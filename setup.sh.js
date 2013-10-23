#!/usr/bin/env node

var program = require('commander')
    , async = require('async')
    , AWS = require('aws-sdk')
    , debug = require('debug')
    , d = {
        /* debug outputs */
        status: debug('status')
    };

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
    .option('-d, --domain <domain>', 'SWF Domain', String, 'test-swf-adder')
    .parse(process.argv);

AWS.config.update({
    accessKeyId : process.env.AWS_ACCESS_KEY,
    secretAccessKey : process.env.AWS_SECRET_KEY
});

AWS.config.update({region: program.region});

var swf = new AWS.SimpleWorkflow({apiVersion: '2012-01-25'});

async.waterfall([
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
            , workflowType: {name: "add-one", version: "0.1"}
        }, function(err, data) {
            if (err && err.code === "UnknownResourceFault") {
                d.status("Creating WorkflowType: add-number");
                swf.registerWorkflowType({
                    domain: program.domain
                    , name: "add-one"
                    , version: "0.1"
                    , description: "Workflow for adding a 1 to a random value"
                    , defaultTaskList: { name: "default" }
                    , defaultTaskStartToCloseTimeout: "60"
                    , defaultExecutionStartToCloseTimeout: "180"
                }, function(err, data) {
                    if (err) return cb(err);

                    d.status("Created WorkflowType: add-one");
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
    , function(domain, cb) {
        swf.describeActivityType({
            domain: program.domain
            , activityType: {
                name: "add-numbers"
                , version: "0.1"
            }
        }, function(err, data) {
                if (err && err.code === "UnknownResourceFault") {
                    d.status("Creating activity type: add-numbers");
                    swf.registerActivityType({
                        domain: program.domain
                        , name: "add-numbers"
                        , version: "0.1"
                        , description: "add two numbers together"
                        , defaultTaskStartToCloseTimeout: "30"
                    }, function(err, data){
                        if (err) return cb(err); 

                        d.status("Created new activity type");
                        cb(null, domain);
                    });
                } else if (err) {
                    cb(err);
                } else {
                    d.status("Found activityType: add-numbers");
                    cb(null, domain);
                }
        });
    }
], function(err, results) {
    console.log(err, results);
});

