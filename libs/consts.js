module.exports = {
    "taskLists": {
        "decision" : "decision"
    },
    "workflow" : { 
        name: "Workflow1"
        , ver: "0.4" 
        , defaultTaskList: "default"

        /* maximum timeout of decision tasks */
        , defaultTaskStartToCloseTimeout: "5"

        /* max time this workflow can run for */
        , defaultExecutionStartToCloseTimeout: "60"
        
    }
    , "activities" : [
          {name: "activity1", ver:"0.5", description: ""}
        , {name: "activity2", ver:"0.5", description: ""}
        , {name: "activity3", ver:"0.5", description: ""}
        , {name: "activity4", ver:"0.5", description: ""}
    ]
}
