def build_default_graph() -> ToolGraph:
    """
    Build the ToolGraph matching the two supported refund-lookup paths:

    Path 1 (normal):
        account_id -> get_user_by_account -> user_id -> get_order_id -> order_id
        -> get_return_id -> return_id -> get_refund_id -> refund_id
        -> get_refund_status -> refund_status

    Path 2 (alternative):
        account_id -> get_user_by_account -> user_id -> get_order_id -> order_id
        -> get_transaction_id -> transaction_id -> get_refund_status -> refund_status
    """
    graph = ToolGraph()

    # First hop: account_id -> user_id
    graph.add_tool(
        "account_id",
        "get_user_by_account",
        "user_id"
    )

    # Shared second hop: user_id -> order_id
    graph.add_tool(
        "user_id",
        "get_order_id",
        "order_id"
    )

    # Path 1: normal
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

    # Path 2: alternative
    graph.add_tool(
        "order_id",
        "get_transaction_id",
        "transaction_id"
    )

    graph.add_tool(
        "transaction_id",
        "get_refund_status",
        "refund_status"
    )

    return graph
