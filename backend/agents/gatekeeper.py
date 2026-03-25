import json
from pathlib import Path

from models.state import AdvisoryState, ComplianceStatus, ComplianceDetail

_DATA_PATH = Path(__file__).parent.parent / "data" / "aml_blacklist.json"


def _load_aml_data() -> dict:
    with open(_DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def gatekeeper_check(state: AdvisoryState) -> dict:
    """Node: Run AML/KYC + bad debt + PEP screening."""
    profile = state.get("client_profile", {})
    data = _load_aml_data()

    client_name = profile.get("name", "").lower().strip()
    client_id = profile.get("id_number", "").strip()

    detail: ComplianceDetail = {
        "aml_check": "passed",
        "bad_debt_check": "passed",
        "pep_check": "passed",
        "bad_debt_info": None,
    }

    # AML blacklist check
    if client_id in data.get("blacklisted_ids", []):
        detail["aml_check"] = "FAILED"
        return {
            "compliance_status": ComplianceStatus.FAILED,
            "compliance_reason": f"HALT: CCCD {client_id} nằm trong danh sách đen AML. Không được phép tiếp tục.",
            "compliance_detail": detail,
        }

    if client_name in [n.lower() for n in data.get("blacklisted_names", [])]:
        detail["aml_check"] = "FAILED"
        return {
            "compliance_status": ComplianceStatus.FAILED,
            "compliance_reason": "HALT: Tên khách hàng bị đánh dấu trong hệ thống AML screening.",
            "compliance_detail": detail,
        }

    # Bad debt check (CIC)
    bad_debt = data.get("bad_debt_clients", {}).get(client_id)
    if bad_debt:
        detail["bad_debt_check"] = f"WARNING - Nhom {bad_debt['group']}"
        detail["bad_debt_info"] = bad_debt

        if int(bad_debt["group"]) >= 5:
            return {
                "compliance_status": ComplianceStatus.WARNING,
                "compliance_reason": (
                    f"CẢNH BÁO: Khách hàng có nợ xấu nhóm {bad_debt['group']}. "
                    f"Lý do: {bad_debt['reason']}. "
                    "Cần Enhanced Due Diligence. RM cần xác nhận để tiếp tục."
                ),
                "compliance_detail": detail,
            }
        else:
            return {
                "compliance_status": ComplianceStatus.WARNING,
                "compliance_reason": (
                    f"CẢNH BÁO: Khách hàng có lịch sử nợ nhóm {bad_debt['group']}. "
                    f"Lý do: {bad_debt['reason']}. RM cần lưu ý."
                ),
                "compliance_detail": detail,
            }

    # PEP check
    for pep in data.get("pep_list", []):
        if pep["name"].lower() == client_name:
            detail["pep_check"] = f"WARNING - {pep['role']}"
            return {
                "compliance_status": ComplianceStatus.WARNING,
                "compliance_reason": (
                    "CẢNH BÁO: Khách hàng là Politically Exposed Person (PEP). "
                    f"{pep.get('note', '')}. RM cần xác nhận."
                ),
                "compliance_detail": detail,
            }

    # Basic validation
    if not client_name:
        return {
            "compliance_status": ComplianceStatus.FAILED,
            "compliance_reason": "Thiếu tên khách hàng - không thể thực hiện kiểm tra AML/KYC.",
            "compliance_detail": detail,
        }

    return {
        "compliance_status": ComplianceStatus.PASSED,
        "compliance_reason": "Khách hàng PASSED tất cả kiểm tra AML/KYC, CIC, PEP.",
        "compliance_detail": detail,
    }
