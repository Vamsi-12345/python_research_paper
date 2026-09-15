"""
trust_memory.py
-----------------
TrustMemory for Agent B: a simple per-tool memory that tracks how
reliable and how useful each tool has been across the run.

For every tool it keeps three things:

  1. reliability       - success_count / total_calls
                          (how often the tool worked, ever, no recency weighting)
  2. failure_history    - a running list/count of the failures recorded
                          for that tool
  3. progress_potential - accumulated "how much progress" the tool has
                          contributed, normalized by total_calls

From (1) and (3) it derives two scores:

  trust_score    = reliability                 (0.0 - 1.0)
  progress_score = progress_potential / calls   (0.0 - 1.0, roughly)
  combined_score = trust_score + progress_score

TrustMemory only records observations and reports scores. It does not
decide what to do with those scores (no action ranking), does not try
to fix a failing tool (no recovery), does no path search (no DFS),
calls no LLM, and computes no run-level evaluation metrics. It also
deliberately ignores *when* an observation happened -- every success
and failure counts equally regardless of order, so there is no
recency weighting anywhere in this module.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class ToolTrustRecord:
    """Raw counters kept for a single tool."""
    total_calls: int = 0
    success_count: int = 0
    failure_count: int = 0
    failure_history: List[str] = field(default_factory=list)
    progress_potential: float = 0.0  # accumulated progress weight


class TrustMemory:
    """Maintains a ToolTrustRecord per tool and derives trust/progress scores."""

    # Score assumed for a tool that has never been called (neutral prior).
    DEFAULT_SCORE = 0.5

    def __init__(self):
        self._records: Dict[str, ToolTrustRecord] = {}

    # ------------------------------------------------------------------
    # Internal helper
    # ------------------------------------------------------------------

    def _get_or_create(self, tool_name: str) -> ToolTrustRecord:
        if tool_name not in self._records:
            self._records[tool_name] = ToolTrustRecord()
        return self._records[tool_name]

    # ------------------------------------------------------------------
    # Recording
    # ------------------------------------------------------------------

    def record_progress(self, tool_name: str, weight: float = 1.0) -> None:
        """
        Record that a call to `tool_name` succeeded and moved the agent
        toward the goal. `weight` lets a caller note how much progress
        this particular result represented (defaults to a full step).
        """
        record = self._get_or_create(tool_name)
        record.total_calls += 1
        record.success_count += 1
        record.progress_potential += weight

    def record_failure(self, tool_name: str, failure_type: str = "UNKNOWN") -> None:
        """
        Record that a call to `tool_name` failed. `failure_type` is a
        free-form label (e.g. "EXPLICIT_FAILURE", "IMPLICIT_FAILURE",
        "NON_PROGRESS") stored in the tool's failure_history.
        """
        record = self._get_or_create(tool_name)
        record.total_calls += 1
        record.failure_count += 1
        record.failure_history.append(failure_type)

    # ------------------------------------------------------------------
    # Retrieval
    # ------------------------------------------------------------------

    def get_trust_info(self, tool_name: str) -> Dict[str, Any]:
        """Return a plain-dict snapshot of everything known about a tool."""
        record = self._records.get(tool_name)
        if record is None:
            return {
                "tool_name": tool_name,
                "total_calls": 0,
                "success_count": 0,
                "failure_count": 0,
                "failure_history": [],
                "progress_potential": 0.0,
                "trust_score": self.DEFAULT_SCORE,
                "progress_score": 0.0,
                "combined_score": self.DEFAULT_SCORE,
            }
        return {
            "tool_name": tool_name,
            "total_calls": record.total_calls,
            "success_count": record.success_count,
            "failure_count": record.failure_count,
            "failure_history": list(record.failure_history),
            "progress_potential": record.progress_potential,
            "trust_score": self.calculate_trust_score(tool_name),
            "progress_score": self.calculate_progress_score(tool_name),
            "combined_score": self.get_combined_score(tool_name),
        }

    # ------------------------------------------------------------------
    # Scoring
    # ------------------------------------------------------------------

    def calculate_trust_score(self, tool_name: str) -> float:
        """
        Reliability: fraction of all recorded calls that were successes.
        A tool with no history yet gets a neutral default score rather
        than 0, so it isn't unfairly penalized before it's been tried.
        """
        record = self._records.get(tool_name)
        if record is None or record.total_calls == 0:
            return self.DEFAULT_SCORE
        return record.success_count / record.total_calls

    def calculate_progress_score(self, tool_name: str) -> float:
        """
        How useful the tool has been for moving toward the goal,
        normalized by how many times it has been called.
        """
        record = self._records.get(tool_name)
        if record is None or record.total_calls == 0:
            return 0.0
        return record.progress_potential / record.total_calls

    def get_combined_score(self, tool_name: str) -> float:
        """Combined Score = Trust Score + Progress Score."""
        return self.calculate_trust_score(tool_name) + self.calculate_progress_score(tool_name)

    # ------------------------------------------------------------------
    # Misc
    # ------------------------------------------------------------------

    def known_tools(self) -> List[str]:
        """Return the names of every tool with at least one recorded call."""
        return list(self._records.keys())


# ---------------------------------------------------------------------------
# Example usage
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    memory = TrustMemory()

    # get_order_id: reliable and always makes progress
    memory.record_progress("get_order_id")
    memory.record_progress("get_order_id")
    memory.record_progress("get_order_id")

    # get_refund_status: mostly good, one implicit failure along the way
    memory.record_progress("get_refund_status")
    memory.record_progress("get_refund_status")
    memory.record_failure("get_refund_status", failure_type="IMPLICIT_FAILURE")

    # get_order_status: technically works, but never contributes progress
    # toward refund_status (recorded as failures of type NON_PROGRESS)
    memory.record_failure("get_order_status", failure_type="NON_PROGRESS")
    memory.record_failure("get_order_status", failure_type="NON_PROGRESS")

    for tool in ["get_order_id", "get_refund_status", "get_order_status", "get_transaction_id"]:
        info = memory.get_trust_info(tool)
        print(f"{tool}:")
        print(f"  total_calls      = {info['total_calls']}")
        print(f"  success_count    = {info['success_count']}")
        print(f"  failure_history  = {info['failure_history']}")
        print(f"  trust_score      = {info['trust_score']:.2f}")
        print(f"  progress_score   = {info['progress_score']:.2f}")
        print(f"  combined_score   = {info['combined_score']:.2f}")
        print()