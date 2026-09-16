"""
task.py
-------

Defines the Task abstraction for the failure-aware tool-use environment.

A Task describes:
  - a unique identifier (task_id)
  - the starting state the agent is given (initial_state)
  - the state key the agent must eventually produce (target_state)
  - the minimum number of tool calls the plan must use (required_min_steps)

This module is purely a data/state container. It does not plan, search,
call tools, or run an LLM -- it only knows how to describe a task and
check whether a given state has reached that task's target.
"""

from typing import Any, Dict


class Task:
    """Represents a single planning task in the environment."""

    def __init__(
        self,
        task_id: str,
        initial_state: Dict[str, Any],
        target_state: str,
        required_min_steps: int = 5,
    ):
        self.task_id = task_id
        self.initial_state = dict(initial_state)
        self.target_state = target_state
        self.required_min_steps = required_min_steps

    def is_goal_reached(self, current_state: Dict[str, Any]) -> bool:
        """
        Return True only when the target field contains a valid value.

        For refund_status, values such as "tuna" are considered invalid.
        This prevents the baseline agent's suspicious result from being
        incorrectly counted as a successful task.
        """

        # Target state must exist.
        if self.target_state not in current_state:
            return False

        value = current_state[self.target_state]

        # None is not a valid result.
        if value is None:
            return False

        # Validate known refund status values.
        if self.target_state == "refund_status":
            valid_refund_statuses = {
                "processed",
                "pending",
                "refunded",
                "failed",
                "rejected",
                "approved",
            }

            return value in valid_refund_statuses

        # For other target states, a non-None value is sufficient.
        return True

    def __repr__(self) -> str:
        return (
            f"Task(task_id={self.task_id!r}, "
            f"initial_state={self.initial_state!r}, "
            f"target_state={self.target_state!r}, "
            f"required_min_steps={self.required_min_steps})"
        )


# ---------------------------------------------------------------------------
# Example task definition
# ---------------------------------------------------------------------------

if __name__ == "__main__":

    example_task = Task(
        task_id="task_001",
        initial_state={"account_id": "acc_001"},
        target_state="refund_status",
        required_min_steps=5,
    )

    print(example_task)

    # Goal not yet reached.
    print(
        "Goal reached?",
        example_task.is_goal_reached(
            example_task.initial_state
        )
    )

    # Invalid/suspicious result.
    invalid_state = {
        "account_id": "acc_001",
        "refund_status": "tuna",
    }

    print(
        "Invalid result accepted?",
        example_task.is_goal_reached(invalid_state)
    )

    # Valid result.
    finished_state = {
        "account_id": "acc_001",
        "refund_status": "processed",
    }

    print(
        "Valid result accepted?",
        example_task.is_goal_reached(finished_state)
    )
