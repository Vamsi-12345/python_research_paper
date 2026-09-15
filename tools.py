"""
tools.py
--------
A simplified failure-aware tool-use environment (inspired by PlanBench-XL).

Design summary:
- A single hidden module-level DATABASE dict simulates a retail backend.
  It is prefixed with an underscore convention (kept "hidden" by
  documentation/contract, not by Python enforcement) and is never meant
  to be accessed directly by an agent -- only through the tool functions
  below.
- Each tool is a small, single-purpose function that takes one identifier
  type and returns another, mirroring a single hop in the supported chains:

    Normal path (5 steps):
        account_id -> user_id -> order_id -> return_id -> refund_id -> refund_status

    Alternative path (4 steps):
        account_id -> user_id -> order_id -> transaction_id -> refund_status

- Tools raise a plain ValueError/KeyError-style lookup failure (via a
  small helper) when an id is not found.
"""

from typing import List


# ---------------------------------------------------------------------------
# Hidden backend database (do not access directly -- use the tools below)
# ---------------------------------------------------------------------------
_DATABASE = {
    # account_id -> user_id (adds 5th step to starting chain)
    "users_by_account": {
        "acc_001": "user_1",
    },
    "users": {
        "user_1": {"name": "Alice"},
        "user_2": {"name": "Bob"},
    },
    # user_id -> list of order_ids
    "orders_by_user": {
        "user_1": ["order_101", "order_102"],
        "user_2": ["order_201"],
    },
    # order_id -> order details
    "orders": {
        "order_101": {"user_id": "user_1", "order_status": "delivered"},
        "order_102": {"user_id": "user_1", "order_status": "delivered"},
        "order_201": {"user_id": "user_2", "order_status": "delivered"},
    },
    # order_id -> return_id (normal path)
    "returns_by_order": {
        "order_101": "return_501",
    },
    # return_id -> return details
    "returns": {
        "return_501": {"order_id": "order_101", "return_status": "approved"},
    },
    # return_id -> refund_id (normal path)
    "refunds_by_return": {
        "return_501": "refund_701",
    },
    # order_id -> transaction_id (alternative path)
    "transactions_by_order": {
        "order_101": "txn_901",
        "order_102": "txn_901",
        "order_201": "txn_902",
    },
    # refund_id -> refund details
    "refunds": {
        "refund_701": {"refund_status": "processed"},
    },
    # transaction_id -> refund_status (alternative path shortcut)
    "refund_status_by_transaction": {
        "txn_901": "refunded",
        "txn_902": "pending",
    },
}


class ToolLookupError(Exception):
    """Raised when a tool cannot resolve the requested identifier."""


def _lookup(table: dict, key, table_name: str):
    if key not in table:
        raise ToolLookupError(f"'{key}' not found in '{table_name}'")
    return table[key]


# ---------------------------------------------------------------------------
# Tool functions (the only sanctioned interface to the hidden DATABASE)
# ---------------------------------------------------------------------------

def get_user_by_account(account_id: str) -> str:
    """account_id -> user_id"""
    return _lookup(_DATABASE["users_by_account"], account_id, "users_by_account")


def get_orders_by_user(user_id: str) -> List[str]:
    """user_id -> list of order_ids"""
    return list(_lookup(_DATABASE["orders_by_user"], user_id, "orders_by_user"))


def get_order_status(order_id: str) -> str:
    """order_id -> order_status"""
    order = _lookup(_DATABASE["orders"], order_id, "orders")
    return order["order_status"]


# --- Normal path -----------------------------------------------------------

def get_return_by_order(order_id: str) -> str:
    """order_id -> return_id"""
    return _lookup(_DATABASE["returns_by_order"], order_id, "returns_by_order")


def get_refund_by_return(return_id: str) -> str:
    """return_id -> refund_id"""
    return _lookup(_DATABASE["refunds_by_return"], return_id, "refunds_by_return")


def get_refund_status(refund_id: str) -> str:
    """refund_id -> refund_status"""
    refund = _lookup(_DATABASE["refunds"], refund_id, "refunds")
    return refund["refund_status"]


# --- Alternative path --------------------------------------------------

def get_transaction_by_order(order_id: str) -> str:
    """order_id -> transaction_id"""
    return _lookup(
        _DATABASE["transactions_by_order"], order_id, "transactions_by_order"
    )


def get_refund_status_by_transaction(transaction_id: str) -> str:
    """transaction_id -> refund_status"""
    return _lookup(
        _DATABASE["refund_status_by_transaction"],
        transaction_id,
        "refund_status_by_transaction",
    )


# ---------------------------------------------------------------------------
# Example usage (manual smoke test, not part of the tool contract)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    # 5-step Normal path: acc_001 -> user_1 -> order_101 -> return_501 -> refund_701 -> processed
    user_id = get_user_by_account("acc_001")
    orders = get_orders_by_user(user_id)
    ret = get_return_by_order(orders[0])
    refund = get_refund_by_return(ret)
    status = get_refund_status(refund)
    print("Normal path:", user_id, orders[0], ret, refund, status)

    # Alternative path recovery: acc_001 -> user_1 -> order_101 -> txn_901 -> refunded
    txn = get_transaction_by_order(orders[0])
    alt_status = get_refund_status_by_transaction(txn)
    print("Alternative path:", orders[0], txn, alt_status)