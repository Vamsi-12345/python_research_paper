"""
search.py
---------

Implements a SearchEngine that finds a path of tool calls connecting a
Task's initial_state to its target_state, by searching over the
abstract ToolGraph (never the hidden database or the tools themselves).

Three strategies are provided:
  1. forward_dfs        - depth-first search starting at the initial state.
  2. backward_dfs       - depth-first search starting at the target state,
                           walking predecessor edges.
  3. bidirectional_search - runs both directions and looks for a state
                            reachable from both sides (a "bridge"), then
                            stitches the two partial paths together.

A discovered path is represented as a list of edges:
    [(from_state, tool_name, to_state), ...]

read in order from the initial state to the target state.

This module only reasons about the graph's states/edges. It does not
call tools.py, does not touch the hidden database, does not run an LLM,
and implements no failure injection, trust memory, result classification,
recovery, or evaluation metrics.
"""

from typing import Dict, List, Optional, Set, Tuple

from graph import Edge, ToolGraph
from task import Task


PathEdge = Tuple[str, str, str]  # (from_state, tool_name, to_state)


class SearchEngine:
    """Searches a ToolGraph for a path from a Task's start state to its target."""

    def __init__(self, graph: ToolGraph):
        self.graph = graph

        # Tracking information, refreshed at the start of every search call.
        self.visited_states: Set[str] = set()
        self.current_path: List[PathEdge] = []
        self.explored_count: int = 0

    # ------------------------------------------------------------------
    # Shared helpers
    # ------------------------------------------------------------------

    def _reset_tracking(self) -> None:
        self.visited_states = set()
        self.current_path = []
        self.explored_count = 0

    def _start_state(self, task: Task) -> str:
        """
        A Task's initial_state is a dictionary such as:

            {"account_id": "acc_001"}

        The graph works over state names, so we take its single key.
        """
        return next(iter(task.initial_state.keys()))

    def _build_reverse_graph(self) -> Dict[str, List[Edge]]:
        """
        Invert every edge of self.graph:

            to_state -> [Edge(tool, from_state), ...]

        This is used by backward DFS and bidirectional search.
        """
        reverse: Dict[str, List[Edge]] = {
            state: [] for state in self.graph.states()
        }

        for state in self.graph.states():
            for edge in self.graph.get_next_options(state):
                reverse[edge.to_state].append(
                    Edge(edge.tool_name, state)
                )

        return reverse

    # ------------------------------------------------------------------
    # 1. Forward DFS
    # ------------------------------------------------------------------

    def forward_dfs(
        self,
        task: Task
    ) -> Optional[List[PathEdge]]:
        """
        Depth-first search starting from the task's initial state.

        The target is accepted only when the discovered path contains
        at least task.required_min_steps tool calls.
        """

        self._reset_tracking()

        start_state = self._start_state(task)
        target = task.target_state
        min_steps = task.required_min_steps

        path: List[PathEdge] = []
        visited: Set[str] = set()

        found = self._forward_visit(
            start_state,
            target,
            min_steps,
            visited,
            path
        )

        self.current_path = path if found else []

        return self.current_path if found else None

    def _forward_visit(
        self,
        state: str,
        target: str,
        min_steps: int,
        visited: Set[str],
        path: List[PathEdge],
    ) -> bool:
        """
        Recursive DFS helper.

        A target state is considered successful only if the current
        path contains at least min_steps tool calls.
        """

        self.explored_count += 1
        visited.add(state)
        self.visited_states.add(state)

        # ------------------------------------------------------------
        # Goal condition
        # ------------------------------------------------------------
        #
        # Previously the search stopped whenever:
        #
        #     state == target
        #
        # Now it also checks the minimum number of required steps.
        #
        if state == target and len(path) >= min_steps:
            return True

        # ------------------------------------------------------------
        # Continue exploring
        # ------------------------------------------------------------

        for edge in self.graph.get_next_options(state):

            # Avoid cycles.
            if edge.to_state in visited:
                continue

            path.append(
                (state, edge.tool_name, edge.to_state)
            )

            if self._forward_visit(
                edge.to_state,
                target,
                min_steps,
                visited,
                path
            ):
                return True

            # Backtrack if this branch did not work.
            path.pop()

        return False

    # ------------------------------------------------------------------
    # 2. Backward DFS
    # ------------------------------------------------------------------

    def backward_dfs(
        self,
        task: Task
    ) -> Optional[List[PathEdge]]:
        """
        Depth-first search starting from the task's target state,
        walking predecessor edges until the initial state is reached.

        The resulting path is returned in forward order.
        """

        self._reset_tracking()

        start_state = self._start_state(task)
        target = task.target_state

        reverse_graph = self._build_reverse_graph()

        reversed_path: List[PathEdge] = []
        visited: Set[str] = set()

        found = self._backward_visit(
            target,
            start_state,
            visited,
            reversed_path,
            reverse_graph
        )

        if not found:
            self.current_path = []
            return None

        # reversed_path contains edges from target toward start.
        # Reverse them so that the final path is:
        #
        # start -> target
        forward_path = [
            (from_state, tool, to_state)
            for (to_state, tool, from_state)
            in reversed(reversed_path)
        ]

        self.current_path = forward_path

        return forward_path

    def _backward_visit(
        self,
        state: str,
        start_state: str,
        visited: Set[str],
        reversed_path: List[PathEdge],
        reverse_graph: Dict[str, List[Edge]],
    ) -> bool:
        """
        Recursive helper for backward DFS.
        """

        self.explored_count += 1
        visited.add(state)
        self.visited_states.add(state)

        if state == start_state:
            return True

        for edge in reverse_graph.get(state, []):

            predecessor = edge.to_state

            if predecessor in visited:
                continue

            reversed_path.append(
                (state, edge.tool_name, predecessor)
            )

            if self._backward_visit(
                predecessor,
                start_state,
                visited,
                reversed_path,
                reverse_graph
            ):
                return True

            reversed_path.pop()

        return False

    # ------------------------------------------------------------------
    # 3. Bidirectional Search
    # ------------------------------------------------------------------

    def bidirectional_search(
        self,
        task: Task
    ) -> Optional[List[PathEdge]]:
        """
        Explore forward from the initial state and backward from the
        target state, then look for a bridge state reachable from both.

        The two partial paths are then combined into one path.
        """

        self._reset_tracking()

        start_state = self._start_state(task)
        target = task.target_state

        # ------------------------------------------------------------
        # Forward exploration
        # ------------------------------------------------------------

        forward_parents, forward_visited = self._collect_parents(
            start_state,
            self.graph.get_next_options
        )

        # ------------------------------------------------------------
        # Backward exploration
        # ------------------------------------------------------------

        reverse_graph = self._build_reverse_graph()

        backward_parents, backward_visited = self._collect_parents(
            target,
            lambda s: reverse_graph.get(s, [])
        )

        self.visited_states = (
            forward_visited | backward_visited
        )

        # ------------------------------------------------------------
        # Find common bridge state
        # ------------------------------------------------------------

        bridge = self._find_bridge(
            forward_visited,
            backward_visited
        )

        if bridge is None:
            self.current_path = []
            return None

        # ------------------------------------------------------------
        # Reconstruct both halves
        # ------------------------------------------------------------

        forward_half = self._reconstruct_forward(
            forward_parents,
            bridge
        )

        backward_half = self._reconstruct_backward(
            backward_parents,
            bridge,
            target
        )

        full_path = forward_half + backward_half

        # ------------------------------------------------------------
        # Check minimum required steps
        # ------------------------------------------------------------

        if len(full_path) < task.required_min_steps:
            self.current_path = []
            return None

        self.current_path = full_path

        return full_path

    # ------------------------------------------------------------------
    # Parent collection helper
    # ------------------------------------------------------------------

    def _collect_parents(
        self,
        start: str,
        edge_source
    ):
        """
        Iterative DFS from start.

        Returns:
            parents:
                {
                    state:
                    None
                    or
                    (previous_state, tool_name)
                }

            visited:
                Set of all reached states.
        """

        parents: Dict[
            str,
            Optional[Tuple[str, str]]
        ] = {
            start: None
        }

        visited: Set[str] = {start}
        stack = [start]

        while stack:

            state = stack.pop()

            self.explored_count += 1

            for edge in edge_source(state):

                if edge.to_state in visited:
                    continue

                visited.add(edge.to_state)

                parents[edge.to_state] = (
                    state,
                    edge.tool_name
                )

                stack.append(edge.to_state)

        return parents, visited

    # ------------------------------------------------------------------
    # Bridge helper
    # ------------------------------------------------------------------

    @staticmethod
    def _find_bridge(
        forward_visited: Set[str],
        backward_visited: Set[str]
    ) -> Optional[str]:

        common = (
            forward_visited &
            backward_visited
        )

        return next(iter(common)) if common else None

    # ------------------------------------------------------------------
    # Forward path reconstruction
    # ------------------------------------------------------------------

    @staticmethod
    def _reconstruct_forward(
        forward_parents: Dict[
            str,
            Optional[Tuple[str, str]]
        ],
        node: str
    ) -> List[PathEdge]:
        """
        Walk forward_parents from node back to the start,
        then reverse the collected path.
        """

        path: List[PathEdge] = []

        state = node

        while forward_parents[state] is not None:

            prev_state, tool = forward_parents[state]

            path.append(
                (prev_state, tool, state)
            )

            state = prev_state

        path.reverse()

        return path

    # ------------------------------------------------------------------
    # Backward path reconstruction
    # ------------------------------------------------------------------

    @staticmethod
    def _reconstruct_backward(
        backward_parents: Dict[
            str,
            Optional[Tuple[str, str]]
        ],
        node: str,
        target: str
    ) -> List[PathEdge]:
        """
        Reconstruct the path from the bridge node to the target.
        """

        path: List[PathEdge] = []

        state = node

        while state != target:

            next_state, tool = backward_parents[state]

            path.append(
                (state, tool, next_state)
            )

            state = next_state

        return path


# ---------------------------------------------------------------------------
# Example usage
# ---------------------------------------------------------------------------

if __name__ == "__main__":

    from graph import build_default_graph

    graph = build_default_graph()

    task = Task(
        task_id="task_001",
        initial_state={
            "account_id": "acc_001"
        },
        target_state="refund_status",
        required_min_steps=5,
    )

    engine = SearchEngine(graph)

    # ------------------------------------------------------------
    # Forward DFS
    # ------------------------------------------------------------

    print("Forward DFS:")

    result = engine.forward_dfs(task)

    print(" path:", result)
    print(" visited:", engine.visited_states)
    print(" explored_count:", engine.explored_count)

    print()

    # ------------------------------------------------------------
    # Backward DFS
    # ------------------------------------------------------------

    print("Backward DFS:")

    result = engine.backward_dfs(task)

    print(" path:", result)
    print(" visited:", engine.visited_states)
    print(" explored_count:", engine.explored_count)

    print()

    # ------------------------------------------------------------
    # Bidirectional Search
    # ------------------------------------------------------------

    print("Bidirectional search:")

    result = engine.bidirectional_search(task)

    print(" path:", result)
    print(" visited:", engine.visited_states)
    print(" explored_count:", engine.explored_count)
