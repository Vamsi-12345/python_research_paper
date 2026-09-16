/* =====================================
   SIMULATION STATE
===================================== */

let failureInjected = false;
let simulationRunning = false;

/*
   Store all animation timers.

   This allows Reset to cancel any steps
   that are still waiting to appear.
*/
let activeTimers = [];


/* =====================================
   DOM ELEMENTS
===================================== */

const trace = document.getElementById("executionTrace");

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
        activeTimers = activeTimers.filter(
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
   SCROLL
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

    step.className = "trace-step";


    let resultClass = "";

    if (type === "failure") {
        resultClass = "trace-failure";
    } else {
        resultClass = "trace-success";
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


    failurePanel.classList.remove("hidden");


    taskStatus.innerText =
        "FAILURE INJECTED";

    taskStatus.style.background =
        "#fff0f0";

    taskStatus.style.color =
        "#c93636";


    executionStatus.innerText =
        "Failure injected into get_refund_status";


    /*
       Reset displayed result cards so the
       next run starts cleanly.
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
   RUN BASELINE
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


    recoveryPanel.classList.add("hidden");


    executionStatus.innerText =
        "Agent A executing...";


    taskStatus.innerText =
        "RUNNING";


    taskStatus.style.background =
        "#eef1f5";

    taskStatus.style.color =
        "#687487";


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


                    if (failureInjected) {

                        /*
                           Agent A fails because it does
                           not detect or recover from
                           the suspicious result.
                        */

                        executionStatus.innerText =
                            "Agent A completed without recovery";


                        taskStatus.innerText =
                            "FAILED";


                        taskStatus.style.background =
                            "#fff0f0";


                        taskStatus.style.color =
                            "#c93636";


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

                    } else {

                        /*
                           Normal run without injected
                           failure.
                        */

                        executionStatus.innerText =
                            "Agent A completed";


                        taskStatus.innerText =
                            "COMPLETED";


                        taskStatus.style.background =
                            "#eaf8f1";


                        taskStatus.style.color =
                            "#278257";


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
   RUN RECOVERY
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
       The failure panel is shown because
       Agent B is demonstrating failure
       detection.
    */

    failurePanel.classList.remove("hidden");

    recoveryPanel.classList.remove("hidden");


    executionStatus.innerText =
        "Agent B executing with failure recovery...";


    taskStatus.innerText =
        "RECOVERING";


    taskStatus.style.background =
        "#fff7e6";

    taskStatus.style.color =
        "#b7791f";


    /*
       Agent B follows the original route,
       detects the failure, backtracks,
       and uses the alternative transaction route.
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

                    executionStatus.innerText =
                        "Agent B successfully recovered";


                    taskStatus.innerText =
                        "RECOVERED";


                    taskStatus.style.background =
                        "#eaf8f1";


                    taskStatus.style.color =
                        "#278257";


                    setText(
                        "recoveryResult",
                        "Recovered successfully using alternative route"
                    );


                    /*
                       Agent B used 8 execution events:
                       5 original tool calls
                       + 1 backtrack
                       + 2 recovery tool calls
                    */

                    setText(
                        "stepsB",
                        "8"
                    );


                    /*
                       Correct final task result.
                    */

                    setText(
                        "accuracyB",
                        "100%"
                    );


                    /*
                       There is ONE actual BACKTRACK
                       event in the execution trace.

                       Previously this was incorrectly
                       displayed as 3.
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
       Cancel every pending animation timer.

       This prevents old steps from appearing
       after Reset.
    */

    cancelActiveTimers();


    /*
       Reset simulation state.
    */

    failureInjected = false;


    /*
       Clear execution trace.
    */

    clearTrace();


    /*
       Hide failure and recovery panels.
    */

    failurePanel.classList.add("hidden");

    recoveryPanel.classList.add("hidden");


    /*
       Reset status text.
    */

    executionStatus.innerText =
        "Waiting...";


    taskStatus.innerText =
        "READY";


    taskStatus.style.background =
        "#eef1f5";


    taskStatus.style.color =
        "#687487";


    /*
       Reset Agent A result.
    */

    setText(
        "baselineResult",
        "Ready to run"
    );


    /*
       Reset Agent B result.
    */

    setText(
        "recoveryResult",
        "Ready to run"
    );


    /*
       Reset accuracy.
    */

    setText(
        "accuracyA",
        "0%"
    );


    setText(
        "accuracyB",
        "0%"
    );


    /*
       Reset tool-call counts.
    */

    setText(
        "stepsA",
        "0"
    );


    setText(
        "stepsB",
        "0"
    );


    /*
       Correct initial backtrack value.

       No agent has run yet, so:
       Backtracks = 0
    */

    setText(
        "backtracks",
        "0"
    );


    /*
       No recovery has happened yet.
    */

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
           Ensure the page starts in a
           completely clean state.
        */

        resetSimulation();

    }
);
