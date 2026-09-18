/* =====================================
   TASK DATA
===================================== */

const tasks = {

    T001: {
        id: "T001",
        title: "Refund Status Retrieval",
        initialState: "account_id = acc_001",
        startState: "account_id",
        minimumSteps: 5
    },

    T002: {
        id: "T002",
        title: "Refund Status Retrieval",
        initialState: "account_id = acc_001",
        startState: "account_id",
        minimumSteps: 5
    },

    T003: {
        id: "T003",
        title: "Refund Status Retrieval",
        initialState: "user_id = user_1",
        startState: "user_id",
        minimumSteps: 4
    },

    T004: {
        id: "T004",
        title: "Refund Status Retrieval",
        initialState: "account_id = acc_001",
        startState: "account_id",
        minimumSteps: 5
    },

    T005: {
        id: "T005",
        title: "Refund Status Retrieval",
        initialState: "account_id = acc_001",
        startState: "account_id",
        minimumSteps: 5
    }

};


/* =====================================
   EXPERIMENT CONFIGURATION
===================================== */

const experimentConfig = {

    T001: {
        injectFailure: true,
        failureType: "Implicit Failure"
    },

    T002: {
        injectFailure: false,
        failureType: null
    },

    T003: {
        injectFailure: true,
        failureType: "Implicit Failure"
    },

    T004: {
        injectFailure: true,
        failureType: "Implicit Failure"
    },

    T005: {
        injectFailure: false,
        failureType: null
    }

};


/* =====================================
   SIMULATION STATE
===================================== */

let failureInjected = false;
let simulationRunning = false;
let baselineHasRun = false;
let activeTimers = [];

let selectedTaskId = "T001";

let experimentResults = {};

/*
   false = single-task mode
   true  = aggregate mode
*/
let aggregateMode = false;


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
   HELPER FUNCTIONS
===================================== */

function getElement(id) {

    return document.getElementById(id);

}


function setText(id, value) {

    const element = getElement(id);

    if (element) {
        element.innerText = value;
    }

}


/* =====================================
   GET CURRENT TASK CONFIGURATION
===================================== */

function getCurrentConfig() {

    return experimentConfig[selectedTaskId] || {
        injectFailure: false,
        failureType: null
    };

}


/* =====================================
   CHECK WHETHER CURRENT TASK HAS
   A CONFIGURED FAILURE
===================================== */

function taskHasConfiguredFailure() {

    const config = getCurrentConfig();

    return config.injectFailure === true;

}


/* =====================================
   ACTIVATE CONFIGURED FAILURE
===================================== */

/*
   Important:
   The experiment configuration is the
   source of truth.

   Therefore, when a failure-configured
   task is run, the failure becomes active
   automatically.

   This prevents the UI from showing
   different behavior depending on whether
   the user clicked "Inject Failure" first.
*/

function activateConfiguredFailure() {

    if (taskHasConfiguredFailure()) {

        failureInjected = true;

    } else {

        failureInjected = false;

    }

}


/* =====================================
   RESET SINGLE-TASK METRICS
===================================== */

function resetSingleTaskMetrics() {

    setText("accuracyA", "0%");
    setText("accuracyB", "0%");

    setText("stepsA", "0");
    setText("stepsB", "0");

    setText("backtracks", "0");
    setText("recoveryRate", "0%");

}


/* =====================================
   TASK SELECTION
===================================== */

function changeTask() {

    if (simulationRunning) {
        return;
    }

    const selector =
        getElement("taskSelect");

    if (!selector) {
        return;
    }

    selectedTaskId =
        selector.value;

    const task =
        tasks[selectedTaskId];

    const config =
        getCurrentConfig();

    if (!task) {
        return;
    }

    /*
       Selecting a task always returns
       the page to single-task mode.
    */

    aggregateMode = false;

    /*
       Do not activate the failure yet.
       It will automatically activate when
       Agent A or Agent B is actually run.
    */

    failureInjected = false;
    baselineHasRun = false;

    setText(
        "taskLabel",
        `TASK ${task.id}`
    );

    setText(
        "taskTitle",
        task.title
    );

    setText(
        "initialState",
        task.initialState
    );

    setText(
        "targetState",
        "refund_status"
    );

    setText(
        "minimumSteps",
        task.minimumSteps
    );

    /*
       This shows the configured experiment
       condition, not whether the failure
       has already been executed.
    */

    setText(
        "injectedFailure",
        config.injectFailure
            ? config.failureType
            : "None"
    );

    clearTrace();

    if (failurePanel) {
        failurePanel.classList.add("hidden");
    }

    if (recoveryPanel) {
        recoveryPanel.classList.add("hidden");
    }

    if (taskStatus) {

        taskStatus.innerText =
            "READY";

        taskStatus.style.background =
            "#eef1f5";

        taskStatus.style.color =
            "#687487";

    }

    if (executionStatus) {

        executionStatus.innerText =
            "Waiting...";

    }

    setText(
        "baselineResult",
        "Ready to run"
    );

    setText(
        "recoveryResult",
        "Ready to run"
    );

    resetSingleTaskMetrics();

}


/* =====================================
   TIMER
===================================== */

function schedule(callback, delay) {

    const timer = setTimeout(() => {

        activeTimers =
            activeTimers.filter(
                item => item !== timer
            );

        if (!simulationRunning) {
            return;
        }

        callback();

    }, delay);

    activeTimers.push(timer);

    return timer;

}


/* =====================================
   CANCEL TIMERS
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

    if (trace) {

        trace.innerHTML = `
            <div class="empty-state">
                Run an agent to view its execution trace.
            </div>
        `;

    }

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

    if (!trace) {
        return;
    }

    /*
       Remove empty-state message when the
       first actual step is displayed.
    */

    const emptyState =
        trace.querySelector(".empty-state");

    if (emptyState) {
        emptyState.remove();
    }

    const step =
        document.createElement("div");

    step.className =
        "trace-step";

    const resultClass =
        type === "failure"
            ? "trace-failure"
            : "trace-success";

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

    step.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });

}


/* =====================================
   FAILURE INJECTION
===================================== */

function injectFailure() {

    if (simulationRunning) {
        return;
    }

    const config =
        getCurrentConfig();

    /*
       Normal control tasks cannot receive
       an injected failure.
    */

    if (!config.injectFailure) {

        failureInjected = false;

        if (executionStatus) {

            executionStatus.innerText =
                "This task is configured as a normal execution case.";

        }

        return;
    }

    aggregateMode = false;

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
   BUILD BASELINE STEPS
===================================== */

function getBaselineSteps(task) {

    const steps = [];

    if (task.startState === "account_id") {

        steps.push({

            tool:
                "get_user_by_account(acc_001)",

            state:
                "user_id",

            result:
                "user_1"

        });

    }

    steps.push({

        tool:
            "get_order_id(user_1)",

        state:
            "order_id",

        result:
            "order_101"

    });

    steps.push({

        tool:
            "get_return_id(order_101)",

        state:
            "return_id",

        result:
            "return_501"

    });

    steps.push({

        tool:
            "get_refund_id(return_501)",

        state:
            "refund_id",

        result:
            "refund_701"

    });

    steps.push({

        tool:
            "get_refund_status(refund_701)",

        state:
            "refund_status",

        result:
            failureInjected
                ? "tuna — IMPLICIT_FAILURE"
                : "processed"

    });

    return steps;

}


/* =====================================
   RUN BASELINE AGENT A
===================================== */

function runBaseline() {

    if (simulationRunning) {
        return;
    }

    aggregateMode = false;

    const task =
        tasks[selectedTaskId];

    /*
       IMPORTANT:
       Automatically activate the failure
       when this task is configured for one.
    */

    activateConfiguredFailure();

    simulationRunning = true;

    clearTrace();

    if (recoveryPanel) {
        recoveryPanel.classList.add("hidden");
    }

    if (failurePanel) {

        if (failureInjected) {
            failurePanel.classList.remove("hidden");
        } else {
            failurePanel.classList.add("hidden");
        }

    }

    if (executionStatus) {

        executionStatus.innerText =
            failureInjected
                ? "Agent A executing with configured failure..."
                : "Agent A executing...";

    }

    if (taskStatus) {

        taskStatus.innerText =
            "RUNNING";

        taskStatus.style.background =
            "#eef1f5";

        taskStatus.style.color =
            "#687487";

    }

    const steps =
        getBaselineSteps(task);

    steps.forEach((step, index) => {

        schedule(() => {

            const failed =
                index === steps.length - 1 &&
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

            if (index === steps.length - 1) {

                schedule(() => {

                    simulationRunning = false;

                    baselineHasRun = true;

                    if (failureInjected) {

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

                        /*
                           SINGLE TASK METRICS
                        */

                        setText(
                            "stepsA",
                            steps.length
                        );

                        setText(
                            "accuracyA",
                            "0%"
                        );

                        /*
                           Do not erase an already completed
                           Agent B result.
                        */

                        const previous =
                            experimentResults[selectedTaskId];

                        setText(
                            "stepsB",
                            previous?.agentB
                                ? previous.agentB.steps
                                : "0"
                        );

                        setText(
                            "accuracyB",
                            previous?.agentB
                                ? previous.agentB.success
                                    ? "100%"
                                    : "0%"
                                : "0%"
                        );

                        setText(
                            "backtracks",
                            previous?.agentB
                                ? previous.agentB.backtracks
                                : "0"
                        );

                        setText(
                            "recoveryRate",
                            previous?.agentB
                                ? previous.agentB.success
                                    ? "100%"
                                    : "0%"
                                : "0%"
                        );

                        experimentResults[selectedTaskId] = {

                            agentA: {
                                success: false,
                                steps: steps.length
                            },

                            agentB:
                                previous?.agentB || null

                        };

                    } else {

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

                        /*
                           SINGLE TASK METRICS
                        */

                        setText(
                            "stepsA",
                            steps.length
                        );

                        setText(
                            "accuracyA",
                            "100%"
                        );

                        const previous =
                            experimentResults[selectedTaskId];

                        setText(
                            "stepsB",
                            previous?.agentB
                                ? previous.agentB.steps
                                : "0"
                        );

                        setText(
                            "accuracyB",
                            previous?.agentB
                                ? previous.agentB.success
                                    ? "100%"
                                    : "0%"
                                : "0%"
                        );

                        setText(
                            "backtracks",
                            previous?.agentB
                                ? previous.agentB.backtracks
                                : "0"
                        );

                        setText(
                            "recoveryRate",
                            "0%"
                        );

                        experimentResults[selectedTaskId] = {

                            agentA: {
                                success: true,
                                steps: steps.length
                            },

                            agentB:
                                previous?.agentB || null

                        };

                    }

                }, 300);

            }

        }, index * 500);

    });

}


/* =====================================
   BUILD RECOVERY STEPS
===================================== */

function getRecoverySteps(task) {

    /*
       No failure:
       Agent B follows the normal route.
    */

    if (!failureInjected) {

        return getBaselineSteps(task);

    }

    const steps = [];

    if (task.startState === "account_id") {

        steps.push({

            tool:
                "get_user_by_account(acc_001)",

            state:
                "user_id",

            result:
                "user_1",

            type:
                "success"

        });

    }

    steps.push({

        tool:
            "get_order_id(user_1)",

        state:
            "order_id",

        result:
            "order_101",

        type:
            "success"

    });

    steps.push({

        tool:
            "get_return_id(order_101)",

        state:
            "return_id",

        result:
            "return_501",

        type:
            "success"

    });

    steps.push({

        tool:
            "get_refund_id(return_501)",

        state:
            "refund_id",

        result:
            "refund_701",

        type:
            "success"

    });

    steps.push({

        tool:
            "get_refund_status(refund_701)",

        state:
            "refund_status",

        result:
            "tuna — IMPLICIT_FAILURE",

        type:
            "failure"

    });

    steps.push({

        tool:
            "BACKTRACK",

        state:
            "order_id",

        result:
            "Previous route rejected",

        type:
            "failure"

    });

    steps.push({

        tool:
            "get_transaction_id(order_101)",

        state:
            "transaction_id",

        result:
            "txn_901",

        type:
            "success"

    });

    steps.push({

        tool:
            "get_refund_status_by_transaction(txn_901)",

        state:
            "refund_status",

        result:
            "refunded",

        type:
            "success"

    });

    return steps;

}


/* =====================================
   RUN RECOVERY AGENT B
===================================== */

function runRecovery() {

    if (simulationRunning) {
        return;
    }

    aggregateMode = false;

    const task =
        tasks[selectedTaskId];

    /*
       IMPORTANT:
       Automatically activate the configured
       failure for Agent B as well.
    */

    activateConfiguredFailure();

    simulationRunning = true;

    clearTrace();

    if (recoveryPanel) {
        recoveryPanel.classList.remove("hidden");
    }

    if (failurePanel) {

        if (failureInjected) {
            failurePanel.classList.remove("hidden");
        } else {
            failurePanel.classList.add("hidden");
        }

    }

    if (executionStatus) {

        executionStatus.innerText =
            failureInjected
                ? "Agent B executing with failure recovery..."
                : "Agent B executing...";

    }

    if (taskStatus) {

        taskStatus.innerText =
            failureInjected
                ? "RECOVERING"
                : "RUNNING";

        taskStatus.style.background =
            failureInjected
                ? "#fff7e6"
                : "#eef1f5";

        taskStatus.style.color =
            failureInjected
                ? "#b7791f"
                : "#687487";

    }

    const steps =
        getRecoverySteps(task);

    steps.forEach((step, index) => {

        schedule(() => {

            addStep(
                index + 1,
                step.tool,
                step.state,
                step.result,
                step.type
            );

            if (index === steps.length - 1) {

                schedule(() => {

                    simulationRunning = false;

                    if (executionStatus) {

                        executionStatus.innerText =
                            failureInjected
                                ? "Agent B successfully recovered"
                                : "Agent B completed";

                    }

                    if (taskStatus) {

                        taskStatus.innerText =
                            failureInjected
                                ? "RECOVERED"
                                : "COMPLETED";

                        taskStatus.style.background =
                            "#eaf8f1";

                        taskStatus.style.color =
                            "#278257";

                    }

                    setText(
                        "recoveryResult",
                        failureInjected
                            ? "Recovered successfully using alternative route"
                            : "Completed"
                    );

                    /*
                       SINGLE TASK METRICS
                    */

                    setText(
                        "stepsB",
                        steps.length
                    );

                    setText(
                        "accuracyB",
                        "100%"
                    );

                    const backtracks =
                        failureInjected
                            ? 1
                            : 0;

                    setText(
                        "backtracks",
                        backtracks
                    );

                    setText(
                        "recoveryRate",
                        failureInjected
                            ? "100%"
                            : "0%"
                    );

                    /*
                       Keep Agent A result if it
                       was already executed.
                    */

                    const previous =
                        experimentResults[selectedTaskId];

                    setText(
                        "accuracyA",
                        previous?.agentA
                            ? previous.agentA.success
                                ? "100%"
                                : "0%"
                            : "0%"
                    );

                    setText(
                        "stepsA",
                        previous?.agentA
                            ? previous.agentA.steps
                            : "0"
                    );

                    experimentResults[selectedTaskId] = {

                        agentA:
                            previous?.agentA || null,

                        agentB: {

                            success: true,

                            steps:
                                steps.length,

                            backtracks:
                                backtracks

                        }

                    };

                }, 400);

            }

        }, index * 500);

    });

}


/* =====================================
   RUN ALL 5 TASKS
===================================== */

function runAllTasks() {

    if (simulationRunning) {
        return;
    }

    cancelActiveTimers();

    aggregateMode = true;

    const taskIds =
        Object.keys(tasks);

    let agentASuccess = 0;
    let agentBSuccess = 0;

    let agentASteps = 0;
    let agentBSteps = 0;

    let agentBBacktracks = 0;

    experimentResults = {};

    taskIds.forEach(taskId => {

        const task =
            tasks[taskId];

        const config =
            experimentConfig[taskId];

        const baselineSteps =
            getBaselineStepsForAggregate(task);

        const recoverySteps =
            getRecoveryStepsForAggregate(
                task,
                config.injectFailure
            );

        /*
           Agent A succeeds only when there
           is no injected failure.
        */

        const baselineSuccess =
            !config.injectFailure;

        /*
           Agent B recovers from all configured
           failure cases in this experiment.
        */

        const recoverySuccess =
            true;

        const backtracks =
            config.injectFailure
                ? 1
                : 0;

        experimentResults[taskId] = {

            agentA: {

                success:
                    baselineSuccess,

                steps:
                    baselineSteps

            },

            agentB: {

                success:
                    recoverySuccess,

                steps:
                    recoverySteps,

                backtracks:
                    backtracks

            }

        };

        if (baselineSuccess) {
            agentASuccess++;
        }

        if (recoverySuccess) {
            agentBSuccess++;
        }

        agentASteps +=
            baselineSteps;

        agentBSteps +=
            recoverySteps;

        agentBBacktracks +=
            backtracks;

    });


    const total =
        taskIds.length;


    const accuracyA =
        Math.round(
            (agentASuccess / total) * 100
        );


    const accuracyB =
        Math.round(
            (agentBSuccess / total) * 100
        );


    const averageStepsA =
        (
            agentASteps /
            total
        ).toFixed(1);


    const averageStepsB =
        (
            agentBSteps /
            total
        ).toFixed(1);


    const failedTasks =
        taskIds.filter(
            taskId =>
                experimentConfig[taskId].injectFailure
        ).length;


    const recoveredFailedTasks =
        taskIds.filter(
            taskId =>
                experimentConfig[taskId].injectFailure &&
                experimentResults[taskId].agentB.success
        ).length;


    const recoveryRate =
        failedTasks === 0
            ? 0
            : Math.round(
                (
                    recoveredFailedTasks /
                    failedTasks
                ) * 100
            );


    /* =================================
       UPDATE AGGREGATE METRICS
    ================================= */

    setText(
        "accuracyA",
        `${accuracyA}%`
    );

    setText(
        "accuracyB",
        `${accuracyB}%`
    );

    setText(
        "stepsA",
        averageStepsA
    );

    setText(
        "stepsB",
        averageStepsB
    );

    setText(
        "backtracks",
        agentBBacktracks
    );

    setText(
        "recoveryRate",
        `${recoveryRate}%`
    );


    setText(
        "baselineResult",
        `${total} tasks evaluated`
    );

    setText(
        "recoveryResult",
        `Recovered ${recoveredFailedTasks}/${failedTasks} failed tasks`
    );


    showAggregateResults(
        taskIds,
        accuracyA,
        accuracyB,
        averageStepsA,
        averageStepsB,
        agentBBacktracks,
        recoveryRate
    );

}


/* =====================================
   AGGREGATE BASELINE STEPS
===================================== */

function getBaselineStepsForAggregate(task) {

    if (task.startState === "user_id") {
        return 4;
    }

    return 5;

}


/* =====================================
   AGGREGATE RECOVERY STEPS
===================================== */

function getRecoveryStepsForAggregate(
    task,
    hasFailure
) {

    if (!hasFailure) {

        if (task.startState === "user_id") {
            return 4;
        }

        return 5;

    }

    if (task.startState === "user_id") {
        return 7;
    }

    return 8;

}


/* =====================================
   AGGREGATE RESULT DISPLAY
===================================== */

function showAggregateResults(
    taskIds,
    accuracyA,
    accuracyB,
    averageStepsA,
    averageStepsB,
    totalBacktracks,
    recoveryRate
) {

    let panel =
        document.getElementById(
            "aggregateResults"
        );


    if (!panel) {

        panel =
            document.createElement("div");

        panel.id =
            "aggregateResults";

        panel.className =
            "comparison-table-wrapper";

        const comparison =
            document.getElementById(
                "comparison"
            );

        if (comparison) {
            comparison.appendChild(panel);
        }

    }


    let rows = "";


    taskIds.forEach(taskId => {

        const result =
            experimentResults[taskId];


        rows += `

            <tr>

                <td>${taskId}</td>

                <td>
                    ${
                        result.agentA.success
                            ? "Success"
                            : "Failed"
                    }
                </td>

                <td>
                    ${result.agentA.steps}
                </td>

                <td>
                    ${
                        result.agentB.success
                            ? "Success"
                            : "Failed"
                    }
                </td>

                <td>
                    ${result.agentB.steps}
                </td>

                <td>
                    ${result.agentB.backtracks}
                </td>

            </tr>

        `;

    });


    panel.innerHTML = `

        <h3 style="margin-bottom: 15px;">
            5-Task Experimental Results
        </h3>

        <table>

            <thead>

                <tr>

                    <th>Task</th>

                    <th>Agent A</th>

                    <th>A Steps</th>

                    <th>Agent B</th>

                    <th>B Steps</th>

                    <th>Backtracks</th>

                </tr>

            </thead>

            <tbody>

                ${rows}

            </tbody>

        </table>

        <div style="
            padding: 20px;
            margin-top: 15px;
            line-height: 1.8;
        ">

            <strong>Aggregate Results</strong><br>

            Agent A Accuracy:
            ${accuracyA}%<br>

            Agent B Accuracy:
            ${accuracyB}%<br>

            Agent A Average Steps:
            ${averageStepsA}<br>

            Agent B Average Steps:
            ${averageStepsB}<br>

            Agent B Total Backtracks:
            ${totalBacktracks}<br>

            Recovery Rate:
            ${recoveryRate}%

        </div>

    `;

}


/* =====================================
   RESET
===================================== */

function resetSimulation() {

    simulationRunning = false;

    cancelActiveTimers();

    failureInjected = false;

    baselineHasRun = false;

    aggregateMode = false;

    clearTrace();


    if (failurePanel) {
        failurePanel.classList.add("hidden");
    }

    if (recoveryPanel) {
        recoveryPanel.classList.add("hidden");
    }


    if (executionStatus) {

        executionStatus.innerText =
            "Waiting...";

    }


    if (taskStatus) {

        taskStatus.innerText =
            "READY";

        taskStatus.style.background =
            "#eef1f5";

        taskStatus.style.color =
            "#687487";

    }


    setText(
        "baselineResult",
        "Ready to run"
    );

    setText(
        "recoveryResult",
        "Ready to run"
    );


    resetSingleTaskMetrics();


    const aggregate =
        document.getElementById(
            "aggregateResults"
        );

    if (aggregate) {
        aggregate.remove();
    }


    experimentResults = {};


    if (trace) {

        trace.innerHTML = `

            <div class="empty-state">
                Run an agent to view its execution trace.
            </div>

        `;

    }

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

        selectedTaskId =
            "T001";

        resetSimulation();

        const selector =
            getElement("taskSelect");

        if (selector) {
            selector.value = "T001";
        }

        changeTask();

    }
);
