/* =====================================
   SIMULATION STATE
===================================== */

let failureInjected = false;
let simulationRunning = false;


/* =====================================
   DOM ELEMENTS
===================================== */

const trace = document.getElementById("executionTrace");

const taskStatus = document.getElementById("taskStatus");

const executionStatus =
    document.getElementById("executionStatus");

const failurePanel =
    document.getElementById("failurePanel");

const recoveryPanel =
    document.getElementById("recoveryPanel");


/* =====================================
   SCROLL
===================================== */

function scrollToSimulation() {

    document
        .getElementById("simulation")
        .scrollIntoView({
            behavior: "smooth"
        });

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

    const step = document.createElement("div");

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

}


/* =====================================
   FAILURE INJECTION
===================================== */

function injectFailure() {

    failureInjected = true;

    failurePanel.classList.remove("hidden");

    taskStatus.innerText = "FAILURE INJECTED";

    taskStatus.style.background = "#fff0f0";
    taskStatus.style.color = "#c93636";

    executionStatus.innerText =
        "Failure injected into get_refund_status";

}


/* =====================================
   RUN BASELINE
===================================== */

function runBaseline() {

    simulationRunning = true;

    clearTrace();

    recoveryPanel.classList.add("hidden");

    executionStatus.innerText =
        "Agent A executing...";

    taskStatus.innerText =
        "RUNNING";

    const steps = [

        {
            tool: "get_user_by_account(acc_001)",
            state: "user_id",
            result: "user_1"
        },

        {
            tool: "get_order_id(user_1)",
            state: "order_id",
            result: "order_101"
        },

        {
            tool: "get_return_id(order_101)",
            state: "return_id",
            result: "return_501"
        },

        {
            tool: "get_refund_id(return_501)",
            state: "refund_id",
            result: "refund_701"
        },

        {
            tool: "get_refund_status(refund_701)",
            state: "refund_status",
            result: failureInjected
                ? "tuna — suspicious result"
                : "processed"
        }

    ];


    steps.forEach((step, index) => {

        setTimeout(() => {

            const failed =
                index === 4 && failureInjected;

            addStep(
                index + 1,
                step.tool,
                step.state,
                step.result,
                failed ? "failure" : "success"
            );


            if (index === steps.length - 1) {

                setTimeout(() => {

                    executionStatus.innerText =
                        failureInjected
                            ? "Agent A completed without recovery"
                            : "Agent A completed";

                    taskStatus.innerText =
                        failureInjected
                            ? "FAILED"
                            : "COMPLETED";

                    taskStatus.style.background =
                        failureInjected
                            ? "#fff0f0"
                            : "#eaf8f1";

                    taskStatus.style.color =
                        failureInjected
                            ? "#c93636"
                            : "#278257";

                    document.getElementById(
                        "baselineResult"
                    ).innerText =
                        failureInjected
                            ? "Failed — returned suspicious value"
                            : "Completed";

                    document.getElementById(
                        "stepsA"
                    ).innerText = "5";

                    document.getElementById(
                        "accuracyA"
                    ).innerText =
                        failureInjected ? "0%" : "100%";

                }, 300);

            }

        }, index * 500);

    });

}


/* =====================================
   RUN RECOVERY
===================================== */

function runRecovery() {

    simulationRunning = true;

    clearTrace();

    failurePanel.classList.remove("hidden");

    recoveryPanel.classList.remove("hidden");

    executionStatus.innerText =
        "Agent B executing with failure recovery...";

    taskStatus.innerText =
        "RECOVERING";

    const steps = [

        {
            tool: "get_user_by_account(acc_001)",
            state: "user_id",
            result: "user_1",
            type: "success"
        },

        {
            tool: "get_order_id(user_1)",
            state: "order_id",
            result: "order_101",
            type: "success"
        },

        {
            tool: "get_return_id(order_101)",
            state: "return_id",
            result: "return_501",
            type: "success"
        },

        {
            tool: "get_refund_id(return_501)",
            state: "refund_id",
            result: "refund_701",
            type: "success"
        },

        {
            tool: "get_refund_status(refund_701)",
            state: "refund_status",
            result: "tuna — NON_PROGRESS",
            type: "failure"
        },

        {
            tool: "BACKTRACK",
            state: "order_id",
            result: "Previous route rejected",
            type: "failure"
        },

        {
            tool: "get_transaction_id(order_101)",
            state: "transaction_id",
            result: "txn_901",
            type: "success"
        },

        {
            tool: "get_refund_status_by_transaction(txn_901)",
            state: "refund_status",
            result: "refunded",
            type: "success"
        }

    ];


    steps.forEach((step, index) => {

        setTimeout(() => {

            addStep(
                index + 1,
                step.tool,
                step.state,
                step.result,
                step.type
            );


            if (index === steps.length - 1) {

                setTimeout(() => {

                    executionStatus.innerText =
                        "Agent B successfully recovered";

                    taskStatus.innerText =
                        "RECOVERED";

                    taskStatus.style.background =
                        "#eaf8f1";

                    taskStatus.style.color =
                        "#278257";

                    document.getElementById(
                        "recoveryResult"
                    ).innerText =
                        "Recovered successfully using alternative route";

                    document.getElementById(
                        "stepsB"
                    ).innerText = "8";

                    document.getElementById(
                        "accuracyB"
                    ).innerText = "100%";

                    document.getElementById(
                        "backtracks"
                    ).innerText = "3";

                }, 400);

            }

        }, index * 500);

    });

}


/* =====================================
   RESET
===================================== */

function resetSimulation() {

    failureInjected = false;

    simulationRunning = false;

    clearTrace();

    failurePanel.classList.add("hidden");

    recoveryPanel.classList.add("hidden");

    executionStatus.innerText =
        "Waiting...";

    taskStatus.innerText =
        "READY";

    taskStatus.style.background =
        "#eef1f5";

    taskStatus.style.color =
        "#687487";


    document.getElementById(
        "baselineResult"
    ).innerText =
        "Ready to run";

    document.getElementById(
        "recoveryResult"
    ).innerText =
        "Ready to run";


    document.getElementById(
        "accuracyA"
    ).innerText = "0%";

    document.getElementById(
        "accuracyB"
    ).innerText = "0%";

    document.getElementById(
        "stepsA"
    ).innerText = "0";

    document.getElementById(
        "stepsB"
    ).innerText = "0";

    document.getElementById(
        "backtracks"
    ).innerText = "3";

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

    }
);
