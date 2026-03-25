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

    prompt = f"""Với khách hàng có khẩu vị rủi ro "{risk_profile}", dựa trên dữ liệu thị trường và chỉ số vĩ mô sau, hãy đưa ra phần giải thích đầu tư ngắn gọn (3-5 câu).

Chỉ số vĩ mô: {json.dumps(macro, ensure_ascii=False)}
Trái phiếu đề xuất: {json.dumps(bonds, ensure_ascii=False)}
Cổ phiếu đề xuất: {json.dumps(stocks, ensure_ascii=False)}

Giải thích vì sao các mã trái phiếu và cổ phiếu này phù hợp. Nêu rõ số liệu/tỷ lệ quan trọng.
Viết hoàn toàn bằng tiếng Việt có dấu. Nếu gặp từ tiếng Việt không dấu (ví dụ: tiet kiem), hãy tự chuẩn hóa thành có dấu (tiết kiệm)."""

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
