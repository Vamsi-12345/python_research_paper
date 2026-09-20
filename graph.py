from dataclasses import dataclass
from typing import List


@dataclass
class Edge:
    from_state: str
    tool_name: str
    to_state: str


class ToolGraph:
    def __init__(self):
        self.edges: List[Edge] = []

    def add_tool(
        self,
        from_state: str,
        tool_name: str,
        to_state: str
    ):
        self.edges.append(
            Edge(
                from_state=from_state,
                tool_name=tool_name,
                to_state=to_state,
            )
        )

    def get_outgoing(self, state: str) -> List[Edge]:
        """
        Return all edges leaving the given state.
        """
        return [
            edge
            for edge in self.edges
            if edge.from_state == state
        ]

    def get_next_options(self, state: str) -> List[Edge]:
        """
        Compatibility method used by SearchEngine.

        SearchEngine expects ToolGraph to expose
        get_next_options(), while other parts of the
        project may use get_outgoing().
        """
        return self.get_outgoing(state)

    def states(self) -> List[str]:
        """
        Return every state appearing anywhere in the graph.
        """
        states = set()

        for edge in self.edges:
            states.add(edge.from_state)
            states.add(edge.to_state)

        return list(states)


def build_default_graph() -> ToolGraph:
    """
    Build the ToolGraph matching the two supported
    refund-lookup paths.
    """

    graph = ToolGraph()

    # ---------------------------------------------------------
    # First hop
    # ---------------------------------------------------------

    graph.add_tool(
        "account_id",
        "get_user_by_account",
        "user_id"
    )

    # ---------------------------------------------------------
    # Shared second hop
    # ---------------------------------------------------------

    graph.add_tool(
        "user_id",
        "get_order_id",
        "order_id"
    )

    # ---------------------------------------------------------
    # Path 1: normal refund path
    # ---------------------------------------------------------

    graph.add_tool(
        "order_id",
        "get_return_id",
        "return_id"
    )

    graph.add_tool(
        "return_id",
        "get_refund_id",
        "refund_id"
    )

    graph.add_tool(
        "refund_id",
        "get_refund_status",
        "refund_status"
    )

    # ---------------------------------------------------------
    # Path 2: alternative transaction path
    # ---------------------------------------------------------

    graph.add_tool(
        "order_id",
        "get_transaction_id",
        "transaction_id"
    )

    graph.add_tool(
        "transaction_id",
        "get_refund_status_by_transaction",
        "refund_status"
    )

    return graph