/* =========================================================
   Adaptive Tool-Use Agent
   PLANBENCH-XL INSPIRED PROJECT
   Frontend Simulation Script
   ========================================================= */

/* =========================================================
   1. EXPERIMENT CONFIGURATION
   ========================================================= */

const experimentConfig = {
    T001: {
        injectFailure: true,
        failureTool: "get_refund_status",
        failureType: "IMPLICIT_FAILURE"
    },

    T002: {
        injectFailure: false,
        failureTool: null,
        failureType: null
    },

    T003: {
        injectFailure: true,
        failureTool: "get_refund_status",
        failureType: "IMPLICIT_FAILURE"
    },

    T004: {
        injectFailure: true,
        failureTool: "get_refund_status",
        failureType: "IMPLICIT_FAILURE"
    },

    T005: {
        injectFailure: false,
        failureTool: null,
        failureType: null
    }
};


/* =========================================================
   2. TASK DEFINITIONS
   ========================================================= */

const tasks = {
    T001: {
        id: "T001",
        title: "Refund Status Retrieval",
        initialState: "account_id = acc_001",
        startState: "account_id",
        targetState: "refund_status",
        minimumSteps: 5
    },

    T002: {
        id: "T002",
        title: "Refund Status Retrieval",
        initialState: "account_id = acc_001",
        startState: "account_id",
        targetState: "refund_status",
        minimumSteps: 5
    },

    T003: {
        id: "T003",
        title: "Refund Status Retrieval",
        initialState: "user_id = user_1",
        startState: "user_id",
        targetState: "refund_status",
        minimumSteps: 4
    },

    T004: {
        id: "T004",
        title: "Refund Status Retrieval",
        initialState: "account_id = acc_001",
        startState: "account_id",
        targetState: "refund_status",
        minimumSteps: 5
    },

    T005: {
        id: "T005",
        title: "Refund Status Retrieval",
        initialState: "account_id = acc_001",
        startState: "account_id",
        targetState: "refund_status",
        minimumSteps: 5
    }
};


/* =========================================================
   3. EXPECTED 5-TASK EXPERIMENTAL RESULTS
   ========================================================= */

const aggregateResults = {
    T001: {
        agentA: {
            status: "Failed",
            steps: 5
        },
        agentB: {
            status: "Success",
            steps: 8
        },
        backtracks: 1
    },

    T002: {
        agentA: {
            status: "Success",
            steps: 5
        },
        agentB: {
            status: "Success",
            steps: 5
        },
        backtracks: 0
    },

    T003: {
        agentA: {
            status: "Failed",
            steps: 4
        },
        agentB: {
            status: "Success",
            steps: 7
        },
        backtracks: 1
    },

    T004: {
        agentA: {
            status: "Failed",
            steps: 5
        },
        agentB: {
            status: "Success",
            steps: 8
        },
        backtracks: 1
    },

    T005: {
        agentA: {
            status: "Success",
            steps: 5
        },
        agentB: {
            status: "Success",
            steps: 5
        },
        backtracks: 0
    }
};


/* =========================================================
   4. CURRENT SIMULATION STATE
   ========================================================= */

let selectedTaskId = "T001";

let failureInjected = false;

let currentAgent = null;

let currentResult = null;


/* =========================================================
   5. DOM HELPER
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
   6. CURRENT TASK / CONFIGURATION
   ========================================================= */

function getCurrentTask() {
    return tasks[selectedTaskId];
}

function getCurrentConfig() {
    return experimentConfig[selectedTaskId];
}

function hasConfiguredFailure(taskId = selectedTaskId) {
    const config = experimentConfig[taskId];

    return Boolean(config && config.injectFailure);
}


/* =========================================================
   7. FAILURE TYPE DISPLAY
   ========================================================= */

function formatFailureType(type) {
    if (!type) {
        return "None";
    }

    return type
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase());
}


/* =========================================================
   8. TASK SELECTOR
   ========================================================= */

function populateTaskSelector() {
    const select = getElement("taskSelect");

    if (!select) {
        return;
    }

    select.innerHTML = "";

    Object.values(tasks).forEach(task => {
        const option = document.createElement("option");

        option.value = task.id;
        option.textContent = `${task.id} — ${task.title}`;

        select.appendChild(option);
    });

    select.value = selectedTaskId;
}


/* =========================================================
   9. DISPLAY SELECTED TASK
   ========================================================= */

function updateTaskInformation() {
    const task = getCurrentTask();
    const config = getCurrentConfig();

    setText("taskId", task.id);
    setText("taskTitle", task.title);
    setText("initialState", task.initialState);
    setText("targetState", task.targetState);
    setText("minimumSteps", task.minimumSteps);

    /*
       Important:
       This displays the experimental configuration.
       It does NOT mean the failure has already happened.
    */

    setText(
        "injectedFailure",
        config.injectFailure
            ? formatFailureType(config.failureType)
            : "None"
    );

    setText(
        "failureTool",
        config.failureTool || "None"
    );

    updateTaskStatus("READY");
}


/* =========================================================
   10. TASK CHANGE
   ========================================================= */

function handleTaskChange() {
    const select = getElement("taskSelect");

    if (!select) {
        return;
    }

    selectedTaskId = select.value;

    failureInjected = false;
    currentAgent = null;
    currentResult = null;

    clearSimulationPanels();

    updateTaskInformation();
}


/* =========================================================
   11. TASK STATUS
   ========================================================= */

function updateTaskStatus(status) {
    setText("taskStatus", status);
}


/* =========================================================
   12. CLEAR SIMULATION PANELS
   ========================================================= */

function clearSimulationPanels() {
    setHTML(
        "executionTrace",
        `
        <div class="empty-state">
            Select an agent to begin execution.
        </div>
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

    setText("executionStatus", "Waiting for execution...");
}


/* =========================================================
   13. FAILURE INJECTION
   ========================================================= */

function injectFailure() {
    const task = getCurrentTask();
    const config = getCurrentConfig();

    if (!config.injectFailure) {
        failureInjected = false;

        setHTML(
            "failurePanel",
            `
            <div class="info-message">
                <strong>No failure configured for ${task.id}.</strong>
                This is a normal control task.
            </div>
            `
        );

        return;
    }

    failureInjected = true;

    setHTML(
        "failurePanel",
        `
        <div class="failure-message">
            <strong>Tool Failure Injected</strong>

            <p>
                ${config.failureTool}
                returned a suspicious result:
                <strong>"tuna"</strong>
            </p>

            <p>
                Classification:
                <strong>${formatFailureType(config.failureType)}</strong>
            </p>
        </div>
        `
    );

    setText(
        "executionStatus",
        "Failure injected — ready for agent execution."
    );
}


/* =========================================================
   14. BASELINE ROUTE
   ========================================================= */

function getBaselineRoute(task) {

    if (task.startState === "user_id") {
        return [
            {
                tool: "get_order_id",
                input: "user_1",
                state: "order_id",
                output: "order_101"
            },

            {
                tool: "get_return_id",
                input: "order_101",
                state: "return_id",
                output: "return_501"
            },

            {
                tool: "get_refund_id",
                input: "return_501",
                state: "refund_id",
                output: "refund_701"
            },

            {
                tool: "get_refund_status",
                input: "refund_701",
                state: "refund_status",
                output: "processed"
            }
        ];
    }

    return [
        {
            tool: "get_user_by_account",
            input: "acc_001",
            state: "user_id",
            output: "user_1"
        },

        {
            tool: "get_order_id",
            input: "user_1",
            state: "order_id",
            output: "order_101"
        },

        {
            tool: "get_return_id",
            input: "order_101",
            state: "return_id",
            output: "return_501"
        },

        {
            tool: "get_refund_id",
            input: "return_501",
            state: "refund_id",
            output: "refund_701"
        },

        {
            tool: "get_refund_status",
            input: "refund_701",
            state: "refund_status",
            output: "processed"
        }
    ];
}


/* =========================================================
   15. RECOVERY ROUTE
   ========================================================= */

function getRecoveryRoute(task) {

    const normalRoute = getBaselineRoute(task);

    /*
       If the task does not have an injected failure,
       Agent B simply follows the normal route.
    */

    if (!hasConfiguredFailure(task.id)) {
        return normalRoute;
    }

    /*
       T001 / T004 style:
       account_id
       → user_id
       → order_id
       → return_id
       → refund_id
       → refund_status
       → BACKTRACK
       → transaction_id
       → refund_status
    */

    if (task.startState === "account_id") {
        return [
            {
                tool: "get_user_by_account",
                input: "acc_001",
                state: "user_id",
                output: "user_1"
            },

            {
                tool: "get_order_id",
                input: "user_1",
                state: "order_id",
                output: "order_101"
            },

            {
                tool: "get_return_id",
                input: "order_101",
                state: "return_id",
                output: "return_501"
            },

            {
                tool: "get_refund_id",
                input: "return_501",
                state: "refund_id",
                output: "refund_701"
            },

            {
                tool: "get_refund_status",
                input: "refund_701",
                state: "refund_status",
                output: "tuna",
                failure: true,
                failureType: "IMPLICIT_FAILURE"
            },

            {
                tool: "BACKTRACK",
                input: "",
                state: "order_id",
                output: "Previous route rejected",
                backtrack: true
            },

            {
                tool: "get_transaction_id",
                input: "order_101",
                state: "transaction_id",
                output: "txn_901"
            },

            {
                tool: "get_refund_status_by_transaction",
                input: "txn_901",
                state: "refund_status",
                output: "refunded"
            }
        ];
    }

    /*
       T003 starts directly at user_id.
       Therefore it needs one fewer step.
    */

    return [
        {
            tool: "get_order_id",
            input: "user_1",
            state: "order_id",
            output: "order_101"
        },

        {
            tool: "get_return_id",
            input: "order_101",
            state: "return_id",
            output: "return_501"
        },

        {
            tool: "get_refund_id",
            input: "return_501",
            state: "refund_id",
            output: "refund_701"
        },

        {
            tool: "get_refund_status",
            input: "refund_701",
            state: "refund_status",
            output: "tuna",
            failure: true,
            failureType: "IMPLICIT_FAILURE"
        },

        {
            tool: "BACKTRACK",
            input: "",
            state: "order_id",
            output: "Previous route rejected",
            backtrack: true
        },

        {
            tool: "get_transaction_id",
            input: "order_101",
            state: "transaction_id",
            output: "txn_901"
        },

        {
            tool: "get_refund_status_by_transaction",
            input: "txn_901",
            state: "refund_status",
            output: "refunded"
        }
    ];
}


/* =========================================================
   16. DISPLAY TRACE
   ========================================================= */

function renderTrace(trace, agentName) {

    let html = "";

    trace.forEach((step, index) => {

        if (step.backtrack) {

            html += `
                <div class="trace-step backtrack-step">
                    <div class="trace-number">
                        ${index + 1}
                    </div>

                    <div class="trace-content">
                        <strong>BACKTRACK</strong>

                        <div>
                            State → ${step.state}
                        </div>

                        <div class="trace-output">
                            ${step.output}
                        </div>
                    </div>
                </div>
            `;

            return;
        }

        const isFailure = step.failure === true;

        html += `
            <div class="trace-step ${isFailure ? "failure-step" : ""}">
                <div class="trace-number">
                    ${index + 1}
                </div>

                <div class="trace-content">

                    <strong>
                        ${step.tool}(${step.input})
                    </strong>

                    <div>
                        State → ${step.state}
                    </div>

                    <div class="trace-output">
                        ${step.output}
                        ${
                            isFailure
                                ? ` — ${formatFailureType(step.failureType)}`
                                : ""
                        }
                    </div>

                </div>
            </div>
        `;
    });

    setHTML("executionTrace", html);

    setText(
        "executionStatus",
        `${agentName} execution completed.`
    );
}


/* =========================================================
   17. FAILURE PANEL
   ========================================================= */

function showFailurePanel() {

    const config = getCurrentConfig();

    if (!config.injectFailure) {

        setHTML(
            "failurePanel",
            `
            <div class="info-message">
                No failure was configured for this task.
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
                ${config.failureTool}
                returned a suspicious result:
                <strong>"tuna"</strong>
            </p>

            <p>
                Classification:
                <strong>
                    ${formatFailureType(config.failureType)}
                </strong>
            </p>

        </div>
        `
    );
}


/* =========================================================
   18. RECOVERY PROCESS PANEL
   ========================================================= */

function showRecoveryProcess() {

    const config = getCurrentConfig();

    if (!config.injectFailure) {

        setHTML(
            "recoveryPanel",
            `
            <div class="recovery-message">

                <h3>Recovery Process</h3>

                <p>
                    No recovery was required because this task
                    completed without a configured failure.
                </p>

            </div>
            `
        );

        return;
    }

    setHTML(
        "recoveryPanel",
        `
        <div class="recovery-message">

            <h3>RECOVERY PROCESS</h3>

            <ol>

                <li>
                    Failure classified as
                    <strong>IMPLICIT_FAILURE</strong>
                </li>

                <li>
                    Trust memory updated
                </li>

                <li>
                    Previous route rejected
                </li>

                <li>
                    Agent backtracked
                </li>

                <li>
                    Alternative tool selected
                </li>

                <li>
                    Correct refund status obtained
                </li>

            </ol>

        </div>
        `
    );
}


/* =========================================================
   19. AGENT A
   ========================================================= */

function runAgentA() {

    const task = getCurrentTask();
    const config = getCurrentConfig();

    currentAgent = "A";

    let trace = getBaselineRoute(task);

    /*
       Automatically apply the configured failure.
       This is important:
       the user does NOT have to press Inject Failure first.
    */

    if (config.injectFailure) {

        trace = trace.map(step => {

            if (step.tool === config.failureTool) {

                return {
                    ...step,
                    output: "tuna",
                    failure: true,
                    failureType: config.failureType
                };
            }

            return step;
        });

        failureInjected = true;

        currentResult = {
            status: "Failed",
            steps: trace.length,
            backtracks: 0
        };

    } else {

        currentResult = {
            status: "Success",
            steps: trace.length,
            backtracks: 0
        };
    }

    renderTrace(trace, "Agent A");

    if (config.injectFailure) {
        showFailurePanel();

        setHTML(
            "recoveryPanel",
            `
            <div class="baseline-message">

                <h3>Agent A completed without recovery</h3>

                <p>
                    The baseline agent continued its planned route
                    and did not perform failure-aware recovery.
                </p>

            </div>
            `
        );

        updateTaskStatus("FAILED");

    } else {

        setHTML(
            "failurePanel",
            `
            <div class="success-message">
                No failure occurred in this control task.
            </div>
            `
        );

        setHTML(
            "recoveryPanel",
            `
            <div class="baseline-message">

                <h3>Agent A completed normally</h3>

                <p>
                    The baseline route reached the target state.
                </p>

            </div>
            `
        );

        updateTaskStatus("COMPLETED");
    }

    updateSingleTaskMetrics();
}


/* =========================================================
   20. AGENT B
   ========================================================= */

function runAgentB() {

    const task = getCurrentTask();
    const config = getCurrentConfig();

    currentAgent = "B";

    /*
       IMPORTANT FIX:
       Agent B automatically respects the task's configured
       failure. The user does not need to press Inject Failure.
    */

    if (config.injectFailure) {

        failureInjected = true;

        const trace = getRecoveryRoute(task);

        currentResult = {
            status: "Success",
            steps: trace.length,
            backtracks: trace.filter(step => step.backtrack).length
        };

        renderTrace(
            trace,
            "Agent B successfully recovered"
        );

        showFailurePanel();

        showRecoveryProcess();

        updateTaskStatus("RECOVERED");

    } else {

        failureInjected = false;

        const trace = getBaselineRoute(task);

        currentResult = {
            status: "Success",
            steps: trace.length,
            backtracks: 0
        };

        renderTrace(
            trace,
            "Agent B completed normally"
        );

        setHTML(
            "failurePanel",
            `
            <div class="success-message">
                No failure was configured for this control task.
            </div>
            `
        );

        setHTML(
            "recoveryPanel",
            `
            <div class="recovery-message">

                <h3>No recovery required</h3>

                <p>
                    Agent B reached the target state using the
                    normal route.
                </p>

            </div>
            `
        );

        updateTaskStatus("COMPLETED");
    }

    updateSingleTaskMetrics();
}


/* =========================================================
   21. SINGLE-TASK METRICS
   ========================================================= */

function updateSingleTaskMetrics() {

    if (!currentResult) {
        return;
    }

    const task = getCurrentTask();

    let accuracyA = "-";
    let accuracyB = "-";

    let stepsA = "-";
    let stepsB = "-";

    let backtracksA = "-";
    let backtracksB = "-";

    let recoveryA = "-";
    let recoveryB = "-";

    /*
       When Agent A is selected.
    */

    if (currentAgent === "A") {

        accuracyA =
            currentResult.status === "Success"
                ? "100%"
                : "0%";

        stepsA = currentResult.steps;
        backtracksA = currentResult.backtracks;

        if (hasConfiguredFailure(task.id)) {
            recoveryA = "0%";
        } else {
            recoveryA = "N/A";
        }
    }

    /*
       When Agent B is selected.
    */

    if (currentAgent === "B") {

        accuracyB =
            currentResult.status === "Success"
                ? "100%"
                : "0%";

        stepsB = currentResult.steps;
        backtracksB = currentResult.backtracks;

        if (hasConfiguredFailure(task.id)) {
            recoveryB = "100%";
        } else {
            recoveryB = "N/A";
        }
    }

    setText("accuracyA", accuracyA);
    setText("accuracyB", accuracyB);

    setText("stepsA", stepsA);
    setText("stepsB", stepsB);

    setText("backtracksA", backtracksA);
    setText("backtracksB", backtracksB);

    setText("recoveryRateA", recoveryA);
    setText("recoveryRateB", recoveryB);
}


/* =========================================================
   22. RESET
   ========================================================= */

function resetSimulation() {

    failureInjected = false;

    currentAgent = null;

    currentResult = null;

    clearSimulationPanels();

    updateTaskInformation();

    setText("accuracyA", "-");
    setText("accuracyB", "-");

    setText("stepsA", "-");
    setText("stepsB", "-");

    setText("backtracksA", "-");
    setText("backtracksB", "-");

    setText("recoveryRateA", "-");
    setText("recoveryRateB", "-");

    setText(
        "executionStatus",
        "Waiting for execution..."
    );
}


/* =========================================================
   23. RUN ALL FIVE TASKS
   ========================================================= */

function runAllTasks() {

    /*
       These values represent the configured five-task
       experimental evaluation.

       T001: A Failed 5 / B Success 8 / 1 backtrack
       T002: A Success 5 / B Success 5 / 0 backtracks
       T003: A Failed 4 / B Success 7 / 1 backtrack
       T004: A Failed 5 / B Success 8 / 1 backtrack
       T005: A Success 5 / B Success 5 / 0 backtracks
    */

    const results = Object.values(aggregateResults);

    const totalTasks = results.length;

    const agentASuccesses = results.filter(
        result => result.agentA.status === "Success"
    ).length;

    const agentBSuccesses = results.filter(
        result => result.agentB.status === "Success"
    ).length;

    const failureTasks = Object.keys(experimentConfig)
        .filter(id => experimentConfig[id].injectFailure);

    const recoveredFailureTasks = failureTasks.filter(
        id => aggregateResults[id].agentB.status === "Success"
    ).length;

    const agentASteps = results.reduce(
        (sum, result) => sum + result.agentA.steps,
        0
    );

    const agentBSteps = results.reduce(
        (sum, result) => sum + result.agentB.steps,
        0
    );

    const totalBacktracks = results.reduce(
        (sum, result) => sum + result.backtracks,
        0
    );

    const agentAAccuracy =
        (agentASuccesses / totalTasks) * 100;

    const agentBAccuracy =
        (agentBSuccesses / totalTasks) * 100;

    const agentAAverageSteps =
        agentASteps / totalTasks;

    const agentBAverageSteps =
        agentBSteps / totalTasks;

    const recoveryRate =
        failureTasks.length > 0
            ? (recoveredFailureTasks / failureTasks.length) * 100
            : 0;

    renderAggregateTable();

    showAggregateResults(
        agentAAccuracy,
        agentBAccuracy,
        agentAAverageSteps,
        agentBAverageSteps,
        totalBacktracks,
        recoveryRate
    );

    setText(
        "executionStatus",
        "All 5 experimental tasks completed."
    );

    updateTaskStatus("COMPLETED");
}


/* =========================================================
   24. AGGREGATE TABLE
   ========================================================= */

function renderAggregateTable() {

    let html = `
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

    Object.keys(aggregateResults).forEach(taskId => {

        const result = aggregateResults[taskId];

        html += `
            <tr>

                <td>
                    <strong>${taskId}</strong>
                </td>

                <td>
                    ${result.agentA.status}
                </td>

                <td>
                    ${result.agentA.steps}
                </td>

                <td>
                    ${result.agentB.status}
                </td>

                <td>
                    ${result.agentB.steps}
                </td>

                <td>
                    ${result.backtracks}
                </td>

            </tr>
        `;
    });

    html += `
                </tbody>

            </table>

        </div>
    `;

    setHTML("aggregateResults", html);
}


/* =========================================================
   25. AGGREGATE METRICS
   ========================================================= */

function showAggregateResults(
    agentAAccuracy,
    agentBAccuracy,
    agentAAverageSteps,
    agentBAverageSteps,
    totalBacktracks,
    recoveryRate
) {

    setText(
        "accuracyA",
        `${agentAAccuracy.toFixed(0)}%`
    );

    setText(
        "accuracyB",
        `${agentBAccuracy.toFixed(0)}%`
    );

    setText(
        "stepsA",
        agentAAverageSteps.toFixed(1)
    );

    setText(
        "stepsB",
        agentBAverageSteps.toFixed(1)
    );

    setText(
        "backtracksA",
        "0"
    );

    setText(
        "backtracksB",
        totalBacktracks
    );

    setText(
        "recoveryRateA",
        "0%"
    );

    setText(
        "recoveryRateB",
        `${recoveryRate.toFixed(0)}%`
    );

    /*
       Optional aggregate summary panel.
    */

    setHTML(
        "recoveryPanel",
        `
        <div class="aggregate-summary">

            <h3>5-Task Experimental Results</h3>

            <p>
                <strong>Agent A Accuracy:</strong>
                ${agentAAccuracy.toFixed(0)}%
            </p>

            <p>
                <strong>Agent B Accuracy:</strong>
                ${agentBAccuracy.toFixed(0)}%
            </p>

            <p>
                <strong>Agent A Average Steps:</strong>
                ${agentAAverageSteps.toFixed(1)}
            </p>

            <p>
                <strong>Agent B Average Steps:</strong>
                ${agentBAverageSteps.toFixed(1)}
            </p>

            <p>
                <strong>Agent B Total Backtracks:</strong>
                ${totalBacktracks}
            </p>

            <p>
                <strong>Recovery Rate:</strong>
                ${recoveryRate.toFixed(0)}%
            </p>

        </div>
        `
    );
}


/* =========================================================
   26. UPDATE PAGE TEXT
   ========================================================= */

function updateStaticText() {

    /*
       Correct title typo if the HTML contains the old text.
    */

    const bodyTextElements = document.querySelectorAll(
        "h1, h2, h3, p, span, div"
    );

    bodyTextElements.forEach(element => {

        if (
            element.children.length === 0 &&
            element.textContent.includes(
                "Adaptive Tool-Use Agentfor"
            )
        ) {

            element.textContent =
                element.textContent.replace(
                    "Adaptive Tool-Use Agentfor",
                    "Adaptive Tool-Use Agent for"
                );
        }
    });
}


/* =========================================================
   27. EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {

    const taskSelect = getElement("taskSelect");

    if (taskSelect) {
        taskSelect.addEventListener(
            "change",
            handleTaskChange
        );
    }

    const runAgentAButton =
        getElement("runAgentA");

    if (runAgentAButton) {
        runAgentAButton.addEventListener(
            "click",
            runAgentA
        );
    }

    const runAgentBButton =
        getElement("runAgentB");

    if (runAgentBButton) {
        runAgentBButton.addEventListener(
            "click",
            runAgentB
        );
    }

    const injectFailureButton =
        getElement("injectFailure");

    if (injectFailureButton) {
        injectFailureButton.addEventListener(
            "click",
            injectFailure
        );
    }

    const resetButton =
        getElement("reset");

    if (resetButton) {
        resetButton.addEventListener(
            "click",
            resetSimulation
        );
    }

    const runAllButton =
        getElement("runAllTasks");

    if (runAllButton) {
        runAllButton.addEventListener(
            "click",
            runAllTasks
        );
    }
}


/* =========================================================
   28. INITIALIZATION
   ========================================================= */

function initializeSimulation() {

    populateTaskSelector();

    updateTaskInformation();

    clearSimulationPanels();

    setupEventListeners();

    updateStaticText();

    /*
       Initial metric values.
    */

    setText("accuracyA", "-");
    setText("accuracyB", "-");

    setText("stepsA", "-");
    setText("stepsB", "-");

    setText("backtracksA", "-");
    setText("backtracksB", "-");

    setText("recoveryRateA", "-");
    setText("recoveryRateB", "-");

    setText(
        "executionStatus",
        "Waiting for execution..."
    );
}


/* =========================================================
   29. GLOBAL FUNCTIONS
   =========================================================

   These are kept so existing HTML buttons using
   onclick="..." continue to work even if your HTML
   already contains inline event handlers.
   ========================================================= */

window.runAgentA = runAgentA;
window.runAgentB = runAgentB;
window.injectFailure = injectFailure;
window.resetSimulation = resetSimulation;
window.runAllTasks = runAllTasks;
window.handleTaskChange = handleTaskChange;


/* =========================================================
   30. START APPLICATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeSimulation
);
