/**
 * Created by P.K.V.M. on 11/30/2017.
 */
var mongoose = require('mongoose');
var uuid_generator = require('uuid/v4');
var path = require('path');
var fs = require('fs');
var hogan_engine = require('hogan.js');
var configuration = require('../config');
var toolbox = require('./toolbox');
var sec_policies = require('./security_policies');
var middleware = require('../routes/middleware');
var tables = ['Tasks','CronTabs'];
var lookupkeys = ['taskname','name'];
var Tasks = mongoose.model('Tasks');
var CronTabs = mongoose.model('CronTabs');

exports.search_all_tasks = function(req, res, next){
    toolbox.req_log("-GET /api/tasks endpoint. search all "+tables[0]+" rows-",req);
    var default_results = [];

    //insert backend code here to fetch your data
    var find_filters = {};
    for (var key1 in req.query) {
        if (sec_policies.displayrules[tables[0]][key1]) {
            find_filters[key1] = req.query[key1];
        }
    }

    find_filters["type"] = req.decoded.type;
    Tasks.restapidbrequest(req, res, next, default_results, "find",
        {
            condition: find_filters,
            projection:{},
            options: {}
        },
        function(req, res, next, default_results, dbresults){
            var apiResponse;
            if (dbresults){
                toolbox.logging('debug',req,dbresults);
                var meta_data = {
                    total: dbresults["total"],
                    limit: dbresults["limit"],
                    page: dbresults["page"],
                    pages: dbresults["pages"]
                };
                var data_filtered = toolbox.filter_data(dbresults["data"],req.decoded.userid,req.decoded.type);
                apiResponse = new configuration.jsonResponse(200,"","",meta_data,data_filtered);
                toolbox.logging('info',req,"get tasks completed",'OK');
                return res.status(apiResponse.status).json(apiResponse);
            } else {
                apiResponse = new configuration.jsonResponse(204,"","","",default_results);
                toolbox.logging('info',req,'no tasks record found','OK');
                return res.status(apiResponse.status).json(apiResponse);
            }
        });
};

exports.get_task = function(req, res, next){
    toolbox.req_log("-GET /api/tasks/:taskid endpoint. get "+tables[0]+" row-",req);
    var default_results = {};

    //insert backend code here to fetch your data
    if (req.params.resid) {
        Tasks.restapidbrequest(req, res, next, default_results, "findOne",
            {
                condition: {taskname: req.params.resid, type: req.decoded.type},
                projection:{},
                options: {}
            },
            function(req, res, next, default_results, dbresults){
                var apiResponse;
                if (dbresults){
                    var data_filtered = toolbox.filter_data(dbresults,req.decoded.userid,req.decoded.type);
                    apiResponse = new configuration.jsonResponse(200,"","","",data_filtered);
                    toolbox.logging('info',req,"get task completed",'OK');
                    return res.status(apiResponse.status).json(apiResponse);
                } else {
                    apiResponse = new configuration.jsonResponse(204,"","","",default_results);
                    toolbox.logging('info',req,'task '+req.params.resid+' does not exist','OK');
                    return res.status(apiResponse.status).json(apiResponse);
                }

            });
    } else {
        var errm = 'Bad request, cannot get task infos without providing a username and the right privileges';
        toolbox.logging('error',req,errm,'KO');
        var apiResponse = new configuration.jsonResponse(400,errm,errm,"",default_results);
        return res.status(apiResponse.status).json(apiResponse);
    }
};

exports.get_task_info = function(req, res, next){
    toolbox.req_log("-GET /api/tasks/:resid?info=infoname endpoint. get task info-",req);
    var default_results = {};

    //insert backend code here to fetch your data
    if (req.params.resid && req.query.info) {
        Tasks.restapidbrequest(req, res, next, default_results, "findOne",
            {
                condition: {taskname: req.params.resid, type: req.decoded.type},
                projection:{},
                options: {}
            },
            function(req, res, next, default_results, dbresults){
                var apiResponse;
                if (dbresults){
                    var data_filtered = toolbox.filter_data(dbresults,req.decoded.userid,req.decoded.type);
                    if (data_filtered[req.query.info]){
                        apiResponse = new configuration.jsonResponse(200,"","","",data_filtered[req.query.info]);
                        toolbox.logging('info',req,"get task info completed",'OK');
                        return res.status(apiResponse.status).json(apiResponse);
                    } else {
                        apiResponse = new configuration.jsonResponse(400,'Bad request: '+req.query.info+" parameter " +
                            "does not exist, or has a restricted access",'Bad request: '+req.query.info+" parameter " +
                            "does not exist, or has a restricted access","",default_results);
                        toolbox.logging('error',req,"get task info aborted because: "+'Bad request: '+req.query.info+" " +
                            "parameter does not exist, or has a restricted access",'KO');
                        return res.status(apiResponse.status).json(apiResponse);
                    }
                } else {
                    apiResponse = new configuration.jsonResponse(204,"","","",default_results);
                    toolbox.logging('info',req,'task does not exist','OK');
                    return res.status(apiResponse.status).json(apiResponse);
                }

            });
    } else {
        var errm = 'Bad request, cannot get task info without providing a taskname, field parameter and the right privileges';
        toolbox.logging('error',req,errm,'KO');
        var apiResponse = new configuration.jsonResponse(400,errm,errm,"",default_results);
        return res.status(apiResponse.status).json(apiResponse);
    }
};

function create_task_scripts(req, res, next, default_results, dbresults){
    var apiResponse;
    var app_dir = process.env.WEBAPP_INSTALL_DIR || path.join(__dirname, '..');
    var taskname = req.body.taskname;
    var task_action_trigger = (req.body.task_action_trigger || "ondemand");

    if (dbresults){
        // create task files and dir
        var scriptsdir = path.join(app_dir, './bin/scripts');
        var newpi_dir = path.join(scriptsdir, taskname+"_src");
        if (!fs.existsSync(newpi_dir)){
            toolbox.logging('debug',req,"about to create p.i. folder: "+newpi_dir);
            fs.mkdirSync(newpi_dir);
        }
        if (!fs.existsSync(path.join(newpi_dir, "__init__.py"), "")) {
            fs.writeFileSync(path.join(newpi_dir, "__init__.py"),"");
        }
        var template;
        var output;
        if (!fs.existsSync(path.join(newpi_dir, "tasks.py"), "")) {
            template = hogan_engine.compile(fs.readFileSync(__dirname+'/../template/tasks.py','utf8'),{delimiters: '<% %>'});
            output = template.render({"taskname":req.body.taskname,"method":"run", "author":req.decoded.userid});
            fs.writeFileSync(path.join(newpi_dir, "tasks.py"),output);
        }
        /*if (!fs.existsSync(path.join(newpi_dir, "crontasks.py"), "")) {
            template = hogan_engine.compile(fs.readFileSync(__dirname+'/../template/tasks.py','utf8'),{delimiters: '<% %>'});
            output = template.render({"channel":"cron_channel","taskname":req.body.taskname,"method":"run", "author":req.decoded.userid});
            fs.writeFileSync(path.join(newpi_dir, "crontasks.py"),output);
        }*/

        // update cron table
        if (task_action_trigger.toLowerCase() === "cron"){
            handle_crontab(req, res, next, default_results, dbresults, 'POST');
        } else{
            apiResponse = new configuration.jsonResponse(201,"","","",toolbox.filter_data(dbresults,req.decoded.userid,req.decoded.customerid));
            toolbox.logging('info',req,"task creation completed",'OK');
            return res.status(apiResponse.status).json(apiResponse);
        }
    } else {
        var errm = "An exception occured, the task was not created";
        apiResponse = new configuration.jsonResponse(500,errm,errm,"",default_results);
        toolbox.logging('error',req,"task creation not completed",'OK');
        return res.status(apiResponse.status).json(apiResponse);
    }
}
exports.create_task = function(req, res, next){
    toolbox.req_log("-POST /api/tasks endpoint. create a new "+tables[0]+" row-",req);

    //insert backend code here to fetch your data
    var apiResponse;
    var default_results = {};

    if (req.body.taskname){
        var uid = uuid_generator();
        var extras_data = {
            taskid:uid,
            type:req.decoded.type
        };
        var new_doc = toolbox.setDocument(req,"Tasks",req.body,extras_data,true);

        Tasks.restapidbrequest(req, res, next, default_results, "create",
            {
                doc: new_doc
            },create_task_scripts);
    } else {
        apiResponse = new configuration.jsonResponse(400,"","Invalid request: you must pass the taskname body parameter " +
            "in your request","Invalid request: you must pass the taskname body parameter in your request",default_results);
        toolbox.logging('error',req,"task creation aborted because: Invalid request, you must pass the taskname body parameter in your request",'KO');
        return res.status(apiResponse.status).json(apiResponse);
    }

};

function handle_crontab(req, res, next, default_results, dbresults, verb){
    var apiResponse, sstatuscode;

    if(verb === "POST"){
        sstatuscode = 201;
    } else if (verb === "PUT") {
        sstatuscode = 200;
    } else {
        sstatuscode = 201;
    }
    var jobid = dbresults["taskname"];
    if (isNaN(req.body.task_action_frequency)){
        apiResponse = new configuration.jsonResponse(400,"","Invalid request: task_action_frequency body " +
            "parameter in your request must be an integer","Invalid request: task_action_frequency body " +
            "parameter in your request must be an integer",default_results);
        toolbox.logging('error',req,"task creation aborted because: Invalid request: task_action_frequency" +
            " body parameter in your request must be an integer",'KO');
        return res.status(apiResponse.status).json(apiResponse);
    }

    var jobdir = configuration.general_parameters.jobs_root_dir;//path.join(__dirname, '../public/jobs');
    toolbox.logging('debug',req,"jobdir set: "+jobdir);
    if (!fs.existsSync(jobdir)){
        toolbox.logging('debug',req,"about to create job root dir folder: "+jobdir);
        fs.mkdirSync(jobdir);
    }
    jobdir = path.join(jobdir, req.decoded.type.replace(" ",""));
    toolbox.logging('debug',req,"jobdir set: "+jobdir);
    if (!fs.existsSync(jobdir)){
        toolbox.logging('debug',req,"about to create customer dir folder: "+jobdir);
        fs.mkdirSync(jobdir);
    }
    jobdir = path.join(jobdir, jobid);
    if (!fs.existsSync(jobdir)){
        toolbox.logging('debug',req,"about to create jobdir folder: "+jobdir);
        fs.mkdirSync(jobdir);
    }
    var argss = {};
    argss["job_request"] = {"jobid":jobid,"jobdir":jobdir,"jobfile":"","req_body":req.body,"status":"received"};
    argss["task"] = {};
    argss["job_request"]["url"] = configuration.general_parameters.server_url;
    argss["job_request"]["apikey"] = req.get('Authorization');
    argss["job_request"]["sessionid"] = req.headers["x-access-token"] || req.cookies.sessionid;
    argss["job_request"]["userid"] = req.decoded.userid;
    argss["job_request"]["type"] = req.decoded.type;
    argss["task"]["name"] = dbresults["taskname"];
    argss["task"]["key"] = dbresults["taskid"];
    argss["task"]["channel"] = "cron_channel";
    if (dbresults["task_action_parameters"] === ""){
        argss["task"]["task_action_parameters"] = {"empty":"ok"};
    } else{
        argss["task"]["task_action_parameters"] = JSON.parse(task_action_parameters);
    }
    if (dbresults["task_auth_parameters"] === ""){
        argss["task"]["task_auth_parameters"] = {"empty":"ok"};
    } else{
        argss["task"]["task_auth_parameters"] = JSON.parse(task_auth_parameters);
    }
    var new_doc = {
        name:dbresults["taskname"],
        jobid:jobid,
        args:JSON.stringify(argss),
        lastrun:"",
        period: (req.body.task_action_frequency || 300),
        type:req.decoded.type
    };

    CronTabs.restapidbrequest(req, res, next, default_results, "create",
        {
            doc: new_doc
        },function(req, res, next, default_results, dbresults1){
            if (dbresults1) {
                apiResponse = new configuration.jsonResponse(sstatuscode,"","","",default_results);
                toolbox.logging('info',req,"task creation completed",'OK');
                return res.status(apiResponse.status).json(apiResponse);
            } else {
                var errm = "An exception occured, the task was not created";
                apiResponse = new configuration.jsonResponse(500,errm,errm,"",default_results);
                toolbox.logging('error',req,"task creation not completed",'OK');
                return res.status(apiResponse.status).json(apiResponse);
            }
        });
}
function handle_update_task(req, res, next, default_results, dbresults){
    var apiResponse;
    var action_trigger_change = false;
    if (!dbresults) {
        apiResponse = new configuration.jsonResponse(204,"","","",default_results);
        toolbox.logging('info',req,"no task to update",'OK');
        return res.status(apiResponse.status).json(apiResponse);
    } else {
        var new_doc = {};
        for (var key in req.body) {
            if (dbresults[key] === "" || dbresults[key] !== undefined) {
                if (key.indexOf("_access") < 0 && key.indexOf("taskname") < 0 && key.indexOf("taskid") < 0) {
                    new_doc[key] = req.body[key];
                    if (key === "task_action_trigger") {
                        action_trigger_change = true;
                    }
                }
            } else {
                apiResponse = new configuration.jsonResponse(500, key + " is not a valid parameter", key + " is not a valid parameter", "", default_results);
                toolbox.logging('error', req, key + " is not a valid parameter", 'KO');
                return res.status(apiResponse.status).json(apiResponse);
            }
        }

        Tasks.restapidbrequest(req, res, next, default_results, "updateOne",
            {
                condition: {taskname: req.params.resid, type: req.decoded.type},
                doc: new_doc,
                options: {}
            }, function (req, res, next, default_results, dbresults1) {
                var apiResponse;
                if (dbresults1) {
                    if (action_trigger_change) {
                        if (new_doc["task_action_trigger"] === "ondemand" && dbresults["task_action_trigger"] !== "ondemand") {
                            CronTabs.restapidbrequest(req, res, next, default_results, "findOneAndDelete",
                                {
                                    condition: {name: dbresults["taskname"], type: req.decoded.type},
                                    options: {}
                                },
                                function (req, res, next, default_results, dbresults2) {
                                    apiResponse = new configuration.jsonResponse(200, "", "", "",
                                        toolbox.filter_data(dbresults1, req.decoded.userid, req.decoded.type));
                                    toolbox.logging('info', req, 'task ' + req.params.resid + ' was updated', 'OK');
                                    return res.status(apiResponse.status).json(apiResponse);
                                });
                        } else if (new_doc["task_action_trigger"] === "cron" && dbresults["task_action_trigger"] !== "cron") {
                            handle_crontab(req, res, next, default_results, dbresults, 'PUT');
                        } else {
                            apiResponse = new configuration.jsonResponse(200, "", "", "",
                                toolbox.filter_data(dbresults1, req.decoded.userid, req.decoded.type));
                            toolbox.logging('info', req, 'task ' + req.params.resid + ' was updated', 'OK');
                            return res.status(apiResponse.status).json(apiResponse);
                        }
                    } else {
                        apiResponse = new configuration.jsonResponse(200, "", "", "",
                            toolbox.filter_data(dbresults1, req.decoded.userid, req.decoded.type));
                        toolbox.logging('info', req, 'task ' + req.params.resid + ' was updated', 'OK');
                        return res.status(apiResponse.status).json(apiResponse);
                    }
                } else {
                    apiResponse = new configuration.jsonResponse(204, "", "", "", default_results);
                    toolbox.logging('info', req, 'task does not exist', 'OK');
                    return res.status(apiResponse.status).json(apiResponse);
                }
            });
    }
}
exports.update_task = function(req, res, next){
    toolbox.req_log("-PUT /api/tasks/:taskid endpoint. update "+tables[0]+" row-",req);
    var default_results = {};

    //insert backend code here to fetch your data
    if (req.params.resid) {
        Tasks.restapidbrequest(req, res, next, default_results, "findOne",
            {
                condition: {taskname: req.params.resid, type: req.decoded.type},
                projection: {},
                options: {}
            }, handle_update_task);
    } else {
        var errm = 'Bad request, cannot update task without providing a taskid and the right privileges';
        toolbox.logging('error',req,errm,'KO');
        var apiResponse = new configuration.jsonResponse(400,errm,errm,"",default_results);
        return res.status(apiResponse.status).json(apiResponse);
    }
};

exports.delete_task = function(req, res, next){
    toolbox.req_log("-DELETE /api/tasks/:resid endpoint. delete "+tables[0]+" row-",req);
    var default_results = {};

    //insert backend code here to fetch your data
    if (req.params.resid){
        Tasks.restapidbrequest(req, res, next, default_results, "findOneAndDelete",
            {
                condition: {taskname: req.params.resid, type: req.decoded.type},
                options: {}
            },
            function(req, res, next, default_results, dbresults){
                if (dbresults){
                    var app_dir = process.env.WEBAPP_INSTALL_DIR || path.join(__dirname, '..');
                    var scriptsdir = path.join(app_dir, './bin/scripts');
                    var newpi_dir = path.join(scriptsdir, dbresults["taskname"]+"_src");
                    if (fs.existsSync(newpi_dir)){
                        toolbox.logging('debug',req,"about to delete jobdir folder: "+newpi_dir);
                        toolbox.rm_rf(newpi_dir);
                    }
                    CronTabs.restapidbrequest(req, res, next, default_results, "findOneAndDelete",
                        {
                            condition: {name: req.params.resid, type: req.decoded.type},
                            options: {}
                        },
                        function(req, res, next, default_results, dbresults1){
                            apiResponse = new configuration.jsonResponse(200,"","","",
                                toolbox.filter_data(dbresults,req.decoded.userid,req.decoded.type));
                            toolbox.logging('info',req,'task '+req.params.resid+' was deleted','OK');
                            return res.status(apiResponse.status).json(apiResponse);
                        });
                } else {
                    var apiResponse = new configuration.jsonResponse(204,"","","",default_results);
                    toolbox.logging('info',req,'task '+req.params.resid+' does not exist or is not accessible','OK');
                    return res.status(apiResponse.status).json(apiResponse);
                }
            });
    } else{
        var errm = 'Bad request, cannot delete task without providing a username with the right privileges';
        toolbox.logging('error',req,errm,'KO');
        var apiResponse = new configuration.jsonResponse(400,errm,errm,"",default_results);
        return res.status(apiResponse.status).json(apiResponse);
    }
};
