#!/usr/bin/env node

var program = require('commander')
    , getAWS = require('./libs/getAWS')
    , consts = require('./libs/consts')
    , d = require('./libs/debug')
    ;

program
    .version('0.0.1')
    .option('-r, --region <region>', 'AWS region', String, 'us-east-1')
    .option('-d, --domain <domain>', 'SWF Domain', String, 'test-swf')
    .parse(process.argv);


var AWS = getAWS(program.region);
var swf = new AWS.SimpleWorkflow({apiVersion: '2012-01-25'});


// keep polling for things... 
(function poll() {
    d.status("Polling for decision task");
    swf.pollForDecisionTask({
        domain: program.domain
        , taskList : {name: consts.taskLists.decision}
        , identity: "Decider1"
    }, function(err, decisionTask) {
        if (err) {
            d.error("%s", err);
        } else if (decisionTask.taskToken != "") { /* empty == poll timeout */
            if (decisionTask.previousStartedEventId == 0) {
                // no decisions ever made...
                scheduleFirstActivity(decisionTask);
            } else {
                d.info("time to scan history ...");
                scheduleNextActivity(decisionTask);
            }
        }

        // keep polling...
        setImmediate(poll);
    });
})();

function scheduleFirstActivity(decision) {
    d.status("Scheduling first decision task");
    var activity = consts.activities[0];

    swf.respondDecisionTaskCompleted({
        taskToken: decision.taskToken
        , decisions: [
            {
            decisionType: "ScheduleActivityTask"
            , scheduleActivityTaskDecisionAttributes: {
                activityType: { name: activity.name, version: activity.ver }
                , activityId  : ("act"+Date.now())
                , input : JSON.stringify({start: Date.now()})
                }
            }
        ]
    }, function(err, results) {
        if (err) {
            d.error("scheduleFirstActivity: %s", err);
        } else {
            d.status("Scheduled First Activity");
        }
    });
}

function scheduleNextActivity(decision) {

    var s = decision.previousStartedEventId - 1;
        e = decision.startedEventId - 1, 
        events = decision.events.slice(s, e) /* events since last decision */
        ev = null
        ;

        while(ev = events.pop()) {
            switch (ev.eventType) {
                case "ActivityTaskCompleted":
                    _nextActivity(ev);
                    break;

                case "DecisionTaskScheduled":
                case "DecisionTaskTimedOut":
                    // do nothing
                    break;

            }
        }

    // ick...
    function _nextActivity(lastTaskEvent) {
        if (lastTaskEvent.eventType == "ActivityTaskCompleted") {
            var last, next
                , r = JSON.parse(lastTaskEvent.activityTaskCompletedEventAttributes.result);
            if (r.activities.length > 0) {
                var last = r.activities[r.activities.length - 1];
                switch(last.name) {
                    case "activity1":
                        next = "activity2";
                        break;
                    case "activity2": 
                        r.activities.push({complete: true, done: Date.now()});
                        next = "done";
                }

                if (next == "done") {
                    swf.respondDecisionTaskCompleted({
                        taskToken: decision.taskToken
                        , decisions: [{
                            decisionType: "CompleteWorkflowExecution"
                            , completeWorkflowExecutionDecisionAttributes: {
                                result: JSON.stringify(r)
                            }
                        }]
                    }, function(err, data) {
                        if (err) { 
                            d.error("scheduleNext: %s", err);
                        } else {
                            d.status("Completed Workflow");
                        }
                    });
                } else {
                    d.info("Scheduling next activity %s", next);
                    swf.respondDecisionTaskCompleted({
                        taskToken: decision.taskToken
                        , decisions: [
                            {
                            decisionType: "ScheduleActivityTask"
                            , scheduleActivityTaskDecisionAttributes: {
                                activityType: { name: next, version: "0.5" }
                                , activityId  : ("act"+Date.now())
                                , input : JSON.stringify(r)
                                }
                            }
                        ]
                    }, function(err, results) {
                        if (err) {
                            d.error("scheduleFirstActivity: %s", err);
                        } else {
                            d.status("Scheduled %s Activity", next);
                        }
                    });
                }
            }
        }
    } 
}
