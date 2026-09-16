"""
main.py
-------

Runs the experimental tasks for the failure-aware
tool-use environment.

For every task:
    1. Build the tool graph.
    2. Find a candidate path using SearchEngine.
    3. Run Agent A with an injected suspicious result.
    4. Run Agent B with the same injected failure.
    5. Compare their results.

Agent A:
    - No failure detection
    - No recovery
    - Stops after the suspicious result

Agent B:
    - Detects the suspicious result
    - Backtracks
    - Uses an alternative route
    - Attempts to reach the correct target
"""

from contextlib import contextmanager

import tools

from agent_baseline import BaselineAgent
from agent_recovery import RecoveryAgent
from evaluator import Evaluator
from failures import FailureInjector, FailureType
from graph import build_default_graph
from search import SearchEngine
from tasks import get_all_tasks


# ---------------------------------------------------------------------------
# Failure configuration
# ---------------------------------------------------------------------------

FAILURE_WRONG_VALUE = "tuna"


# ---------------------------------------------------------------------------
# Temporary failure for Agent A
# ---------------------------------------------------------------------------

@contextmanager
def temporarily_wrong_tool(
    module,
    attr_name: str,
    wrong_value: object
):
    """
    Make the first call to a tool return a wrong value.

    This is used for Agent A because the baseline agent does
    not have its own failure recovery mechanism.
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


# ---------------------------------------------------------------------------
# Print one agent result
# ---------------------------------------------------------------------------

def print_agent_result(
    agent_label: str,
    result: dict
) -> None:

    print(f"\n--- {agent_label} ---")

    print(
        f"Reached goal:      "
        f"{result.get('success')}"
    )

    print(
        f"Tool calls:        "
        f"{result.get('tool_call_count')}"
    )

    print(
        f"Executed tools:    "
        f"{result.get('executed_tools')}"
    )

    print(
        f"States reached:    "
        f"{result.get('states_reached')}"
    )

    print(
        f"Final state:       "
        f"{result.get('final_state')}"
    )

    if "failures" in result:

        print(
            f"Failures:          "
            f"{result.get('failures')}"
        )

    else:

        print(
            "Failures:          "
            "N/A (Agent A does not classify/record failures)"
        )

    if "recovery_attempts" in result:

        print(
            f"Recovery attempts: "
            f"{result.get('recovery_attempts')}"
        )

    else:

        print(
            "Recovery attempts: "
            "N/A (Agent A does not attempt recovery)"
        )

    if "backtracks" in result:

        print(
            f"Backtracks:        "
            f"{result.get('backtracks')}"
        )

    else:

        print(
            "Backtracks:        "
            "N/A (Agent A does not backtrack)"
        )


# ---------------------------------------------------------------------------
# Run one task
# ---------------------------------------------------------------------------

def run_single_task(task, task_number: int, total_tasks: int):

    print("\n")
    print("=" * 70)
    print(
        f"EXPERIMENT {task_number}/{total_tasks}"
    )
    print("=" * 70)

    print("\nTask:")
    print(task)

    # ---------------------------------------------------------------
    # 1. Build a fresh graph
    # ---------------------------------------------------------------

    graph = build_default_graph()

    # ---------------------------------------------------------------
    # 2. Find candidate path
    # ---------------------------------------------------------------

    search_engine = SearchEngine(graph)

    planned_path = search_engine.forward_dfs(task)

    print("\nPlanned path:")
    print(planned_path)

    # ---------------------------------------------------------------
    # 3. Create a fresh failure injector for Agent B
    #
    # A fresh injector is important because once=True means
    # the failure is injected only once for this task.
    # ---------------------------------------------------------------

    injector = FailureInjector()

    injector.enable()

    injector.inject(
        "get_refund_status",
        FailureType.IMPLICIT_FAILURE,
        wrong_value=FAILURE_WRONG_VALUE,
        once=True,
    )

    # ---------------------------------------------------------------
    # 4. Create fresh agents
    #
    # Fresh agents keep each task independent.
    # ---------------------------------------------------------------

    baseline_agent = BaselineAgent(
        graph=graph
    )

    recovery_agent = RecoveryAgent(
        graph=graph,
        failure_injector=injector
    )

    # ---------------------------------------------------------------
    # 5. Run Agent A
    # ---------------------------------------------------------------

    print("\nRunning Agent A...")

    with temporarily_wrong_tool(
        tools,
        "get_refund_status",
        FAILURE_WRONG_VALUE
    ):

        result_a = baseline_agent.run(task)

    # ---------------------------------------------------------------
    # 6. Run Agent B
    # ---------------------------------------------------------------

    print("Running Agent B...")

    result_b = recovery_agent.run(task)

    # ---------------------------------------------------------------
    # 7. Display results
    # ---------------------------------------------------------------

    print_agent_result(
        "Agent A (BaselineAgent)",
        result_a
    )

    print_agent_result(
        "Agent B (RecoveryAgent)",
        result_b
    )

    return result_a, result_b


# ---------------------------------------------------------------------------
# Main experiment
# ---------------------------------------------------------------------------

def main():

    print("=" * 70)
    print("ADAPTIVE TOOL-USE AGENT")
    print("MULTI-TASK FAILURE RECOVERY EXPERIMENT")
    print("=" * 70)

    # ---------------------------------------------------------------
    # Load all tasks from tasks.py
    # ---------------------------------------------------------------

    tasks = get_all_tasks()

    print(
        f"\nTotal experimental tasks: {len(tasks)}"
    )

    print(
        "Failure type: "
        "Implicit failure / suspicious result"
    )

    print(
        "Injected value: "
        f"{FAILURE_WRONG_VALUE}"
    )

    # ---------------------------------------------------------------
    # Evaluator
    # ---------------------------------------------------------------

    evaluator = Evaluator()

    # ---------------------------------------------------------------
    # Store results for summary
    # ---------------------------------------------------------------

    all_results = []

    # ---------------------------------------------------------------
    # Run every task
    # ---------------------------------------------------------------

    for index, task in enumerate(tasks, start=1):

        result_a, result_b = run_single_task(
            task,
            index,
            len(tasks)
        )

        all_results.append(
            {
                "task": task,
                "agent_a": result_a,
                "agent_b": result_b,
            }
        )

        # -----------------------------------------------------------
        # Add results to evaluator
        # -----------------------------------------------------------

        evaluator.add_result(
            f"{task.task_id} - Agent A",
            result_a
        )

        evaluator.add_result(
            f"{task.task_id} - Agent B",
            result_b
        )

    # ----------------------------------------------------------------
    # Final comparison
    # ----------------------------------------------------------------

    print("\n\n")
    print("=" * 70)
    print("FINAL EXPERIMENTAL COMPARISON")
    print("=" * 70)

    evaluator.print_comparison_table()

    # ----------------------------------------------------------------
    # Simple task-by-task summary
    # ----------------------------------------------------------------

    print("\n")
    print("=" * 70)
    print("TASK-BY-TASK SUMMARY")
    print("=" * 70)

    print(
        f"{'Task':<10}"
        f"{'Agent A':<20}"
        f"{'Agent B':<20}"
    )

    print("-" * 50)

    for item in all_results:

        task_id = item["task"].task_id

        result_a = item["agent_a"]
        result_b = item["agent_b"]

        success_a = result_a.get(
            "success",
            False
        )

        success_b = result_b.get(
            "success",
            False
        )

        status_a = (
            "Success"
            if success_a
            else "Failed"
        )

        status_b = (
            "Success"
            if success_b
            else "Failed"
        )

        print(
            f"{task_id:<10}"
            f"{status_a:<20}"
            f"{status_b:<20}"
        )

    print("-" * 50)

    print("\nExperiment completed.")


# ---------------------------------------------------------------------------
# Program entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    main()
