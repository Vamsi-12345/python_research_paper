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
        Return True if `current_state` contains the target field
        (e.g. 'refund_status') with a non-None value.
        """
        return (
            self.target_state in current_state
            and current_state[self.target_state] is not None
        )

    def __repr__(self) -> str:
        return (
            f"Task(task_id={self.task_id!r}, "
            f"initial_state={self.initial_state!r}, "
            f"target_state={self.target_state!r}, "
            f"required_min_steps={self.required_min_steps})"
        )


# ---------------------------------------------------------------------------
# Example task definition (matches the normal/alternative refund chains
# supported by tools.py: account_id -> ... -> refund_status)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    example_task = Task(
        task_id="task_001",
        initial_state={"account_id": "acc_001"},
        target_state="refund_status",
        required_min_steps=5,
    )

    print(example_task)

    # Goal not yet reached: state only has account_id
    print("Goal reached?", example_task.is_goal_reached(example_task.initial_state))

    # Simulate a state after a full plan has resolved refund_status
    finished_state = {"account_id": "acc_001", "refund_status": "processed"}
    print("Goal reached?", example_task.is_goal_reached(finished_state))