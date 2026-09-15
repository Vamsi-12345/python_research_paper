"""
failures.py

A simple FailureInjector for the tool-use environment.

It supports exactly three failure types:

1. EXPLICIT_FAILURE
   - The tool call is replaced with an obvious error string.

2. IMPLICIT_FAILURE
   - The tool call is replaced with a suspicious/wrong value.

3. MISLEADING_TOOL
   - The requested tool is replaced by a different related tool.

The injector is passive:
- no result classification
- no recovery
- no trust memory
- no LLM
- no evaluation metrics

The injector can also apply a configured failure only once by using:

    once=True

This is useful for experiments where the first tool attempt fails,
but an alternative route should be able to use the real tool afterward.
"""

from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Tuple


class FailureType(Enum):

    EXPLICIT_FAILURE = "EXPLICIT_FAILURE"
    IMPLICIT_FAILURE = "IMPLICIT_FAILURE"
    MISLEADING_TOOL = "MISLEADING_TOOL"


class FailureInjector:

    """
    Holds a configuration of:

        tool_name -> failure configuration

    and intercepts calls through execute() when enabled.
    """

    def __init__(self):

        self.enabled: bool = False

        self._injections: Dict[str, Dict[str, Any]] = {}

        # Debugging log only.
        self.log: List[Tuple[str, Optional[str]]] = []

    # ------------------------------------------------------------------
    # Enable / disable
    # ------------------------------------------------------------------

    def enable(self) -> None:
        self.enabled = True

    def disable(self) -> None:
        self.enabled = False

    def is_enabled(self) -> bool:
        return self.enabled

    # ------------------------------------------------------------------
    # Configuration
    # ------------------------------------------------------------------

    def inject(
        self,
        tool_name: str,
        failure_type: FailureType,
        **params: Any
    ) -> None:

        """
        Configure a failure for a specific tool.

        Parameters:

        EXPLICIT_FAILURE:
            error_message: str
                Default:
                "ERROR: endpoint unavailable"

        IMPLICIT_FAILURE:
            wrong_value: Any
                Default:
                "tuna"

        MISLEADING_TOOL:
            substitute_func: Callable
                Required.

            substitute_name: str
                Optional label.

        General option:

            once: bool
                If True, the failure is applied only once.
                After that, the real tool is called normally.
        """

        # Extract the optional once flag.
        once = params.pop("once", False)

        self._injections[tool_name] = {
            "type": failure_type,
            "params": params,
            "once": once,
            "used": False,
        }

    def remove(self, tool_name: str) -> None:
        """Remove any configured failure for a specific tool."""

        self._injections.pop(tool_name, None)

    def clear_all(self) -> None:
        """Remove every configured failure."""

        self._injections.clear()

    def get_failure(
        self,
        tool_name: str
    ) -> Optional[Dict[str, Any]]:

        """
        Return the configured failure for a tool,
        regardless of whether the injector is enabled.
        """

        return self._injections.get(tool_name)

    def list_injections(self) -> Dict[str, Dict[str, Any]]:
        """Return a copy of the current failure configuration."""

        return dict(self._injections)

    # ------------------------------------------------------------------
    # Reset one-shot failures
    # ------------------------------------------------------------------

    def reset(self) -> None:
        """
        Reset the 'used' status of all one-shot failures.

        This is useful when running the same experiment again.
        """

        for config in self._injections.values():
            config["used"] = False

    # ------------------------------------------------------------------
    # Execution wrapper
    # ------------------------------------------------------------------

    def execute(
        self,
        tool_name: str,
        real_func: Callable[..., Any],
        *args: Any,
        **kwargs: Any
    ) -> Any:

        """
        Run a tool call.

        If no failure is configured:
            real_func() is executed normally.

        If a failure is configured:

            EXPLICIT_FAILURE:
                Return an error message.

            IMPLICIT_FAILURE:
                Return a suspicious/wrong value.

            MISLEADING_TOOL:
                Execute the substitute tool.

        If once=True was used during injection:
            the failure happens only on the first matching call.
            Later calls execute the real tool normally.
        """

        # --------------------------------------------------------------
        # Get configuration
        # --------------------------------------------------------------

        config = (
            self._injections.get(tool_name)
            if self.enabled
            else None
        )

        # --------------------------------------------------------------
        # No failure configured
        # --------------------------------------------------------------

        if config is None:

            result = real_func(*args, **kwargs)

            self.log.append(
                (tool_name, None)
            )

            return result

        # --------------------------------------------------------------
        # Check one-shot configuration
        # --------------------------------------------------------------

        if config["once"] and config["used"]:

            # Failure has already happened once.
            # Execute the real tool normally.

            result = real_func(*args, **kwargs)

            self.log.append(
                (tool_name, None)
            )

            return result

        # --------------------------------------------------------------
        # Apply configured failure
        # --------------------------------------------------------------

        failure_type: FailureType = config["type"]

        params: Dict[str, Any] = config["params"]

        # Mark one-shot failure as used.
        if config["once"]:
            config["used"] = True

        # Record failure in debug log.
        self.log.append(
            (tool_name, failure_type.value)
        )

        # --------------------------------------------------------------
        # EXPLICIT FAILURE
        # --------------------------------------------------------------

        if failure_type is FailureType.EXPLICIT_FAILURE:

            return params.get(
                "error_message",
                "ERROR: endpoint unavailable"
            )

        # --------------------------------------------------------------
        # IMPLICIT FAILURE
        # --------------------------------------------------------------

        if failure_type is FailureType.IMPLICIT_FAILURE:

            return params.get(
                "wrong_value",
                "tuna"
            )

        # --------------------------------------------------------------
        # MISLEADING TOOL
        # --------------------------------------------------------------

        if failure_type is FailureType.MISLEADING_TOOL:

            substitute_func = params["substitute_func"]

            return substitute_func(
                *args,
                **kwargs
            )

        # --------------------------------------------------------------
        # Unknown failure type
        # --------------------------------------------------------------

        return real_func(
            *args,
            **kwargs
        )


# ---------------------------------------------------------------------------
# Example usage
# ---------------------------------------------------------------------------

if __name__ == "__main__":

    import tools

    injector = FailureInjector()

    user_id = "user_1"

    # --------------------------------------------------------------
    # No injection
    # --------------------------------------------------------------

    print("-- No injection (baseline behavior) --")

    order_id = injector.execute(
        "get_order_id",
        lambda uid: tools.get_orders_by_user(uid)[0],
        user_id
    )

    return_id = injector.execute(
        "get_return_id",
        tools.get_return_by_order,
        order_id
    )

    refund_id = injector.execute(
        "get_refund_id",
        tools.get_refund_by_return,
        return_id
    )

    status = injector.execute(
        "get_refund_status",
        tools.get_refund_status,
        refund_id
    )

    print(
        "order_id:",
        order_id,
        "return_id:",
        return_id,
        "refund_id:",
        refund_id,
        "status:",
        status
    )

    # --------------------------------------------------------------
    # EXPLICIT FAILURE
    # --------------------------------------------------------------

    print("\n-- EXPLICIT_FAILURE --")

    injector.enable()

    injector.inject(
        "get_return_id",
        FailureType.EXPLICIT_FAILURE
    )

    result = injector.execute(
        "get_return_id",
        tools.get_return_by_order,
        order_id
    )

    print("result:", result)

    # --------------------------------------------------------------
    # IMPLICIT FAILURE
    # --------------------------------------------------------------

    print("\n-- IMPLICIT_FAILURE --")

    injector.clear_all()

    injector.inject(
        "get_refund_status",
        FailureType.IMPLICIT_FAILURE,
        wrong_value="tuna"
    )

    result = injector.execute(
        "get_refund_status",
        tools.get_refund_status,
        refund_id
    )

    print("result:", result)

    # --------------------------------------------------------------
    # ONE-SHOT IMPLICIT FAILURE
    # --------------------------------------------------------------

    print("\n-- ONE-SHOT IMPLICIT_FAILURE --")

    injector.clear_all()

    injector.inject(
        "get_refund_status",
        FailureType.IMPLICIT_FAILURE,
        wrong_value="tuna",
        once=True
    )

    first_result = injector.execute(
        "get_refund_status",
        tools.get_refund_status,
        refund_id
    )

    second_result = injector.execute(
        "get_refund_status",
        tools.get_refund_status,
        refund_id
    )

    print("First call:", first_result)
    print("Second call:", second_result)

    # --------------------------------------------------------------
    # MISLEADING TOOL
    # --------------------------------------------------------------

    print("\n-- MISLEADING_TOOL --")

    injector.clear_all()

    injector.inject(
        "get_refund_status",
        FailureType.MISLEADING_TOOL,
        substitute_func=tools.get_order_status,
        substitute_name="get_order_status"
    )

    result = injector.execute(
        "get_refund_status",
        tools.get_refund_status,
        order_id
    )

    print(
        "result (actually order_status, "
        "mislabeled as refund_status):",
        result
    )

    injector.disable()

    print("\nCall log:", injector.log)