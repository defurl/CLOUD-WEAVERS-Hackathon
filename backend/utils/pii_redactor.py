"""
PII Redaction Module — strips PII locally before sending to cloud LLM.
Extracts geospatial attributes while removing exact addresses and names.
"""

import hashlib
import re

from models.state import AdvisoryState, ClientProfile, RedactedProfile


def redact_pii(state: AdvisoryState) -> dict:
    """Node: Redact PII from client profile."""
    profile = state.get("client_profile", {})
    if not profile:
        return {"errors": ["PII Redactor: No client profile to redact"]}

    redacted = _build_redacted_profile(profile)
    return {"redacted_profile": redacted}


def _build_redacted_profile(profile: ClientProfile) -> RedactedProfile:
    id_source = f"{profile.get('name', '')}{profile.get('id_number', '')}"
    client_id = hashlib.sha256(id_source.encode()).hexdigest()[:12]

    district = _extract_district(profile.get("address", ""))

    redacted: RedactedProfile = {
        "client_id": client_id,
        "district": district,
        "risk_profile": profile.get("risk_profile", "moderate"),
        "casa_balance": profile.get("casa_balance", 0.0),
        "investment_goals": profile.get("investment_goals", ""),
        "monthly_income": profile.get("monthly_income", 0.0),
        "occupation": profile.get("occupation", ""),
        "existing_loans": profile.get("existing_loans", 0.0),
        "property_area_sqm": profile.get("property_area_sqm", 0.0),
        "property_type": profile.get("property_type", ""),
        "gold_holdings_tael": profile.get("gold_holdings_tael", 0.0),
    }
    return redacted


def _extract_district(address: str) -> str:
    if not address:
        return "1"  # Default Q1

    patterns = [
        r"(?:Quan|Q\.?)\s*(\d+|[A-Za-z\u00C0-\u1EF9\s]+?)(?:,|\s*$)",
        r"(?:District)\s*(\d+)",
        r"(?:Huyen|H\.)\s+([A-Za-z\u00C0-\u1EF9\s]+?)(?:,|\s*$)",
    ]
    for pattern in patterns:
        match = re.search(pattern, address, re.IGNORECASE)
        if match:
            return match.group(1).strip()

    return "1"
