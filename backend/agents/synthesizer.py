"""
Synthesis Node — Aggregates all agent outputs and generates
a hyper-personalized advisory report in Vietnamese.

Includes Vietnamese PIT (Personal Income Tax) tier calculations.
"""

import json

from models.state import AdvisoryState

# Vietnam PIT tiers (annual income in VND)
_PIT_TIERS = [
    (60_000_000, 0.05),
    (120_000_000, 0.10),
    (216_000_000, 0.15),
    (384_000_000, 0.20),
    (624_000_000, 0.25),
    (960_000_000, 0.30),
    (float("inf"), 0.35),
]

_RISK_VN = {"conservative": "Thận trọng", "moderate": "Cân bằng", "aggressive": "Mạo hiểm"}


def calculate_pit(annual_income_vnd: float) -> dict:
    """Calculate Vietnamese Personal Income Tax."""
    remaining = annual_income_vnd
    total_tax = 0.0
    prev_threshold = 0
    breakdown = []

    for threshold, rate in _PIT_TIERS:
        tier_amount = min(remaining, threshold - prev_threshold)
        if tier_amount <= 0:
            break
        tax = tier_amount * rate
        total_tax += tax
        breakdown.append({"range": f"{prev_threshold:,.0f} - {threshold:,.0f}", "rate": rate, "tax_vnd": tax})
        remaining -= tier_amount
        prev_threshold = threshold

    return {
        "annual_income_vnd": annual_income_vnd,
        "total_tax_vnd": total_tax,
        "effective_rate_pct": round(total_tax / annual_income_vnd * 100, 2) if annual_income_vnd > 0 else 0,
        "breakdown": breakdown,
    }


def _format_vnd(amount: float) -> str:
    """Format number as Vietnamese currency."""
    if amount >= 1_000_000_000:
        return f"{amount / 1_000_000_000:,.2f} tỷ VND"
    if amount >= 1_000_000:
        return f"{amount / 1_000_000:,.0f} triệu VND"
    return f"{amount:,.0f} VND"


def synthesizer_node(state: AdvisoryState) -> dict:
    """Node: Synthesize all agent data into a Vietnamese advisory report."""
    from utils.llm import generate

    redacted = state.get("redacted_profile", {})
    real_estate = state.get("real_estate", {})
    market_intel = state.get("market_intel", {})
    gold = state.get("gold", {})
    open_finance = state.get("open_finance", {})

    casa = redacted.get("casa_balance", 0)
    property_value = real_estate.get("estimated_value_vnd", 0)
    gold_value = gold.get("gold_value_vnd", 0)
    external_balance = open_finance.get("total_external_balance", 0)
    total_net_worth = casa + property_value + gold_value + external_balance

    monthly_income = redacted.get("monthly_income", 0)
    estimated_annual_income = (monthly_income * 12) if monthly_income > 0 else (total_net_worth * 0.10)
    tax_calc = calculate_pit(estimated_annual_income)

    prompt = _build_synthesis_prompt(redacted, real_estate, market_intel, gold, open_finance, tax_calc, total_net_worth)
    llm_report = generate(
        prompt,
        system=(
            "Bạn là chuyên gia tư vấn tài chính cao cấp tại một ngân hàng lớn ở Việt Nam. "
            "Hãy tạo báo cáo tư vấn đầu tư cá nhân hóa, chi tiết, dùng markdown với bảng và số liệu cụ thể. "
            "Báo cáo phải bao gồm: tổng quan tài sản ròng, định giá bất động sản, khuyến nghị đầu tư "
            "(trái phiếu, cổ phiếu, vàng), tác động thuế TNCN, bối cảnh vĩ mô và rủi ro. "
            "Độ dài mục tiêu 900–1200 từ. Luôn kết thúc trọn ý, đóng đầy đủ bảng/danh sách/tiêu đề markdown. "
            "Viết hoàn toàn bằng tiếng Việt có dấu. Tất cả giá trị tiền tệ dùng đơn vị VND."
        ),
        temperature=0.5,
        max_tokens=8192,
    )

    report = llm_report if llm_report else _generate_template_report(
        redacted, real_estate, market_intel, gold, open_finance, tax_calc, total_net_worth
    )

    return {"advisory_report": report, "tax_calculation": tax_calc}


def _build_synthesis_prompt(redacted, real_estate, market_intel, gold, open_finance, tax_calc, total_net_worth) -> str:
    risk_vn = _RISK_VN.get(redacted.get("risk_profile", "moderate"), "Cân bằng")
    return f"""Dựa trên dữ liệu tổng hợp dưới đây, hãy tạo báo cáo tư vấn đầu tư cá nhân hóa cho khách hàng ngân hàng Việt Nam.

## Hồ sơ khách hàng (đã ẩn danh)
- Mã khách hàng: {redacted.get('client_id', 'N/A')}
- Khẩu vị rủi ro: {risk_vn}
- Khu vực: Quận {redacted.get('district', 'N/A')}
- Số dư CASA: {_format_vnd(redacted.get('casa_balance', 0))}
- Thu nhập hàng tháng: {_format_vnd(redacted.get('monthly_income', 0))}
- Nghề nghiệp: {redacted.get('occupation', 'N/A')}
- Khoản vay hiện tại: {_format_vnd(redacted.get('existing_loans', 0))}
- Mục tiêu đầu tư: {redacted.get('investment_goals', 'N/A')}

## Định giá bất động sản (Citics AVM)
{json.dumps(real_estate, ensure_ascii=False, indent=2)}

## Thông tin thị trường (FiinGroup/SSI)
{json.dumps(market_intel, ensure_ascii=False, indent=2)}

## Vàng SJC
{json.dumps(gold, ensure_ascii=False, indent=2)}

## Tài khoản bên ngoài (Open Finance)
{json.dumps(open_finance, ensure_ascii=False, indent=2)}

## Thuế TNCN ước tính
- Thu nhập năm ước tính: {_format_vnd(tax_calc.get('annual_income_vnd', 0))}
- Thuế TNCN ước tính: {_format_vnd(tax_calc.get('total_tax_vnd', 0))}
- Thuế suất hiệu quả: {tax_calc.get('effective_rate_pct', 0)}%

## Tổng tài sản ròng ước tính: {_format_vnd(total_net_worth)}

Hãy tạo báo cáo tư vấn đầu tư hoàn chỉnh bằng tiếng Việt bao gồm:
1. Tổng quan tài sản ròng (bảng phân bổ có tỷ trọng %)
2. Phân tích định giá bất động sản và xu hướng thị trường khu vực
3. Khuyến nghị đầu tư cụ thể (trái phiếu, cổ phiếu, vàng) phù hợp khẩu vị "{risk_vn}"
4. Lưu ý thuế TNCN và cơ hội tối ưu thuế
5. Bối cảnh kinh tế vĩ mô và tác động đến danh mục
6. Các rủi ro cần lưu ý và chiến lược phòng ngừa

Giọng văn chuyên nghiệp, số liệu cụ thể, phù hợp khẩu vị "{risk_vn}"."""


def _generate_template_report(redacted, real_estate, market_intel, gold, open_finance, tax_calc, total_net_worth) -> str:
    """Tạo báo cáo mẫu tiếng Việt (fallback khi không có API key)."""
    risk = redacted.get("risk_profile", "moderate")
    risk_vn = _RISK_VN.get(risk, risk)

    bonds = market_intel.get("recommended_bonds", [])
    stocks = market_intel.get("recommended_stocks", [])
    macro = market_intel.get("macro_indicators", {})
    reasoning = market_intel.get("investment_reasoning", "")

    bonds_section = "\n".join(
        f"  - **{b['issuer']}**: Lãi suất {b['coupon_rate']}%/năm, đáo hạn {b['maturity']}, "
        f"xếp hạng {b['credit_score']}, tối thiểu {_format_vnd(b['min_investment_vnd'])}"
        for b in bonds
    ) or "  *(Không có đề xuất trái phiếu)*"

    stocks_section = "\n".join(
        f"  - **{s['ticker']}** ({s['name']}): P/E {s['pe_ratio']}, "
        f"tỷ suất cổ tức {s['dividend_yield_pct']}%, ngành {s['sector']}"
        for s in stocks
    ) or "  *(Không có đề xuất cổ phiếu)*"

    accounts_section = "\n".join(
        f"  - {a['bank']} ({a['account_type']}): {_format_vnd(a['balance_vnd'])}"
        for a in open_finance.get("external_accounts", [])
    ) or "  *(Không tìm thấy tài khoản bên ngoài)*"

    casa = redacted.get("casa_balance", 0)
    prop_val = real_estate.get("estimated_value_vnd", 0)
    gold_val = gold.get("gold_value_vnd", 0)
    ext_bal = open_finance.get("total_external_balance", 0)

    def pct(val):
        return f"{val / total_net_worth * 100:.1f}%" if total_net_worth > 0 else "N/A"

    reasoning_block = f"\n> **Phân tích AI:** {reasoning}\n" if reasoning else ""

    return f"""# BÁO CÁO TƯ VẤN ĐẦU TƯ CÁ NHÂN

**Mã khách hàng:** `{redacted.get('client_id', 'N/A')}`
**Khẩu vị rủi ro:** {risk_vn}
**Khu vực:** Quận {redacted.get('district', 'N/A')}

---

## 1. TỔNG QUAN TÀI SẢN RÒNG

| Loại tài sản | Giá trị | Tỷ trọng |
|---|---|---|
| Tiền gửi CASA | {_format_vnd(casa)} | {pct(casa)} |
| Bất động sản | {_format_vnd(prop_val)} | {pct(prop_val)} |
| Vàng SJC ({gold.get('gold_holdings_tael', 0)} lượng) | {_format_vnd(gold_val)} | {pct(gold_val)} |
| Tài khoản bên ngoài | {_format_vnd(ext_bal)} | {pct(ext_bal)} |
| **TỔNG TÀI SẢN RÒNG** | **{_format_vnd(total_net_worth)}** | **100%** |

## 2. ĐỊNH GIÁ BẤT ĐỘNG SẢN

- **Khu vực:** {real_estate.get('district_name', f"Quận {real_estate.get('district', 'N/A')}")}
- **Loại hình:** {real_estate.get('property_type', 'N/A')}
- **Diện tích:** {real_estate.get('area_sqm', 0)} m²  — **Độ rộng hẻm:** {real_estate.get('alley_width_m', 0)}m
- **Đơn giá:** {_format_vnd(real_estate.get('price_per_sqm', 0))}/m²
- **Giá trị ước tính: {_format_vnd(prop_val)}**
- **Xu hướng:** {real_estate.get('trend', 'stable')} ({real_estate.get('trend_pct', 0):+.1f}%/năm)
- **Nguồn:** {real_estate.get('valuation_source', 'Citics AVM (mô phỏng)')}

## 3. KHUYẾN NGHỊ ĐẦU TƯ
{reasoning_block}
### Trái phiếu doanh nghiệp
{bonds_section}

### Cổ phiếu
{stocks_section}

### Vàng SJC
- **Giá mua vào:** {_format_vnd(gold.get('sjc_buy_price', 0))}/lượng
- **Giá bán ra:** {_format_vnd(gold.get('sjc_sell_price', 0))}/lượng
- **Nắm giữ hiện tại:** {gold.get('gold_holdings_tael', 0)} lượng = **{_format_vnd(gold_val)}**
- **Xu hướng:** {gold.get('trend', 'N/A')}

## 4. TÀI KHOẢN BÊN NGOÀI (Open Finance)
{accounts_section}
- **Tổng:** {_format_vnd(ext_bal)}

## 5. THUẾ THU NHẬP CÁ NHÂN (TNCN) ƯỚC TÍNH

- **Thu nhập năm ước tính:** {_format_vnd(tax_calc.get('annual_income_vnd', 0))}
- **Thuế TNCN ước tính:** {_format_vnd(tax_calc.get('total_tax_vnd', 0))}
- **Thuế suất hiệu quả:** {tax_calc.get('effective_rate_pct', 0)}%

## 6. CHỈ SỐ KINH TẾ VĨ MÔ

| Chỉ số | Giá trị |
|---|---|
| Tăng trưởng GDP | {macro.get('gdp_growth_pct', 0)}% |
| Lạm phát | {macro.get('inflation_pct', 0)}% |
| Lãi suất NHNN | {macro.get('sbv_interest_rate_pct', 0)}% |
| VN-Index | {macro.get('vnindex', 0):,} điểm |
| Tỷ giá USD/VND | {macro.get('vnd_usd_rate', 0):,} |

---
*Báo cáo được tạo bởi Viet-Advisory Orchestrator. Đây là tài liệu tham khảo, không phải lời khuyên đầu tư chính thức.
Mọi quyết định đầu tư cần được Chuyên viên QHKH xem xét và phê duyệt.*
"""
