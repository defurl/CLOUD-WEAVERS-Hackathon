"""
Viet-Advisory Orchestrator — LangGraph DAG

Flow:
  START -> smart_paste_parser -> pii_redactor -> gatekeeper
    -> [INTERRUPT: RM confirms profile + compliance results]
    -> fan-out: real_estate | market_intel | gold_sjc | open_finance
    -> [INTERRUPT: RM reviews agent results, can edit]
    -> synthesizer
    -> [INTERRUPT: RM reviews final report]
    -> END
"""

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import interrupt

from models.state import AdvisoryState, ComplianceStatus
from agents.smart_paste import parse_smart_paste
from agents.gatekeeper import gatekeeper_check
from agents.real_estate import real_estate_agent
from agents.market_intel import market_intel_agent
from agents.gold_sjc import gold_sjc_agent
from agents.open_finance import open_finance_agent
from agents.synthesizer import synthesizer_node
from utils.pii_redactor import redact_pii


# --- Human-in-the-loop checkpoint nodes ---

def rm_confirm_profile(state: AdvisoryState) -> dict:
    """Checkpoint 1: RM reviews profile + compliance + redacted data."""
    profile = state.get("client_profile", {})
    redacted = state.get("redacted_profile", {})
    compliance = state.get("compliance_status", "")
    reason = state.get("compliance_reason", "")
    detail = state.get("compliance_detail", {})

    answer = interrupt({
        "type": "confirm_profile",
        "message": "Review client profile, PII redaction results, and compliance check before proceeding.",
        "client_profile": profile,
        "redacted_profile": redacted,
        "compliance_status": compliance,
        "compliance_reason": reason,
        "compliance_detail": detail,
    })

    if answer.get("approved"):
        return {"rm_approved_profile": True}
    else:
        return {
            "rm_approved_profile": False,
            "errors": [f"RM rejected profile: {answer.get('reason', 'No reason')}"],
        }


def rm_review_agents(state: AdvisoryState) -> dict:
    """Checkpoint 2: RM reviews all agent results before synthesis."""
    answer = interrupt({
        "type": "review_agents",
        "message": "Review data collected by all agents. You can proceed or request changes.",
        "real_estate": state.get("real_estate", {}),
        "market_intel": state.get("market_intel", {}),
        "gold": state.get("gold", {}),
        "open_finance": state.get("open_finance", {}),
    })

    if answer.get("approved"):
        return {}
    else:
        return {
            "errors": [f"RM flagged agent data: {answer.get('reason', '')}"],
        }


def rm_review_report(state: AdvisoryState) -> dict:
    """Checkpoint 3: RM reviews final advisory report."""
    report = state.get("advisory_report", "")

    answer = interrupt({
        "type": "review_report",
        "message": "Review the final advisory report before sending to the client.",
        "advisory_report": report,
    })

    if answer.get("approved"):
        return {"rm_approved_report": True}
    else:
        return {
            "rm_approved_report": False,
            "errors": [f"RM rejected report: {answer.get('reason', 'No reason')}"],
        }


# --- Routing ---

def route_after_gatekeeper(state: AdvisoryState) -> str:
    if state.get("compliance_status") == ComplianceStatus.FAILED:
        return END
    # PASSED or WARNING both go to RM review
    return "rm_confirm_profile"


def route_after_profile_confirm(state: AdvisoryState):
    if not state.get("rm_approved_profile"):
        return END
    return ["real_estate_agent", "market_intel_agent", "gold_sjc_agent", "open_finance_agent"]


def route_after_report_review(state: AdvisoryState) -> str:
    return END


# --- Build the graph ---

def build_graph():
    builder = StateGraph(AdvisoryState)

    # Nodes
    builder.add_node("smart_paste_parser", parse_smart_paste)
    builder.add_node("pii_redactor", redact_pii)
    builder.add_node("gatekeeper", gatekeeper_check)
    builder.add_node("rm_confirm_profile", rm_confirm_profile)
    builder.add_node("real_estate_agent", real_estate_agent)
    builder.add_node("market_intel_agent", market_intel_agent)
    builder.add_node("gold_sjc_agent", gold_sjc_agent)
    builder.add_node("open_finance_agent", open_finance_agent)
    builder.add_node("rm_review_agents", rm_review_agents)
    builder.add_node("synthesizer", synthesizer_node)
    builder.add_node("rm_review_report", rm_review_report)

    # Sequential: START -> parse -> redact -> gatekeeper
    builder.add_edge(START, "smart_paste_parser")
    builder.add_edge("smart_paste_parser", "pii_redactor")
    builder.add_edge("pii_redactor", "gatekeeper")

    # Gatekeeper -> FAIL=END, PASS/WARN=rm_confirm
    builder.add_conditional_edges("gatekeeper", route_after_gatekeeper)

    # RM confirm -> fan-out or END
    builder.add_conditional_edges("rm_confirm_profile", route_after_profile_confirm)

    # Fan-in: 4 agents -> rm_review_agents
    builder.add_edge("real_estate_agent", "rm_review_agents")
    builder.add_edge("market_intel_agent", "rm_review_agents")
    builder.add_edge("gold_sjc_agent", "rm_review_agents")
    builder.add_edge("open_finance_agent", "rm_review_agents")

    # Agent review -> synthesizer -> report review -> END
    builder.add_edge("rm_review_agents", "synthesizer")
    builder.add_edge("synthesizer", "rm_review_report")
    builder.add_conditional_edges("rm_review_report", route_after_report_review)

    checkpointer = InMemorySaver()
    graph = builder.compile(checkpointer=checkpointer)
    return graph


advisory_graph = build_graph()
