"""
result_classifier.py
---------------------
A standalone ResultClassifier that looks at a single tool execution
result and labels it as one of exactly four categories:

  1. PROGRESS          - a valid result of the expected type/shape,
                          moving the agent toward its target state.
  2. EXPLICIT_FAILURE   - the tool call raised an error, or the result
                          is itself an explicit error message.
  3. IMPLICIT_FAILURE   - the tool returned *something*, but it does
                          not look like a valid value of the expected
                          type at all (e.g. refund_status = "tuna").
  4. NON_PROGRESS       - the tool succeeded and returned a real,
                          valid-looking value, but for the *wrong*
                          field (e.g. an order_status value when a
                          refund_status was expected).

This module has no dependency on tools.py, task.py, graph.py,
search.py, agent_baseline.py, or failures.py -- it only inspects
whatever (tool_name, result, expected_state) it is handed. That keeps
it usable by any agent (Agent A today, Agent B later) without either
side needing to know about the other.

It is intentionally a pure classifier: it makes no decisions about
what to do next (no recovery), keeps no history of which tools have
been reliable (no Trust Memory), does no path search (no DFS), calls
no LLM, and computes no aggregate success/failure statistics (no
evaluation metrics).
"""

import re
from enum import Enum
from typing import Any, Callable, Dict, NamedTuple, Optional


class ResultCategory(Enum):
    PROGRESS = "PROGRESS"
    EXPLICIT_FAILURE = "EXPLICIT_FAILURE"
    IMPLICIT_FAILURE = "IMPLICIT_FAILURE"
    NON_PROGRESS = "NON_PROGRESS"


class ClassificationResult(NamedTuple):
    category: ResultCategory
    reason: str


class ResultClassifier:
    """
    Classifies a single tool result against the state it was expected
    to produce.

    STATE_VALIDATORS defines, per state name, what a plausible value
    for that state looks like. This is intentionally a light heuristic
    (prefix checks / whitelists) rather than anything that talks to
    the real database -- it only judges the *shape* of the value it is
    handed.
    """

    STATE_VALIDATORS: Dict[str, Callable[[Any], bool]] = {
        "user_id": lambda v: isinstance(v, str) and len(v) > 0,
        "order_id": lambda v: isinstance(v, str) and v.startswith("order_"),
        "return_id": lambda v: isinstance(v, str) and v.startswith("return_"),
        "refund_id": lambda v: isinstance(v, str) and v.startswith("refund_"),
        "transaction_id": lambda v: isinstance(v, str) and v.startswith("txn_"),
        "refund_status": lambda v: v in {
            "processed", "pending", "refunded", "failed", "rejected", "approved",
        },
        "order_status": lambda v: v in {
            "delivered", "shipped", "processing", "cancelled", "pending",
        },
    }

    def classify(
        self,
        tool_name: str,
        result: Any,
        expected_state: str,
        error: Optional[BaseException] = None,
    ) -> ClassificationResult:
        """
        Classify a single tool execution outcome.

        Args:
            tool_name: name of the tool that was called (used for the reason text).
            result: the value the tool returned (may be None or an error string).
            expected_state: the state name the caller needed (e.g. "refund_status").
            error: optionally, an exception the tool call raised instead of
                   returning normally.

        Returns:
            ClassificationResult(category, reason)
        """
        if error is not None:
            return ClassificationResult(
                ResultCategory.EXPLICIT_FAILURE,
                f"Tool '{tool_name}' raised an error: {error}",
            )

        if result is None:
            return ClassificationResult(
                ResultCategory.EXPLICIT_FAILURE,
                f"Tool '{tool_name}' returned no result (None).",
            )

        if isinstance(result, str) and result.strip().upper().startswith("ERROR"):
            return ClassificationResult(
                ResultCategory.EXPLICIT_FAILURE,
                f"Tool '{tool_name}' reported an explicit error: '{result}'",
            )

        validator = self.STATE_VALIDATORS.get(expected_state)
        if validator is None:
            # No validator registered for this state: we can't judge shape,
            # and nothing signaled failure, so treat it as progress.
            return ClassificationResult(
                ResultCategory.PROGRESS,
                f"No validator registered for '{expected_state}'; "
                f"treating '{result}' from '{tool_name}' as progress.",
            )

        if validator(result):
            return ClassificationResult(
                ResultCategory.PROGRESS,
                f"'{result}' is a valid-looking {expected_state} value.",
            )

        other_state = self._matches_other_state(result, exclude=expected_state)
        if other_state is not None:
            return ClassificationResult(
                ResultCategory.NON_PROGRESS,
                f"Tool '{tool_name}' returned '{result}', which looks like a "
                f"valid {other_state} value, not the expected {expected_state}.",
            )

        return ClassificationResult(
            ResultCategory.IMPLICIT_FAILURE,
            f"Tool '{tool_name}' returned '{result}', which does not resemble "
            f"a valid {expected_state} value (possibly corrupted or suspicious).",
        )

    def _matches_other_state(self, result: Any, exclude: str) -> Optional[str]:
        """Check whether `result` looks like a valid value for some *other* known state."""
        for state_name, validator in self.STATE_VALIDATORS.items():
            if state_name == exclude:
                continue
            try:
                if validator(result):
                    return state_name
            except Exception:
                continue
        return None


# ---------------------------------------------------------------------------
# Example usage
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    classifier = ResultClassifier()

    examples = [
        ("get_refund_status", "processed", "refund_status", None),   # PROGRESS
        ("get_return_id", "ERROR: endpoint unavailable", "return_id", None),  # EXPLICIT_FAILURE
        ("get_refund_status", "tuna", "refund_status", None),        # IMPLICIT_FAILURE
        ("get_refund_status", "delivered", "refund_status", None),   # NON_PROGRESS
    ]

    for tool_name, result, expected_state, error in examples:
        classification = classifier.classify(tool_name, result, expected_state, error)
        print(f"tool={tool_name!r} result={result!r} expected={expected_state!r}")
        print(f"  -> {classification.category.value}: {classification.reason}")
        print()