#!/usr/bin/env node

var program = require('commander')
    , consts = require('./libs/consts')
    , getAWS = require('./libs/getAWS')
    , async = require('async')
    , d = require('./libs/debug')
    ;

/*
 * This will set up: 
 *
 *  - SWF Domain 
 *  - The workflow type
 *  - The Action type
 *
 * within AWS so the example code: decider.js, worker-X.js will work
 * as intended.
 */

program
    .version('0.0.1')
    .option('-r, --region <region>', 'AWS region', String, 'us-east-1')
    .option('-d, --domain <domain>', 'SWF Domain', String, 'test-swf')
    .parse(process.argv);

var AWS = getAWS(program.region);
var swf = new AWS.SimpleWorkflow({apiVersion: '2012-01-25'});

var createTasks = [
    function(cb) {
        /* make sure the domain exists */
        swf.describeDomain({name: program.domain}, function(err, data) {
            if (err && err.code === "UnknownResourceFault") {
                d.status("Domain %s not found, creating it", program.domain);
                swf.registerDomain({
                    name: program.domain
                    , description: "github.com/mostlygeek/learn-simpleworkflow"
                    , workflowExecutionRetentionPeriodInDays: "30"
                }, cb);
            } else if (err) {
                cb(err);
            } else {
                d.status("Found Domain: %s", program.domain);
                cb(null, data);
            }
        });
    }
    , function(domain, cb) {
        swf.describeWorkflowType({
            domain: program.domain
            , workflowType: {
                name: consts.workflow.name, 
                version: consts.workflow.ver}
        }, function(err, data) {
            if (err && err.code === "UnknownResourceFault") {
                d.status("Creating WorkflowType: %s", consts.workflow.name);
                swf.registerWorkflowType({
                    domain: program.domain
                    , name: consts.workflow.name
                    , version: consts.workflow.ver
                    , description: "A simple workflow"
                    , defaultTaskList: { name: consts.workflow.defaultTaskList }

                    /* maximum timeout of decision tasks */
                    , defaultTaskStartToCloseTimeout: consts.workflow.defaultTaskStartToCloseTimeout

                    /* max time this workflow can run for */
                    , defaultExecutionStartToCloseTimeout: consts.workflow.defaultExecutionStartToCloseTimeout
                }, function(err, data) {
                    if (err) return cb(err);

                    d.status("Created WorkflowType: %s", consts.workflow.name);
                    cb(null, domain);
                });
            } else if (err) {
                cb(err);
            } else {
                d.status("Found workflowType: add-one");
                cb(null, data);
            }
        });
    }
];

consts.activities.forEach(function(activity) {
    createTasks.push(createAddActivity(
        activity.name
        , activity.ver
        , activity.description
        )
    );
});

async.waterfall(createTasks, function(err, results) {
    console.log(err, results);
});


/*
 * create an activity if it doesn't exist
 */
function createAddActivity(name, ver, description, timeout) {

    timeout = timeout || "60";
    description = description || "";
    return function(domain, cb) {
        swf.describeActivityType({
            domain: program.domain
            , activityType: { name: name , version: ver}
        }, function(err, data) {
            if (err && err.code === "UnknownResourceFault") {
                d.status("Creating activity type: %s", name);
                swf.registerActivityType({
                    domain: program.domain
                    , name: name
                    , version: ver
                    , description: description
                    , defaultTaskList : { name: name }

                    /* setting default values means when creating 
                     * new activity tasks, these values do *NOT* need
                     * to be specified */
                    , defaultTaskStartToCloseTimeout: "60"
                    , defaultTaskScheduleToStartTimeout: "10"
                    , defaultTaskScheduleToCloseTimeout: "30"
                    , defaultTaskHeartbeatTimeout: "NONE"
                }, function(err, data){
                    if (err) return cb(err); 

                    d.status("Created new activity type: %s", name);
                    cb(null, domain);
                });
            } else if (err) {
                cb(err);
            } else {
                d.status("Found activityType: %s", name);
                cb(null, domain);
            }
        });
    }
}
