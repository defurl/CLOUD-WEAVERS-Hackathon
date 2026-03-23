"""
Market Intelligence Agent — Reads from data/market.json.
Returns bonds, stocks recommendations based on risk profile + macro data.
Uses LLM to generate investment reasoning when available.
"""

import json
from pathlib import Path

from models.state import AdvisoryState, MarketIntelData

_DATA_PATH = Path(__file__).parent.parent / "data" / "market.json"


def _load_data() -> dict:
    with open(_DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def _generate_reasoning(risk_profile: str, bonds: list, stocks: list, macro: dict) -> str | None:
    """Use LLM to explain why these instruments match the client's risk profile."""
    from utils.llm import generate

    prompt = f"""Given a client with risk profile "{risk_profile}", the following market data, and macro indicators, provide a brief investment reasoning (3-5 sentences).

Macro indicators: {json.dumps(macro, ensure_ascii=False)}
Recommended bonds: {json.dumps(bonds, ensure_ascii=False)}
Recommended stocks: {json.dumps(stocks, ensure_ascii=False)}

Explain WHY these specific bonds and stocks are suitable for this risk profile. Be specific about numbers and rates. Keep it concise."""

    return generate(prompt, temperature=0.4, max_tokens=500)


def market_intel_agent(state: AdvisoryState) -> dict:
    """Node: Fetch market intelligence from FiinGroup + SSI (simulated)."""
    redacted = state.get("redacted_profile", {})
    risk_profile = redacted.get("risk_profile", "moderate")

    data = _load_data()

    bonds = data.get("bonds", {}).get(risk_profile, data["bonds"]["moderate"])
    stocks = data.get("stocks", {}).get(risk_profile, data["stocks"]["moderate"])
    macro = data.get("macro", {})

    reasoning = _generate_reasoning(risk_profile, bonds, stocks, macro)

    result: MarketIntelData = {
        "recommended_bonds": bonds,
        "recommended_stocks": stocks,
        "macro_indicators": macro,
    }

    if reasoning:
        result["investment_reasoning"] = reasoning

    return {"market_intel": result}
