"""
FULL WALLET AUDIT — кошельки.csv (636 wallets)

Pipeline:
  1. Load CSV
  2. On-chain: eth_getCode for each address (contract or EOA?)
  3. Cross-reference with all existing data sources
  4. Hard filters: remove contracts, routers, aggregators
  5. Soft flags: red/yellow/green per wallet
  6. Scoring: ROI-first (efficiency > absolute PnL)
  7. Tier assignment: T1 (copy) / T2 (confirm) / REJECT
  8. Output: data/audit_result.csv + detailed report

Usage:
    python audit_wallets.py
"""

import csv
import json
import math
import time
import asyncio
import aiohttp
import logging
from pathlib import Path
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Set, Optional

log = logging.getLogger(__name__)

# ================================================================
# CONFIG
# ================================================================

INPUT_CSV = Path(r"c:\Users\romim\OneDrive\Рабочий стол\кошельки.csv")
INPUT_CSV_2 = Path(r"c:\Users\romim\OneDrive\Рабочий стол\stats-base-net-30d_2026-02-25.csv.csv")
OUTPUT_CSV = Path(__file__).parent / "data" / "audit_result.csv"
REPORT_TXT = Path(__file__).parent / "data" / "audit_report.txt"
OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)

from config import ALCHEMY_HTTP_URL, ALCHEMY_API_KEY
ALCHEMY_URL = ALCHEMY_HTTP_URL

# Cross-reference sources
PROJECT_DIR = Path(__file__).parent.parent
PRIMITIVKA_CSV = PROJECT_DIR / "primitivka_scored_combined.csv"
SMART_MONEY_TOP_CSV = PROJECT_DIR / "smart_money_top.csv"
NEW_WALLETS_CSV = PROJECT_DIR / "new_wallets_batch_2026-02-24.csv"

# Known bad addresses
KNOWN_EXCLUDED = {
    "0x63d2dfea64b3433f4071a98665bcd7ca14d93496",  # Uniswap V4 Pool Manager
    "0x498581ff718922c3f8e6a244956af099b2652b2b",  # Clanker LP Locker Fee Converter
    "0xf3622742b1e446d92e45e22923ef11c2fcd55d68",
    "0xe85a59c628f7d27878aceb4bf3b35733630083a9",
    "0xf5c4f3dc02c3fb9279495a8fef7b0741da956157",
    "0x5aafc1f252d544f744d17a4e734afd6efc47ede4",
    "0xad01c20d5886137e056775af56915de824c8fce5",
    "0xfa00a9ed787f3793db668bff3e6e6e7db0f92a1b",
    "0x4f82e73edb06d29ff62c91ec8f5ff06571bdeb29",
    "0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae",  # LiFi Diamond
    "0x9bb15abecf1648f2a8b8e50a2c148f6800c5e327",  # Banana Gun Router
    "0x00000000009726632680fb29d3f7a9734e3010e2",  # Relay.link
    "0x88ecfb411a0cc8bb14d67701f87908b0b321208b",  # Maestro Router
    "0x6131b5fae19ea4f9d964eac0408e4408b66337b5",  # Kyber Aggregator
}


@dataclass
class WalletAudit:
    address: str
    # Raw data
    pnl: float          # ETH
    roi: float          # %
    invested: float     # ETH
    trades: int
    buys: int
    sells: int
    last_activity: str
    # On-chain
    is_contract: Optional[bool] = None   # True = contract, False = EOA
    # Cross-reference
    in_our_t1: bool = False
    in_our_t2: bool = False
    in_primitivka: bool = False
    in_smart_top: bool = False
    cross_score: float = 0.0       # from primitivka
    cross_tokens: int = 0          # from smart_money_top
    cross_early_pct: float = 0.0   # from smart_money_top
    # Computed
    type: str = ""
    sell_ratio: float = 0.0
    days_inactive: int = 0
    # Flags
    red_flags: List[str] = field(default_factory=list)
    yellow_flags: List[str] = field(default_factory=list)
    green_flags: List[str] = field(default_factory=list)
    # Final
    score: float = 0.0
    tier: str = ""     # T1, T2, REJECT
    weight: float = 0.0
    reject_reason: str = ""


# ================================================================
# STEP 1: ON-CHAIN CHECK (contract or EOA)
# ================================================================

async def check_contracts_batch(addresses: List[str]) -> Dict[str, bool]:
    """Check eth_getCode for each address. Empty code = EOA, non-empty = contract."""
    results = {}
    batch_size = 50  # Alchemy batch RPC limit

    async with aiohttp.ClientSession() as session:
        for i in range(0, len(addresses), batch_size):
            batch = addresses[i:i + batch_size]

            # Build batch request
            payload = [
                {
                    "jsonrpc": "2.0",
                    "id": j,
                    "method": "eth_getCode",
                    "params": [addr, "latest"],
                }
                for j, addr in enumerate(batch)
            ]

            try:
                async with session.post(
                    ALCHEMY_URL,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as resp:
                    data = await resp.json()

                for item, addr in zip(sorted(data, key=lambda x: x["id"]), batch):
                    code = item.get("result", "0x")
                    # "0x" = no code = EOA; anything else = contract
                    results[addr] = code != "0x" and len(code) > 2

            except Exception as e:
                log.warning(f"Batch {i}-{i+batch_size} failed: {e}")
                for addr in batch:
                    results[addr] = None  # unknown

            # Rate limit: 2 rps conservative
            if i + batch_size < len(addresses):
                await asyncio.sleep(0.5)

            done = min(i + batch_size, len(addresses))
            if done % 200 == 0 or done == len(addresses):
                contracts = sum(1 for v in results.values() if v is True)
                log.info(f"  Checked {done}/{len(addresses)} — {contracts} contracts so far")

    return results


# ================================================================
# STEP 2: CROSS-REFERENCE
# ================================================================

def load_cross_data():
    """Load all our existing data sources for cross-referencing."""
    cross = {
        "primitivka": {},
        "smart_top": {},
        "new_batch": {},
        "our_t1": set(),
        "our_t2": set(),
        "our_wxyz": set(),
    }

    # Primitivka
    if PRIMITIVKA_CSV.exists():
        with open(PRIMITIVKA_CSV, "r", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                addr = row.get("address", "").lower().strip()
                if addr:
                    cross["primitivka"][addr] = row

    # Smart Money Top
    if SMART_MONEY_TOP_CSV.exists():
        with open(SMART_MONEY_TOP_CSV, "r", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                addr = row.get("Address", "").lower().strip()
                if addr:
                    cross["smart_top"][addr] = row

    # New wallets batch
    if NEW_WALLETS_CSV.exists():
        with open(NEW_WALLETS_CSV, "r", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                addr = row.get("address", "").lower().strip()
                if addr:
                    cross["new_batch"][addr] = row

    # Our verified wallets
    try:
        import sys
        sys.path.insert(0, str(PROJECT_DIR))
        from smart_money_copytrade_final import TIER_1, TIER_2, WALLET_XYZ_VERIFIED
        cross["our_t1"] = {w["address"].lower() for w in TIER_1}
        cross["our_t2"] = {w["address"].lower() for w in TIER_2}
        cross["our_wxyz"] = {w["address"].lower() for w in WALLET_XYZ_VERIFIED}
    except ImportError:
        log.warning("Could not import smart_money_copytrade_final")

    log.info(
        f"Cross-ref loaded: primitivka={len(cross['primitivka'])}, "
        f"smart_top={len(cross['smart_top'])}, our_t1={len(cross['our_t1'])}, "
        f"our_t2={len(cross['our_t2'])}"
    )
    return cross


# ================================================================
# STEP 3: HARD FILTERS
# ================================================================

def apply_hard_filters(w: WalletAudit) -> bool:
    """Returns True = REJECT. Hard filters, no exceptions."""

    # Known excluded
    if w.address in KNOWN_EXCLUDED:
        w.reject_reason = "KNOWN_EXCLUDED_CONTRACT"
        return True

    # On-chain: it's a contract — but ONLY reject if it looks like infrastructure
    # Smart contract wallets (Gnosis Safe, Argent, etc.) are legit traders
    if w.is_contract is True:
        is_infra = (
            (w.buys > 0 and w.sells / w.buys >= 2.0)  # aggregators sell more than buy
            or w.roi < 0.5             # near-zero ROI = routing/pooling, not trading
        )
        if is_infra:
            w.reject_reason = "INFRA_CONTRACT"
            return True
        # Otherwise: smart contract wallet (Safe, Argent, etc.) — keep, just yellow flag

    # Extreme sell ratio (>= 2.5x)
    if w.buys > 0:
        w.sell_ratio = w.sells / w.buys
        if w.sell_ratio >= 2.5:
            w.reject_reason = f"SELL_RATIO_{w.sell_ratio:.1f}x"
            return True

    # Insane invested (>50K ETH) — protocol, not a person
    if w.invested >= 50000:
        w.reject_reason = f"EXTREME_VOLUME_{w.invested:.0f}_ETH"
        return True

    # ROI near zero with huge capital — aggregator grinding
    if w.invested >= 5000 and w.roi < 0.5:
        w.reject_reason = f"GRINDER_ROI_{w.roi:.2f}%_INV_{w.invested:.0f}"
        return True

    return False


# ================================================================
# STEP 4: FLAGS (soft signals)
# ================================================================

def apply_flags(w: WalletAudit, cross: dict):
    """Apply red/yellow/green flags."""

    # --- RED FLAGS ---
    if w.buys > 0 and w.sells / w.buys >= 2.0:
        w.red_flags.append(f"HIGH_SELL_RATIO_{w.sells/w.buys:.1f}x")

    if w.invested >= 10000 and w.roi < 1:
        w.red_flags.append(f"LOW_ROI_BIG_CAPITAL")

    if w.trades < 15:
        w.red_flags.append("TOO_FEW_TRADES")

    if w.days_inactive >= 14:
        w.red_flags.append(f"INACTIVE_{w.days_inactive}d")

    # NOTE: is_contract=None means check failed (no API key / expired)
    # Do NOT penalize — it's our problem, not the wallet's
    # If on-chain check succeeds and detects infra contract, it's caught in hard filters

    # --- YELLOW FLAG for smart contract wallets ---
    # Not rejected (passed hard filter) but still a contract = smart wallet
    if w.is_contract is True:
        w.yellow_flags.append("SMART_CONTRACT_WALLET")

    # Sells > 60% of total = over-selling (not holding positions)
    total = w.buys + w.sells
    if total > 20 and w.sells / total > 0.65:
        w.red_flags.append(f"OVER_SELLING_{w.sells/total:.0%}")

    # --- YELLOW FLAGS ---
    if w.invested >= 5000 and w.roi < 2:
        w.yellow_flags.append("LOW_ROI_FOR_VOLUME")

    if w.trades < 30:
        w.yellow_flags.append("SMALL_SAMPLE")

    if w.days_inactive >= 5:
        w.yellow_flags.append(f"INACTIVE_{w.days_inactive}d")

    if w.roi < 5:
        w.yellow_flags.append(f"LOW_ROI_{w.roi:.1f}%")

    if w.buys > 0 and w.sells / w.buys >= 1.5:
        w.yellow_flags.append("ELEVATED_SELL_RATIO")

    # --- GREEN FLAGS ---
    if w.roi >= 20:
        w.green_flags.append(f"HIGH_ROI_{w.roi:.0f}%")

    if w.pnl >= 50:
        w.green_flags.append(f"HIGH_PNL_{w.pnl:.0f}")

    if 0.30 <= (w.sells / max(total, 1)) <= 0.55:
        w.green_flags.append("BALANCED_SELLS")

    if w.days_inactive <= 2:
        w.green_flags.append("RECENTLY_ACTIVE")

    if w.address in cross["our_t1"]:
        w.green_flags.append("OUR_VERIFIED_T1")
        w.in_our_t1 = True

    if w.address in cross["our_t2"]:
        w.green_flags.append("OUR_VERIFIED_T2")
        w.in_our_t2 = True

    if w.address in cross["our_wxyz"]:
        w.green_flags.append("WALLET_XYZ_VERIFIED")

    # Cross-reference enrichment
    if w.address in cross["smart_top"]:
        st = cross["smart_top"][w.address]
        w.in_smart_top = True
        w.cross_tokens = int(st.get("Tokens", 0))
        w.cross_early_pct = float(st.get("EarlyPct", 0))
        if w.cross_early_pct >= 70:
            w.green_flags.append(f"EARLY_ALPHA_{w.cross_early_pct:.0f}%")
        if w.cross_tokens >= 30:
            w.green_flags.append(f"TOKEN_DIVERSITY_{w.cross_tokens}")

    if w.address in cross["primitivka"]:
        w.in_primitivka = True
        w.cross_score = float(cross["primitivka"][w.address].get("score", 0) or 0)


# ================================================================
# STEP 5: SCORING (ROI-first)
# ================================================================

def compute_score(w: WalletAudit) -> float:
    """
    ROI-first scoring for copy-trading with fixed position ($200).

    ROI (40%)       — efficiency is king. High ROI = they pick winners.
    Activity (25%)  — buys_per_day: need active wallets for signals.
    Discipline (15%) — sell ratio, taking profits.
    PnL (10%)       — sanity check only. Log-scaled, capped at 100.
    Recency (5%)   — still active?
    Trust (5%)     — cross-reference with our verified data.
    """

    # --- ROI (40%) ---
    if w.roi >= 100:
        roi_score = 100
    elif w.roi >= 50:
        roi_score = 80 + (w.roi - 50) / 50 * 20
    elif w.roi >= 20:
        roi_score = 50 + (w.roi - 20) / 30 * 30
    elif w.roi >= 10:
        roi_score = 30 + (w.roi - 10) / 10 * 20
    elif w.roi >= 5:
        roi_score = 15 + (w.roi - 5) / 5 * 15
    elif w.roi > 0:
        roi_score = w.roi / 5 * 15
    else:
        roi_score = max(0, 10 + w.roi / 5)

    # --- Activity (25%): buys per day over 30d window ---
    buys_per_day = w.buys / 30 if w.buys > 0 else 0
    if buys_per_day >= 20:
        act_score = 100
    elif buys_per_day >= 10:
        act_score = 80 + (buys_per_day - 10) / 10 * 20
    elif buys_per_day >= 5:
        act_score = 60 + (buys_per_day - 5) / 5 * 20
    elif buys_per_day >= 2:
        act_score = 40 + (buys_per_day - 2) / 3 * 20
    elif buys_per_day >= 1:
        act_score = 25 + (buys_per_day - 1) * 15
    else:
        act_score = max(0, buys_per_day * 25)

    # --- Discipline (15%) ---
    total = w.buys + w.sells
    if total > 10:
        sell_frac = w.sells / total
        if 0.30 <= sell_frac <= 0.55:
            disc_score = 100
        elif 0.20 <= sell_frac < 0.30:
            disc_score = 60 + (sell_frac - 0.20) / 0.10 * 40
        elif 0.55 < sell_frac <= 0.65:
            disc_score = 60 + (0.65 - sell_frac) / 0.10 * 40
        elif sell_frac < 0.20:
            disc_score = sell_frac / 0.20 * 50
        else:
            disc_score = max(0, 50 - (sell_frac - 0.65) * 150)
    else:
        disc_score = 30

    # --- PnL (10%): sanity check, log-scaled ---
    if w.pnl > 0:
        pnl_score = min(100, 20 * math.log10(1 + w.pnl))
    elif w.pnl < 0:
        pnl_score = max(0, 50 + w.pnl)
    else:
        pnl_score = 25

    # --- Recency (5%) ---
    if w.days_inactive <= 1:
        rec_score = 100
    elif w.days_inactive <= 3:
        rec_score = 80
    elif w.days_inactive <= 7:
        rec_score = 50
    elif w.days_inactive <= 14:
        rec_score = 30
    else:
        rec_score = max(0, 30 - w.days_inactive)

    # --- Trust (5%) ---
    trust_score = 0
    if w.in_our_t1:
        trust_score = 100
    elif w.in_our_t2:
        trust_score = 70
    elif w.in_smart_top and w.cross_early_pct >= 60:
        trust_score = 60
    elif w.in_primitivka and w.cross_score >= 50:
        trust_score = 50
    elif w.in_primitivka:
        trust_score = 30

    # --- Composite ---
    score = (
        roi_score * 0.40
        + act_score * 0.25
        + disc_score * 0.15
        + pnl_score * 0.10
        + rec_score * 0.05
        + trust_score * 0.05
    )

    # --- Penalties ---
    score -= len(w.red_flags) * 8
    score -= len(w.yellow_flags) * 2

    # --- Bonuses ---
    score += len(w.green_flags) * 2

    return round(max(0, min(100, score)), 1)


# ================================================================
# STEP 6: TIER ASSIGNMENT
# ================================================================

def assign_tier(w: WalletAudit):
    """
    T1: score >= 60 AND no red flags — COPY these
    T2: score >= 40 AND <= 1 red flag — use for CONFIRMATION
    REJECT: everything else
    """
    s = w.score
    reds = len(w.red_flags)

    if s >= 60 and reds == 0:
        w.tier = "T1"
        if s >= 80:
            w.weight = 1.0
        elif s >= 70:
            w.weight = 0.9
        else:
            w.weight = 0.8
    elif s >= 40 and reds <= 1:
        w.tier = "T2"
        if s >= 55:
            w.weight = 0.6
        elif s >= 45:
            w.weight = 0.5
        else:
            w.weight = 0.4
    else:
        w.tier = "REJECT"
        w.weight = 0.0
        if not w.reject_reason:
            reasons = []
            if s < 40:
                reasons.append(f"LOW_SCORE_{s}")
            if reds > 1:
                reasons.append(f"RED_FLAGS_{reds}")
            w.reject_reason = "+".join(reasons) if reasons else "BELOW_THRESHOLD"


# ================================================================
# STEP 7: TYPE CLASSIFICATION
# ================================================================

def classify_type(w: WalletAudit) -> str:
    total = w.trades
    if total >= 1000:
        if w.buys > 0 and 0.5 <= w.sells / w.buys <= 2.0:
            return "BOT"
        if total >= 3000:
            return "BOT"
    if w.invested >= 500:
        return "HEAVY"
    if w.invested >= 100:
        return "WHALE"
    if total >= 200:
        return "ACTIVE"
    return "TRADER"


# ================================================================
# MAIN
# ================================================================

async def run():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    # --- Load CSVs ---
    def parse_wallet_row(row) -> WalletAudit:
        w = WalletAudit(
            address=row["Wallet"].lower().strip(),
            pnl=float(row["PnL (SOL)"]),
            roi=float(row["ROI (%)"]),
            invested=float(row["Total Invested (SOL)"]),
            trades=int(row["Total Trades (#)"]),
            buys=int(row["Total Buys (#)"]),
            sells=int(row["Total Sells (#)"]),
            last_activity=row["Last Activity Date"],
        )
        try:
            d = datetime.fromisoformat(w.last_activity.replace("Z", "+00:00"))
            w.days_inactive = (datetime(2026, 2, 25) - d.replace(tzinfo=None)).days
        except (ValueError, TypeError):
            w.days_inactive = 99
        return w

    wallet_map_raw: Dict[str, WalletAudit] = {}

    # Source 1: кошельки.csv
    with open(INPUT_CSV, "r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            w = parse_wallet_row(row)
            wallet_map_raw[w.address] = w
    log.info(f"Source 1: {len(wallet_map_raw)} wallets from {INPUT_CSV.name}")

    # Source 2: stats-base-net (additional)
    added_new = 0
    updated = 0
    if INPUT_CSV_2.exists():
        with open(INPUT_CSV_2, "r", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                w = parse_wallet_row(row)
                if w.address in wallet_map_raw:
                    old = wallet_map_raw[w.address]
                    # Take more recent data (lower days_inactive) or better ROI
                    if w.days_inactive < old.days_inactive or (w.roi > old.roi and w.days_inactive <= old.days_inactive):
                        wallet_map_raw[w.address] = w
                        updated += 1
                else:
                    wallet_map_raw[w.address] = w
                    added_new += 1
        log.info(f"Source 2: +{added_new} new, {updated} updated from {INPUT_CSV_2.name}")
    else:
        log.warning(f"Source 2 not found: {INPUT_CSV_2}")

    wallets = list(wallet_map_raw.values())
    log.info(f"Total unique wallets: {len(wallets)}")

    # --- On-chain check (optional — needs working Alchemy key) ---
    on_chain_contracts = 0
    if ALCHEMY_API_KEY and ALCHEMY_API_KEY != "your_alchemy_api_key_here":
        log.info("Checking on-chain (eth_getCode)...")
        addresses = [w.address for w in wallets]
        contract_map = await check_contracts_batch(addresses)

        for w in wallets:
            w.is_contract = contract_map.get(w.address)
            if w.is_contract:
                on_chain_contracts += 1

        # Check if ALL returned None (API failure)
        all_none = all(v is None for v in contract_map.values())
        if all_none:
            log.warning("All on-chain checks returned None — API key likely expired. Skipping on-chain filter.")
            for w in wallets:
                w.is_contract = None
            on_chain_contracts = 0
        else:
            log.info(f"On-chain: {on_chain_contracts} contracts, {sum(1 for v in contract_map.values() if v is False)} EOAs")
    else:
        log.info("Alchemy API key not set — skipping on-chain check")

    # --- Cross-reference ---
    cross = load_cross_data()
    for w in wallets:
        w.in_primitivka = w.address in cross["primitivka"]

    # --- Hard filters ---
    clean = []
    rejected = []
    for w in wallets:
        if apply_hard_filters(w):
            w.tier = "REJECT"
            rejected.append(w)
        else:
            clean.append(w)

    log.info(f"Hard filter: {len(rejected)} rejected, {len(clean)} passed")

    # --- Flags + Score + Tier ---
    for w in clean:
        w.type = classify_type(w)
        apply_flags(w, cross)
        w.score = compute_score(w)
        assign_tier(w)

    # Split by tier
    t1 = sorted([w for w in clean if w.tier == "T1"], key=lambda w: -w.score)
    t2 = sorted([w for w in clean if w.tier == "T2"], key=lambda w: -w.score)
    soft_reject = sorted([w for w in clean if w.tier == "REJECT"], key=lambda w: -w.score)

    all_sorted = t1 + t2 + soft_reject + rejected

    # --- Write CSV ---
    fields = [
        "address", "tier", "weight", "score", "type",
        "pnl", "roi", "invested", "trades", "buys", "sells",
        "sell_ratio", "days_inactive", "is_contract",
        "red_flags", "yellow_flags", "green_flags",
        "in_our_t1", "in_our_t2", "in_smart_top",
        "cross_tokens", "cross_early_pct",
        "reject_reason", "last_activity",
    ]

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for w in all_sorted:
            writer.writerow({
                "address": w.address,
                "tier": w.tier,
                "weight": w.weight,
                "score": w.score,
                "type": w.type,
                "pnl": round(w.pnl, 2),
                "roi": round(w.roi, 2),
                "invested": round(w.invested, 2),
                "trades": w.trades,
                "buys": w.buys,
                "sells": w.sells,
                "sell_ratio": round(w.sell_ratio, 2) if w.sell_ratio else "",
                "days_inactive": w.days_inactive,
                "is_contract": w.is_contract,
                "red_flags": "|".join(w.red_flags),
                "yellow_flags": "|".join(w.yellow_flags),
                "green_flags": "|".join(w.green_flags),
                "in_our_t1": w.in_our_t1,
                "in_our_t2": w.in_our_t2,
                "in_smart_top": w.in_smart_top,
                "cross_tokens": w.cross_tokens,
                "cross_early_pct": w.cross_early_pct,
                "reject_reason": w.reject_reason,
                "last_activity": w.last_activity,
            })

    # --- Build report ---
    report = []
    report.append("=" * 80)
    report.append("WALLET AUDIT REPORT — кошельки.csv")
    report.append(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    report.append("=" * 80)

    report.append(f"\nInput: {len(wallets)} unique wallets ({INPUT_CSV.name} + {INPUT_CSV_2.name})")
    report.append(f"On-chain contracts found: {on_chain_contracts}")
    report.append(f"Hard-rejected: {len(rejected)}")
    for w in rejected:
        report.append(f"  {w.address}  reason={w.reject_reason}")

    report.append(f"\nAfter hard filter: {len(clean)}")
    report.append(f"  T1 (COPY):     {len(t1)}")
    report.append(f"  T2 (CONFIRM):  {len(t2)}")
    report.append(f"  REJECT (soft): {len(soft_reject)}")

    # Type distribution
    type_counts = {}
    for w in t1 + t2:
        type_counts[w.type] = type_counts.get(w.type, 0) + 1
    report.append(f"\nTypes in T1+T2:")
    for t, c in sorted(type_counts.items(), key=lambda x: -x[1]):
        report.append(f"  {t:<8} {c}")

    # T1 detail
    report.append(f"\n{'='*80}")
    report.append(f"TIER 1 — COPY THESE ({len(t1)} wallets)")
    report.append(f"{'='*80}")
    report.append(f"{'#':>3} {'Score':>5} {'W':>4} {'Type':<7} {'PnL':>7} {'ROI%':>7} {'Inv':>8} {'Trd':>5} {'B/S%':>5} {'Flags'}")
    report.append("-" * 80)

    for i, w in enumerate(t1, 1):
        sf = w.sells / (w.buys + w.sells) * 100 if (w.buys + w.sells) > 0 else 0
        flags_str = " ".join(w.green_flags[:3])
        report.append(
            f"{i:>3} {w.score:>5.1f} {w.weight:>4.1f} {w.type:<7} "
            f"{w.pnl:>7.1f} {w.roi:>6.1f}% {w.invested:>8.0f} {w.trades:>5} "
            f"{sf:>4.0f}% {flags_str}"
        )
        report.append(f"    {w.address}")

    # T2 summary
    report.append(f"\n{'='*80}")
    report.append(f"TIER 2 — CONFIRMATION ({len(t2)} wallets)")
    report.append(f"{'='*80}")
    for i, w in enumerate(t2[:30], 1):
        sf = w.sells / (w.buys + w.sells) * 100 if (w.buys + w.sells) > 0 else 0
        reds = f" RED:{','.join(w.red_flags)}" if w.red_flags else ""
        report.append(
            f"{i:>3} s={w.score:>5.1f} {w.type:<7} PnL={w.pnl:>6.1f} "
            f"ROI={w.roi:>5.1f}% Inv={w.invested:>7.0f} Trd={w.trades:>5}{reds}"
        )
        report.append(f"    {w.address}")

    if len(t2) > 30:
        report.append(f"    ... and {len(t2) - 30} more T2 wallets")

    # Soft-rejected
    report.append(f"\n{'='*80}")
    report.append(f"REJECTED — soft ({len(soft_reject)} wallets)")
    report.append(f"{'='*80}")
    for w in soft_reject[:20]:
        report.append(
            f"  s={w.score:>5.1f} PnL={w.pnl:>6.1f} ROI={w.roi:>5.1f}% "
            f"reason={w.reject_reason}  red={','.join(w.red_flags)}"
        )
        report.append(f"    {w.address}")

    # Stats
    if t1:
        avg_roi_t1 = sum(w.roi for w in t1) / len(t1)
        avg_pnl_t1 = sum(w.pnl for w in t1) / len(t1)
        report.append(f"\n{'='*80}")
        report.append(f"STATISTICS")
        report.append(f"{'='*80}")
        report.append(f"T1 average ROI:  {avg_roi_t1:.1f}%")
        report.append(f"T1 average PnL:  {avg_pnl_t1:.1f} ETH")
        report.append(f"T1 total PnL:    {sum(w.pnl for w in t1):.1f} ETH")

    if t2:
        avg_roi_t2 = sum(w.roi for w in t2) / len(t2)
        report.append(f"T2 average ROI:  {avg_roi_t2:.1f}%")

    report_text = "\n".join(report)

    with open(REPORT_TXT, "w", encoding="utf-8") as f:
        f.write(report_text)

    print(report_text)
    print(f"\nCSV: {OUTPUT_CSV}")
    print(f"Report: {REPORT_TXT}")


if __name__ == "__main__":
    asyncio.run(run())
