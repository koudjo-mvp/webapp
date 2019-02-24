exports.roles = ["admin","consumer"];

exports.actionrules = {
    "POST /login":["admin","consumer"],
    "POST /logout":["admin","consumer"],
    "GET /users":["admin","consumer"],
    "POST /users":["admin","consumer"],
    "PUT /users":["admin","consumer"],
    "DELETE /users":["admin","consumer"],
    "GET /tasks":["consumer"],
    "POST /tasks":["consumer"],
    "PUT /tasks":["consumer"],
    "DELETE /tasks":["admin","consumer"],
    "GET /jobs":["consumer"],
    "POST /jobs":["consumer"],
    "PUT /jobs":["consumer"]
};

exports.displayrules = {
    "Users":{
        username: "pu",
        userid: "in",
        firstname: "pu",
        lastname: "pu",
        email: "cf",
        password: "cf",
        facebook: "cf",
        facebook_token: "in",
        facebook_tokensecret: "in",
        twitter: "cf",
        twitter_token: "in",
        twitter_tokensecret: "in",
        recovery_email: "cf",
        age: "pu",
        gender: "pu",
        picture: "pu",
        type: "pu",
        login_ip: "in",
        signup_ip: "in",
        signup_location: "in",
        login_location: "in",
        login_sessionid: "in",
        login_date: "pr",
        roles: "pu"
    },
    "UsersSignUp":{
        username: "pu",
        firstname: "pu",
        lastname: "pu",
        email: "cf",
        password: "cf",
        age: "pu",
        gender: "pu",
        type: "pu",
        signup_ip: "in",
        signup_location: "in",
        signup_date: "pr",
        expiration_date: "pu",
        signup_token: "in"
    },
    "PreviewSessions":{
        sessionid: "cf",
        preview_ip: "cf",
        preview_token: "cf"
    },
    "Apikeys":{
        appname: "pu",
        apikey: "cf"
    },
    "Tasks":{
        taskid: "pr",
        taskname: "pu",
        task_auth_parameters: "cf",
        task_action_queue: "pu",
        task_action_parameters: "pr",
        task_action_trigger: "pu",
        task_action_frequency: "pu",
        type: "pu"
    },
    "CronTabs":{
        name: "pu",
        jobid: "pu",
        args: "cf",
        lastrun: "pu",
        period: "pu",
        type: "pu"
    },
    "Jobs":{
        jobid: "pu",
        taskname: "pu",
        trigger: "pu",
        status: "pu",
        reason: "pu",
        submission_parameters: "pr",
        type: "pu"
    }
};