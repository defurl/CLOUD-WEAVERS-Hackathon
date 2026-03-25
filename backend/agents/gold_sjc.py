import json
from pathlib import Path

from models.state import AdvisoryState, GoldData

_DATA_PATH = Path(__file__).parent.parent / "data" / "gold.json"


def _load_data() -> dict:
    with open(_DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def gold_sjc_agent(state: AdvisoryState) -> dict:
    """Node: Fetch SJC gold price and calculate holdings value."""
    redacted = state.get("redacted_profile", {})
    gold_tael = redacted.get("gold_holdings_tael", 0.0)

    data = _load_data()
    sjc = data.get("sjc", {})

    buy_price = sjc.get("buy_price", 92500000)
    sell_price = sjc.get("sell_price", 94500000)

    result: GoldData = {
        "sjc_buy_price": buy_price,
        "sjc_sell_price": sell_price,
        "gold_holdings_tael": gold_tael,
        "gold_value_vnd": gold_tael * sell_price,
        "world_price_usd": data.get("world_gold_usd_oz", 0),
        "premium_pct": data.get("premium_pct", 0),
        "trend": data.get("trend", "stable"),
        "trend_note": data.get("trend_note", ""),
    }

    return {"gold": result}
