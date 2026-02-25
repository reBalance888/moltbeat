"""
Watchlist: loads audit_result.csv, assigns T1/T2 by score threshold.
No hardcoded wallets — everything comes from the audited CSV.
"""

import csv
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Set

from config import EXCLUDED_CONTRACTS, MIN_T1_BUYS_PER_DAY

log = logging.getLogger(__name__)

AUDIT_CSV = Path(__file__).parent / "data" / "audit_result.csv"

# T1 threshold — wallets with score >= this generate signals
# Lowered from 75 to 65 to capture more high-ROI wallets
T1_SCORE_THRESHOLD = 65


@dataclass
class WalletInfo:
    address: str
    label: str
    tier: int
    weight: float
    type: str
    score: float


def load_watchlist() -> tuple:
    """
    Load wallets from audit_result.csv.

    T1 (score >= 65 AND buys/day >= 2): generate signals (SINGLE, CONSENSUS, STRONG)
    T2 (score < 65 OR buys/day < 2, not REJECT): amplify consensus (CONSENSUS_MIXED)
    REJECT: skipped entirely

    Returns (monitored_wallets, wallet_info_map, address_set).
    """
    wallet_map: Dict[str, WalletInfo] = {}

    if not AUDIT_CSV.exists():
        log.error(f"Audit CSV not found: {AUDIT_CSV}")
        log.error("Run: python audit_wallets.py")
        return [], {}, set()

    demoted = 0  # wallets demoted from T1 to T2 due to low activity

    with open(AUDIT_CSV, "r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            addr = row.get("address", "").lower().strip()
            if not addr:
                continue

            # Skip hard-rejected and soft-rejected
            if row.get("tier") == "REJECT":
                continue

            # Skip excluded contracts
            if addr in EXCLUDED_CONTRACTS:
                continue

            try:
                score = float(row.get("score", 0))
                weight = float(row.get("weight", 0))
                buys = int(float(row.get("buys", 0)))
            except (ValueError, TypeError):
                continue

            buys_per_day = buys / 30

            # Assign tier by score + minimum activity filter
            if score >= T1_SCORE_THRESHOLD:
                if buys_per_day >= MIN_T1_BUYS_PER_DAY:
                    tier = 1
                    # Weight from score: 80+ → 1.0, 70-79 → 0.9, 65-69 → 0.8
                    if score >= 80:
                        w = 1.0
                    elif score >= 70:
                        w = 0.9
                    else:
                        w = 0.8
                else:
                    # Score OK but too few buys — demote to T2
                    tier = 2
                    w = weight if weight > 0 else 0.5
                    demoted += 1
            else:
                tier = 2
                w = weight if weight > 0 else 0.5

            wtype = row.get("type", "TRADER")
            label = f"{wtype}_{addr[:8]}"

            wallet_map[addr] = WalletInfo(
                address=addr,
                label=label,
                tier=tier,
                weight=w,
                type=wtype,
                score=score,
            )

    if demoted:
        log.info(f"Demoted {demoted} wallets from T1 to T2 (buys/day < {MIN_T1_BUYS_PER_DAY})")

    # --- Build output ---
    monitored = list(wallet_map.values())
    monitored.sort(key=lambda w: (w.tier, -w.score))
    address_set = set(wallet_map.keys())

    t1 = sum(1 for w in monitored if w.tier == 1)
    t2 = sum(1 for w in monitored if w.tier == 2)
    bots = sum(1 for w in monitored if w.type == "BOT")

    log.info(f"Monitoring {len(monitored)} wallets (T1={t1}, T2={t2}, BOTs={bots})")

    return monitored, wallet_map, address_set


def get_startup_report(monitored: List[WalletInfo], wallet_map: Dict[str, WalletInfo]) -> str:
    """Generate startup report string for Telegram."""
    t1 = [w for w in monitored if w.tier == 1]
    t2 = [w for w in monitored if w.tier == 2]
    bots = [w for w in monitored if w.type == "BOT"]

    type_counts = {}
    for w in monitored:
        type_counts[w.type] = type_counts.get(w.type, 0) + 1

    avg_score_t1 = sum(w.score for w in t1) / len(t1) if t1 else 0

    lines = [
        "Smart Money Bot Started",
        "",
        f"Monitoring: {len(monitored)} wallets",
        f"  T1: {len(t1)} (score >= {T1_SCORE_THRESHOLD}, buys/day >= {MIN_T1_BUYS_PER_DAY}, avg={avg_score_t1:.0f})",
        f"  T2: {len(t2)} (confirmation)",
        f"  BOTs: {len(bots)} (dedup active)",
        "",
        "Types:",
    ]
    for t, c in sorted(type_counts.items()):
        lines.append(f"  {t}: {c}")

    lines.append("")
    lines.append("Signals:")
    lines.append("  SINGLE_T1: alert only (no trade)")
    lines.append("  CONSENSUS_T1: 2+ T1 -> 0.7x")
    lines.append("  CONSENSUS_MIXED: 1 T1 + 3 total -> 1.0x")
    lines.append("  STRONG: 3+ T1 -> 1.5x")

    return "\n".join(lines)
