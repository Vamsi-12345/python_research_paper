"use strict";

/*
===========================================================
 Adaptive Tool-Use Agent
 Frontend Simulation
===========================================================

 This frontend mirrors the experiment configuration used
 by the Python implementation.

 Agent A = Baseline Agent
 Agent B = Failure-Aware Recovery Agent

 Failure tasks:
 T001, T003, T004

 Control tasks:
 T002, T005
===========================================================
*/


/* =========================================================
   TASK CONFIGURATION
========================================================= */

const taskConfig = {
    T001: {
        title: "Refund Status Retrieval",
        initialState: "account_id = acc_001",
        startState: "account_id",
        targetState: "refund_status",
        minSteps: 5,
        injectFailure: true,
        failureTool: "get_refund_status",
        failureType: "IMPLICIT_FAILURE"
    },

    T002: {
        title: "Refund Status Retrieval",
        initialState: "account_id = acc_001",
        startState: "account_id",
        targetState: "refund_status",
        minSteps: 5,
        injectFailure: false,
        failureTool: null,
        failureType: null
    },

    T003: {
        title: "Refund Status Retrieval",
        initialState: "user_id = user_1",
        startState: "user_id",
        targetState: "refund_status",
        minSteps: 4,
        injectFailure: true,
        failureTool: "get_refund_status",
        failureType: "IMPLICIT_FAILURE"
    },

    T004: {
        title: "Refund Status Retrieval",
        initialState: "account_id = acc_001",
        startState: "account_id",
        targetState: "refund_status",
        minSteps: 5,
        injectFailure: true,
        failureTool: "get_refund_status",
        failureType: "IMPLICIT_FAILURE"
    },

    T005: {
        title: "Refund Status Retrieval",
        initialState: "account_id = acc_001",
        startState: "account_id",
        targetState: "refund_status",
        minSteps: 5,
        injectFailure: false,
        failureTool: null,
        failureType: null
    }
};


/* =========================================================
   EXPECTED 5-TASK EXPERIMENTAL RESULTS
========================================================= */

const aggregateTaskResults = {
    T001: {
        agentA: {
            status: "Failed",
            steps: 5,
            backtracks: 0,
            success: false
        },
        agentB: {
            status: "Success",
            steps: 8,
            backtracks: 1,
            success: true
        }
    },

    T002: {
        agentA: {
            status: "Success",
            steps: 5,
            backtracks: 0,
            success: true
        },
        agentB: {
            status: "Success",
            steps: 5,
            backtracks: 0,
            success: true
        }
    },

    T003: {
        agentA: {
            status: "Failed",
            steps: 4,
            backtracks: 0,
            success: false
        },
        agentB: {
            status: "Success",
            steps: 7,
            backtracks: 1,
            success: true
        }
    },

    T004: {
        agentA: {
            status: "Failed",
            steps: 5,
            backtracks: 0,
            success: false
        },
        agentB: {
            status: "Success",
            steps: 8,
            backtracks: 1,
            success: true
        }
    },

    T005: {
        agentA: {
            status: "Success",
            steps: 5,
            backtracks: 0,
            success: true
        },
        agentB: {
            status: "Success",
            steps: 5,
            backtracks: 0,
            success: true
        }
    }
};


/* =========================================================
   CURRENT UI STATE
========================================================= */

let currentState = {
    taskId: "T001",
    failureInjected: false,
    agentAResult: null,
    agentBResult: null,
    lastAgent: null
};


/* =========================================================
   DOM HELPERS
========================================================= */

function getElement(id) {
    return document.getElementById(id);
}


function setText(id, value) {
    const element = getElement(id);

    if (element) {
        element.textContent = value;
    }
}


function setHTML(id, value) {
    const element = getElement(id);

    if (element) {
        element.innerHTML = value;
    }
}


/* =========================================================
   TASK HELPERS
========================================================= */

function getCurrentTaskId() {
    const select = getElement("taskSelect");

    if (select && select.value) {
        return select.value;
    }

    return currentState.taskId;
}


function getCurrentTask() {
    const taskId = getCurrentTaskId();

    return taskConfig[taskId] || taskConfig.T001;
}


function getCurrentConfig() {
    const taskId = getCurrentTaskId();

    return taskConfig[taskId] || taskConfig.T001;
}


/* =========================================================
   TRACE BUILDERS
========================================================= */

function buildAccountRoute(failureInjected) {

    const trace = [
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
        }
    ];


    if (failureInjected) {

        trace.push({
            number: 5,
            tool: "get_refund_status(refund_701)",
            state: "refund_status",
            value: "tuna — IMPLICIT_FAILURE",
            failure: true
        });

    } else {

        trace.push({
            number: 5,
            tool: "get_refund_status(refund_701)",
            state: "refund_status",
            value: "processed"
        });
    }


    return trace;
}


function buildUserRoute(failureInjected) {

    const trace = [
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
        }
    ];


    if (failureInjected) {

        trace.push({
            number: 4,
            tool: "get_refund_status(refund_701)",
            state: "refund_status",
            value: "tuna — IMPLICIT_FAILURE",
            failure: true
        });

    } else {

        trace.push({
            number: 4,
            tool: "get_refund_status(refund_701)",
            state: "refund_status",
            value: "processed"
        });
    }


    return trace;
}


function buildRecoveryRoute(task) {

    const startNumber = task.startState === "user_id" ? 4 : 5;

    return [
        {
            number: startNumber + 1,
            tool: "BACKTRACK",
            state: "order_id",
            value: "Previous route rejected",
            backtrack: true
        },
        {
            number: startNumber + 2,
            tool: "get_transaction_id(order_101)",
            state: "transaction_id",
            value: "txn_901"
        },
        {
            number: startNumber + 3,
            tool: "get_refund_status_by_transaction(txn_901)",
            state: "refund_status",
            value: "refunded"
        }
    ];
}


/* =========================================================
   TRACE HTML
========================================================= */

function renderTrace(trace) {

    if (!trace || trace.length === 0) {
        return "<p>Waiting...</p>";
    }


    let html = "";


    trace.forEach(step => {

        if (step.backtrack) {

            html += `
                <div class="trace-step backtrack">
                    <div class="trace-number">${step.number}</div>

                    <div class="trace-content">
                        <strong>BACKTRACK</strong>

                        <div>
                            State → ${step.state}
                        </div>

                        <div>
                            <strong>${step.value}</strong>
                        </div>
                    </div>
                </div>
            `;

            return;
        }


        html += `
            <div class="trace-step ${step.failure ? "failure" : ""}">

                <div class="trace-number">
                    ${step.number}
                </div>

                <div class="trace-content">

                    <strong>${step.tool}</strong>

                    <div>
                        State → ${step.state}
                    </div>

                    <div>
                        <strong>${step.value}</strong>
                    </div>

                </div>

            </div>
        `;
    });


    return html;
}


/* =========================================================
   FAILURE PANEL
========================================================= */

function renderFailurePanel(task) {

    if (!task.injectFailure) {

        setHTML(
            "failurePanel",
            `
            <div class="success-message">
                No failure injected for this control task.
            </div>
            `
        );

        return;
    }


    setHTML(
        "failurePanel",
        `
        <div class="failure-message">

            <strong>Tool Failure Detected</strong>

            <p>
                ${task.failureTool}
                returned a suspicious result:
                <strong>"tuna"</strong>
            </p>

        </div>
        `
    );
}


/* =========================================================
   RECOVERY PANEL
========================================================= */

function renderRecoveryPanel(task, result) {

    if (!task.injectFailure) {

        setHTML(
            "recoveryPanel",
            `
            <div class="success-message">
                No recovery required. Normal route completed successfully.
            </div>
            `
        );

        return;
    }


    if (!result || !result.success) {

        setHTML(
            "recoveryPanel",
            `
            <div class="failure-message">
                Recovery was not completed.
            </div>
            `
        );

        return;
    }


    setHTML(
        "recoveryPanel",
        `
        <div class="recovery-process">

            <h4>RECOVERY PROCESS</h4>

            <div><strong>1</strong> Failure classified as IMPLICIT_FAILURE</div>

            <div><strong>2</strong> Trust memory updated</div>

            <div><strong>3</strong> Previous route rejected</div>

            <div><strong>4</strong> Agent backtracked</div>

            <div><strong>5</strong> Alternative tool selected</div>

            <div><strong>6</strong> Correct refund status obtained</div>

        </div>
        `
    );
}


/* =========================================================
   TASK INFORMATION
========================================================= */

function updateTaskInformation() {

    const taskId = getCurrentTaskId();
    const task = taskConfig[taskId];


    currentState.taskId = taskId;


    setText(
        "taskStatus",
        "READY"
    );


    setText(
        "executionStatus",
        "Waiting for execution..."
    );


    /*
     Optional elements.
     These are only updated if they exist in your HTML.
    */

    const taskTitle = getElement("taskTitle");

    if (taskTitle) {
        taskTitle.textContent = task.title;
    }


    const initialState = getElement("initialState");

    if (initialState) {
        initialState.textContent = task.initialState;
    }


    const targetState = getElement("targetState");

    if (targetState) {
        targetState.textContent = task.targetState;
    }


    const minimumSteps = getElement("minimumSteps");

    if (minimumSteps) {
        minimumSteps.textContent = task.minSteps;
    }


    const injectedFailure = getElement("injectedFailure");

    if (injectedFailure) {

        injectedFailure.textContent =
            task.injectFailure
                ? task.failureType
                : "None";
    }
}


/* =========================================================
   RESET METRICS
========================================================= */

function resetMetrics() {

    setText("accuracyA", "—");
    setText("accuracyB", "—");

    setText("stepsA", "—");
    setText("stepsB", "—");

    setText("backtracks", "—");
    setText("recoveryRate", "—");
}


/* =========================================================
   DISPLAY SINGLE-TASK METRICS
========================================================= */

function updateSingleTaskMetrics() {

    const taskId = currentState.taskId;
    const task = taskConfig[taskId];

    const resultA = currentState.agentAResult;
    const resultB = currentState.agentBResult;


    if (resultA) {

        setText(
            "accuracyA",
            resultA.success ? "100%" : "0%"
        );

        setText(
            "stepsA",
            resultA.steps
        );
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

        setText(
            "backtracks",
            resultB.backtracks
        );
    }


    if (task.injectFailure) {

        if (resultA) {
            setText(
                "recoveryRate",
                "0%"
            );
        }


        if (resultB && resultB.success) {
            setText(
                "recoveryRate",
                "100%"
            );
        }

    } else {

        setText(
            "recoveryRate",
            "N/A"
        );
    }
}


/* =========================================================
   AGENT A
========================================================= */

function runAgentA() {

    const taskId = getCurrentTaskId();
    const task = taskConfig[taskId];


    currentState.taskId = taskId;
    currentState.lastAgent = "A";


    /*
     IMPORTANT:
     Agent A automatically respects the experiment
     configuration.
    */

    const failureInjected = task.injectFailure;

    currentState.failureInjected = failureInjected;


    let trace;


    if (task.startState === "user_id") {

        trace = buildUserRoute(failureInjected);

    } else {

        trace = buildAccountRoute(failureInjected);
    }


    const result = aggregateTaskResults[taskId].agentA;


    currentState.agentAResult = {
        success: result.success,
        steps: result.steps,
        backtracks: result.backtracks,
        status: result.status
    };


    setHTML(
        "executionTrace",
        renderTrace(trace)
    );


    if (result.success) {

        setText(
            "taskStatus",
            "COMPLETED"
        );

        setText(
            "executionStatus",
            "Agent A completed the task successfully"
        );

    } else {

        setText(
            "taskStatus",
            "FAILED"
        );

        setText(
            "executionStatus",
            "Agent A stopped after the planned route failed"
        );
    }


    if (task.injectFailure) {
        renderFailurePanel(task);
    }


    updateSingleTaskMetrics();
}


/* =========================================================
   AGENT B
========================================================= */

function runAgentB() {

    const taskId = getCurrentTaskId();
    const task = taskConfig[taskId];


    currentState.taskId = taskId;
    currentState.lastAgent = "B";


    /*
     IMPORTANT FIX:
     Agent B automatically uses the configured failure.
     The user does NOT need to click Inject Failure first.
    */

    const failureInjected = task.injectFailure;

    currentState.failureInjected = failureInjected;


    let trace;


    if (failureInjected) {

        let normalTrace;


        if (task.startState === "user_id") {

            normalTrace = buildUserRoute(true);

        } else {

            normalTrace = buildAccountRoute(true);
        }


        const recoveryTrace = buildRecoveryRoute(task);

        trace = normalTrace.concat(recoveryTrace);

    } else {

        if (task.startState === "user_id") {

            trace = buildUserRoute(false);

        } else {

            trace = buildAccountRoute(false);
        }
    }


    const result = aggregateTaskResults[taskId].agentB;


    currentState.agentBResult = {
        success: result.success,
        steps: result.steps,
        backtracks: result.backtracks,
        status: result.status
    };


    setHTML(
        "executionTrace",
        renderTrace(trace)
    );


    if (result.success && failureInjected) {

        setText(
            "taskStatus",
            "RECOVERED"
        );

        setText(
            "executionStatus",
            "Agent B successfully recovered"
        );

    } else if (result.success) {

        setText(
            "taskStatus",
            "COMPLETED"
        );

        setText(
            "executionStatus",
            "Agent B completed the task successfully"
        );

    } else {

        setText(
            "taskStatus",
            "FAILED"
        );

        setText(
            "executionStatus",
            "Agent B failed to complete the task"
        );
    }


    renderFailurePanel(task);

    renderRecoveryPanel(task, result);


    updateSingleTaskMetrics();
}


/* =========================================================
   MANUAL FAILURE INJECTION
========================================================= */

function injectFailure() {

    const taskId = getCurrentTaskId();
    const task = taskConfig[taskId];


    if (!task.injectFailure) {

        currentState.failureInjected = false;


        setHTML(
            "failurePanel",
            `
            <div class="success-message">
                This task is configured as a control task.
                No failure is available for injection.
            </div>
            `
        );

        return;
    }


    currentState.failureInjected = true;


    setText(
        "executionStatus",
        "Failure manually injected into the configured tool"
    );


    renderFailurePanel(task);
}


/* =========================================================
   RESET SIMULATION
========================================================= */

function resetSimulation() {

    currentState = {
        taskId: getCurrentTaskId(),
        failureInjected: false,
        agentAResult: null,
        agentBResult: null,
        lastAgent: null
    };


    setText(
        "taskStatus",
        "READY"
    );


    setText(
        "executionStatus",
        "Waiting for execution..."
    );


    setHTML(
        "executionTrace",
        `
        <p>
            Waiting...
        </p>

        <p>
            Run an agent to view its execution trace.
        </p>
        `
    );


    setHTML(
        "failurePanel",
        ""
    );


    setHTML(
        "recoveryPanel",
        ""
    );


    resetMetrics();
}


/* =========================================================
   AGGREGATE RESULTS
========================================================= */

function showAggregateResults() {

    const results = aggregateTaskResults;


    let totalA = 0;
    let totalB = 0;

    let stepsA = 0;
    let stepsB = 0;

    let backtracksB = 0;

    let failedTasks = 0;
    let recoveredTasks = 0;


    Object.keys(results).forEach(taskId => {

        const resultA = results[taskId].agentA;
        const resultB = results[taskId].agentB;


        if (resultA.success) {
            totalA++;
        }


        if (resultB.success) {
            totalB++;
        }


        stepsA += resultA.steps;
        stepsB += resultB.steps;


        backtracksB += resultB.backtracks;


        if (!resultA.success) {

            failedTasks++;


            if (resultB.success) {
                recoveredTasks++;
            }
        }
    });


    const taskCount = Object.keys(results).length;


    const accuracyA =
        (totalA / taskCount) * 100;


    const accuracyB =
        (totalB / taskCount) * 100;


    const averageStepsA =
        stepsA / taskCount;


    const averageStepsB =
        stepsB / taskCount;


    const recoveryRate =
        failedTasks === 0
            ? 0
            : (recoveredTasks / failedTasks) * 100;


    /*
     Make sure the main metric cards show aggregate values.
    */

    setText(
        "accuracyA",
        `${accuracyA.toFixed(0)}%`
    );


    setText(
        "accuracyB",
        `${accuracyB.toFixed(0)}%`
    );


    setText(
        "stepsA",
        averageStepsA.toFixed(1)
    );


    setText(
        "stepsB",
        averageStepsB.toFixed(1)
    );


    setText(
        "backtracks",
        backtracksB
    );


    setText(
        "recoveryRate",
        `${recoveryRate.toFixed(0)}%`
    );


    /*
     Build proper HTML instead of displaying JavaScript
     objects as [object Object].
    */

    let tableHTML = `
        <h3>5-Task Experimental Results</h3>

        <div class="aggregate-table-wrapper">

            <table class="aggregate-table">

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
    `;


    Object.keys(results).forEach(taskId => {

        const resultA = results[taskId].agentA;
        const resultB = results[taskId].agentB;


        tableHTML += `
            <tr>

                <td>
                    <strong>${taskId}</strong>
                </td>

                <td class="${resultA.success ? "success" : "failed"}">
                    ${resultA.status}
                </td>

                <td>
                    ${resultA.steps}
                </td>

                <td class="${resultB.success ? "success" : "failed"}">
                    ${resultB.status}
                </td>

                <td>
                    ${resultB.steps}
                </td>

                <td>
                    ${resultB.backtracks}
                </td>

            </tr>
        `;
    });


    tableHTML += `
                </tbody>

            </table>

        </div>


        <div class="aggregate-summary">

            <h3>Aggregate Results</h3>

            <p>
                Agent A Accuracy:
                <strong>${accuracyA.toFixed(0)}%</strong>
            </p>

            <p>
                Agent B Accuracy:
                <strong>${accuracyB.toFixed(0)}%</strong>
            </p>

            <p>
                Agent A Average Steps:
                <strong>${averageStepsA.toFixed(1)}</strong>
            </p>

            <p>
                Agent B Average Steps:
                <strong>${averageStepsB.toFixed(1)}</strong>
            </p>

            <p>
                Agent B Total Backtracks:
                <strong>${backtracksB}</strong>
            </p>

            <p>
                Recovery Rate:
                <strong>${recoveryRate.toFixed(0)}%</strong>
            </p>

        </div>
    `;


    setHTML(
        "aggregateResults",
        tableHTML
    );


    setText(
        "executionStatus",
        "5-task evaluation completed"
    );
}


/* =========================================================
   RUN ALL FIVE TASKS
========================================================= */

function runAllTasks() {

    /*
     The aggregate experiment uses the fixed five-task
     configuration above.

     This is intentionally independent of manual failure
     injection.
    */

    showAggregateResults();
}


/* =========================================================
   TASK SELECT CHANGE
========================================================= */

function handleTaskChange() {

    const taskId = getCurrentTaskId();


    currentState = {
        taskId: taskId,
        failureInjected: false,
        agentAResult: null,
        agentBResult: null,
        lastAgent: null
    };


    updateTaskInformation();

    resetMetrics();


    setHTML(
        "executionTrace",
        `
        <p>
            Waiting...
        </p>

        <p>
            Run an agent to view its execution trace.
        </p>
        `
    );


    setHTML(
        "failurePanel",
        ""
    );


    setHTML(
        "recoveryPanel",
        ""
    );
}


/* =========================================================
   INITIALIZE TASK DROPDOWN
========================================================= */

function initializeTaskDropdown() {

    const select = getElement("taskSelect");


    if (!select) {
        return;
    }


    /*
     Only populate if the select does not already contain
     the five required tasks.
    */

    if (select.options.length === 0) {

        Object.keys(taskConfig).forEach(taskId => {

            const option =
                document.createElement("option");


            option.value = taskId;


            option.textContent =
                `${taskId} — ${taskConfig[taskId].title}`;


            select.appendChild(option);
        });
    }


    /*
     Ensure T001 is selected initially.
    */

    if (!select.value || !taskConfig[select.value]) {

        select.value = "T001";
    }


    select.addEventListener(
        "change",
        handleTaskChange
    );
}


/* =========================================================
   INITIALIZATION
========================================================= */

function initializeSimulation() {

    initializeTaskDropdown();


    currentState.taskId =
        getCurrentTaskId();


    updateTaskInformation();


    resetMetrics();


    setHTML(
        "executionTrace",
        `
        <p>
            Waiting...
        </p>

        <p>
            Run an agent to view its execution trace.
        </p>
        `
    );
}


/* =========================================================
   GLOBAL BUTTON FUNCTIONS
========================================================= */

/*
 These are exposed globally so buttons such as:

 onclick="runAgentA()"
 onclick="runAgentB()"
 onclick="injectFailure()"
 onclick="resetSimulation()"
 onclick="runAllTasks()"

 continue to work.
*/

window.runAgentA = runAgentA;
window.runAgentB = runAgentB;

window.runBaseline = runAgentA;
window.runRecovery = runAgentB;

window.injectFailure = injectFailure;
window.resetSimulation = resetSimulation;
window.runAllTasks = runAllTasks;

window.showAggregateResults = showAggregateResults;

window.getCurrentConfig = getCurrentConfig;


/* =========================================================
   PAGE LOAD
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeSimulation
);
