"""
graph.py
--------
Defines a ToolGraph: a simple representation of how tools connect one
state/datatype to another (e.g. user_id -> order_id via get_order_id).

This module only models the *shape* of the tool relationships. It does
not execute tools, search/plan over the graph, call an LLM, or inject
failures -- it is purely a data structure plus lookup/debug helpers,
ready to be used later by a planner (e.g. a DFS search added in a
future iteration).
"""

from typing import Dict, List, NamedTuple


class Edge(NamedTuple):
    """A single edge: applying `tool_name` on the current state yields `to_state`."""
    tool_name: str
    to_state: str


class ToolGraph:
    """
    A directed graph of states (datatypes) connected by tools.

    Internally stored as an adjacency list:
        { from_state: [Edge(tool_name, to_state), ...], ... }
    """

    def __init__(self):
        self._adjacency: Dict[str, List[Edge]] = {}

    def add_tool(self, from_state: str, tool_name: str, to_state: str) -> None:
        """
        Register a tool relationship: from_state --tool_name--> to_state.
        """
        self._adjacency.setdefault(from_state, [])
        self._adjacency.setdefault(to_state, [])  # ensure terminal states exist too
        self._adjacency[from_state].append(Edge(tool_name, to_state))

    def get_next_options(self, from_state: str) -> List[Edge]:
        """
        Return the list of (tool_name, to_state) edges available from
        the given state. Returns an empty list if the state has no
        outgoing tools or is unknown.
        """
        return list(self._adjacency.get(from_state, []))

    def states(self) -> List[str]:
        """Return all known states (nodes) in the graph."""
        return list(self._adjacency.keys())

    def display(self) -> None:
        """Print the graph in a simple, readable form for debugging."""
        for from_state, edges in self._adjacency.items():
            if not edges:
                print(f"{from_state} -> (terminal)")
                continue
            for edge in edges:
                print(f"{from_state} --{edge.tool_name}--> {edge.to_state}")


def build_default_graph() -> ToolGraph:
    """
    Build the ToolGraph matching the two supported refund-lookup paths:

    Path 1 (normal):
        user_id -> get_order_id -> order_id -> get_return_id -> return_id
                -> get_refund_id -> refund_id -> get_refund_status -> refund_status

    Path 2 (alternative):
        user_id -> get_order_id -> order_id -> get_transaction_id -> transaction_id
                -> get_refund_status -> refund_status
    """
    graph = ToolGraph()

    # Shared first hop
    graph.add_tool("user_id", "get_order_id", "order_id")

    # Path 1: normal
    graph.add_tool("order_id", "get_return_id", "return_id")
    graph.add_tool("return_id", "get_refund_id", "refund_id")
    graph.add_tool("refund_id", "get_refund_status", "refund_status")

    # Path 2: alternative
    graph.add_tool("order_id", "get_transaction_id", "transaction_id")
    graph.add_tool("transaction_id", "get_refund_status", "refund_status")

    return graph


if __name__ == "__main__":
    g = build_default_graph()

    print("All states:", g.states())
    print()

    print("Next options from 'user_id':", g.get_next_options("user_id"))
    print("Next options from 'order_id':", g.get_next_options("order_id"))
    print("Next options from 'refund_status':", g.get_next_options("refund_status"))
    print()

    print("Full graph:")
    g.display()