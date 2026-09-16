"""
tasks.py
--------

Collection of experimental tasks for the failure-aware
tool-use planning environment.

The tasks use the tool chains currently supported by tools.py
and graph.py.

Normal route:
account_id
    ↓
user_id
    ↓
order_id
    ↓
return_id
    ↓
refund_id
    ↓
refund_status

Alternative recovery route:
order_id
    ↓
transaction_id
    ↓
refund_status
"""

from task import Task


def get_all_tasks():
    """
    Return all experimental tasks.
    """

    tasks = [

        # ---------------------------------------------------------
        # T001 - Standard long-horizon refund retrieval
        # ---------------------------------------------------------
        Task(
            task_id="T001",
            initial_state={
                "account_id": "acc_001"
            },
            target_state="refund_status",
            required_min_steps=5,
        ),

        # ---------------------------------------------------------
        # T002 - Long-horizon refund retrieval
        # Used to evaluate repeated failure-aware execution.
        # ---------------------------------------------------------
        Task(
            task_id="T002",
            initial_state={
                "account_id": "acc_001"
            },
            target_state="refund_status",
            required_min_steps=5,
        ),

        # ---------------------------------------------------------
        # T003 - Start from user_id
        # This removes the account lookup step and creates
        # a shorter planning problem.
        # ---------------------------------------------------------
        Task(
            task_id="T003",
            initial_state={
                "user_id": "user_1"
            },
            target_state="refund_status",
            required_min_steps=4,
        ),

        # ---------------------------------------------------------
        # T004 - Standard account-based recovery task
        # Used to demonstrate failure detection and backtracking.
        # ---------------------------------------------------------
        Task(
            task_id="T004",
            initial_state={
                "account_id": "acc_001"
            },
            target_state="refund_status",
            required_min_steps=5,
        ),

        # ---------------------------------------------------------
        # T005 - Recovery-oriented long-horizon task
        # The recovery agent can use the transaction route
        # when the normal refund route becomes unreliable.
        # ---------------------------------------------------------
        Task(
            task_id="T005",
            initial_state={
                "account_id": "acc_001"
            },
            target_state="refund_status",
            required_min_steps=5,
        ),
    ]

    return tasks


def get_task_by_id(task_id: str):
    """
    Return a task with the requested task ID.

    Returns None if the task does not exist.
    """

    for task in get_all_tasks():

        if task.task_id == task_id:
            return task

    return None


# -------------------------------------------------------------------------
# Test this file directly
# -------------------------------------------------------------------------

if __name__ == "__main__":

    tasks = get_all_tasks()

    print("=" * 60)
    print("EXPERIMENTAL TASKS")
    print("=" * 60)

    for task in tasks:
        print(task)

    print("\nTotal tasks:", len(tasks))

    print("\nSearching for T001:")

    task = get_task_by_id("T001")

    if task is not None:
        print(task)
    else:
        print("Task not found.")
