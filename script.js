/* =====================================
   SIMULATION STATE
===================================== */

let failureInjected = false;
let simulationRunning = false;

/*
   Tracks whether Agent A has already
   completed at least one run.

   This is important because the Reset
   button should clear the current trace,
   but should NOT erase Agent A's result
   when we are preparing to test Agent B.
*/
let baselineHasRun = false;


/*
   Store all animation timers.

   This allows Reset to cancel any steps
   that are still waiting to appear.
*/
let activeTimers = [];


/* =====================================
   DOM ELEMENTS
===================================== */

const trace =
    document.getElementById("executionTrace");

const taskStatus =
    document.getElementById("taskStatus");

const executionStatus =
    document.getElementById("executionStatus");

const failurePanel =
    document.getElementById("failurePanel");

const recoveryPanel =
    document.getElementById("recoveryPanel");


/* =====================================
   HELPER: GET ELEMENT
===================================== */

function getElement(id) {
    return document.getElementById(id);
}


/* =====================================
   HELPER: SET TEXT
===================================== */

function setText(id, value) {

    const element = getElement(id);

    if (element) {
        element.innerText = value;
    }
}


/* =====================================
   HELPER: TIMER
===================================== */

function schedule(callback, delay) {

    const timer = setTimeout(() => {

        /*
           Remove timer after execution.
        */

        activeTimers =
            activeTimers.filter(
                item => item !== timer
            );


        /*
           Do not execute old callbacks
           after Reset.
        */

        if (!simulationRunning) {
            return;
        }


        callback();

    }, delay);


    activeTimers.push(timer);

    return timer;
}


/* =====================================
   CANCEL ACTIVE TIMERS
===================================== */

function cancelActiveTimers() {

    activeTimers.forEach(timer => {
        clearTimeout(timer);
    });

    activeTimers = [];
}


/* =====================================
   SCROLL TO SIMULATION
===================================== */

function scrollToSimulation() {

    const simulation =
        document.getElementById("simulation");

    if (simulation) {

        simulation.scrollIntoView({
            behavior: "smooth"
        });

    }
}


/* =====================================
   CLEAR TRACE
===================================== */

function clearTrace() {

    trace.innerHTML = "";
}


/* =====================================
   ADD TRACE STEP
===================================== */

function addStep(
    number,
    tool,
    state,
    result,
    type = "success"
) {

    const step =
        document.createElement("div");


    step.className =
        "trace-step";


    let resultClass;


    if (type === "failure") {

        resultClass =
            "trace-failure";

    } else {

        resultClass =
            "trace-success";

    }


    step.innerHTML = `

        <div class="trace-number">
            ${number}
        </div>

        <div class="trace-content">

            <div class="trace-tool">
                ${tool}
            </div>

            <div class="trace-state">
                State → ${state}
            </div>

            <div class="${resultClass}">
                ${result}
            </div>

        </div>

    `;


    trace.appendChild(step);


    /*
       Automatically scroll the latest
       execution step into view.
    */

    step.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}


/* =====================================
   FAILURE INJECTION
===================================== */

function injectFailure() {

    /*
       Do not inject another failure while
       an agent is already executing.
    */

    if (simulationRunning) {
        return;
    }


    failureInjected = true;


    if (failurePanel) {
        failurePanel.classList.remove("hidden");
    }


    if (taskStatus) {

        taskStatus.innerText =
            "FAILURE INJECTED";


        taskStatus.style.background =
            "#fff0f0";


        taskStatus.style.color =
            "#c93636";
    }


    if (executionStatus) {

        executionStatus.innerText =
            "Failure injected into get_refund_status";

    }


    /*
       Update result cards.

       IMPORTANT:
       We do NOT reset Agent A's metrics here.
    */

    setText(
        "baselineResult",
        "Failure ready to test"
    );


    setText(
        "recoveryResult",
        "Failure ready to test"
    );
}


/* =====================================
   RUN BASELINE AGENT A
===================================== */

function runBaseline() {

    /*
       Prevent multiple simultaneous runs.
    */

    if (simulationRunning) {
        return;
    }


    simulationRunning = true;


    clearTrace();


    if (recoveryPanel) {
        recoveryPanel.classList.add("hidden");
    }


    if (executionStatus) {

        executionStatus.innerText =
            "Agent A executing...";

    }


    if (taskStatus) {

        taskStatus.innerText =
            "RUNNING";


        taskStatus.style.background =
            "#eef1f5";


        taskStatus.style.color =
            "#687487";
    }


    /*
       Agent A follows only the original route.

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
    */

    const steps = [

        {
            tool:
                "get_user_by_account(acc_001)",

            state:
                "user_id",

            result:
                "user_1"
        },


        {
            tool:
                "get_order_id(user_1)",

            state:
                "order_id",

            result:
                "order_101"
        },


        {
            tool:
                "get_return_id(order_101)",

            state:
                "return_id",

            result:
                "return_501"
        },


        {
            tool:
                "get_refund_id(return_501)",

            state:
                "refund_id",

            result:
                "refund_701"
        },


        {
            tool:
                "get_refund_status(refund_701)",

            state:
                "refund_status",

            result:
                failureInjected
                    ? "tuna — suspicious result"
                    : "processed"
        }

    ];


    steps.forEach((step, index) => {

        schedule(() => {

            const failed =
                index === 4 &&
                failureInjected;


            addStep(
                index + 1,
                step.tool,
                step.state,
                step.result,
                failed
                    ? "failure"
                    : "success"
            );


            /*
               Final Agent A result.
            */

            if (index === steps.length - 1) {

                schedule(() => {

                    simulationRunning = false;


                    /*
                       Agent A has now completed.
                    */

                    baselineHasRun = true;


                    if (failureInjected) {

                        /*
                           Agent A does not detect or
                           recover from the suspicious
                           result.
                        */

                        if (executionStatus) {

                            executionStatus.innerText =
                                "Agent A completed without recovery";

                        }


                        if (taskStatus) {

                            taskStatus.innerText =
                                "FAILED";


                            taskStatus.style.background =
                                "#fff0f0";


                            taskStatus.style.color =
                                "#c93636";
                        }


                        setText(
                            "baselineResult",
                            "Failed — returned suspicious value"
                        );


                        setText(
                            "stepsA",
                            "5"
                        );


                        setText(
                            "accuracyA",
                            "0%"
                        );


                        /*
                           Agent A does not recover.
                        */

                        setText(
                            "recoveryRateA",
                            "0%"
                        );

                    } else {

                        /*
                           Normal run without injected
                           failure.
                        */

                        if (executionStatus) {

                            executionStatus.innerText =
                                "Agent A completed";

                        }


                        if (taskStatus) {

                            taskStatus.innerText =
                                "COMPLETED";


                            taskStatus.style.background =
                                "#eaf8f1";


                            taskStatus.style.color =
                                "#278257";
                        }


                        setText(
                            "baselineResult",
                            "Completed"
                        );


                        setText(
                            "stepsA",
                            "5"
                        );


                        setText(
                            "accuracyA",
                            "100%"
                        );

                    }

                }, 300);

            }

        }, index * 500);

    });
}


/* =====================================
   RUN RECOVERY AGENT B
===================================== */

function runRecovery() {

    /*
       Prevent multiple simultaneous runs.
    */

    if (simulationRunning) {
        return;
    }


    simulationRunning = true;


    clearTrace();


    /*
       Agent B demonstrates failure-aware
       recovery.
    */

    if (failurePanel) {
        failurePanel.classList.remove("hidden");
    }


    if (recoveryPanel) {
        recoveryPanel.classList.remove("hidden");
    }


    if (executionStatus) {

        executionStatus.innerText =
            "Agent B executing with failure recovery...";

    }


    if (taskStatus) {

        taskStatus.innerText =
            "RECOVERING";


        taskStatus.style.background =
            "#fff7e6";


        taskStatus.style.color =
            "#b7791f";
    }


    /*
       Agent B route:

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
           ↓
       FAILURE DETECTED
           ↓
       BACKTRACK
           ↓
       transaction_id
           ↓
       refund_status
    */

    const steps = [

        {
            tool:
                "get_user_by_account(acc_001)",

            state:
                "user_id",

            result:
                "user_1",

            type:
                "success"
        },


        {
            tool:
                "get_order_id(user_1)",

            state:
                "order_id",

            result:
                "order_101",

            type:
                "success"
        },


        {
            tool:
                "get_return_id(order_101)",

            state:
                "return_id",

            result:
                "return_501",

            type:
                "success"
        },


        {
            tool:
                "get_refund_id(return_501)",

            state:
                "refund_id",

            result:
                "refund_701",

            type:
                "success"
        },


        {
            tool:
                "get_refund_status(refund_701)",

            state:
                "refund_status",

            result:
                "tuna — NON_PROGRESS",

            type:
                "failure"
        },


        {
            tool:
                "BACKTRACK",

            state:
                "order_id",

            result:
                "Previous route rejected",

            type:
                "failure"
        },


        {
            tool:
                "get_transaction_id(order_101)",

            state:
                "transaction_id",

            result:
                "txn_901",

            type:
                "success"
        },


        {
            tool:
                "get_refund_status_by_transaction(txn_901)",

            state:
                "refund_status",

            result:
                "refunded",

            type:
                "success"
        }

    ];


    steps.forEach((step, index) => {

        schedule(() => {

            addStep(
                index + 1,
                step.tool,
                step.state,
                step.result,
                step.type
            );


            /*
               Final recovery result.
            */

            if (index === steps.length - 1) {

                schedule(() => {

                    simulationRunning = false;


                    /*
                       Agent B successfully reached
                       the correct target state.
                    */

                    if (executionStatus) {

                        executionStatus.innerText =
                            "Agent B successfully recovered";

                    }


                    if (taskStatus) {

                        taskStatus.innerText =
                            "RECOVERED";


                        taskStatus.style.background =
                            "#eaf8f1";


                        taskStatus.style.color =
                            "#278257";
                    }


                    setText(
                        "recoveryResult",
                        "Recovered successfully using alternative route"
                    );


                    /*
                       Agent B execution:

                       5 original tool calls
                       + 1 backtrack
                       + 2 recovery calls

                       Total = 8 execution steps
                    */

                    setText(
                        "stepsB",
                        "8"
                    );


                    /*
                       Agent B reached the correct
                       final result.
                    */

                    setText(
                        "accuracyB",
                        "100%"
                    );


                    /*
                       Exactly ONE backtrack.
                    */

                    setText(
                        "backtracks",
                        "1"
                    );


                    /*
                       Recovery succeeded.
                    */

                    setText(
                        "recoveryRate",
                        "100%"
                    );

                }, 400);

            }

        }, index * 500);

    });
}


/* =====================================
   RESET
===================================== */

function resetSimulation() {

    /*
       Stop the current simulation.
    */

    simulationRunning = false;


    /*
       Cancel all pending animation timers.
    */

    cancelActiveTimers();


    /*
       Reset only the CURRENT simulation state.

       Important:
       failureInjected becomes false,
       but Agent A's completed comparison
       metrics are preserved.
    */

    failureInjected = false;


    /*
       Clear execution trace.
    */

    clearTrace();


    /*
       Hide failure and recovery panels.
    */

    if (failurePanel) {
        failurePanel.classList.add("hidden");
    }


    if (recoveryPanel) {
        recoveryPanel.classList.add("hidden");
    }


    /*
       Reset execution status.
    */

    if (executionStatus) {

        executionStatus.innerText =
            "Waiting...";

    }


    /*
       Reset task status.
    */

    if (taskStatus) {

        taskStatus.innerText =
            "READY";


        taskStatus.style.background =
            "#eef1f5";


        taskStatus.style.color =
            "#687487";
    }


    /*
       Reset result messages.

       These are only status messages;
       Agent A's actual metrics are preserved.
    */

    setText(
        "baselineResult",
        baselineHasRun
            ? "Previous result preserved"
            : "Ready to run"
    );


    setText(
        "recoveryResult",
        "Ready to run"
    );


    /*
       IMPORTANT:

       If Agent A has NOT been run yet,
       initialize Agent A metrics.

       If Agent A HAS already been run,
       DO NOT overwrite its metrics.

       This fixes the problem where:

       Test 1:
       Agent A = 0%, 5 steps

       Reset

       Test 2:
       Agent A was incorrectly changed
       to 0 steps.
    */

    if (!baselineHasRun) {

        setText(
            "accuracyA",
            "0%"
        );


        setText(
            "stepsA",
            "0"
        );

    }


    /*
       Agent B is reset because we are preparing
       for a new recovery test.
    */

    setText(
        "accuracyB",
        "0%"
    );


    setText(
        "stepsB",
        "0"
    );


    setText(
        "backtracks",
        "0"
    );


    setText(
        "recoveryRate",
        "0%"
    );


    /*
       Restore empty trace message.
    */

    trace.innerHTML = `

        <div class="empty-state">
            Run an agent to view its execution trace.
        </div>

    `;
}


/* =====================================
   INITIALIZATION
===================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "Adaptive Tool-Use Agent UI loaded."
        );


        /*
           First page load.

           baselineHasRun is false, so
           all metrics start from zero.
        */

        baselineHasRun = false;


        resetSimulation();

    }
);
