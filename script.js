"use strict";

/*
========================================================
ADAPTIVE TOOL-USE AGENT
Frontend Simulation Controller
========================================================

Agent A = Baseline
Agent B = Failure-Aware Recovery

This frontend mirrors the Python experiment configuration.

T001 -> Failure
T002 -> Normal
T003 -> Failure
T004 -> Failure
T005 -> Normal
========================================================
*/


/* ======================================================
   TASK CONFIGURATION
====================================================== */

const taskConfig = {

    T001: {
        title: "Refund Status Retrieval",
        initialState: "account_id = acc_001",
        startState: "account_id",
        targetState: "refund_status",
        minimumSteps: 5,
        injectFailure: true,
        failureTool: "get_refund_status",
        failureType: "IMPLICIT_FAILURE"
    },

    T002: {
        title: "Refund Status Retrieval",
        initialState: "account_id = acc_001",
        startState: "account_id",
        targetState: "refund_status",
        minimumSteps: 5,
        injectFailure: false,
        failureTool: null,
        failureType: null
    },

    T003: {
        title: "Refund Status Retrieval",
        initialState: "user_id = user_1",
        startState: "user_id",
        targetState: "refund_status",
        minimumSteps: 4,
        injectFailure: true,
        failureTool: "get_refund_status",
        failureType: "IMPLICIT_FAILURE"
    },

    T004: {
        title: "Refund Status Retrieval",
        initialState: "account_id = acc_001",
        startState: "account_id",
        targetState: "refund_status",
        minimumSteps: 5,
        injectFailure: true,
        failureTool: "get_refund_status",
        failureType: "IMPLICIT_FAILURE"
    },

    T005: {
        title: "Refund Status Retrieval",
        initialState: "account_id = acc_001",
        startState: "account_id",
        targetState: "refund_status",
        minimumSteps: 5,
        injectFailure: false,
        failureTool: null,
        failureType: null
    }

};


/* ======================================================
   EXPERIMENT RESULTS
====================================================== */

const experimentResults = {

    T001: {
        agentA: {
            success: false,
            steps: 5,
            backtracks: 0,
            recovery: 0
        },

        agentB: {
            success: true,
            steps: 8,
            backtracks: 1,
            recovery: 100
        }
    },

    T002: {
        agentA: {
            success: true,
            steps: 5,
            backtracks: 0,
            recovery: null
        },

        agentB: {
            success: true,
            steps: 5,
            backtracks: 0,
            recovery: null
        }
    },

    T003: {
        agentA: {
            success: false,
            steps: 4,
            backtracks: 0,
            recovery: 0
        },

        agentB: {
            success: true,
            steps: 7,
            backtracks: 1,
            recovery: 100
        }
    },

    T004: {
        agentA: {
            success: false,
            steps: 5,
            backtracks: 0,
            recovery: 0
        },

        agentB: {
            success: true,
            steps: 8,
            backtracks: 1,
            recovery: 100
        }
    },

    T005: {
        agentA: {
            success: true,
            steps: 5,
            backtracks: 0,
            recovery: null
        },

        agentB: {
            success: true,
            steps: 5,
            backtracks: 0,
            recovery: null
        }
    }

};


/* ======================================================
   CURRENT SIMULATION STATE
====================================================== */

let currentTaskId = "T001";

let simulationState = {
    failureInjected: false,
    lastAgent: null,
    agentAResult: null,
    agentBResult: null,
    aggregateMode: false
};


/* ======================================================
   DOM HELPER FUNCTIONS
====================================================== */

function getElement(id) {
    return document.getElementById(id);
}


function setText(id, value) {

    const element = getElement(id);

    if (element) {
        element.textContent = value;
    }
}


function setHTML(id, html) {

    const element = getElement(id);

    if (element) {
        element.innerHTML = html;
    }
}


/* ======================================================
   TASK FUNCTIONS
====================================================== */

function getCurrentConfig() {

    return taskConfig[currentTaskId];
}


function getCurrentTask() {

    return {
        taskId: currentTaskId,
        ...getCurrentConfig()
    };
}


/* ======================================================
   INITIALIZE TASK DROPDOWN
====================================================== */

function initializeTaskDropdown() {

    const select = getElement("taskSelect");

    if (!select) {
        return;
    }

    select.innerHTML = "";

    Object.keys(taskConfig).forEach(taskId => {

        const option = document.createElement("option");

        option.value = taskId;

        option.textContent =
            `${taskId} — ${taskConfig[taskId].title}`;

        select.appendChild(option);
    });

    select.value = currentTaskId;

    select.addEventListener("change", function () {

        currentTaskId = this.value;

        resetSimulation();

    });

}


/* ======================================================
   NORMAL ROUTE
====================================================== */

function getNormalTrace(taskId) {

    if (taskId === "T003") {

        return [

            {
                number: 1,
                tool: "get_order_id(user_1)",
                state: "order_id",
                value: "order_101"
            },

            {
                number: 2,
                tool: "get_return_id(order_101)",
                state: "return_id",
                value: "return_501"
            },

            {
                number: 3,
                tool: "get_refund_id(return_501)",
                state: "refund_id",
                value: "refund_701"
            },

            {
                number: 4,
                tool: "get_refund_status(refund_701)",
                state: "refund_status",
                value: "processed"
            }

        ];

    }


    return [

        {
            number: 1,
            tool: "get_user_by_account(acc_001)",
            state: "user_id",
            value: "user_1"
        },

        {
            number: 2,
            tool: "get_order_id(user_1)",
            state: "order_id",
            value: "order_101"
        },

        {
            number: 3,
            tool: "get_return_id(order_101)",
            state: "return_id",
            value: "return_501"
        },

        {
            number: 4,
            tool: "get_refund_id(return_501)",
            state: "refund_id",
            value: "refund_701"
        },

        {
            number: 5,
            tool: "get_refund_status(refund_701)",
            state: "refund_status",
            value: "processed"
        }

    ];

}


/* ======================================================
   FAILURE TRACE
====================================================== */

function getFailureTrace(taskId) {

    const normalTrace = getNormalTrace(taskId);

    const failureTrace = normalTrace.map(step => ({
        ...step
    }));

    const lastStep = failureTrace[failureTrace.length - 1];

    lastStep.value = "tuna";
    lastStep.failure = true;
    lastStep.classification = "IMPLICIT_FAILURE";

    return failureTrace;
}


/* ======================================================
   RECOVERY TRACE
====================================================== */

function getRecoveryTrace(taskId) {

    const trace = getFailureTrace(taskId);

    const lastNumber = trace.length;

    trace.push({

        number: lastNumber + 1,

        type: "backtrack",

        tool: "BACKTRACK",

        state: "order_id",

        value: "Previous route rejected"

    });


    trace.push({

        number: lastNumber + 2,

        tool: "get_transaction_id(order_101)",

        state: "transaction_id",

        value: "txn_901"

    });


    trace.push({

        number: lastNumber + 3,

        tool: "get_refund_status_by_transaction(txn_901)",

        state: "refund_status",

        value: "refunded",

        success: true

    });


    return trace;

}


/* ======================================================
   RENDER EXECUTION TRACE
====================================================== */

function renderTrace(trace, description) {

    let html = "";

    if (description) {

        html += `
            <div class="trace-message">
                ${description}
            </div>
        `;

    }


    trace.forEach(step => {

        if (step.type === "backtrack") {

            html += `

                <div class="trace-step backtrack">

                    <div class="trace-number">
                        ${step.number}
                    </div>

                    <div class="trace-content">

                        <strong>
                            BACKTRACK
                        </strong>

                        <div>
                            State → ${step.state}
                        </div>

                        <span>
                            ${step.value}
                        </span>

                    </div>

                </div>

            `;

            return;
        }


        let valueClass = "";

        if (step.failure) {
            valueClass = "failure";
        }

        if (step.success) {
            valueClass = "success";
        }


        let displayValue = step.value;


        if (step.failure) {

            displayValue =
                `${step.value} — ${step.classification}`;

        }


        html += `

            <div class="trace-step ${valueClass}">

                <div class="trace-number">
                    ${step.number}
                </div>

                <div class="trace-content">

                    <strong>
                        ${step.tool}
                    </strong>

                    <div>
                        State → ${step.state}
                    </div>

                    <span>
                        ${displayValue}
                    </span>

                </div>

            </div>

        `;

    });


    setHTML("executionTrace", html);

}


/* ======================================================
   UPDATE TASK INFORMATION
====================================================== */

function updateTaskInfo(status = "READY") {

    const task = getCurrentTask();

    setText(
        "taskStatus",
        status
    );


    let failureText = "NONE";

    if (task.injectFailure) {

        failureText =
            task.failureType;

    }


    const failurePanel = getElement("failurePanel");

    if (failurePanel) {

        if (task.injectFailure) {

            failurePanel.innerHTML = `

                <strong>Configured Failure</strong>

                <br>

                Tool:
                <code>${task.failureTool}</code>

                <br>

                Type:
                <strong>${task.failureType}</strong>

            `;

        } else {

            failurePanel.innerHTML = `

                <strong>No Failure Configured</strong>

                <br>

                This is a control task.

            `;

        }

    }


    const recoveryPanel = getElement("recoveryPanel");

    if (recoveryPanel) {

        recoveryPanel.innerHTML = `

            <strong>Recovery System</strong>

            <br>

            Failure-aware recovery is ready.

        `;

    }


    setText(
        "executionStatus",
        "Waiting for execution..."
    );

}


/* ======================================================
   UPDATE SINGLE-TASK METRICS
====================================================== */

function updateSingleMetrics() {

    const task = getCurrentTask();

    const resultA =
        simulationState.agentAResult;

    const resultB =
        simulationState.agentBResult;


    if (resultA) {

        setText(
            "accuracyA",
            resultA.success ? "100%" : "0%"
        );

        setText(
            "stepsA",
            resultA.steps
        );

    } else {

        setText("accuracyA", "—");
        setText("stepsA", "—");

    }


    if (resultB) {

        setText(
            "accuracyB",
            resultB.success ? "100%" : "0%"
        );

        setText(
            "stepsB",
            resultB.steps
        );

    } else {

        setText("accuracyB", "—");
        setText("stepsB", "—");

    }


    let backtracks = 0;

    if (resultB) {
        backtracks = resultB.backtracks;
    }

    setText(
        "backtracks",
        backtracks
    );


    let recoveryRate = "—";


    if (task.injectFailure) {

        if (resultB) {

            recoveryRate =
                resultB.success ? "100%" : "0%";

        } else if (resultA) {

            recoveryRate = "0%";

        }

    }


    setText(
        "recoveryRate",
        recoveryRate
    );

}


/* ======================================================
   AGENT A — BASELINE
====================================================== */

function runAgentA() {

    const task = getCurrentTask();

    const expectedFailure =
        task.injectFailure;


    /*
       Automatically use the experiment configuration.

       This means the user does NOT need to press
       "Inject Failure" first.
    */

    simulationState.failureInjected =
        expectedFailure;


    simulationState.aggregateMode =
        false;


    simulationState.lastAgent =
        "A";


    const trace =
        expectedFailure
            ? getFailureTrace(currentTaskId)
            : getNormalTrace(currentTaskId);


    const success =
        !expectedFailure;


    const result = {

        success: success,

        steps: trace.length,

        backtracks: 0,

        recovery: expectedFailure ? 0 : null

    };


    simulationState.agentAResult =
        result;


    /*
       Agent A never performs runtime recovery.
    */

    if (success) {

        updateTaskInfo("COMPLETED");

        setText(
            "executionStatus",
            "Agent A completed the planned route"
        );


        renderTrace(
            trace,
            "Agent A completed successfully"
        );

    } else {

        updateTaskInfo("FAILED");

        setText(
            "executionStatus",
            "Agent A stopped after the planned route failed"
        );


        renderTrace(
            trace,
            "Agent A stopped after the planned route failed"
        );

    }


    updateSingleMetrics();


    const recoveryPanel =
        getElement("recoveryPanel");


    if (recoveryPanel) {

        if (expectedFailure) {

            recoveryPanel.innerHTML = `

                <strong>Agent A — No Recovery</strong>

                <br>

                Failure detected by the environment,
                but the baseline agent does not classify
                or recover from it.

            `;

        } else {

            recoveryPanel.innerHTML = `

                <strong>Agent A — Normal Execution</strong>

                <br>

                No failure was configured for this task.

            `;

        }

    }

}


/* ======================================================
   AGENT B — FAILURE-AWARE RECOVERY
====================================================== */

function runAgentB() {

    const task = getCurrentTask();


    /*
       IMPORTANT:

       Agent B automatically respects the task's
       experiment configuration.
    */

    simulationState.failureInjected =
        task.injectFailure;


    simulationState.aggregateMode =
        false;


    simulationState.lastAgent =
        "B";


    let trace;

    let result;


    if (task.injectFailure) {

        /*
           Failure occurs on the planned route.
           Agent B detects it, backtracks and
           chooses the alternative route.
        */

        trace =
            getRecoveryTrace(currentTaskId);


        result = {

            success: true,

            steps: trace.length,

            backtracks: 1,

            recovery: 100

        };

    } else {

        /*
           Control task:
           no failure and no recovery required.
        */

        trace =
            getNormalTrace(currentTaskId);


        result = {

            success: true,

            steps: trace.length,

            backtracks: 0,

            recovery: null

        };

    }


    simulationState.agentBResult =
        result;


    if (task.injectFailure) {

        updateTaskInfo("RECOVERED");

        setText(
            "executionStatus",
            "Agent B successfully recovered"
        );


        renderTrace(
            trace,
            "Agent B successfully recovered"
        );


        const recoveryPanel =
            getElement("recoveryPanel");


        if (recoveryPanel) {

            recoveryPanel.innerHTML = `

                <strong>Recovery Successful</strong>

                <br><br>

                Failure:
                <strong>IMPLICIT_FAILURE</strong>

                <br>

                Failed tool:
                <code>${task.failureTool}</code>

                <br>

                Backtrack:
                <strong>order_id</strong>

                <br>

                Alternative route:
                <strong>
                    order_id → transaction_id → refund_status
                </strong>

            `;

        }

    } else {

        updateTaskInfo("COMPLETED");

        setText(
            "executionStatus",
            "Agent B completed the planned route"
        );


        renderTrace(
            trace,
            "Agent B completed successfully"
        );


        const recoveryPanel =
            getElement("recoveryPanel");


        if (recoveryPanel) {

            recoveryPanel.innerHTML = `

                <strong>No Recovery Required</strong>

                <br>

                This control task completed
                without a configured failure.

            `;

        }

    }


    updateSingleMetrics();

}


/* ======================================================
   MANUAL FAILURE INJECTION
====================================================== */

function injectFailure() {

    const task = getCurrentTask();


    if (!task.injectFailure) {

        setText(
            "executionStatus",
            "No failure is configured for this control task."
        );

        return;

    }


    simulationState.failureInjected = true;


    updateTaskInfo("FAILURE INJECTED");


    setText(
        "executionStatus",
        `Failure injected into ${task.failureTool}`
    );


    const trace =
        getFailureTrace(currentTaskId);


    renderTrace(
        trace,
        "Failure injected for the current experiment"
    );


    const recoveryPanel =
        getElement("recoveryPanel");


    if (recoveryPanel) {

        recoveryPanel.innerHTML = `

            <strong>Injected Failure</strong>

            <br>

            Tool:
            <code>${task.failureTool}</code>

            <br>

            Classification:
            <strong>IMPLICIT_FAILURE</strong>

            <br><br>

            Run Agent B to observe recovery.

        `;

    }

}


/* ======================================================
   RESET SIMULATION
====================================================== */

function resetSimulation() {

    simulationState = {

        failureInjected: false,

        lastAgent: null,

        agentAResult: null,

        agentBResult: null,

        aggregateMode: false

    };


    updateTaskInfo("READY");


    setText(
        "executionStatus",
        "Waiting for execution..."
    );


    setHTML(
        "executionTrace",
        `
            <div class="trace-message">
                Select an agent to begin execution.
            </div>
        `
    );


    setHTML(
        "aggregateResults",
        ""
    );


    updateSingleMetrics();

}


/* ======================================================
   AGGREGATE EVALUATION
====================================================== */

function calculateAggregateResults() {

    const taskIds =
        Object.keys(experimentResults);


    let successA = 0;
    let successB = 0;

    let totalStepsA = 0;
    let totalStepsB = 0;

    let totalBacktracksB = 0;

    let failureTasks = 0;
    let recoveredTasks = 0;


    taskIds.forEach(taskId => {

        const config =
            taskConfig[taskId];

        const resultA =
            experimentResults[taskId].agentA;

        const resultB =
            experimentResults[taskId].agentB;


        if (resultA.success) {
            successA++;
        }


        if (resultB.success) {
            successB++;
        }


        totalStepsA += resultA.steps;

        totalStepsB += resultB.steps;

        totalBacktracksB +=
            resultB.backtracks;


        if (config.injectFailure) {

            failureTasks++;


            if (resultB.success) {
                recoveredTasks++;
            }

        }

    });


    return {

        totalTasks: taskIds.length,

        accuracyA:
            (successA / taskIds.length) * 100,

        accuracyB:
            (successB / taskIds.length) * 100,

        averageStepsA:
            totalStepsA / taskIds.length,

        averageStepsB:
            totalStepsB / taskIds.length,

        totalBacktracksB:
            totalBacktracksB,

        recoveryRate:
            failureTasks === 0
                ? 0
                : (recoveredTasks / failureTasks) * 100,

        failureTasks:
            failureTasks,

        recoveredTasks:
            recoveredTasks

    };

}


/* ======================================================
   AGGREGATE TABLE
====================================================== */

function showAggregateResults() {

    const aggregate =
        calculateAggregateResults();


    let html = `

        <div class="aggregate-summary">

            <h3>
                5-Task Evaluation Results
            </h3>

            <div class="aggregate-metrics">

                <div>
                    <strong>Agent A Accuracy</strong>
                    <span>${aggregate.accuracyA}%</span>
                </div>

                <div>
                    <strong>Agent B Accuracy</strong>
                    <span>${aggregate.accuracyB}%</span>
                </div>

                <div>
                    <strong>Agent A Average Steps</strong>
                    <span>${aggregate.averageStepsA}</span>
                </div>

                <div>
                    <strong>Agent B Average Steps</strong>
                    <span>${aggregate.averageStepsB}</span>
                </div>

                <div>
                    <strong>Agent B Backtracks</strong>
                    <span>${aggregate.totalBacktracksB}</span>
                </div>

                <div>
                    <strong>Recovery Rate</strong>
                    <span>${aggregate.recoveryRate}%</span>
                </div>

            </div>

        </div>


        <div class="aggregate-table">

            <table>

                <thead>

                    <tr>

                        <th>Task</th>

                        <th>Agent A</th>

                        <th>Agent B</th>

                        <th>Backtracks</th>

                    </tr>

                </thead>

                <tbody>

    `;


    Object.keys(experimentResults).forEach(taskId => {

        const resultA =
            experimentResults[taskId].agentA;

        const resultB =
            experimentResults[taskId].agentB;


        html += `

            <tr>

                <td>
                    <strong>${taskId}</strong>
                </td>

                <td>
                    ${resultA.success
                        ? "Success"
                        : "Failed"}
                    (${resultA.steps} steps)
                </td>

                <td>
                    ${resultB.success
                        ? "Success"
                        : "Failed"}
                    (${resultB.steps} steps)
                </td>

                <td>
                    ${resultB.backtracks}
                </td>

            </tr>

        `;

    });


    html += `

                </tbody>

            </table>

        </div>

        <div class="aggregate-note">

            Recovery Rate:
            <strong>
                ${aggregate.recoveredTasks}/${aggregate.failureTasks}
            </strong>
            failed tasks recovered.

        </div>

    `;


    setHTML(
        "aggregateResults",
        html
    );


    /*
       Update the main metric cards too.
    */

    setText(
        "accuracyA",
        `${aggregate.accuracyA}%`
    );


    setText(
        "accuracyB",
        `${aggregate.accuracyB}%`
    );


    setText(
        "stepsA",
        aggregate.averageStepsA.toFixed(1)
    );


    setText(
        "stepsB",
        aggregate.averageStepsB.toFixed(1)
    );


    setText(
        "backtracks",
        aggregate.totalBacktracksB
    );


    setText(
        "recoveryRate",
        `${aggregate.recoveryRate}%`
    );

}


/* ======================================================
   RUN ALL FIVE TASKS
====================================================== */

function runAllTasks() {

    simulationState.aggregateMode =
        true;


    simulationState.lastAgent =
        null;


    /*
       The aggregate values are intentionally
       calculated from all five configured tasks.
    */

    showAggregateResults();


    setText(
        "taskStatus",
        "EVALUATED"
    );


    setText(
        "executionStatus",
        "5-task evaluation completed"
    );


    /*
       Show T001's failure trace as the representative
       execution trace for the experiment.
    */

    const representativeTrace =
        getFailureTrace("T001");


    renderTrace(
        representativeTrace,
        "5-task evaluation completed — representative T001 failure trace"
    );


    const recoveryPanel =
        getElement("recoveryPanel");


    if (recoveryPanel) {

        recoveryPanel.innerHTML = `

            <strong>Aggregate Evaluation</strong>

            <br><br>

            Agent A accuracy:
            <strong>40%</strong>

            <br>

            Agent B accuracy:
            <strong>100%</strong>

            <br>

            Recovery:
            <strong>3/3 failure tasks recovered</strong>

        `;

    }

}


/* ======================================================
   INITIAL PAGE SETUP
====================================================== */

function initializeSimulation() {

    initializeTaskDropdown();

    resetSimulation();

}


/* ======================================================
   DOM READY
====================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initializeSimulation
);


/* ======================================================
   GLOBAL FUNCTIONS
======================================================

   These are exposed globally because the HTML buttons
   may use onclick="runAgentA()" etc.
====================================================== */

window.runAgentA =
    runAgentA;

window.runAgentB =
    runAgentB;

window.runBaseline =
    runAgentA;

window.runRecovery =
    runAgentB;

window.injectFailure =
    injectFailure;

window.resetSimulation =
    resetSimulation;

window.runAllTasks =
    runAllTasks;

window.showAggregateResults =
    showAggregateResults;

window.getCurrentConfig =
    getCurrentConfig;
