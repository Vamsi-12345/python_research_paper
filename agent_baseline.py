"""
agent_baseline.py
------------------
Agent A: the conventional baseline agent.

BaselineAgent takes a Task, asks SearchEngine for a single tool-use
path over the ToolGraph, and then executes that path by calling the
real functions in tools.py (never touching the hidden database
directly). It keeps a plain execution record but has none of the
"smart" behaviors that later, failure-aware agents will add:

    NOT included here:
      - Trust Memory
      - result classifier
      - failure recovery
      - backtracking
      - alternative-path recovery
      - LLM usage
      - evaluation metrics

If a tool call raises an error or returns nothing useful, the agent
simply stops and reports failure -- it does not retry, does not try
another branch of the graph, and does not re-plan.
"""

from typing import Any, Dict, List, Optional

import tools
from graph import ToolGraph, build_default_graph
from search import SearchEngine
from task import Task


# ---------------------------------------------------------------------------
# Adapter layer: maps a graph edge (from_state, tool_name) to the matching
# tools.py function call. This is the only place that knows how graph
# states/tool names line up with the real tool functions.
# ---------------------------------------------------------------------------

def _execute_tool(from_state: str, tool_name: str, value: Any) -> Any:
    """
    Execute the real tools.py function corresponding to a single graph
    edge, given the current value held at `from_state`.

    Raises tools.ToolLookupError (or lets it propagate) on failure --
    the baseline agent does not catch/interpret it beyond stopping.
    """
    if from_state == "user_id":
        # user_id -> order_id (take the first order, no smart selection)
        orders = tools.get_orders_by_user(value)
        return orders[0] if orders else None

    if from_state == "order_id" and tool_name == "get_return_id":
        return tools.get_return_by_order(value)

    if from_state == "order_id" and tool_name == "get_transaction_id":
        return tools.get_transaction_by_order(value)

    if from_state == "return_id":
        return tools.get_refund_by_return(value)

    if from_state == "refund_id":
        return tools.get_refund_status(value)

    if from_state == "transaction_id":
        return tools.get_refund_status_by_transaction(value)

    raise ValueError(f"No tool adapter for edge ({from_state}, {tool_name})")


class BaselineAgent:
    """Agent A: plans once with forward DFS, executes the plan, stops on error."""

    def __init__(self, graph: Optional[ToolGraph] = None):
        self.graph = graph if graph is not None else build_default_graph()
        self.search_engine = SearchEngine(self.graph)

    def run(self, task: Task) -> Dict[str, Any]:
        """
        Plan a path for `task` and execute it tool-by-tool.

        Returns a record dict with:
            task_id, executed_tools, states_reached,
            tool_call_count, final_state, success
        """
        record: Dict[str, Any] = {
            "task_id": task.task_id,
            "executed_tools": [],
            "states_reached": [],
            "tool_call_count": 0,
            "final_state": None,
            "success": False,
        }

        # --- Plan -----------------------------------------------------
        start_state = next(iter(task.initial_state.keys()))
        path = self.search_engine.forward_dfs(task)

        if not path:
            record["final_state"] = {start_state: task.initial_state[start_state]}
            record["states_reached"].append(start_state)
            return record  # no plan found; stop, no recovery attempted

        # --- Execute ----------------------------------------------------
        current_state_name = start_state
        current_value = task.initial_state[start_state]
        record["states_reached"].append(current_state_name)

        for from_state, tool_name, to_state in path:
            try:
                next_value = _execute_tool(from_state, tool_name, current_value)
            except Exception:
                # Baseline behavior: stop immediately on any error, no recovery.
                break

            record["executed_tools"].append(tool_name)
            record["tool_call_count"] += 1

            if next_value is None:
                # Tool ran but produced nothing usable; stop here.
                break

            current_state_name = to_state
            current_value = next_value
            record["states_reached"].append(current_state_name)

        # --- Final bookkeeping -----------------------------------------
        final_state = {current_state_name: current_value}
        record["final_state"] = final_state
        record["success"] = task.is_goal_reached(final_state)

        return record


# ---------------------------------------------------------------------------
# Example usage
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    example_task = Task(
        task_id="task_001",
        initial_state={"user_id": "U101"},
        target_state="refund_status",
        required_min_steps=5,
    )

    agent = BaselineAgent()
    result = agent.run(example_task)

    for key, value in result.items():
        print(f"{key}: {value}")