"""
Synthesis Node — Aggregates all agent outputs and generates
a hyper-personalized advisory report.

Includes Vietnamese PIT (Personal Income Tax) tier calculations.
"""

import json
import os

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


def synthesizer_node(state: AdvisoryState) -> dict:
    """Node: Synthesize all agent data into advisory report.

    Calls Gemini to generate a personalized advisory report.
    Falls back to template if no API key is configured.
    """
    from utils.llm import generate

    redacted = state.get("redacted_profile", {})
    real_estate = state.get("real_estate", {})
    market_intel = state.get("market_intel", {})
    gold = state.get("gold", {})
    open_finance = state.get("open_finance", {})

    # Calculate total net worth
    casa = redacted.get("casa_balance", 0)
    property_value = real_estate.get("estimated_value_vnd", 0)
    gold_value = gold.get("gold_value_vnd", 0)
    external_balance = open_finance.get("total_external_balance", 0)
    total_net_worth = casa + property_value + gold_value + external_balance

    # Tax calculation (mock annual income = 10% of net worth)
    estimated_annual_income = total_net_worth * 0.10
    tax_calc = calculate_pit(estimated_annual_income)

    # Try LLM-generated report first
    prompt = _build_synthesis_prompt(redacted, real_estate, market_intel, gold, open_finance, tax_calc)
    llm_report = generate(
        prompt,
        system="You are a senior financial advisor at one of Vietnam's largest banks. Generate a COMPREHENSIVE and DETAILED personalized investment advisory report. Use markdown with tables, specific figures, and in-depth analysis. The report must cover: net worth overview, real estate valuation, investment recommendations (bonds, stocks, gold), PIT tax implications, macro indicators, and risk factors. Target 900-1200 words. Ensure the response ends cleanly with complete sentences and properly closed markdown structures (parentheses, tables, lists, headings). All monetary values in VND.",
        temperature=0.5,
        max_tokens=8192,
    )

    if llm_report:
        report = llm_report
    else:
        report = _generate_template_report(
            redacted, real_estate, market_intel, gold, open_finance, tax_calc, total_net_worth
        )

    return {
        "advisory_report": report,
        "tax_calculation": tax_calc,
    }


def _build_synthesis_prompt(redacted, real_estate, market_intel, gold, open_finance, tax_calc) -> str:
    """Build the prompt for LLM synthesis."""
    return f"""Based on the following aggregated data, generate a personalized investment advisory report for a Vietnamese bank client.

## Client Profile (anonymized)
{json.dumps(redacted, ensure_ascii=False, indent=2)}

## Real Estate Valuation
{json.dumps(real_estate, ensure_ascii=False, indent=2)}

## Market Intelligence
{json.dumps(market_intel, ensure_ascii=False, indent=2)}

## Gold SJC Data
{json.dumps(gold, ensure_ascii=False, indent=2)}

## External Accounts (Open Finance)
{json.dumps(open_finance, ensure_ascii=False, indent=2)}

## Estimated PIT (Personal Income Tax)
{json.dumps(tax_calc, ensure_ascii=False, indent=2)}

Please provide:
1. Net worth overview with asset allocation table
2. Real estate valuation analysis
3. Specific investment recommendations (bonds, stocks, gold) aligned with client's risk profile
4. PIT tax considerations
5. Macro environment analysis
6. Key risks and mitigation strategies

Use professional tone, specific data points, and tailor recommendations to the client's risk appetite."""


def _format_vnd(amount: float) -> str:
    """Format number as Vietnamese currency."""
    if amount >= 1_000_000_000:
        return f"{amount / 1_000_000_000:,.1f}B VND"
    if amount >= 1_000_000:
        return f"{amount / 1_000_000:,.0f}M VND"
    return f"{amount:,.0f} VND"


def _generate_template_report(redacted, real_estate, market_intel, gold, open_finance, tax_calc, total_net_worth) -> str:
    """Generate a template-based advisory report (fallback when no API key)."""
    risk = redacted.get("risk_profile", "moderate")
    risk_label = {"conservative": "Conservative", "moderate": "Moderate", "aggressive": "Aggressive"}.get(risk, risk)

    bonds = market_intel.get("recommended_bonds", [])
    stocks = market_intel.get("recommended_stocks", [])
    macro = market_intel.get("macro_indicators", {})

    bonds_section = "\n".join(
        f"  - **{b['issuer']}**: Coupon {b['coupon_rate']}%, maturity {b['maturity']}, "
        f"rating {b['credit_score']}, min investment {_format_vnd(b['min_investment_vnd'])}"
        for b in bonds
    )

    stocks_section = "\n".join(
        f"  - **{s['ticker']}** ({s['name']}): P/E {s['pe_ratio']}, "
        f"dividend {s['dividend_yield_pct']}%, sector {s['sector']}"
        for s in stocks
    )

    external_accs = open_finance.get("external_accounts", [])
    accounts_section = "\n".join(
        f"  - {a['bank']} ({a['account_type']}): {_format_vnd(a['balance_vnd'])}"
        for a in external_accs
    )

    # Asset allocation
    casa = redacted.get("casa_balance", 0)
    prop_val = real_estate.get("estimated_value_vnd", 0)
    gold_val = gold.get("gold_value_vnd", 0)
    ext_bal = open_finance.get("total_external_balance", 0)

    report = f"""# PERSONALIZED INVESTMENT ADVISORY REPORT

**Client ID:** {redacted.get('client_id', 'N/A')}
**Risk Profile:** {risk_label}
**District:** {redacted.get('district', 'N/A')}

---

## 1. NET WORTH OVERVIEW

| Asset Class | Value | Weight |
|---|---|---|
| CASA Deposits | {_format_vnd(casa)} | {casa/total_net_worth*100:.1f}% |
| Real Estate | {_format_vnd(prop_val)} | {prop_val/total_net_worth*100:.1f}% |
| Gold SJC ({gold.get('gold_holdings_tael', 0)} tael) | {_format_vnd(gold_val)} | {gold_val/total_net_worth*100:.1f}% |
| External Accounts | {_format_vnd(ext_bal)} | {ext_bal/total_net_worth*100:.1f}% |
| **TOTAL** | **{_format_vnd(total_net_worth)}** | **100%** |

## 2. REAL ESTATE VALUATION

- District: {real_estate.get('district', 'N/A')}
- Type: {real_estate.get('property_type', 'N/A')}
- Area: {real_estate.get('area_sqm', 0)} sqm
- Alley Width: {real_estate.get('alley_width_m', 0)}m
- **Estimated Value: {_format_vnd(prop_val)}**
- Source: {real_estate.get('valuation_source', 'N/A')}

## 3. INVESTMENT RECOMMENDATIONS

### Corporate Bonds
{bonds_section}

### Equities
{stocks_section}

### Gold SJC
- Buy Price: {_format_vnd(gold.get('sjc_buy_price', 0))}/tael
- Sell Price: {_format_vnd(gold.get('sjc_sell_price', 0))}/tael
- Current Holdings: {gold.get('gold_holdings_tael', 0)} tael = {_format_vnd(gold_val)}

## 4. EXTERNAL ACCOUNTS (Open Finance)
{accounts_section}
- **Total:** {_format_vnd(ext_bal)}

## 5. ESTIMATED PIT (Personal Income Tax)

- Estimated Annual Income: {_format_vnd(tax_calc.get('annual_income_vnd', 0))}
- Estimated PIT: {_format_vnd(tax_calc.get('total_tax_vnd', 0))}
- Effective Tax Rate: {tax_calc.get('effective_rate_pct', 0)}%

## 6. MACRO INDICATORS

- GDP Growth: {macro.get('gdp_growth_pct', 0)}%
- Inflation: {macro.get('inflation_pct', 0)}%
- SBV Interest Rate: {macro.get('sbv_interest_rate_pct', 0)}%
- VN-Index: {macro.get('vnindex', 0):,}
- USD/VND Rate: {macro.get('vnd_usd_rate', 0):,}

---
*Report generated by Viet-Advisory Orchestrator. This is a reference document, not official investment advice.
All investment decisions must be reviewed and approved by the Relationship Manager.*
"""
    return report
