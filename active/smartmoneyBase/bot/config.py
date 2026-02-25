"""
Configuration for Smart Money Copy Trading Bot.
Loads from .env, defines constants, thresholds, excluded contracts.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from bot/ directory
ENV_PATH = Path(__file__).parent / ".env"
load_dotenv(ENV_PATH)

# ================================================================
# API KEYS
# ================================================================

ALCHEMY_API_KEY = os.getenv("ALCHEMY_API_KEY", "")
ALCHEMY_WS_URL = f"wss://base-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}"
ALCHEMY_HTTP_URL = f"https://base-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}"

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

# ================================================================
# PATHS
# ================================================================

BOT_DIR = Path(__file__).parent
PROJECT_DIR = BOT_DIR.parent
DATA_DIR = BOT_DIR / "data"
DB_PATH = DATA_DIR / "bot_state.db"

# Source CSVs for scorer
PRIMITIVKA_CSV = PROJECT_DIR / "primitivka_scored_combined.csv"
NEW_WALLETS_CSV = PROJECT_DIR / "new_wallets_batch_2026-02-24.csv"
SMART_MONEY_TOP_CSV = PROJECT_DIR / "smart_money_top.csv"
COMBINED_WATCHLIST_CSV = DATA_DIR / "combined_watchlist.csv"

# ================================================================
# BASE CHAIN CONSTANTS
# ================================================================

CHAIN_ID = 8453  # Base mainnet
BLOCK_TIME_SEC = 2  # ~2 seconds per block on Base

# Well-known tokens (lowercase)
WETH = "0x4200000000000000000000000000000000000006"
USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
DAI = "0x50c5725949a6f0c72e6c4a641f24049a917db0cb"
USDbC = "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca"

MONEY_TOKENS = {WETH, USDC, DAI, USDbC}

# ERC-20 Transfer event topic
TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

# ================================================================
# EXCLUDED CONTRACTS — infrastructure, NOT real traders
# ================================================================

EXCLUDED_CONTRACTS = {
    # Original 9 from full scan
    "0x63d2dfea64b3433f4071a98665bcd7ca14d93496",  # Uniswap V4 Pool Manager
    "0x498581ff718922c3f8e6a244956af099b2652b2b",  # Clanker LP Locker Fee Converter
    "0xf3622742b1e446d92e45e22923ef11c2fcd55d68",  # Contract (784K buys)
    "0xe85a59c628f7d27878aceb4bf3b35733630083a9",  # Contract (0 buys / 155 sells)
    "0xf5c4f3dc02c3fb9279495a8fef7b0741da956157",  # Contract (20K buys)
    "0x5aafc1f252d544f744d17a4e734afd6efc47ede4",  # Contract (40K buys)
    "0xad01c20d5886137e056775af56915de824c8fce5",  # Contract (25K buys)
    "0xfa00a9ed787f3793db668bff3e6e6e7db0f92a1b",  # Contract (1971 buys)
    "0x4f82e73edb06d29ff62c91ec8f5ff06571bdeb29",  # Contract (10K buys)
    # Routers discovered in HOTFIX audit
    "0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae",  # LiFi Diamond
    "0x9bb15abecf1648f2a8b8e50a2c148f6800c5e327",  # Banana Gun Router
    "0x00000000009726632680fb29d3f7a9734e3010e2",  # Relay.link
    "0x88ecfb411a0cc8bb14d67701f87908b0b321208b",  # Maestro Router
    "0x6131b5fae19ea4f9d964eac0408e4408b66337b5",  # Kyber Aggregator
}

# DEX router addresses (for tx matching — we look at from/to)
DEX_ROUTERS = {
    "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad",  # Uniswap Universal Router
    "0x2626664c2603336e57b271c5c0b26f421741e481",  # Uniswap V3 Router
    "0x6131b5fae19ea4f9d964eac0408e4408b66337b5",  # Kyber Aggregator
}

# ================================================================
# SIGNAL THRESHOLDS — v1 (won backtest)
# ================================================================

SIGNAL_CONFIG = {
    "SINGLE_T1": {
        "min_t1": 1,
        "min_total": 1,
        "mult": 0.0,  # alert only, no auto-trade
        "description": "1 T1 wallet bought new token (alert only)",
    },
    "CONSENSUS_T1": {
        "min_t1": 2,
        "min_total": 2,
        "mult": 0.7,
        "description": "2+ T1 wallets bought same token",
    },
    "CONSENSUS_MIXED": {
        "min_t1": 1,
        "min_total": 3,
        "mult": 1.0,
        "description": "1+ T1 and 3+ total bought same token",
    },
    "STRONG": {
        "min_t1": 3,
        "min_total": 3,
        "mult": 1.5,
        "description": "3+ T1 bought — strongest signal",
    },
}

CONSENSUS_WINDOW_SEC = 300  # 5 minute sliding window
BASE_POSITION_USD = 200
ETH_PRICE_USD = 2700  # approximate, for display

# ================================================================
# SCORING THRESHOLDS
# ================================================================

# Type classification
BOT_TRADES_THRESHOLD = 1000
HEAVY_INVESTED_THRESHOLD = 100  # ETH

# Minimum activity for T1: wallets with < this buys/day stay in T2
MIN_T1_BUYS_PER_DAY = 2

# ================================================================
# TELEGRAM RATE LIMITING
# ================================================================

TELEGRAM_MAX_MESSAGES_PER_MIN = 20
TELEGRAM_RATE_WINDOW_SEC = 60

# ================================================================
# MONITOR SETTINGS
# ================================================================

WS_RECONNECT_MIN_SEC = 1
WS_RECONNECT_MAX_SEC = 60
CLEANUP_INTERVAL_SEC = 60
STALE_WINDOW_SEC = CONSENSUS_WINDOW_SEC * 2  # 10 min
