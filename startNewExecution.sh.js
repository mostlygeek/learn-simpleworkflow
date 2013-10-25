#!/usr/bin/env node

var program = require('commander')
    , getAWS = require('./libs/getAWS')
    , consts = require('./libs/consts')
    , debug = require("debug")
    , d = {
        status: debug("status")
    };

program
    .version('0.0.1')
    .option('-r, --region <region>', 'AWS region', String, 'us-east-1')
    .option('-d, --domain <domain>', 'SWF Domain', String, 'test-swf')
    .parse(process.argv);


var AWS = getAWS(program.region);
var swf = new AWS.SimpleWorkflow({apiVersion: '2012-01-25'});

d.status("Starting a new workflow");
swf.startWorkflowExecution({
    domain: program.domain
    , workflowId: ("test"+Date.now())
    , workflowType : { 
        name: consts.workflow.name
        , version: consts.workflow.ver
    }
    , taskList: {name: consts.taskLists.decision }
    , input: JSON.stringify({start: Date.now()})

    /* max time the workflow has to finish */
    , executionStartToCloseTimeout: "60"

    /* max time each task gets to finish */
    , taskStartToCloseTimeout: "10"

    , childPolicy: "TERMINATE"
}, function(err, data) {
    console.log(err, data);
});
