"""
agent_recovery.py
-------------------
Agent B: RecoveryAgent.

Combines SearchEngine, FailureInjector, ResultClassifier, and
TrustMemory to walk the ToolGraph from a Task's initial state to its
target state, and to genuinely recover (backtrack + try an
alternative tool/path) when a step fails, rather than just stopping
like Agent A (agent_baseline.py) does.

High-level flow
----------------
1. Ask SearchEngine for a candidate path (forward_dfs) -- this is used
   only as a *preference* for which tool to try first at each state,
   not as a rigid script.
2. Walk the graph state by state. At each state, look at every
   available outgoing edge (tool), ordered by: (a) whether it matches
   the candidate plan, then (b) TrustMemory's combined score.
3. Execute the chosen tool through the FailureInjector (so the same
   tools.py functions run, but a configured failure can be substituted
   in).
4. Classify the raw result with ResultClassifier:
     PROGRESS         -> accept the new state, update TrustMemory,
                          recurse forward from the new state.
     EXPLICIT_FAILURE  -> reject the result, record the failure,
                          blacklist that (state, tool) edge, try the
                          next candidate edge from the same state.
     IMPLICIT_FAILURE  -> same handling as EXPLICIT_FAILURE.
     NON_PROGRESS      -> same handling (also blacklisted, so the
                          same unhelpful action is never retried).
5. If every edge from a state fails (or a deeper branch dead-ends),
   the agent backtracks to the previous state and tries that state's
   next alternative edge -- e.g. if A->B->C->D fails at C, it will
   retry from B and can succeed via A->B->X->Y->D.
6. A per-run tool-call budget and a visited-states-on-this-branch set
   prevent infinite loops / runaway retries.

This module does not implement evaluation metrics or an LLM, and does
not modify any of the existing project files.
"""

from typing import Any, Dict, List, Optional, Set, Tuple

from failures import FailureInjector
from graph import Edge, ToolGraph, build_default_graph
from result_classifier import ResultCategory, ResultClassifier
from search import SearchEngine
from task import Task
from trust_memory import TrustMemory

import tools


# ---------------------------------------------------------------------------
# Tool adapter: maps a graph edge (from_state, tool_name) to the matching
# tools.py function. Kept separate from FailureInjector so the injector
# stays generic; this is the only place that knows the graph <-> tools.py
# wiring (mirrors the adapter used by agent_baseline.py, duplicated here
# so this file has no dependency on agent_baseline.py).
# ---------------------------------------------------------------------------

def _real_tool_call(from_state: str, tool_name: str, value: Any) -> Any:
    if from_state == "user_id":
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


class RecoveryAgent:
    """Agent B: plans, executes, classifies, and recovers via backtracking."""

    def __init__(
        self,
        graph: Optional[ToolGraph] = None,
        failure_injector: Optional[FailureInjector] = None,
        classifier: Optional[ResultClassifier] = None,
        trust_memory: Optional[TrustMemory] = None,
        max_tool_calls: int = 25,
    ):
        self.graph = graph if graph is not None else build_default_graph()
        self.failure_injector = failure_injector if failure_injector is not None else FailureInjector()
        self.classifier = classifier if classifier is not None else ResultClassifier()
        self.trust_memory = trust_memory if trust_memory is not None else TrustMemory()
        self.max_tool_calls = max_tool_calls

        # Per-run state (reset in run()):
        self._blacklisted_edges: Set[Tuple[str, str]] = set()
        self._last_known_good: Tuple[str, Any] = ("", None)

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------

    def run(self, task: Task) -> Dict[str, Any]:
        record: Dict[str, Any] = {
            "task_id": task.task_id,
            "executed_tools": [],
            "states_reached": [],
            "failures": [],
            "recovery_attempts": 0,
            "tool_call_count": 0,
            "backtracks": 0,
            "final_state": None,
            "success": False,
        }

        self._blacklisted_edges = set()

        start_state = next(iter(task.initial_state.keys()))
        start_value = task.initial_state[start_state]
        record["states_reached"].append(start_state)
        self._last_known_good = (start_state, start_value)

        # Use SearchEngine to get a candidate plan; it is a *preference*,
        # not a hard requirement -- the walk below may deviate from it.
        search_engine = SearchEngine(self.graph)
        candidate_path = search_engine.forward_dfs(task)
        preferred_tool_by_state: Dict[str, str] = {}
        if candidate_path:
            for from_state, tool_name, _to_state in candidate_path:
                preferred_tool_by_state.setdefault(from_state, tool_name)
        record["candidate_path"] = candidate_path or []

        visited_on_branch: Set[str] = {start_state}

        self._walk(
            state=start_state,
            value=start_value,
            target=task.target_state,
            preferred_tool_by_state=preferred_tool_by_state,
            visited_on_branch=visited_on_branch,
            record=record,
        )

        if not record["final_state"]:
            last_state, last_value = self._last_known_good
            record["final_state"] = {last_state: last_value}

        record["success"] = task.is_goal_reached(record["final_state"])
        return record

    # ------------------------------------------------------------------
    # Recursive backtracking walk
    # ------------------------------------------------------------------

    def _walk(
        self,
        state: str,
        value: Any,
        target: str,
        preferred_tool_by_state: Dict[str, str],
        visited_on_branch: Set[str],
        record: Dict[str, Any],
    ) -> bool:
        if state == target:
            record["final_state"] = {state: value}
            self._last_known_good = (state, value)
            return True

        if record["tool_call_count"] >= self.max_tool_calls:
            return False  # budget exhausted; stop trying, let caller backtrack/give up

        edges = self._ordered_edges(state, preferred_tool_by_state)

        for edge in edges:
            edge_key = (state, edge.tool_name)
            if edge_key in self._blacklisted_edges:
                continue
            if edge.to_state in visited_on_branch:
                continue  # avoid revisiting a state already on this branch (cycle guard)
            if record["tool_call_count"] >= self.max_tool_calls:
                break

            result, error = self._call_tool(state, edge.tool_name, value)
            record["executed_tools"].append(edge.tool_name)
            record["tool_call_count"] += 1

            classification = self.classifier.classify(
                edge.tool_name, result, edge.to_state, error=error
            )

            if classification.category is ResultCategory.PROGRESS:
                self.trust_memory.record_progress(edge.tool_name)
                record["states_reached"].append(edge.to_state)
                self._last_known_good = (edge.to_state, result)
                visited_on_branch.add(edge.to_state)

                if self._walk(
                    edge.to_state,
                    result,
                    target,
                    preferred_tool_by_state,
                    visited_on_branch,
                    record,
                ):
                    return True

                # The deeper branch dead-ended even though this step was
                # progress -- back out of it and try a sibling edge.
                visited_on_branch.discard(edge.to_state)
                record["states_reached"].pop()
                record["backtracks"] += 1
                continue

            # EXPLICIT_FAILURE, IMPLICIT_FAILURE, or NON_PROGRESS: reject
            # the result, remember why, and never try this exact edge again.
            self.trust_memory.record_failure(edge.tool_name, classification.category.value)
            record["failures"].append(
                {
                    "state": state,
                    "tool_name": edge.tool_name,
                    "category": classification.category.value,
                    "reason": classification.reason,
                }
            )
            record["recovery_attempts"] += 1
            record["backtracks"] += 1
            self._blacklisted_edges.add(edge_key)
            continue  # try the next alternative edge from this same state

        return False  # no edge (tried or retried) reached the target from here

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _ordered_edges(
        self, state: str, preferred_tool_by_state: Dict[str, str]
    ) -> List[Edge]:
        """
        Rank the edges available from `state`: the candidate-plan's tool
        (if any) first, then by TrustMemory's combined score, highest first.
        """
        edges = self.graph.get_next_options(state)
        preferred_tool = preferred_tool_by_state.get(state)

        def sort_key(edge: Edge):
            is_preferred = edge.tool_name != preferred_tool  # False (0) sorts first
            trust_score = self.trust_memory.get_combined_score(edge.tool_name)
            return (is_preferred, -trust_score)

        return sorted(edges, key=sort_key)

    def _call_tool(self, from_state: str, tool_name: str, value: Any) -> Tuple[Any, Optional[BaseException]]:
        """Run a tool through the FailureInjector, capturing any exception instead of raising it."""
        real_func = lambda v: _real_tool_call(from_state, tool_name, v)
        try:
            result = self.failure_injector.execute(tool_name, real_func, value)
            return result, None
        except Exception as exc:  # noqa: BLE001 - we deliberately want to classify any error
            return None, exc


# ---------------------------------------------------------------------------
# Example usage
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    from failures import FailureType

    task = Task(
        task_id="task_recovery_demo",
        initial_state={"user_id": "user_1"},
        target_state="refund_status",
        required_min_steps=5,
    )

    print("== Run 1: no injected failures (should succeed via the normal path) ==")
    agent = RecoveryAgent()
    result = agent.run(task)
    for key, value in result.items():
        print(f"{key}: {value}")

    print("\n== Run 2: get_return_id is broken -> agent must recover via the alternative path ==")
    injector = FailureInjector()
    injector.enable()
    injector.inject("get_return_id", FailureType.EXPLICIT_FAILURE)

    agent_with_failure = RecoveryAgent(failure_injector=injector)
    result2 = agent_with_failure.run(task)
    for key, value in result2.items():
        print(f"{key}: {value}")