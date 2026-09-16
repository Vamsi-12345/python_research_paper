"""
main.py
-------

Runs all experimental tasks for the failure-aware
tool-use environment.

Each task can have its own experimental configuration.

Agent A:
    - No failure detection
    - No recovery
    - Continues along the planned route

Agent B:
    - Detects suspicious results
    - Classifies failures
    - Uses trust memory
    - Backtracks
    - Selects an alternative route
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


# ============================================================
# CONFIGURATION
# ============================================================

FAILURE_WRONG_VALUE = "tuna"


# ============================================================
# EXPERIMENT CONFIGURATION
# ============================================================
#
# Each task has its own experimental condition.
#
# failure_tool:
#     Tool on which the failure is injected.
#
# failure_type:
#     Type of failure injected.
#
# inject_failure:
#     True  -> inject failure
#     False -> normal execution
#
# The current tool graph has a verified recovery route for
# get_refund_status, so failure experiments use that tool.
#

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
# TEMPORARY FAILURE FOR AGENT A
# ============================================================

@contextmanager
def temporarily_wrong_tool(
    module,
    attr_name: str,
    wrong_value: object
):
    """
    Make the first call to a selected tool return
    a suspicious value.

    This simulates a misleading tool result for
    the baseline agent.
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
# PRINT AGENT RESULT
# ============================================================

def print_agent_result(
    agent_label: str,
    result: dict
) -> None:

    print()
    print("-" * 60)
    print(agent_label)
    print("-" * 60)

    print(
        f"Reached goal      : "
        f"{result.get('success')}"
    )

    print(
        f"Tool calls        : "
        f"{result.get('tool_call_count')}"
    )

    print(
        f"Executed tools    : "
        f"{result.get('executed_tools')}"
    )

    print(
        f"States reached    : "
        f"{result.get('states_reached')}"
    )

    print(
        f"Final state       : "
        f"{result.get('final_state')}"
    )

    if "failures" in result:

        print(
            f"Failures          : "
            f"{result.get('failures')}"
        )

    else:

        print(
            "Failures          : "
            "N/A"
        )

    if "recovery_attempts" in result:

        print(
            f"Recovery attempts : "
            f"{result.get('recovery_attempts')}"
        )

    else:

        print(
            "Recovery attempts : "
            "N/A"
        )

    if "backtracks" in result:

        print(
            f"Backtracks        : "
            f"{result.get('backtracks')}"
        )

    else:

        print(
            "Backtracks        : "
            "N/A"
        )


# ============================================================
# GET EXPERIMENT CONFIGURATION
# ============================================================

def get_experiment_config(task):

    return EXPERIMENT_CONFIG.get(
        task.task_id,
        {
            "inject_failure": False,
            "failure_tool": None,
            "failure_type": None,
        }
    )


# ============================================================
# RUN ONE TASK
# ============================================================

def run_single_task(
    task,
    task_number: int,
    total_tasks: int
):

    print()
    print()
    print("=" * 70)
    print(
        f"EXPERIMENT {task_number}/{total_tasks}"
    )
    print("=" * 70)

    print("\nTask:")
    print(task)

    # --------------------------------------------------------
    # Get experiment configuration
    # --------------------------------------------------------

    config = get_experiment_config(task)

    inject_failure = config["inject_failure"]
    failure_tool = config["failure_tool"]
    failure_type = config["failure_type"]

    print("\nExperiment configuration:")

    print(
        f"Failure injection : "
        f"{inject_failure}"
    )

    print(
        f"Failure tool      : "
        f"{failure_tool}"
    )

    print(
        f"Failure type      : "
        f"{failure_type}"
    )

    # --------------------------------------------------------
    # Build a fresh graph
    # --------------------------------------------------------

    graph = build_default_graph()

    # --------------------------------------------------------
    # Find candidate path
    # --------------------------------------------------------

    search_engine = SearchEngine(graph)

    planned_path = search_engine.forward_dfs(task)

    print("\nCandidate path:")
    print(planned_path)

    # --------------------------------------------------------
    # Create fresh failure injector
    # --------------------------------------------------------

    injector = FailureInjector()

    injector.enable()

    if inject_failure:

        injector.inject(
            failure_tool,
            failure_type,
            wrong_value=FAILURE_WRONG_VALUE,
            once=True,
        )

    # --------------------------------------------------------
    # Create fresh agents
    # --------------------------------------------------------

    baseline_agent = BaselineAgent(
        graph=graph
    )

    recovery_agent = RecoveryAgent(
        graph=graph,
        failure_injector=injector
    )

    # ========================================================
    # AGENT A
    # ========================================================

    print("\nRunning Agent A...")

    if inject_failure:

        with temporarily_wrong_tool(
            tools,
            failure_tool,
            FAILURE_WRONG_VALUE
        ):

            result_a = baseline_agent.run(task)

    else:

        result_a = baseline_agent.run(task)

    # ========================================================
    # AGENT B
    # ========================================================

    print("\nRunning Agent B...")

    result_b = recovery_agent.run(task)

    # ========================================================
    # DISPLAY RESULTS
    # ========================================================

    print_agent_result(
        "AGENT A — BASELINE",
        result_a
    )

    print_agent_result(
        "AGENT B — RECOVERY",
        result_b
    )

    return result_a, result_b


# ============================================================
# MAIN EXPERIMENT
# ============================================================

def main():

    print("=" * 70)
    print("ADAPTIVE TOOL-USE AGENT")
    print("LONG-HORIZON FAILURE RECOVERY EXPERIMENT")
    print("=" * 70)

    # --------------------------------------------------------
    # Load all experimental tasks
    # --------------------------------------------------------

    tasks = get_all_tasks()

    print()

    print(
        f"Number of experimental tasks: "
        f"{len(tasks)}"
    )

    print(
        f"Injected suspicious value: "
        f"{FAILURE_WRONG_VALUE}"
    )

    # --------------------------------------------------------
    # Display experiment plan
    # --------------------------------------------------------

    print()
    print("=" * 70)
    print("EXPERIMENT PLAN")
    print("=" * 70)

    for task in tasks:

        config = get_experiment_config(task)

        print(
            f"{task.task_id}: "
            f"failure={config['inject_failure']}, "
            f"tool={config['failure_tool']}"
        )

    # --------------------------------------------------------
    # Create evaluator
    # --------------------------------------------------------

    evaluator = Evaluator()

    # --------------------------------------------------------
    # Store all results
    # --------------------------------------------------------

    all_results = []

    # ========================================================
    # RUN ALL TASKS
    # ========================================================

    for index, task in enumerate(
        tasks,
        start=1
    ):

        result_a, result_b = run_single_task(
            task,
            index,
            len(tasks)
        )

        # ----------------------------------------------------
        # Store results
        # ----------------------------------------------------

        all_results.append(
            {
                "task": task,
                "agent_a": result_a,
                "agent_b": result_b,
            }
        )

        # ----------------------------------------------------
        # Add results to evaluator
        # ----------------------------------------------------

        evaluator.add_result(
            f"{task.task_id} - Agent A",
            result_a
        )

        evaluator.add_result(
            f"{task.task_id} - Agent B",
            result_b
        )

    # ========================================================
    # FINAL COMPARISON
    # ========================================================

    print()
    print()

    print("=" * 70)
    print("FINAL EXPERIMENTAL COMPARISON")
    print("=" * 70)

    evaluator.print_comparison_table()

    # ========================================================
    # TASK-BY-TASK SUMMARY
    # ========================================================

    print()
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

        task = item["task"]

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
            f"{task.task_id:<10}"
            f"{status_a:<20}"
            f"{status_b:<20}"
        )

    print("-" * 50)

    # ========================================================
    # SUCCESS SUMMARY
    # ========================================================

    successful_a = sum(
        1
        for item in all_results
        if item["agent_a"].get(
            "success",
            False
        )
    )

    successful_b = sum(
        1
        for item in all_results
        if item["agent_b"].get(
            "success",
            False
        )
    )

    total_tasks = len(all_results)

    print()
    print("=" * 70)
    print("SUCCESS SUMMARY")
    print("=" * 70)

    print(
        f"Agent A successful tasks : "
        f"{successful_a}/{total_tasks}"
    )

    print(
        f"Agent B successful tasks : "
        f"{successful_b}/{total_tasks}"
    )

    if total_tasks > 0:

        accuracy_a = (
            successful_a / total_tasks
        ) * 100

        accuracy_b = (
            successful_b / total_tasks
        ) * 100

        print(
            f"Agent A task accuracy    : "
            f"{accuracy_a:.2f}%"
        )

        print(
            f"Agent B task accuracy    : "
            f"{accuracy_b:.2f}%"
        )

    # ========================================================
    # EXPERIMENT COMPLETED
    # ========================================================

    print()
    print("=" * 70)
    print("EXPERIMENT COMPLETED")
    print("=" * 70)


# ============================================================
# PROGRAM ENTRY POINT
# ============================================================

if __name__ == "__main__":

    main()
