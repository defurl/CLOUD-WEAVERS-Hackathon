from __future__ import annotations

import operator
from enum import Enum
from typing import Annotated, Any, TypedDict


class ComplianceStatus(str, Enum):
    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"


class ClientProfile(TypedDict, total=False):
    name: str
    phone: str
    address: str
    id_number: str
    casa_balance: float
    risk_profile: str
    investment_goals: str
    monthly_income: float
    occupation: str
    existing_loans: float
    property_area_sqm: float
    property_type: str
    gold_holdings_tael: float


class RedactedProfile(TypedDict, total=False):
    client_id: str
    district: str
    risk_profile: str
    casa_balance: float
    investment_goals: str
    monthly_income: float
    occupation: str
    existing_loans: float
    property_area_sqm: float
    property_type: str
    gold_holdings_tael: float


class RealEstateData(TypedDict, total=False):
    district: str
    district_name: str
    alley_width_m: float
    estimated_value_vnd: float
    property_type: str
    area_sqm: float
    price_per_sqm: float
    trend: str
    trend_pct: float
    valuation_source: str


class MarketIntelData(TypedDict, total=False):
    recommended_bonds: list[dict[str, Any]]
    recommended_stocks: list[dict[str, Any]]
    macro_indicators: dict[str, Any]
    investment_reasoning: str


class GoldData(TypedDict, total=False):
    sjc_buy_price: float
    sjc_sell_price: float
    gold_holdings_tael: float
    gold_value_vnd: float
    world_price_usd: float
    premium_pct: float
    trend: str
    trend_note: str


class OpenFinanceData(TypedDict, total=False):
    external_accounts: list[dict[str, Any]]
    total_external_balance: float
    source: str


class ComplianceDetail(TypedDict, total=False):
    aml_check: str
    bad_debt_check: str
    bad_debt_info: dict[str, Any] | None
    pep_check: str


class AdvisoryState(TypedDict, total=False):
    # Input
    raw_paste: str

    # Parsed & Privacy
    client_profile: ClientProfile
    redacted_profile: RedactedProfile

    # Compliance
    compliance_status: ComplianceStatus
    compliance_reason: str
    compliance_detail: ComplianceDetail

    # Human-in-the-loop
    rm_approved_profile: bool
    rm_approved_report: bool

    # Agent outputs
    real_estate: RealEstateData
    market_intel: MarketIntelData
    gold: GoldData
    open_finance: OpenFinanceData

    # Synthesis
    advisory_report: str
    tax_calculation: dict[str, Any]

    # Metadata
    errors: Annotated[list[str], operator.add]
