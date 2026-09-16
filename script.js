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
   SIMULATION STATE
===================================== */

let failureInjected = false;
let simulationRunning = false;
let baselineHasRun = false;
let activeTimers = [];

let selectedTaskId = "T001";


/*
   Store results for all tasks.
*/

let experimentResults = {};


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
   HELPER
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

    if (!task) {
        return;
    }

    /*
       Update task information.
    */

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

    setText(
        "injectedFailure",
        "Implicit Failure"
    );


    /*
       Reset only the current simulation.
    */

    failureInjected = false;
    baselineHasRun = false;

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

    setText(
        "accuracyA",
        "0%"
    );

    setText(
        "accuracyB",
        "0%"
    );

    setText(
        "stepsA",
        "0"
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
        trace.innerHTML = "";
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


    /*
       T001/T002/T004/T005:
       account_id → user_id → order_id
    */

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


    /*
       All routes eventually reach order_id.
    */

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
                ? "tuna — suspicious result"
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

    const task =
        tasks[selectedTaskId];

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

                        setText(
                            "stepsA",
                            steps.length
                        );

                        setText(
                            "accuracyA",
                            "0%"
                        );

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

                        setText(
                            "stepsA",
                            steps.length
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
   BUILD RECOVERY STEPS
===================================== */

function getRecoverySteps(task) {

    const steps = [];


    /*
       If task starts from account_id,
       first obtain user_id.
    */

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


    /*
       Common route.
    */

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


    /*
       Failure.
    */

    steps.push({

        tool:
            "get_refund_status(refund_701)",

        state:
            "refund_status",

        result:
            "tuna — NON_PROGRESS",

        type:
            "failure"

    });


    /*
       Backtracking.
    */

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


    /*
       Alternative route.
    */

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

    const task =
        tasks[selectedTaskId];

    simulationRunning = true;

    clearTrace();


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
       Recovery should demonstrate
       the injected failure.
    */

    failureInjected = true;


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


                    setText(
                        "stepsB",
                        steps.length
                    );


                    setText(
                        "accuracyB",
                        "100%"
                    );


                    setText(
                        "backtracks",
                        "1"
                    );


                    setText(
                        "recoveryRate",
                        "100%"
                    );


                    /*
                       Save result.
                    */

                    experimentResults[selectedTaskId] = {

                        agentA: {
                            success: false,
                            steps: task.minimumSteps
                        },

                        agentB: {
                            success: true,
                            steps: steps.length,
                            backtracks: 1
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


    /*
       Stop old animation.
    */

    cancelActiveTimers();


    const taskIds =
        Object.keys(tasks);


    let agentASuccess = 0;
    let agentBSuccess = 0;

    let agentASteps = 0;
    let agentBSteps = 0;

    let agentBBacktracks = 0;


    /*
       Since this is an experiment runner,
       we calculate the result of each task
       using the same injected failure.
    */

    taskIds.forEach(taskId => {

        const task =
            tasks[taskId];


        /*
           Baseline receives the wrong result
           and therefore fails.
        */

        const baselineSteps =
            getBaselineStepsForAggregate(task);


        /*
           Recovery takes the original route,
           detects failure, backtracks and
           uses the alternative route.
        */

        const recoverySteps =
            getRecoverySteps(task);


        experimentResults[taskId] = {

            agentA: {
                success: false,
                steps: baselineSteps
            },

            agentB: {
                success: true,
                steps: recoverySteps,
                backtracks: 1
            }

        };


        if (experimentResults[taskId].agentA.success) {
            agentASuccess++;
        }


        if (experimentResults[taskId].agentB.success) {
            agentBSuccess++;
        }


        agentASteps += baselineSteps;
        agentBSteps += recoverySteps;

        agentBBacktracks += 1;

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
        (agentASteps / total).toFixed(1);


    const averageStepsB =
        (agentBSteps / total).toFixed(1);


    const recoveryRateB =
        Math.round(
            (agentBSuccess / total) * 100
        );


    /*
       Update visible metrics.
    */

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
        `${recoveryRateB}%`
    );


    setText(
        "baselineResult",
        `${total} tasks evaluated`
    );


    setText(
        "recoveryResult",
        `Recovered ${agentBSuccess}/${total} tasks`
    );


    /*
       Display aggregate summary.
    */

    showAggregateResults(
        taskIds,
        accuracyA,
        accuracyB,
        averageStepsA,
        averageStepsB,
        agentBBacktracks
    );

}


/* =====================================
   AGGREGATE BASELINE STEPS
===================================== */

function getBaselineStepsForAggregate(task) {

    /*
       account_id tasks:
       5 tool calls

       user_id task:
       4 tool calls
    */

    if (task.startState === "user_id") {
        return 4;
    }

    return 5;

}


/* =====================================
   AGGREGATE RECOVERY STEPS
===================================== */

function getRecoveryStepsForAggregate(task) {

    /*
       account_id:
       5 normal calls
       + 1 backtrack
       + 2 alternative calls
       = 8

       user_id:
       4 normal calls
       + 1 backtrack
       + 2 alternative calls
       = 7
    */

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
    totalBacktracks
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
                    ${result.agentA.success
                        ? "Success"
                        : "Failed"}
                </td>

                <td>
                    ${result.agentA.steps}
                </td>

                <td>
                    ${result.agentB.success
                        ? "Success"
                        : "Failed"}
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
            ${totalBacktracks}

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

    setText(
        "accuracyA",
        "0%"
    );

    setText(
        "accuracyB",
        "0%"
    );

    setText(
        "stepsA",
        "0"
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
       Remove aggregate results.
    */

    const aggregate =
        document.getElementById(
            "aggregateResults"
        );

    if (aggregate) {
        aggregate.remove();
    }


    experimentResults = {};


    clearTrace();

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

        changeTask();

    }
);
