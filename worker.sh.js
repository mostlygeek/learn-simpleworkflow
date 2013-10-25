#!/usr/bin/env node

var program = require('commander')
    , getAWS = require('./libs/getAWS')
    , consts = require('./libs/consts')
    , d = require('./libs/debug')

program
    .version('0.0.1')
    .option('-r, --region <region>', 'AWS region', String, 'us-east-1')
    .option('-d, --domain <domain>', 'SWF Domain', String, 'test-swf')
    .parse(process.argv);


var AWS = getAWS(program.region);
var swf = new AWS.SimpleWorkflow({apiVersion: '2012-01-25'});

consts.activities.forEach(function(activityTask, i) {
    (function poll(identity, activityTask) {
        d.status("%s) Waiting for ActivityTask: %s", identity, activityTask.name);
        swf.pollForActivityTask({
            domain: program.domain
            , taskList: { name: activityTask.name }
            , identity: identity
        }, function(err, data) {
            if (err) {
                d.error("%s) activityTask poll error: %s", identity, err);
            } else if (data.startedEventId === 0) { /* timeout */
                d.status("%s) activityTask poll timeout", identity);
            } else {
                handleActivityTask(activityTask.name, data);
            }

            // poll again...
            setImmediate(poll.bind(this, identity, activityTask));
        });
    })("Worker"+i, activityTask);
});

/* `data` blob looks like: 
 *
{ activityId: 'act1382658450091',
  activityType: { name: 'activity1', version: '0.5' },
  startedEventId: 6,
  taskToken: '.... ',
  input: '....'
  workflowExecution:
   { runId: '12FcSuE8wUeJX9vtlWvbeh/v1a7sTQx5XBiwNFpYSNxK8=',
     workflowId: 'test1382658449609' } }
 */

function handleActivityTask(name, data) {
    var result = JSON.parse(data.input);

    if (!result.activities) {
        result.activities = [ {name: name, touched: Date.now()} ];
    } else {
        result.activities.push({name: name, touched: Date.now()});
    }

    swf.respondActivityTaskCompleted({
        taskToken: data.taskToken
        , result: JSON.stringify(result)
    }, function(err, data) {
        if (err) {
            d.error("%s) %s", name, err);
        } else {
            d.status("%s completed activity task", name);
        }
    });
}

