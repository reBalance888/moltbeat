"""
Scorer: loads ALL wallet CSVs, performs FRESH analysis, classifies, merges, assigns tiers.

Sources:
  1. primitivka_scored_combined.csv (733 wallets) — PnL, ROI, Invested, Trades
  2. new_wallets_batch_2026-02-24.csv (204 wallets) — same format
  3. smart_money_top.csv (199 wallets) — different format: Tokens, EarlyPct, Buys, Sells

Pipeline:
  1. Load all 3 CSVs into unified format
  2. FRESH classification: detect contracts, bots, whales
  3. FRESH composite scoring (ignoring pre-existing scores)
  4. Remove EXCLUDED_CONTRACTS
  5. Assign tiers and weights
  6. Dedup by address (best score wins)
  7. Output data/combined_watchlist.csv

Usage:
    python scorer.py
"""

import csv
import math
import logging
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional

from config import (
    PRIMITIVKA_CSV, NEW_WALLETS_CSV, SMART_MONEY_TOP_CSV, COMBINED_WATCHLIST_CSV,
    EXCLUDED_CONTRACTS, DATA_DIR,
)

log = logging.getLogger(__name__)


# ================================================================
# CONTRACT DETECTION HEURISTICS
# ================================================================

# SellRatio thresholds: sells / buys
# Normal trader: 0.5 - 1.5
# Router/contract: > 2.0 (receives tokens from many, sells to many)
# Pure sell contract: > 3.0
CONTRACT_SELL_RATIO_THRESHOLD = 2.5

# Very high tx count with balanced buy/sell = likely contract/router
CONTRACT_TX_THRESHOLD = 50_000

# Very few buys but many sells = fee collector / sell contract
CONTRACT_FEW_BUYS_MANY_SELLS_BUYS = 20
CONTRACT_FEW_BUYS_MANY_SELLS_RATIO = 3.0


@dataclass
class RawWallet:
    """Unified wallet record before scoring."""
    address: str
    # From primitivka/new_batch
    pnl_30d: float = 0.0
    roi_30d: float = 0.0
    invested: float = 0.0   # ETH
    trades: int = 0
    buys: int = 0
    sells: int = 0
    # From smart_money_top
    tokens: int = 0          # unique AI tokens traded
    early_pct: float = 0.0   # % of early entries
    hunter_score: float = 0.0  # smart_money_hunter score (0-10)
    # Pre-existing (may ignore)
    pre_type: str = ""
    pre_tier: int = 0
    pre_weight: float = 0.0
    pre_score: float = 0.0
    pre_flags: str = ""
    # Metadata
    sources: str = ""  # which CSVs this appeared in


@dataclass
class ScoredWallet:
    address: str
    type: str       # CONTRACT, BOT, HEAVY, WHALE, ACTIVE, TRADER
    tier: int       # 1 or 2
    weight: float   # 0.0 - 1.0
    score: float    # composite score 0-100
    pnl_30d: float
    roi_30d: float
    invested: float
    trades: int
    buys: int
    sells: int
    tokens: int
    early_pct: float
    label: str = ""
    source: str = ""
    flags: str = ""


# ================================================================
# HELPERS
# ================================================================

def safe_float(val, default=0.0) -> float:
    try:
        return float(val) if val else default
    except (ValueError, TypeError):
        return default


def safe_int(val, default=0) -> int:
    try:
        return int(float(val)) if val else default
    except (ValueError, TypeError):
        return default


# ================================================================
# STEP 1: LOAD ALL SOURCES
# ================================================================

def load_primitivka(path: Path) -> Dict[str, RawWallet]:
    """Load primitivka_scored_combined.csv or new_wallets_batch CSV."""
    if not path.exists():
        log.warning(f"CSV not found: {path}")
        return {}

    wallets = {}
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            addr = row.get("address", "").lower().strip()
            if not addr:
                continue

            wallets[addr] = RawWallet(
                address=addr,
                pnl_30d=safe_float(row.get("pnl_30d")),
                roi_30d=safe_float(row.get("roi_30d")),
                invested=safe_float(row.get("invested")),
                trades=safe_int(row.get("trades")),
                buys=safe_int(row.get("buys")),
                sells=safe_int(row.get("sells")),
                pre_type=row.get("type", "").upper(),
                pre_tier=safe_int(row.get("tier")),
                pre_weight=safe_float(row.get("weight")),
                pre_score=safe_float(row.get("score")),
                pre_flags=row.get("flags", ""),
                sources=path.stem,
            )

    log.info(f"Loaded {len(wallets)} from {path.name}")
    return wallets


def load_smart_money_top(path: Path) -> Dict[str, RawWallet]:
    """Load smart_money_top.csv (different format: Rank, Score, Tokens, EarlyPct, Buys, Sells)."""
    if not path.exists():
        log.warning(f"CSV not found: {path}")
        return {}

    wallets = {}
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            addr = row.get("Address", "").lower().strip()
            if not addr:
                continue

            buys = safe_int(row.get("Buys"))
            sells = safe_int(row.get("Sells"))

            wallets[addr] = RawWallet(
                address=addr,
                buys=buys,
                sells=sells,
                trades=buys + sells,
                tokens=safe_int(row.get("Tokens")),
                early_pct=safe_float(row.get("EarlyPct")),
                hunter_score=safe_float(row.get("Score")),
                sources="smart_money_top",
            )

    log.info(f"Loaded {len(wallets)} from {path.name}")
    return wallets


# ================================================================
# STEP 2: DETECT CONTRACTS
# ================================================================

def is_likely_contract(w: RawWallet) -> tuple:
    """
    Detect if address is likely a contract/router, not a real trader.
    Returns (is_contract: bool, reason: str).
    """
    total = w.buys + w.sells

    # Already flagged as EXCLUDED in source data
    if w.pre_type == "EXCLUDED":
        return True, "pre_flagged_excluded"

    # Very high tx count (50K+) with balanced ratio = infrastructure
    if total >= CONTRACT_TX_THRESHOLD:
        sell_ratio = w.sells / max(w.buys, 1)
        if 0.8 <= sell_ratio <= 1.3:
            # Could be a high-frequency bot OR a contract
            # But 50K+ txs is extreme even for bots — flag as suspicious
            # We'll still allow if other signals are good (check below)
            pass

    # High sell ratio = likely contract (fee collector, LP, etc.)
    if w.buys > 0:
        sell_ratio = w.sells / w.buys
        if sell_ratio >= CONTRACT_SELL_RATIO_THRESHOLD:
            return True, f"high_sell_ratio_{sell_ratio:.1f}"

    # Very few buys but many sells = sell-only contract
    if w.buys <= CONTRACT_FEW_BUYS_MANY_SELLS_BUYS and w.sells > 0:
        ratio = w.sells / max(w.buys, 1)
        if ratio >= CONTRACT_FEW_BUYS_MANY_SELLS_RATIO:
            return True, f"few_buys_{w.buys}_many_sells_{w.sells}"

    # Zero buys = definitely not a trader
    if w.buys == 0 and w.sells > 10:
        return True, "zero_buys"

    return False, ""


# ================================================================
# STEP 3: CLASSIFY TYPE
# ================================================================

def classify_type(w: RawWallet) -> str:
    """
    Fresh classification based on raw data.
    BOT: 1000+ trades, balanced buy/sell
    HEAVY: 100+ ETH invested, or 5K-50K txs
    WHALE: 50+ ETH invested
    ACTIVE: 100+ trades
    TRADER: everything else
    """
    total = w.buys + w.sells

    # BOT: very high activity, near 1:1 buy/sell
    if total >= 1000:
        if w.buys > 0:
            ratio = w.sells / w.buys
            if 0.7 <= ratio <= 1.5:
                return "BOT"
        # High trades but not balanced — still a bot if over 5K
        if total >= 5000:
            return "BOT"

    # HEAVY: significant capital
    if w.invested >= 100:
        return "HEAVY"

    # WHALE: large capital
    if w.invested >= 50:
        return "WHALE"

    # ACTIVE: moderate activity
    if total >= 100:
        return "ACTIVE"

    return "TRADER"


# ================================================================
# STEP 4: COMPOSITE SCORING
# ================================================================

def compute_score(w: RawWallet, wtype: str) -> float:
    """
    ROI-first composite score 0-100. Optimized for copy-trading with fixed position.

    Weights:
      - ROI component (40%): efficiency is king for fixed-size copy ($200)
      - Activity component (25%): buys_per_day — need active wallets for signals
      - Discipline component (15%): balanced selling, not just buying
      - PnL component (10%): sanity check, log-scaled
      - Alpha component (10%): early entries + unique tokens (from hunter data)
    """
    # --- ROI (40%) ---
    roi = w.roi_30d
    if roi >= 100:
        roi_score = 100
    elif roi >= 50:
        roi_score = 80 + (roi - 50) / 50 * 20
    elif roi >= 20:
        roi_score = 50 + (roi - 20) / 30 * 30
    elif roi >= 10:
        roi_score = 30 + (roi - 10) / 10 * 20
    elif roi >= 5:
        roi_score = 15 + (roi - 5) / 5 * 15
    elif roi > 0:
        roi_score = roi / 5 * 15
    elif roi < 0:
        roi_score = max(0, 10 + roi / 5)  # -50% ROI = 0
    else:
        roi_score = 10  # neutral — no ROI data

    # --- Activity (25%): buys per day over 30d window ---
    buys_per_day = w.buys / 30 if w.buys > 0 else 0
    if buys_per_day >= 20:
        activity_score = 100
    elif buys_per_day >= 10:
        activity_score = 80 + (buys_per_day - 10) / 10 * 20
    elif buys_per_day >= 5:
        activity_score = 60 + (buys_per_day - 5) / 5 * 20
    elif buys_per_day >= 2:
        activity_score = 40 + (buys_per_day - 2) / 3 * 20
    elif buys_per_day >= 1:
        activity_score = 25 + (buys_per_day - 1) * 15
    else:
        activity_score = max(0, buys_per_day * 25)

    # --- Discipline (15%): sell ratio ---
    total = w.buys + w.sells
    if total > 10:
        sell_frac = w.sells / total  # 0.0 - 1.0
        # Ideal: 0.30 - 0.55 (selling some profits, not panic selling)
        if 0.25 <= sell_frac <= 0.55:
            discipline_score = 100
        elif sell_frac < 0.25:
            # Mostly buying, rarely selling — risky
            discipline_score = sell_frac / 0.25 * 70
        else:
            # Selling too much
            discipline_score = max(0, 100 - (sell_frac - 0.55) * 200)
    else:
        discipline_score = 30  # too few trades to judge

    # --- PnL (10%): sanity check, log-scaled ---
    pnl = w.pnl_30d
    if pnl > 0:
        pnl_score = min(100, 20 * math.log10(1 + pnl))
    elif pnl < 0:
        pnl_score = max(0, 50 + pnl)  # -50 ETH PnL = 0 score
    else:
        pnl_score = 25  # neutral — no PnL data

    # --- Alpha (10%): early entries + token diversity ---
    alpha_score = 0.0
    if w.tokens > 0:
        # Token diversity: more unique tokens = better coverage
        token_score = min(100, w.tokens * 1.5)  # 67+ tokens = 100
        # Early entry percentage: being early is alpha
        early_score = w.early_pct  # already 0-100
        alpha_score = token_score * 0.5 + early_score * 0.5
    elif w.hunter_score > 0:
        # Use hunter score as proxy (0-10 scale)
        alpha_score = w.hunter_score * 10
    else:
        # No alpha data — use PnL as rough proxy
        alpha_score = min(pnl_score, 50)

    # --- Composite ---
    composite = (
        roi_score * 0.40
        + activity_score * 0.25
        + discipline_score * 0.15
        + pnl_score * 0.10
        + alpha_score * 0.10
    )

    # --- Bonuses ---
    # BOT with good track record gets bonus
    if wtype == "BOT" and w.pnl_30d > 50:
        composite += 5

    # Early alpha hunters get bonus
    if w.early_pct >= 80 and w.tokens >= 30:
        composite += 3

    return round(min(100, composite), 1)


# ================================================================
# STEP 5: ASSIGN TIER + WEIGHT
# ================================================================

def assign_tier_weight(score: float, wtype: str) -> tuple:
    """
    Tier 1: score >= 50 OR (BOT/HEAVY with score >= 40 and good signals)
    Tier 2: score >= 25
    Below 25: rejected (not added to watchlist)

    Weight: 0.3 - 1.0 based on score and type.
    """
    if wtype == "CONTRACT":
        return 0, 0.0  # filtered out

    if score >= 65:
        tier = 1
        weight = 1.0
    elif score >= 55:
        tier = 1
        weight = 0.9
    elif score >= 50:
        tier = 1
        weight = 0.8 if wtype in ("BOT", "HEAVY") else 0.7
    elif score >= 40 and wtype in ("BOT", "HEAVY"):
        # BOTs and HEAVY get tier 1 with lower threshold
        tier = 1
        weight = 0.7
    elif score >= 35:
        tier = 2
        weight = 0.6
    elif score >= 25:
        tier = 2
        weight = max(0.3, 0.3 + (score - 25) / 100)
    else:
        tier = 2
        weight = 0.3

    return tier, round(weight, 2)


# ================================================================
# MAIN PIPELINE
# ================================================================

def run_scorer() -> List[ScoredWallet]:
    """Full scoring pipeline: load → detect contracts → classify → score → merge → output."""
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")

    # --- Step 1: Load all sources ---
    prim_wallets = load_primitivka(PRIMITIVKA_CSV)
    new_wallets = load_primitivka(NEW_WALLETS_CSV)
    top_wallets = load_smart_money_top(SMART_MONEY_TOP_CSV)

    # --- Step 2: Merge into unified map (dedup by address) ---
    unified: Dict[str, RawWallet] = {}

    # Primitivka first (has PnL/ROI data)
    for addr, w in prim_wallets.items():
        unified[addr] = w

    # New batch: merge (update if better PnL)
    merge_new = 0
    merge_update = 0
    for addr, w in new_wallets.items():
        if addr in unified:
            old = unified[addr]
            # Take better data: higher PnL or more recent
            if w.pnl_30d > old.pnl_30d or (w.trades > old.trades and old.pnl_30d == 0):
                w.sources = f"{old.sources}+{w.sources}"
                unified[addr] = w
                merge_update += 1
        else:
            unified[addr] = w
            merge_new += 1
    log.info(f"New batch: {merge_new} new, {merge_update} updated")

    # Smart Money Top: enrich with alpha data (tokens, early_pct, hunter_score)
    enriched = 0
    added_from_top = 0
    for addr, tw in top_wallets.items():
        if addr in unified:
            # Enrich existing wallet with hunter data
            unified[addr].tokens = max(unified[addr].tokens, tw.tokens)
            unified[addr].early_pct = max(unified[addr].early_pct, tw.early_pct)
            unified[addr].hunter_score = max(unified[addr].hunter_score, tw.hunter_score)
            # Update buys/sells if we only had zeros
            if unified[addr].buys == 0 and tw.buys > 0:
                unified[addr].buys = tw.buys
                unified[addr].sells = tw.sells
                unified[addr].trades = tw.trades
            unified[addr].sources += "+smart_money_top"
            enriched += 1
        else:
            # New wallet from top only (no PnL data, but has alpha signals)
            unified[addr] = tw
            added_from_top += 1
    log.info(f"Smart Money Top: enriched {enriched} existing, added {added_from_top} new")

    total_raw = len(unified)
    log.info(f"Total raw wallets after merge: {total_raw}")

    # --- Step 3: Filter excluded contracts + detect new contracts ---
    contracts_excluded = 0
    contracts_detected = 0
    contract_reasons = {}

    addrs_to_remove = set()
    for addr, w in unified.items():
        # Known exclusions
        if addr in EXCLUDED_CONTRACTS:
            addrs_to_remove.add(addr)
            contracts_excluded += 1
            continue

        # Heuristic contract detection
        is_contract, reason = is_likely_contract(w)
        if is_contract:
            addrs_to_remove.add(addr)
            contracts_detected += 1
            contract_reasons[reason] = contract_reasons.get(reason, 0) + 1

    for addr in addrs_to_remove:
        del unified[addr]

    log.info(f"Removed {contracts_excluded} known excluded + {contracts_detected} detected contracts")
    if contract_reasons:
        log.info(f"  Contract detection reasons: {contract_reasons}")

    # --- Step 4: Classify + Score ---
    scored_wallets: List[ScoredWallet] = []

    type_counts = {}
    tier_counts = {1: 0, 2: 0}

    for addr, w in unified.items():
        # Fresh type classification
        wtype = classify_type(w)
        type_counts[wtype] = type_counts.get(wtype, 0) + 1

        # Fresh composite score
        score = compute_score(w, wtype)

        # Assign tier and weight
        tier, weight = assign_tier_weight(score, wtype)
        tier_counts[tier] = tier_counts.get(tier, 0) + 1

        # Generate label
        label = f"{wtype}_{addr[:8]}"

        scored_wallets.append(ScoredWallet(
            address=addr,
            type=wtype,
            tier=tier,
            weight=weight,
            score=score,
            pnl_30d=w.pnl_30d,
            roi_30d=w.roi_30d,
            invested=w.invested,
            trades=w.trades,
            buys=w.buys,
            sells=w.sells,
            tokens=w.tokens,
            early_pct=w.early_pct,
            label=label,
            source=w.sources,
            flags=w.pre_flags,
        ))

    # Sort: T1 first, then by score desc
    scored_wallets.sort(key=lambda w: (w.tier, -w.score))

    # --- Step 5: Write output CSV ---
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    fields = [
        "address", "type", "tier", "weight", "score",
        "pnl_30d", "roi_30d", "invested", "trades", "buys", "sells",
        "tokens", "early_pct", "label", "source", "flags",
    ]

    with open(COMBINED_WATCHLIST_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for w in scored_wallets:
            writer.writerow(asdict(w))

    log.info(f"Written {len(scored_wallets)} wallets to {COMBINED_WATCHLIST_CSV}")

    # --- Step 6: Print report ---
    t1 = [w for w in scored_wallets if w.tier == 1]
    t2 = [w for w in scored_wallets if w.tier == 2]

    print(f"\n{'='*60}")
    print(f"SCORER RESULTS — Fresh Analysis")
    print(f"{'='*60}")
    print(f"Sources loaded:")
    print(f"  primitivka:       {len(prim_wallets)} wallets")
    print(f"  new_batch:        {len(new_wallets)} wallets")
    print(f"  smart_money_top:  {len(top_wallets)} wallets")
    print(f"  Total raw:        {total_raw}")
    print(f"")
    print(f"Filtering:")
    print(f"  Known excluded:   {contracts_excluded}")
    print(f"  Detected contracts: {contracts_detected}")
    if contract_reasons:
        for reason, count in sorted(contract_reasons.items(), key=lambda x: -x[1]):
            print(f"    {reason}: {count}")
    print(f"")
    print(f"After filtering:    {len(scored_wallets)}")
    print(f"  T1: {len(t1)}")
    print(f"  T2: {len(t2)}")
    print(f"")
    print(f"Types: {type_counts}")
    print(f"")
    print(f"Top 15 by score:")
    for w in scored_wallets[:15]:
        extra = ""
        if w.tokens > 0:
            extra = f" tok={w.tokens} early={w.early_pct:.0f}%"
        if w.pnl_30d != 0:
            extra += f" PnL={w.pnl_30d:.1f}"
        print(f"  {w.address[:12]}.. T{w.tier} w={w.weight} s={w.score:>5} {w.type:<7}{extra}")
    print(f"{'='*60}\n")

    return scored_wallets


if __name__ == "__main__":
    run_scorer()
