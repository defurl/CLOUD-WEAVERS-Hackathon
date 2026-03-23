"""
Open Finance Agent — Reads from data/open_finance.json.
Simulates Brankas API fetching external account balances (Circular 64/2024).
"""

import json
from pathlib import Path

from models.state import AdvisoryState, OpenFinanceData

_DATA_PATH = Path(__file__).parent.parent / "data" / "open_finance.json"


def _load_data() -> dict:
    with open(_DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def open_finance_agent(state: AdvisoryState) -> dict:
    """Node: Fetch external account balances via Open Finance (simulated)."""
    profile = state.get("client_profile", {})
    client_id = profile.get("id_number", "")

    data = _load_data()
    accounts_map = data.get("mock_accounts", {})

    # Look up by client ID, fallback to default
    accounts = accounts_map.get(client_id, accounts_map.get("default", []))

    total = sum(acc.get("balance_vnd", 0) for acc in accounts)

    result: OpenFinanceData = {
        "external_accounts": accounts,
        "total_external_balance": total,
        "source": data.get("source", "Brankas API (simulated)"),
    }

    return {"open_finance": result}
