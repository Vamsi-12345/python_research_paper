"""
server.py
---------

FastAPI backend for the Adaptive Tool-Use Agent project.

This file connects the HTML/CSS/JavaScript frontend
to the existing Python experiment implementation.

It does NOT replace the existing agents.

Flow:

    Browser
        |
        v
    FastAPI
        |
        v
    Agent A / Agent B
        |
        v
    Existing Python modules
        |
        v
    JSON response
"""

from contextlib import contextmanager
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import tools

from agent_baseline import BaselineAgent
from agent_recovery import RecoveryAgent
from evaluator import Evaluator
from failures import FailureInjector, FailureType
from graph import build_default_graph
from search import SearchEngine
from tasks import get_all_tasks


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Adaptive Tool-Use Agent API",
    description="Backend API for the failure-aware tool-use experiment.",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================
#
# This allows the frontend to communicate with FastAPI
# during local development.
#

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# CONFIGURATION
# ============================================================

FAILURE_WRONG_VALUE = "tuna"


EXPERIMENT_CONFIG = {

    "T001": {
        "inject_failure": True,
        "failure_tool": "get_refund_status",
        "failure_type": FailureType.IMPLICIT_FAILURE,
    },

    "T002": {
        "inject_failure": False,
        "failure_tool": None,
        "failure_type": None,
    },

    "T003": {
        "inject_failure": True,
        "failure_tool": "get_refund_status",
        "failure_type": FailureType.IMPLICIT_FAILURE,
    },

    "T004": {
        "inject_failure": True,
        "failure_tool": "get_refund_status",
        "failure_type": FailureType.IMPLICIT_FAILURE,
    },

    "T005": {
        "inject_failure": False,
        "failure_tool": None,
        "failure_type": None,
    },
}


# ============================================================
# REQUEST MODELS
# ============================================================

class RunRequest(BaseModel):
    task_id: str
    agent: str


# ============================================================
# TEMPORARY FAILURE
# ============================================================

@contextmanager
def temporarily_wrong_tool(
    module,
    attr_name: str,
    wrong_value: object,
):
    """
    Temporarily make the first call to a selected tool
    return a suspicious value.

    This is used only for Agent A because Agent A does
    not use FailureInjector.
    """

    original_func = getattr(module, attr_name)

    call_count = 0

    def wrong_result(*args, **kwargs):

        nonlocal call_count

        call_count += 1

        if call_count == 1:
            return wrong_value

        return original_func(*args, **kwargs)

    setattr(module, attr_name, wrong_result)

    try:
        yield

    finally:
        setattr(module, attr_name, original_func)


# ============================================================
# TASK HELPERS
# ============================================================

def get_task(task_id: str):

    for task in get_all_tasks():

        if task.task_id == task_id:
            return task

    return None


def get_config(task_id: str) -> Dict[str, Any]:

    return EXPERIMENT_CONFIG.get(
        task_id,
        {
            "inject_failure": False,
            "failure_tool": None,
            "failure_type": None,
        },
    )


# ============================================================
# SERIALIZATION
# ============================================================

def serialize_task(task) -> Dict[str, Any]:

    config = get_config(task.task_id)

    return {
        "task_id": task.task_id,
        "initial_state": task.initial_state,
        "target_state": task.target_state,
        "required_min_steps": task.required_min_steps,
        "inject_failure": config["inject_failure"],
        "failure_tool": config["failure_tool"],
        "failure_type": (
            config["failure_type"].value
            if config["failure_type"] is not None
            else None
        ),
    }


def serialize_result(result: Dict[str, Any]) -> Dict[str, Any]:

    return {
        key: value
        for key, value in result.items()
    }


# ============================================================
# RUN AGENT A
# ============================================================

def run_agent_a(task) -> Dict[str, Any]:

    config = get_config(task.task_id)

    graph = build_default_graph()

    agent = BaselineAgent(
        graph=graph
    )

    inject_failure = config["inject_failure"]
    failure_tool = config["failure_tool"]

    if inject_failure:

        with temporarily_wrong_tool(
            tools,
            failure_tool,
            FAILURE_WRONG_VALUE,
        ):

            result = agent.run(task)

    else:

        result = agent.run(task)

    return serialize_result(result)


# ============================================================
# RUN AGENT B
# ============================================================

def run_agent_b(task) -> Dict[str, Any]:

    config = get_config(task.task_id)

    graph = build_default_graph()

    injector = FailureInjector()

    injector.enable()

    if config["inject_failure"]:

        injector.inject(
            config["failure_tool"],
            config["failure_type"],
            wrong_value=FAILURE_WRONG_VALUE,
            once=True,
        )

    agent = RecoveryAgent(
        graph=graph,
        failure_injector=injector,
    )

    result = agent.run(task)

    return serialize_result(result)


# ============================================================
# HEALTH ENDPOINT
# ============================================================

@app.get("/api/health")
def health():

    return {
        "status": "ok",
        "service": "Adaptive Tool-Use Agent API",
    }


# ============================================================
# TASKS ENDPOINT
# ============================================================

@app.get("/api/tasks")
def tasks_endpoint():

    tasks = get_all_tasks()

    return {
        "tasks": [
            serialize_task(task)
            for task in tasks
        ]
    }


# ============================================================
# RUN ONE AGENT
# ============================================================

@app.post("/api/run")
def run_agent(request: RunRequest):

    task = get_task(request.task_id)

    if task is None:

        raise HTTPException(
            status_code=404,
            detail=f"Unknown task: {request.task_id}",
        )

    agent_name = request.agent.upper()

    if agent_name == "A":

        result = run_agent_a(task)

    elif agent_name == "B":

        result = run_agent_b(task)

    else:

        raise HTTPException(
            status_code=400,
            detail="Agent must be 'A' or 'B'.",
        )

    return {
        "success": True,
        "task": serialize_task(task),
        "agent": f"Agent {agent_name}",
        "result": result,
    }


# ============================================================
# RUN ALL TASKS
# ============================================================

@app.post("/api/run-all")
def run_all():

    tasks = get_all_tasks()

    evaluator = Evaluator()

    results = []

    for task in tasks:

        result_a = run_agent_a(task)

        result_b = run_agent_b(task)

        evaluator.add_result(
            f"{task.task_id} - Agent A",
            result_a,
        )

        evaluator.add_result(
            f"{task.task_id} - Agent B",
            result_b,
        )

        results.append(
            {
                "task_id": task.task_id,
                "agent_a": result_a,
                "agent_b": result_b,
            }
        )

    # --------------------------------------------------------
    # Calculate aggregate metrics
    # --------------------------------------------------------

    metrics = evaluator.compare()

    return {
        "success": True,
        "results": results,
        "metrics": metrics,
    }


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
def root():

    return {
        "message": "Adaptive Tool-Use Agent API is running.",
        "docs": "/docs",
        "health": "/api/health",
    }


# ============================================================
# RUN SERVER DIRECTLY
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "server:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )
