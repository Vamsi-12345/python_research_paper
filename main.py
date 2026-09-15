from contextlib import contextmanager

import tools

from agent_baseline import BaselineAgent
from agent_recovery import RecoveryAgent
from evaluator import Evaluator
from failures import FailureInjector, FailureType
from graph import build_default_graph
from search import SearchEngine
from task import Task


FAILURE_WRONG_VALUE = "tuna"


@contextmanager
def temporarily_wrong_tool(module, attr_name: str, wrong_value: object):
    """
    For Agent A:
    Make the first call return the wrong value, then allow
    the original tool to work normally.
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


def print_agent_result(agent_label: str, result: dict) -> None:
    print(f"\n--- {agent_label} ---")
    print(f"Reached goal:      {result.get('success')}")
    print(f"Tool calls:        {result.get('tool_call_count')}")
    print(f"Executed tools:    {result.get('executed_tools')}")
    print(f"States reached:    {result.get('states_reached')}")
    print(f"Final state:       {result.get('final_state')}")

    if "failures" in result:
        print(f"Failures:          {result.get('failures')}")
    else:
        print(
            "Failures:          "
            "N/A (Agent A does not classify/record failures)"
        )

    if "recovery_attempts" in result:
        print(f"Recovery attempts: {result.get('recovery_attempts')}")
    else:
        print(
            "Recovery attempts: "
            "N/A (Agent A does not attempt recovery)"
        )

    if "backtracks" in result:
        print(f"Backtracks:        {result.get('backtracks')}")
    else:
        print(
            "Backtracks:        "
            "N/A (Agent A does not backtrack)"
        )


def main() -> None:

    # ------------------------------------------------------------
    # 1. Create the task
    # ------------------------------------------------------------

    task = Task(
        task_id="T001",
        initial_state={"user_id": "user_1"},
        target_state="refund_status",
        required_min_steps=5,
    )

    # ------------------------------------------------------------
    # 2. Build shared ToolGraph
    # ------------------------------------------------------------

    graph = build_default_graph()

    # ------------------------------------------------------------
    # 3. Get candidate path
    # ------------------------------------------------------------

    search_engine = SearchEngine(graph)
    planned_path = search_engine.forward_dfs(task)

    print("=" * 60)
    print("Task:", task)
    print("Planned path (SearchEngine.forward_dfs):")
    print(" ", planned_path)
    print("=" * 60)

    # ------------------------------------------------------------
    # 4. Create FailureInjector for Agent B
    #
    # IMPORTANT:
    # The RecoveryAgent needs the implicit failure only once.
    # After the failed attempt, the alternative route should be
    # allowed to obtain the correct result.
    # ------------------------------------------------------------

    injector = FailureInjector()
    injector.enable()

    injector.inject(
    "get_refund_status",
    FailureType.IMPLICIT_FAILURE,
    wrong_value=FAILURE_WRONG_VALUE,
    once=True,
)

    # ------------------------------------------------------------
    # 5. Create agents
    # ------------------------------------------------------------

    baseline_agent = BaselineAgent(
        graph=graph
    )

    recovery_agent = RecoveryAgent(
        graph=graph,
        failure_injector=injector
    )

    # ------------------------------------------------------------
    # 6. Run Agent A
    #
    # First get_refund_status call returns "tuna".
    # This demonstrates that the baseline agent accepts the
    # suspicious value without detecting the failure.
    # ------------------------------------------------------------

    with temporarily_wrong_tool(
        tools,
        "get_refund_status",
        FAILURE_WRONG_VALUE
    ):
        result_a = baseline_agent.run(task)

    # ------------------------------------------------------------
    # 7. Run Agent B
    # ------------------------------------------------------------

    result_b = recovery_agent.run(task)

    # ------------------------------------------------------------
    # 8. Print results
    # ------------------------------------------------------------

    print_agent_result(
        "Agent A (BaselineAgent)",
        result_a
    )

    print_agent_result(
        "Agent B (RecoveryAgent)",
        result_b
    )

    # ------------------------------------------------------------
    # 9. Evaluate
    # ------------------------------------------------------------

    evaluator = Evaluator()

    evaluator.add_result(
        "Agent A (baseline)",
        result_a
    )

    evaluator.add_result(
        "Agent B (recovery)",
        result_b
    )

    # ------------------------------------------------------------
    # 10. Comparison
    # ------------------------------------------------------------

    print("\n" + "=" * 60)
    print("Comparison metrics")
    print("=" * 60)

    evaluator.print_comparison_table()


if __name__ == "__main__":
    main()