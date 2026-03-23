"""
Real Estate Agent — Property valuation from data/real_estate.json.
Implements the "Alleyway Paradox" solution with district + alley width factors.
"""

import json
from pathlib import Path

from models.state import AdvisoryState, RealEstateData

_DATA_PATH = Path(__file__).parent.parent / "data" / "real_estate.json"


def _load_data() -> dict:
    with open(_DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def real_estate_agent(state: AdvisoryState) -> dict:
    """Node: Valuate property using Citics AVM simulation."""
    redacted = state.get("redacted_profile", {})
    district = redacted.get("district", "Unknown")
    area_sqm = redacted.get("property_area_sqm", 75.0)
    property_type = redacted.get("property_type", "Nha pho hem 3-6m")

    data = _load_data()
    districts = data.get("districts", {})
    alley_factors = data.get("alley_width_factors", {})

    # Look up district data
    district_data = districts.get(district, districts.get("1"))  # Default to Q1
    if not district_data:
        district_data = list(districts.values())[0]

    base_price = district_data["avg_price_per_sqm"]
    district_name = district_data["name"]

    # Find property type multiplier
    multiplier = 0.55  # default hem nho
    for prop in district_data.get("properties", []):
        if prop["type"].lower() == property_type.lower():
            multiplier = prop["multiplier"]
            break

    # Estimate alley width from property type
    alley_width = 4.0
    if "mat tien" in property_type.lower():
        alley_width = 10.0
    elif "hem 6m" in property_type.lower():
        alley_width = 7.0
    elif "hem 3-6m" in property_type.lower() or "hem 3" in property_type.lower():
        alley_width = 4.0
    elif "hem duoi 3m" in property_type.lower() or "hem 2" in property_type.lower():
        alley_width = 2.5

    estimated_value = base_price * area_sqm * multiplier

    result: RealEstateData = {
        "district": district,
        "district_name": district_name,
        "alley_width_m": alley_width,
        "estimated_value_vnd": estimated_value,
        "property_type": property_type,
        "area_sqm": area_sqm,
        "price_per_sqm": base_price * multiplier,
        "trend": district_data.get("trend", "stable"),
        "trend_pct": district_data.get("trend_pct", 0),
        "valuation_source": data.get("valuation_source", "Citics AVM (simulated)"),
    }

    return {"real_estate": result}
