"""
Smart Paste Parser — parses unstructured clipboard text from RM's legacy CRM
into a structured ClientProfile.

For prototype: uses regex-based extraction.
Production: would use Claude to parse freeform text.
"""

import re
from models.state import AdvisoryState, ClientProfile


def parse_smart_paste(state: AdvisoryState) -> dict:
    """Node: Parse raw clipboard paste into structured client profile.
    If client_profile is already provided (from form input), skip parsing.
    """
    # Skip if profile already provided via form
    existing = state.get("client_profile")
    if existing and existing.get("name"):
        return {}

    raw = state.get("raw_paste", "")
    if not raw.strip():
        return {"errors": ["Smart Paste: No input text provided"]}

    profile = _extract_profile(raw)
    return {
        "client_profile": profile,
    }


def _extract_profile(text: str) -> ClientProfile:
    """Extract client info from unstructured CRM text."""
    profile: ClientProfile = {}

    # Name
    name_match = re.search(r"(?:Họ tên|Ho ten|Tên|Ten|Name|Client)[:\s]+([^\n,]+)", text, re.IGNORECASE)
    if name_match:
        profile["name"] = name_match.group(1).strip()

    # Phone
    phone_match = re.search(r"(?:SĐT|SDT|Phone|Điện thoại|Dien thoai|Tel)[:\s]+([\d\s\-\.]+)", text, re.IGNORECASE)
    if phone_match:
        profile["phone"] = phone_match.group(1).strip()

    # ID number (CCCD/CMND)
    id_match = re.search(r"(?:CCCD|CMND|ID|Số CMND|So CMND)[:\s]+([\d]+)", text, re.IGNORECASE)
    if id_match:
        profile["id_number"] = id_match.group(1).strip()

    # Address
    addr_match = re.search(r"(?:Địa chỉ|Dia chi|Address)[:\s]+([^\n]+)", text, re.IGNORECASE)
    if addr_match:
        profile["address"] = addr_match.group(1).strip()

    # CASA balance
    balance_match = re.search(r"(?:CASA|Số dư|So du|Balance)[:\s]+([\d\.,]+)", text, re.IGNORECASE)
    if balance_match:
        balance_str = balance_match.group(1).replace(",", "").replace(".", "")
        try:
            profile["casa_balance"] = float(balance_str)
        except ValueError:
            pass

    # Risk profile
    risk_match = re.search(
        r"(?:Risk|Rủi ro|Rui ro|Khẩu vị|Khau vi)[:\s]+(conservative|moderate|aggressive|thận trọng|can bang|cân bằng|mạo hiểm|mao hiem|than trong)",
        text,
        re.IGNORECASE,
    )
    if risk_match:
        risk_map = {
            "thận trọng": "conservative",
            "than trong": "conservative",
            "cân bằng": "moderate",
            "can bang": "moderate",
            "mạo hiểm": "aggressive",
            "mao hiem": "aggressive",
        }
        raw_risk = risk_match.group(1).strip().lower()
        profile["risk_profile"] = risk_map.get(raw_risk, raw_risk)

    # Investment goals
    goals_match = re.search(r"(?:Mục tiêu|Muc tieu|Goals?|Objective)[:\s]+([^\n]+)", text, re.IGNORECASE)
    if goals_match:
        profile["investment_goals"] = goals_match.group(1).strip()

    return profile
