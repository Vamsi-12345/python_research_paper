"""
evaluator.py
-------------
Evaluator: compares execution records produced by Agent A
(agent_baseline.BaselineAgent) and Agent B
(agent_recovery.RecoveryAgent) using five metrics:

  1. Task Accuracy        = successful tasks / total tasks
  2. Recovery Rate         = recovered failed tasks / failed tasks
                             where recovery was possible
  3. Average Steps/Turns   = total tool calls / total tasks
  4. Invalid Call Rate     = invalid tool calls / total tool calls
  5. Wasted-Effort Ratio   = unnecessary or failed tool calls /
                             total tool calls

The Evaluator does not run agents, plan paths, execute tools, inject
failures, or attempt recovery itself -- it only reads the plain
dict-shaped execution records the agents already return (see
BaselineAgent.run() / RecoveryAgent.run()) and derives metrics from
whatever fields are actually present in them. Every number reported
comes from data handed to it via add_result()/add_results(); nothing
is hard-coded or assumed ahead of time.

Field handling
--------------
Agent A's records have: task_id, executed_tools, states_reached,
tool_call_count, final_state, success.

Agent B's records have all of the above plus: failures (a list of
{state, tool_name, category, reason}), recovery_attempts, backtracks,
candidate_path.

Because Agent A has no per-call failure classification, some metrics
fall back to a conservative approximation when the richer "failures"/
"backtracks" fields are absent:

  - A task is considered to have "had a failure" if its record lists
    explicit failures (Agent B), or -- lacking that field -- if the
    task ended unsuccessfully after at least one tool call was made
    (Agent A). This only detects failures Agent A's own record keeps
    evidence of; if a tool call raised before Agent A even logged it,
    it cannot be recovered from the record and is not invented here.
  - "Invalid tool calls", absent explicit failure data, uses the same
    signal: an unsuccessful run with at least one recorded call is
    counted as exactly one invalid call (the one that stopped it),
    matching how BaselineAgent halts immediately on the first problem.
  - "Wasted/unnecessary calls" uses `backtracks` directly when present
    (each backtrack corresponds to one call whose result was discarded,
    whether from a failure or from a dead-end progress step), and
    otherwise falls back to the same value as invalid calls, since
    Agent A never backtracks.
"""

from typing import Any, Dict, List


class Evaluator:
    """Collects per-agent execution records and computes comparison metrics."""

    def __init__(self):
        self._results: Dict[str, List[Dict[str, Any]]] = {}

    # ------------------------------------------------------------------
    # Ingesting execution results
    # ------------------------------------------------------------------

    def add_result(self, agent_name: str, record: Dict[str, Any]) -> None:
        """Add a single execution record (as returned by an agent's run())."""
        self._results.setdefault(agent_name, []).append(record)

    def add_results(self, agent_name: str, records: List[Dict[str, Any]]) -> None:
        """Add several execution records at once."""
        self._results.setdefault(agent_name, []).extend(records)

    # ------------------------------------------------------------------
    # Per-record helpers (safe on both Agent A and Agent B schemas)
    # ------------------------------------------------------------------

    @staticmethod
    def _had_failure(record: Dict[str, Any]) -> bool:
        if "failures" in record:
            return len(record["failures"]) > 0
        return (not record.get("success", False)) and record.get("tool_call_count", 0) > 0

    @staticmethod
    def _invalid_call_count(record: Dict[str, Any]) -> int:
        if "failures" in record:
            return sum(
                1
                for f in record["failures"]
                if f.get("category") in ("EXPLICIT_FAILURE", "IMPLICIT_FAILURE")
            )
        if (not record.get("success", False)) and record.get("tool_call_count", 0) > 0:
            return 1
        return 0

    @staticmethod
    def _wasted_call_count(record: Dict[str, Any]) -> int:
        if "backtracks" in record:
            return record["backtracks"]
        return Evaluator._invalid_call_count(record)

    # ------------------------------------------------------------------
    # Metric calculation
    # ------------------------------------------------------------------

    def compute_metrics(self, agent_name: str) -> Dict[str, float]:
        """Compute all five metrics for one agent's collected records."""
        records = self._results.get(agent_name, [])
        total_tasks = len(records)

        if total_tasks == 0:
            return {
                "total_tasks": 0,
                "total_tool_calls": 0,
                "task_accuracy": 0.0,
                "recovery_rate": 0.0,
                "average_steps": 0.0,
                "invalid_call_rate": 0.0,
                "wasted_effort_ratio": 0.0,
            }

        successful_tasks = sum(1 for r in records if r.get("success", False))
        total_tool_calls = sum(r.get("tool_call_count", 0) for r in records)

        failed_with_recovery_possible = sum(1 for r in records if self._had_failure(r))
        recovered_tasks = sum(
            1 for r in records if self._had_failure(r) and r.get("success", False)
        )

        invalid_calls = sum(self._invalid_call_count(r) for r in records)
        wasted_calls = sum(self._wasted_call_count(r) for r in records)

        return {
            "total_tasks": total_tasks,
            "total_tool_calls": total_tool_calls,
            "task_accuracy": self._safe_divide(successful_tasks, total_tasks),
            "recovery_rate": self._safe_divide(recovered_tasks, failed_with_recovery_possible),
            "average_steps": self._safe_divide(total_tool_calls, total_tasks),
            "invalid_call_rate": self._safe_divide(invalid_calls, total_tool_calls),
            "wasted_effort_ratio": self._safe_divide(wasted_calls, total_tool_calls),
        }

    def compare(self) -> Dict[str, Dict[str, float]]:
        """Compute metrics for every agent that has recorded results."""
        return {agent_name: self.compute_metrics(agent_name) for agent_name in self._results}

    @staticmethod
    def _safe_divide(numerator: float, denominator: float) -> float:
        return numerator / denominator if denominator else 0.0

    # ------------------------------------------------------------------
    # Reporting
    # ------------------------------------------------------------------

    def print_comparison_table(self) -> None:
        """Print a simple, readable side-by-side comparison of all agents."""
        all_metrics = self.compare()
        if not all_metrics:
            print("No results recorded yet.")
            return

        agent_names = list(all_metrics.keys())
        rows = [
            ("Total tasks", "total_tasks", "{:d}"),
            ("Total tool calls", "total_tool_calls", "{:d}"),
            ("Task Accuracy", "task_accuracy", "{:.2%}"),
            ("Recovery Rate", "recovery_rate", "{:.2%}"),
            ("Average Steps/Turns", "average_steps", "{:.2f}"),
            ("Invalid Call Rate", "invalid_call_rate", "{:.2%}"),
            ("Wasted-Effort Ratio", "wasted_effort_ratio", "{:.2%}"),
        ]

        label_width = max(len(label) for label, _, _ in rows) + 2
        col_width = max(max(len(name) for name in agent_names) + 2, 12)

        header = " " * label_width + "".join(name.center(col_width) for name in agent_names)
        print(header)
        print("-" * len(header))

        for label, key, fmt in rows:
            line = label.ljust(label_width)
            for name in agent_names:
                value = all_metrics[name][key]
                cell = fmt.format(value) if not isinstance(value, int) or "d" in fmt else fmt.format(value)
                line += cell.center(col_width)
            print(line)


# ---------------------------------------------------------------------------
# Example usage: run the real agents on a few tasks and evaluate them.
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    from agent_baseline import BaselineAgent
    from agent_recovery import RecoveryAgent
    from task import Task

    tasks = [
        Task("task_user1", {"user_id": "user_1"}, "refund_status", 5),
        Task("task_user2", {"user_id": "user_2"}, "refund_status", 5),
        Task("task_bad_user", {"user_id": "U101"}, "refund_status", 5),
    ]

    baseline_agent = BaselineAgent()
    recovery_agent = RecoveryAgent()

    evaluator = Evaluator()
    for task in tasks:
        evaluator.add_result("Agent A (baseline)", baseline_agent.run(task))
        evaluator.add_result("Agent B (recovery)", recovery_agent.run(task))

    evaluator.print_comparison_table()