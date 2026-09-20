"use strict";

/* =========================================================
   FASTAPI BACKEND CONFIGURATION
   ========================================================= */

const API_BASE_URL = "http://127.0.0.1:8000";


/* =========================================================
   GENERIC API HELPER
   ========================================================= */

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
            `HTTP ${response.status}: ${errorText || response.statusText}`
        );
    }

    return response.json();
}


/* =========================================================
   BACKEND HEALTH CHECK
   ========================================================= */

async function checkBackend() {
    try {
        const data = await apiRequest("/api/health");

        console.log("Backend connected:", data);

        return data;
    } catch (error) {
        console.error("Backend connection failed:", error);

        throw error;
    }
}


/* =========================================================
   LOAD TASKS FROM FASTAPI
   ========================================================= */

async function loadTasks() {
    try {
        const tasks = await apiRequest("/api/tasks");

        console.log("Tasks loaded from FastAPI:", tasks);

        return tasks;
    } catch (error) {
        console.error("Failed to load tasks:", error);

        throw error;
    }
}


/* =========================================================
   RUN AGENT A THROUGH FASTAPI
   ========================================================= */

async function runAgentAFromAPI(taskId) {
    return apiRequest("/api/run", {
        method: "POST",
        body: JSON.stringify({
            task_id: taskId,
            agent: "A"
        })
    });
}


/* =========================================================
   RUN AGENT B THROUGH FASTAPI
   ========================================================= */

async function runAgentBFromAPI(taskId) {
    return apiRequest("/api/run", {
        method: "POST",
        body: JSON.stringify({
            task_id: taskId,
            agent: "B"
        })
    });
}


/* =========================================================
   RUN BOTH AGENTS FOR ONE TASK
   ========================================================= */

async function runComparisonFromAPI(taskId) {
    const [agentA, agentB] = await Promise.all([
        runAgentAFromAPI(taskId),
        runAgentBFromAPI(taskId)
    ]);

    return {
        agentA,
        agentB
    };
}


/* =========================================================
   RUN ALL TASKS THROUGH FASTAPI
   ========================================================= */

async function runAllTasksFromAPI() {
    return apiRequest("/api/run-all", {
        method: "POST"
    });
}


/* =========================================================
   TASK CONFIGURATION
   ========================================================= */

const taskConfig = {
    T001: {
        title: "Refund Status Recovery",
        description:
            "Recover the refund status when the return-based route produces an invalid result.",
        failure: true,
        failureTool: "get_refund_status"
    },

    T002: {
        title: "Successful Refund Lookup",
        description:
            "Retrieve refund status through the normal return-based path.",
        failure: false,
        failureTool: null
    },

    T003: {
        title: "Transaction Route Recovery",
        description:
            "Recover from an invalid refund-status result by switching to the transaction route.",
        failure: true,
        failureTool: "get_refund_status"
    },

    T004: {
        title: "Implicit Failure Recovery",
        description:
            "Detect an invalid intermediate result and recover using an alternative route.",
        failure: true,
        failureTool: "get_refund_status"
    },

    T005: {
        title: "Normal Refund Verification",
        description:
            "Complete the refund-status task without an injected failure.",
        failure: false,
        failureTool: null
    }
};


/* =========================================================
   FRONTEND STATE
   ========================================================= */

const simulationState = {
    currentTask: "T001",

    agentAResult: null,
    agentBResult: null,

    allResults: null,

    isRunningA: false,
    isRunningB: false,
    isRunningAll: false
};


/* =========================================================
   SAFE DOM HELPERS
   ========================================================= */

function getElement(id) {
    return document.getElementById(id);
}


function setElementText(id, value) {
    const element = getElement(id);

    if (element) {
        element.textContent = value;
    }
}


function setElementHTML(id, value) {
    const element = getElement(id);

    if (element) {
        element.innerHTML = value;
    }
}


function showElement(id) {
    const element = getElement(id);

    if (element) {
        element.style.display = "";
    }
}


function hideElement(id) {
    const element = getElement(id);

    if (element) {
        element.style.display = "none";
    }
}


/* =========================================================
   CURRENT TASK
   ========================================================= */

function getCurrentTaskId() {
    return simulationState.currentTask || "T001";
}


function setCurrentTask(taskId) {
    simulationState.currentTask = taskId;

    console.log("Current task:", taskId);
}


/* =========================================================
   BUTTON / STATUS HELPERS
   ========================================================= */

function setAgentStatus(agent, status) {
    const possibleIds = [
        `${agent}Status`,
        `${agent.toLowerCase()}Status`,
        `${agent}-status`
    ];

    for (const id of possibleIds) {
        const element = getElement(id);

        if (element) {
            element.textContent = status;
            return;
        }
    }
}


function setBackendStatus(connected) {
    const possibleIds = [
        "backendStatus",
        "backend-status",
        "connectionStatus",
        "connection-status"
    ];

    for (const id of possibleIds) {
        const element = getElement(id);

        if (!element) {
            continue;
        }

        if (connected) {
            element.textContent = "Backend Connected";
            element.classList.remove("error", "offline");
            element.classList.add("connected");
        } else {
            element.textContent = "Backend Offline";
            element.classList.remove("connected");
            element.classList.add("error", "offline");
        }
    }
}


/* =========================================================
   FORMAT HELPERS
   ========================================================= */

function formatNumber(value, decimals = 1) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return number.toFixed(decimals);
}


function formatPercent(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0%";
    }

    return `${number.toFixed(1)}%`;
}


function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   RESULT HELPERS
   ========================================================= */

function getAgentResult(apiResponse) {
    if (!apiResponse) {
        return null;
    }

    return apiResponse.result || apiResponse;
}


function getToolCount(result) {
    if (!result) {
        return 0;
    }

    if (Number.isFinite(Number(result.tool_call_count))) {
        return Number(result.tool_call_count);
    }

    if (Array.isArray(result.executed_tools)) {
        return result.executed_tools.length;
    }

    return 0;
}


function getBacktrackCount(result) {
    if (!result) {
        return 0;
    }

    return Number(result.backtracks || 0);
}


function getRecoveryCount(result) {
    if (!result) {
        return 0;
    }

    return Number(result.recovery_attempts || 0);
}


function getFailureCount(result) {
    if (!result) {
        return 0;
    }

    if (Array.isArray(result.failures)) {
        return result.failures.length;
    }

    return 0;
}


/* =========================================================
   DISPLAY AGENT RESULT
   ========================================================= */

function displayAgentResult(agentName, result) {
    if (!result) {
        return;
    }

    const success = Boolean(result.success);
    const toolCalls = getToolCount(result);
    const backtracks = getBacktrackCount(result);
    const recoveryAttempts = getRecoveryCount(result);
    const failures = getFailureCount(result);

    const agentLower = agentName.toLowerCase();

    const resultHTML = `
        <div class="agent-result">
            <div class="result-status ${success ? "success" : "failure"}">
                ${success ? "SUCCESS" : "FAILED"}
            </div>

            <div class="result-metrics">
                <div class="metric">
                    <strong>Tool Calls</strong>
                    <span>${toolCalls}</span>
                </div>

                <div class="metric">
                    <strong>Backtracks</strong>
                    <span>${backtracks}</span>
                </div>

                <div class="metric">
                    <strong>Recovery Attempts</strong>
                    <span>${recoveryAttempts}</span>
                </div>

                <div class="metric">
                    <strong>Failures</strong>
                    <span>${failures}</span>
                </div>
            </div>

            <div class="result-final-state">
                <strong>Final State:</strong>
                <pre>${escapeHTML(
                    JSON.stringify(result.final_state || {}, null, 2)
                )}</pre>
            </div>
        </div>
    `;

    const possibleIds = [
        `${agentLower}Result`,
        `${agentName}Result`,
        `${agentLower}-result`,
        `${agentLower}Output`,
        `${agentLower}-output`
    ];

    for (const id of possibleIds) {
        const element = getElement(id);

        if (element) {
            element.innerHTML = resultHTML;
            return;
        }
    }

    console.log(`${agentName} result:`, result);
}


/* =========================================================
   RENDER BACKEND TRACE
   ========================================================= */

function renderBackendTrace(result, agentName) {
    if (!result) {
        return;
    }

    const tools = Array.isArray(result.executed_tools)
        ? result.executed_tools
        : [];

    const states = Array.isArray(result.states_reached)
        ? result.states_reached
        : [];

    const failures = Array.isArray(result.failures)
        ? result.failures
        : [];

    const failureByTool = {};

    failures.forEach(failure => {
        if (failure.tool_name) {
            failureByTool[failure.tool_name] = failure;
        }
    });

    let traceHTML = `
        <div class="backend-trace">
            <h3>${escapeHTML(agentName)} Trace</h3>
    `;

    if (tools.length === 0) {
        traceHTML += `
            <div class="trace-empty">
                No tool calls recorded.
            </div>
        `;
    }

    tools.forEach((toolName, index) => {
        const failure = failureByTool[toolName];

        const stateBefore =
            states[index] ||
            "";

        const stateAfter =
            states[index + 1] ||
            "";

        const failed = Boolean(failure);

        traceHTML += `
            <div class="trace-step ${failed ? "trace-failure" : ""}">
                <div class="trace-number">
                    ${index + 1}
                </div>

                <div class="trace-content">
                    <div class="trace-tool">
                        ${escapeHTML(toolName)}
                    </div>

                    <div class="trace-states">
                        ${
                            stateBefore
                                ? escapeHTML(stateBefore)
                                : "state"
                        }

                        →

                        ${
                            stateAfter
                                ? escapeHTML(stateAfter)
                                : "result"
                        }
                    </div>

                    ${
                        failed
                            ? `
                                <div class="trace-error">
                                    <strong>${escapeHTML(
                                        failure.category || "FAILURE"
                                    )}</strong>
                                    <br>
                                    ${escapeHTML(
                                        failure.reason || "Failure detected."
                                    )}
                                </div>
                            `
                            : ""
                    }
                </div>
            </div>
        `;
    });

    if (result.recovery_attempts) {
        traceHTML += `
            <div class="trace-recovery">
                Recovery attempts:
                <strong>${result.recovery_attempts}</strong>
            </div>
        `;
    }

    if (result.backtracks) {
        traceHTML += `
            <div class="trace-backtrack">
                Backtracks:
                <strong>${result.backtracks}</strong>
            </div>
        `;
    }

    traceHTML += `
        </div>
    `;

    const agentLower = agentName.toLowerCase();

    const possibleIds = [
        `${agentLower}Trace`,
        `${agentLower}-trace`,
        `${agentLower}ExecutionTrace`,
        `${agentLower}-execution-trace`,
        "traceOutput",
        "executionTrace"
    ];

    let rendered = false;

    for (const id of possibleIds) {
        const element = getElement(id);

        if (element) {
            element.innerHTML = traceHTML;
            rendered = true;
            break;
        }
    }

    if (!rendered) {
        console.log(`${agentName} trace:`, result);
    }
}


/* =========================================================
   AGENT A
   ========================================================= */

async function runAgentA(taskId = getCurrentTaskId()) {
    if (simulationState.isRunningA) {
        return;
    }

    simulationState.isRunningA = true;

    setCurrentTask(taskId);
    setAgentStatus("AgentA", "Running...");

    console.log(`Running Agent A for ${taskId}`);

    try {
        const response = await runAgentAFromAPI(taskId);

        const result = getAgentResult(response);

        simulationState.agentAResult = result;

        console.log("Agent A backend response:", response);
        console.log("Agent A result:", result);

        displayAgentResult("Agent A", result);
        renderBackendTrace(result, "Agent A");

        setAgentStatus(
            "AgentA",
            result.success ? "Success" : "Failed"
        );

        return response;

    } catch (error) {
        console.error("Agent A error:", error);

        setAgentStatus("AgentA", "Error");

        showAPIError(error, "Agent A");

        throw error;

    } finally {
        simulationState.isRunningA = false;
    }
}


/* =========================================================
   AGENT B
   ========================================================= */

async function runAgentB(taskId = getCurrentTaskId()) {
    if (simulationState.isRunningB) {
        return;
    }

    simulationState.isRunningB = true;

    setCurrentTask(taskId);
    setAgentStatus("AgentB", "Running...");

    console.log(`Running Agent B for ${taskId}`);

    try {
        const response = await runAgentBFromAPI(taskId);

        const result = getAgentResult(response);

        simulationState.agentBResult = result;

        console.log("Agent B backend response:", response);
        console.log("Agent B result:", result);

        displayAgentResult("Agent B", result);
        renderBackendTrace(result, "Agent B");

        setAgentStatus(
            "AgentB",
            result.success ? "Success" : "Failed"
        );

        return response;

    } catch (error) {
        console.error("Agent B error:", error);

        setAgentStatus("AgentB", "Error");

        showAPIError(error, "Agent B");

        throw error;

    } finally {
        simulationState.isRunningB = false;
    }
}


/* =========================================================
   RUN COMPARISON FOR ONE TASK
   ========================================================= */

async function runComparison(taskId = getCurrentTaskId()) {
    console.log(`Running comparison for ${taskId}`);

    setCurrentTask(taskId);

    try {
        const response = await runComparisonFromAPI(taskId);

        const agentA = getAgentResult(response.agentA);
        const agentB = getAgentResult(response.agentB);

        simulationState.agentAResult = agentA;
        simulationState.agentBResult = agentB;

        displayAgentResult("Agent A", agentA);
        displayAgentResult("Agent B", agentB);

        renderBackendTrace(agentA, "Agent A");
        renderBackendTrace(agentB, "Agent B");

        setAgentStatus(
            "AgentA",
            agentA.success ? "Success" : "Failed"
        );

        setAgentStatus(
            "AgentB",
            agentB.success ? "Success" : "Failed"
        );

        return response;

    } catch (error) {
        console.error("Comparison failed:", error);

        showAPIError(error, "Comparison");

        throw error;
    }
}


/* =========================================================
   RENDER AGGREGATE RESULTS FROM REAL BACKEND
   ========================================================= */

function renderAggregateBackendResults(response) {
    if (!response) {
        return;
    }

    const results = Array.isArray(response.results)
        ? response.results
        : [];

    if (results.length === 0) {
        console.warn("No aggregate results returned.");
        return;
    }

    let agentASuccesses = 0;
    let agentBSuccesses = 0;

    let agentATotalCalls = 0;
    let agentBTotalCalls = 0;

    let agentABacktracks = 0;
    let agentBBacktracks = 0;

    let agentBFailures = 0;
    let agentBRecoveredFailures = 0;

    results.forEach(taskResult => {
        const agentA = getAgentResult(taskResult.agent_a);
        const agentB = getAgentResult(taskResult.agent_b);

        if (!agentA || !agentB) {
            return;
        }

        if (agentA.success) {
            agentASuccesses++;
        }

        if (agentB.success) {
            agentBSuccesses++;
        }

        agentATotalCalls += getToolCount(agentA);
        agentBTotalCalls += getToolCount(agentB);

        agentABacktracks += getBacktrackCount(agentA);
        agentBBacktracks += getBacktrackCount(agentB);

        const failures = getFailureCount(agentB);

        if (failures > 0) {
            agentBFailures++;

            if (agentB.success) {
                agentBRecoveredFailures++;
            }
        }
    });

    const totalTasks = results.length;

    const agentAAccuracy =
        totalTasks > 0
            ? (agentASuccesses / totalTasks) * 100
            : 0;

    const agentBAccuracy =
        totalTasks > 0
            ? (agentBSuccesses / totalTasks) * 100
            : 0;

    const agentAAverageSteps =
        totalTasks > 0
            ? agentATotalCalls / totalTasks
            : 0;

    const agentBAverageSteps =
        totalTasks > 0
            ? agentBTotalCalls / totalTasks
            : 0;

    const recoveryRate =
        agentBFailures > 0
            ? (agentBRecoveredFailures / agentBFailures) * 100
            : 0;

    const aggregate = {
        totalTasks,

        agentA: {
            successes: agentASuccesses,
            accuracy: agentAAccuracy,
            totalCalls: agentATotalCalls,
            averageSteps: agentAAverageSteps,
            backtracks: agentABacktracks
        },

        agentB: {
            successes: agentBSuccesses,
            accuracy: agentBAccuracy,
            totalCalls: agentBTotalCalls,
            averageSteps: agentBAverageSteps,
            backtracks: agentBBacktracks,
            failureTasks: agentBFailures,
            recoveredFailures: agentBRecoveredFailures,
            recoveryRate
        }
    };

    console.log("Aggregate backend results:", aggregate);

    simulationState.allResults = aggregate;

    showAggregateResults(aggregate);

    return aggregate;
}


/* =========================================================
   DISPLAY AGGREGATE RESULTS
   ========================================================= */

function showAggregateResults(aggregate) {
    if (!aggregate) {
        return;
    }

    const a = aggregate.agentA;
    const b = aggregate.agentB;

    /*
     * Try to update common IDs used by the existing website.
     */

    const values = {
        "agentAAccuracy": formatPercent(a.accuracy),
        "agentBAccuracy": formatPercent(b.accuracy),

        "agentAAverageSteps": formatNumber(a.averageSteps, 1),
        "agentBAverageSteps": formatNumber(b.averageSteps, 1),

        "agentABacktracks": String(a.backtracks),
        "agentBBacktracks": String(b.backtracks),

        "agentAAccuracyValue": formatPercent(a.accuracy),
        "agentBAccuracyValue": formatPercent(b.accuracy),

        "agentASteps": formatNumber(a.averageSteps, 1),
        "agentBSteps": formatNumber(b.averageSteps, 1),

        "agentABacktrackValue": String(a.backtracks),
        "agentBBacktrackValue": String(b.backtracks),

        "recoveryRate": formatPercent(b.recoveryRate),
        "agentBRecoveryRate": formatPercent(b.recoveryRate),

        "totalTasks": String(aggregate.totalTasks),

        "agentASuccesses":
            `${a.successes}/${aggregate.totalTasks}`,

        "agentBSuccesses":
            `${b.successes}/${aggregate.totalTasks}`
    };

    Object.entries(values).forEach(([id, value]) => {
        setElementText(id, value);
    });


    /*
     * Update generic aggregate containers if they exist.
     */

    const aggregateHTML = `
        <div class="aggregate-results">

            <h2>Experiment Results</h2>

            <div class="aggregate-grid">

                <div class="aggregate-agent">
                    <h3>Agent A — Baseline</h3>

                    <div>
                        Accuracy:
                        <strong>${formatPercent(a.accuracy)}</strong>
                    </div>

                    <div>
                        Average Steps:
                        <strong>${formatNumber(
                            a.averageSteps,
                            1
                        )}</strong>
                    </div>

                    <div>
                        Total Tool Calls:
                        <strong>${a.totalCalls}</strong>
                    </div>

                    <div>
                        Backtracks:
                        <strong>${a.backtracks}</strong>
                    </div>
                </div>


                <div class="aggregate-agent">
                    <h3>Agent B — Recovery</h3>

                    <div>
                        Accuracy:
                        <strong>${formatPercent(b.accuracy)}</strong>
                    </div>

                    <div>
                        Average Steps:
                        <strong>${formatNumber(
                            b.averageSteps,
                            1
                        )}</strong>
                    </div>

                    <div>
                        Total Tool Calls:
                        <strong>${b.totalCalls}</strong>
                    </div>

                    <div>
                        Backtracks:
                        <strong>${b.backtracks}</strong>
                    </div>

                    <div>
                        Recovery Rate:
                        <strong>${formatPercent(
                            b.recoveryRate
                        )}</strong>
                    </div>
                </div>

            </div>

        </div>
    `;

    const aggregateIds = [
        "aggregateResults",
        "aggregate-results",
        "experimentResults",
        "experiment-results",
        "metricsResults"
    ];

    for (const id of aggregateIds) {
        const element = getElement(id);

        if (element) {
            element.innerHTML = aggregateHTML;
            break;
        }
    }

    /*
     * Update table cells if your existing HTML uses IDs.
     */

    updateMetricCell("aAccuracy", formatPercent(a.accuracy));
    updateMetricCell("bAccuracy", formatPercent(b.accuracy));

    updateMetricCell(
        "aSteps",
        formatNumber(a.averageSteps, 1)
    );

    updateMetricCell(
        "bSteps",
        formatNumber(b.averageSteps, 1)
    );

    updateMetricCell(
        "aBacktracks",
        String(a.backtracks)
    );

    updateMetricCell(
        "bBacktracks",
        String(b.backtracks)
    );

    updateMetricCell(
        "recoveryRate",
        formatPercent(b.recoveryRate)
    );
}


function updateMetricCell(id, value) {
    const element = getElement(id);

    if (element) {
        element.textContent = value;
    }
}


/* =========================================================
   RUN ALL TASKS
   ========================================================= */

async function runAllTasks() {
    if (simulationState.isRunningAll) {
        return;
    }

    simulationState.isRunningAll = true;

    console.log("Running all tasks through FastAPI...");

    setElementText("runAllStatus", "Running all tasks...");

    try {
        const response = await runAllTasksFromAPI();

        console.log("Run-all backend response:", response);

        simulationState.allResults = response;

        renderAggregateBackendResults(response);

        /*
         * Also print every task result to the browser console.
         */

        if (Array.isArray(response.results)) {
            response.results.forEach(task => {
                console.log(
                    `Task ${task.task_id || ""}:`,
                    task
                );
            });
        }

        setElementText("runAllStatus", "All tasks completed");

        return response;

    } catch (error) {
        console.error("Run-all failed:", error);

        setElementText("runAllStatus", "Run-all failed");

        showAPIError(error, "Run All");

        throw error;

    } finally {
        simulationState.isRunningAll = false;
    }
}


/* =========================================================
   API ERROR DISPLAY
   ========================================================= */

function showAPIError(error, source = "Backend") {
    const message =
        error && error.message
            ? error.message
            : String(error);

    console.error(`${source} error:`, message);

    const errorHTML = `
        <div class="api-error">
            <strong>${escapeHTML(source)} Error</strong>
            <p>${escapeHTML(message)}</p>

            <p>
                Make sure your FastAPI server is running at:
            </p>

            <code>${escapeHTML(API_BASE_URL)}</code>
        </div>
    `;

    const errorIds = [
        "apiError",
        "backendError",
        "errorMessage"
    ];

    for (const id of errorIds) {
        const element = getElement(id);

        if (element) {
            element.innerHTML = errorHTML;
            return;
        }
    }
}


/* =========================================================
   BACKEND INITIALIZATION
   ========================================================= */

async function initializeBackend() {
    console.log("Initializing FastAPI connection...");

    try {
        const health = await checkBackend();

        setBackendStatus(true);

        console.log("FastAPI health:", health);

        try {
            await loadTasks();
        } catch (taskError) {
            console.warn(
                "Backend is reachable, but task loading failed:",
                taskError
            );
        }

        return health;

    } catch (error) {
        setBackendStatus(false);

        console.warn(
            "FastAPI backend is not currently reachable."
        );

        /*
         * Do not stop the website from loading if the backend
         * is temporarily offline.
         */
        return null;
    }
}


/* =========================================================
   TASK BUTTON HELPERS
   ========================================================= */

function selectTask(taskId) {
    setCurrentTask(taskId);

    console.log("Selected task:", taskId);

    const config = taskConfig[taskId];

    if (config) {
        setElementText(
            "taskTitle",
            config.title
        );

        setElementText(
            "taskDescription",
            config.description
        );
    }

    /*
     * Update common task selectors if they exist.
     */

    const taskSelectors = [
        "taskSelect",
        "task-selector",
        "taskSelector"
    ];

    for (const id of taskSelectors) {
        const element = getElement(id);

        if (element && "value" in element) {
            element.value = taskId;
        }
    }

    return taskId;
}


/* =========================================================
   TRACE SUMMARY
   ========================================================= */

function getTraceSummary(result) {
    if (!result) {
        return {
            toolCalls: 0,
            backtracks: 0,
            failures: 0,
            recoveryAttempts: 0,
            success: false
        };
    }

    return {
        toolCalls: getToolCount(result),
        backtracks: getBacktrackCount(result),
        failures: getFailureCount(result),
        recoveryAttempts: getRecoveryCount(result),
        success: Boolean(result.success)
    };
}


/* =========================================================
   CONSOLE DEBUG FUNCTION
   ========================================================= */

function printCurrentResults() {
    console.log("====================================");
    console.log("CURRENT EXPERIMENT RESULTS");
    console.log("====================================");

    console.log("Task:", simulationState.currentTask);

    console.log(
        "Agent A:",
        simulationState.agentAResult
    );

    console.log(
        "Agent B:",
        simulationState.agentBResult
    );

    console.log(
        "Aggregate:",
        simulationState.allResults
    );

    console.log("====================================");
}


/* =========================================================
   WINDOW EXPORTS
   =========================================================
   
   These make the functions available to your existing HTML
   buttons such as:
   
   onclick="runAgentA('T001')"
   onclick="runAgentB('T001')"
   onclick="runAllTasks()"
   
   ========================================================= */

window.API_BASE_URL = API_BASE_URL;

window.checkBackend = checkBackend;
window.loadTasks = loadTasks;

window.runAgentAFromAPI = runAgentAFromAPI;
window.runAgentBFromAPI = runAgentBFromAPI;
window.runComparisonFromAPI = runComparisonFromAPI;
window.runAllTasksFromAPI = runAllTasksFromAPI;

window.runAgentA = runAgentA;
window.runAgentB = runAgentB;
window.runComparison = runComparison;
window.runAllTasks = runAllTasks;

window.renderBackendTrace = renderBackendTrace;
window.renderAggregateBackendResults =
    renderAggregateBackendResults;

window.showAggregateResults = showAggregateResults;

window.selectTask = selectTask;
window.setCurrentTask = setCurrentTask;

window.printCurrentResults = printCurrentResults;


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    console.log(
        "PLANBENCH-XL frontend loaded."
    );

    /*
     * Keep T001 as the initial task unless your HTML
     * already selected another task.
     */
    if (!simulationState.currentTask) {
        simulationState.currentTask = "T001";
    }

    /*
     * Initialize backend connection.
     */
    await initializeBackend();

    /*
     * Expose initial state for debugging.
     */
    console.log(
        "Initial task:",
        simulationState.currentTask
    );
});



// ============================================================
// COMPATIBILITY FUNCTIONS FOR EXISTING HTML BUTTONS
// ============================================================

window.runAgentA = async function () {
    const selector = document.querySelector("select");
    const taskId = selector ? selector.value : "T001";

    console.log("Running Agent A for:", taskId);

    try {
        await runAgentAFromAPI(taskId);
    } catch (error) {
        console.error("Agent A failed:", error);
        alert("Agent A error: " + error.message);
    }
};

window.runAgentB = async function () {
    const selector = document.querySelector("select");
    const taskId = selector ? selector.value : "T001";

    console.log("Running Agent B for:", taskId);

    try {
        await runAgentBFromAPI(taskId);
    } catch (error) {
        console.error("Agent B failed:", error);
        alert("Agent B error: " + error.message);
    }
};

window.runAllTasks = async function () {
    console.log("Running all 5 tasks...");

    try {
        await runAllTasksFromAPI();
    } catch (error) {
        console.error("Run All failed:", error);
        alert("Run All error: " + error.message);
    }
};


// ============================================================
// CONNECT OLD HTML BUTTONS TO THE NEW FASTAPI BACKEND
// ============================================================

// HTML currently calls runBaseline()
window.runBaseline = async function () {
    const selector = document.querySelector("select");
    const taskId = selector ? selector.value : "T001";

    console.log("Running Agent A for:", taskId);

    try {
        await runAgentAFromAPI(taskId);
    } catch (error) {
        console.error("Agent A error:", error);
        alert("Agent A error: " + error.message);
    }
};


// HTML currently calls runAgentB()
window.runAgentB = async function () {
    const selector = document.querySelector("select");
    const taskId = selector ? selector.value : "T001";

    console.log("Running Agent B for:", taskId);

    try {
        await runAgentBFromAPI(taskId);
    } catch (error) {
        console.error("Agent B error:", error);
        alert("Agent B error: " + error.message);
    }
};


// HTML currently calls injectFailure()
window.injectFailure = function () {
    console.log("Failure injection is controlled by the FastAPI backend.");

    alert(
        "Failure injection is configured by the backend for the experimental task.\n\n" +
        "Run Agent A or Agent B to execute the configured failure."
    );
};


// HTML currently calls resetSimulation()
window.resetSimulation = function () {
    console.log("Resetting simulation...");
    window.location.reload();
};


// HTML currently calls changeTask(value)
window.changeTask = function (taskId) {
    console.log("Changing task to:", taskId);

    // Save selected task
    if (typeof simulationState !== "undefined") {
        simulationState.currentTask = taskId;
        simulationState.selectedTask = taskId;
    }

    // Find the task from the backend-loaded task list
    let task = null;

    if (typeof backendTasks !== "undefined" && Array.isArray(backendTasks)) {
        task = backendTasks.find(t => t.task_id === taskId);
    }

    // Also check taskConfig if backendTasks is not available
    if (!task && typeof taskConfig !== "undefined") {
        task = taskConfig[taskId];
    }

    if (!task) {
        console.warn("Task not found:", taskId);
        return;
    }

    console.log("Selected task:", task);

    // Try to update common task-card elements
    const allText = document.querySelectorAll("body *");

    allText.forEach(el => {
        if (el.children.length !== 0) return;

        const text = el.textContent.trim();

        if (text === "TASK T001" || /^TASK T\d+$/.test(text)) {
            el.textContent = "TASK " + taskId;
        }

        if (text === "account_id = acc_001" && task.initial_state) {
            const accountId = task.initial_state.account_id;
            el.textContent = "account_id = " + accountId;
        }

        if (text === "refund_status" && el.dataset.taskField === "target") {
            el.textContent = task.target_state;
        }
    });
};


// Keep compatibility with any HTML using runAgentA()
window.runAgentA = window.runBaseline;


// Keep compatibility with any HTML using runAgentB()
window.runAgentB = window.runAgentB;


// Keep compatibility with any HTML using runAllTasks()
window.runAllTasks = async function () {
    console.log("Running all 5 tasks...");

    try {
        await runAllTasksFromAPI();
    } catch (error) {
        console.error("Run All error:", error);
        alert("Run All error: " + error.message);
    }
};

console.log("HTML button compatibility functions loaded.");
