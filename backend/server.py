"""
FastAPI server for the Viet-Advisory Orchestrator.

Endpoints:
  POST /api/advisory/start-form  — Start advisory from structured form
  POST /api/advisory/approve     — RM approves/rejects at checkpoint
  GET  /api/advisory/state/:id   — Get current session state
  GET  /api/advisory/scenarios   — Get available demo scenarios
"""

import json
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langgraph.types import Command
from pydantic import BaseModel

from graph import advisory_graph
import uvicorn

_SCENARIOS_PATH = Path(__file__).parent / "data" / "scenarios.json"


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Viet-Advisory Orchestrator", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request/Response models ---

class StartFormRequest(BaseModel):
    name: str
    phone: str = ""
    id_number: str = ""
    address: str = ""
    casa_balance: float = 0
    risk_profile: str = "moderate"
    investment_goals: str = ""
    monthly_income: float = 0
    occupation: str = ""
    existing_loans: float = 0
    property_area_sqm: float = 0
    property_type: str = ""
    gold_holdings_tael: float = 0


class StartResponse(BaseModel):
    session_id: str
    state: dict
    interrupted: bool
    interrupt_data: dict | None = None


class ApproveRequest(BaseModel):
    session_id: str
    approved: bool
    reason: str = ""


class ApproveResponse(BaseModel):
    state: dict
    interrupted: bool
    interrupt_data: dict | None = None
    completed: bool


class StateResponse(BaseModel):
    state: dict
    interrupted: bool
    interrupt_data: dict | None = None
    completed: bool


# --- Helpers ---

def _extract_interrupt(session_id: str) -> dict | None:
    config = {"configurable": {"thread_id": session_id}}
    graph_state = advisory_graph.get_state(config)
    if graph_state.next:
        for task in graph_state.tasks:
            if hasattr(task, "interrupts") and task.interrupts:
                return task.interrupts[0].value
    return None


def _is_completed(session_id: str) -> bool:
    config = {"configurable": {"thread_id": session_id}}
    graph_state = advisory_graph.get_state(config)
    return len(graph_state.next) == 0


# --- Endpoints ---

@app.get("/api/advisory/scenarios")
async def get_scenarios():
    with open(_SCENARIOS_PATH, encoding="utf-8") as f:
        return json.load(f)


@app.post("/api/advisory/start-form", response_model=StartResponse)
async def start_advisory_form(req: StartFormRequest):
    """Start a new advisory session from structured form data."""
    session_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": session_id}}

    client_profile = req.model_dump()

    result = advisory_graph.invoke(
        {"raw_paste": "", "client_profile": client_profile, "errors": []},
        config,
    )

    interrupt_data = _extract_interrupt(session_id)

    return StartResponse(
        session_id=session_id,
        state=result,
        interrupted=interrupt_data is not None,
        interrupt_data=interrupt_data,
    )


@app.post("/api/advisory/approve", response_model=ApproveResponse)
async def approve_checkpoint(req: ApproveRequest):
    """RM approves or rejects at a human-in-the-loop checkpoint."""
    config = {"configurable": {"thread_id": req.session_id}}

    graph_state = advisory_graph.get_state(config)
    if not graph_state.next:
        raise HTTPException(status_code=400, detail="Session is not waiting for approval")

    result = advisory_graph.invoke(
        Command(resume={"approved": req.approved, "reason": req.reason}),
        config,
    )

    interrupt_data = _extract_interrupt(req.session_id)
    completed = _is_completed(req.session_id)

    return ApproveResponse(
        state=result,
        interrupted=interrupt_data is not None,
        interrupt_data=interrupt_data,
        completed=completed,
    )


@app.get("/api/advisory/state/{session_id}", response_model=StateResponse)
async def get_session_state(session_id: str):
    config = {"configurable": {"thread_id": session_id}}

    try:
        graph_state = advisory_graph.get_state(config)
    except Exception:
        raise HTTPException(status_code=404, detail="Session not found")

    interrupt_data = _extract_interrupt(session_id)
    completed = len(graph_state.next) == 0

    return StateResponse(
        state=graph_state.values,
        interrupted=interrupt_data is not None,
        interrupt_data=interrupt_data,
        completed=completed,
    )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
