/**
 * Created by P.K.V.M. on 11/30/2017.
 */
var mongoose = require('mongoose');
var uuid_generator = require('uuid/v4');
var configuration = require('../config');
const exec = require('child_process').exec;
var toolbox = require('./toolbox');
var sec_policies = require('./security_policies');
var middleware = require('../routes/middleware');
var path = require('path');
var fs = require('fs');
var hogan_engine = require('hogan.js');
var tables = ['Jobs','Tasks'];
var lookupkeys = ['jobid','taskname'];
var Jobs = mongoose.model('Jobs');
var Tasks = mongoose.model('Tasks');

exports.search_all_jobs = function(req, res, next){
    toolbox.req_log("-GET /api/jobs endpoint. search all "+tables[0]+" job rows-",req);
    var default_results = [];

    //insert backend code here to fetch your data
    var find_filters = {};
    for (var key1 in req.query) {
        if (sec_policies.displayrules[tables[0]][key1]) {
            find_filters[key1] = req.query[key1];
        }
    }

    find_filters["type"] = req.decoded.type;
    Jobs.restapidbrequest(req, res, next, default_results, "find",
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
                toolbox.logging('info',req,"get jobs completed",'OK');
                return res.status(apiResponse.status).json(apiResponse);
            } else {
                apiResponse = new configuration.jsonResponse(204,"","","",default_results);
                toolbox.logging('info',req,'no jobs record found','OK');
                return res.status(apiResponse.status).json(apiResponse);
            }
        });
};

exports.get_job = function(req, res, next){
    toolbox.req_log("-GET /api/jobs/:jobid endpoint.  "+tables[0]+" job row-",req);
    var default_results = {};

    //insert backend code here to fetch your data
    if (req.params.resid) {
        Jobs.restapidbrequest(req, res, next, default_results, "findOne",
            {
                condition: {jobid: req.params.resid, type: req.decoded.type},
                projection:{},
                options: {}
            },
            function(req, res, next, default_results, dbresults){
                var apiResponse;
                if (dbresults){
                    var data_filtered = toolbox.filter_data(dbresults,req.decoded.userid,req.decoded.type);
                    apiResponse = new configuration.jsonResponse(200,"","","",data_filtered);
                    toolbox.logging('info',req,"get job completed",'OK');
                    return res.status(apiResponse.status).json(apiResponse);
                } else {
                    apiResponse = new configuration.jsonResponse(204,"","","",default_results);
                    toolbox.logging('info',req,'job '+req.params.resid+' does not exist','OK');
                    return res.status(apiResponse.status).json(apiResponse);
                }

            });
    } else {
        var errm = 'Bad request, cannot get job infos without providing a username and the right privileges';
        toolbox.logging('error',req,errm,'KO');
        var apiResponse = new configuration.jsonResponse(400,errm,errm,"",default_results);
        return res.status(apiResponse.status).json(apiResponse);
    }
};

exports.get_job_info = function(req, res, next){
    toolbox.req_log("-GET /api/jobs/:resid?info=infoname endpoint. get job info-",req);
    var default_results = {};

    //insert backend code here to fetch your data
    if (req.params.resid && req.query.info) {
        Jobs.restapidbrequest(req, res, next, default_results, "findOne",
            {
                condition: {jobid: req.params.resid, type: req.decoded.type},
                projection:{},
                options: {}
            },
            function(req, res, next, default_results, dbresults){
                var apiResponse;
                if (dbresults){
                    var data_filtered = toolbox.filter_data(dbresults,req.decoded.userid,req.decoded.type);
                    if (data_filtered[req.query.info]){
                        apiResponse = new configuration.jsonResponse(200,"","","",data_filtered[req.query.info]);
                        toolbox.logging('info',req,"get job info completed",'OK');
                        return res.status(apiResponse.status).json(apiResponse);
                    } else {
                        apiResponse = new configuration.jsonResponse(400,'Bad request: '+req.query.info+" parameter " +
                            "does not exist, or has a restricted access",'Bad request: '+req.query.info+" parameter " +
                            "does not exist, or has a restricted access","",default_results);
                        toolbox.logging('error',req,"get job info aborted because: "+'Bad request: '+req.query.info+" " +
                            "parameter does not exist, or has a restricted access",'KO');
                        return res.status(apiResponse.status).json(apiResponse);
                    }
                } else {
                    apiResponse = new configuration.jsonResponse(204,"","","",default_results);
                    toolbox.logging('info',req,'job does not exist','OK');
                    return res.status(apiResponse.status).json(apiResponse);
                }

            });
    } else {
        var errm = 'Bad request, cannot get job info without providing a jobid, info fieldname and the right privileges';
        toolbox.logging('error',req,errm,'KO');
        var apiResponse = new configuration.jsonResponse(400,errm,errm,"",default_results);
        return res.status(apiResponse.status).json(apiResponse);
    }
};

function handle_create_job(req, res, next, default_results, dbresults){
    var apiResponse;

    if (dbresults) {
        var uid = uuid_generator();
        var reception_date = new Date();
        //reception_date = reception_date.toISOString().slice(0, 19).replace('T', ' ');
        var trigger_mode = (req.body.trigger || dbresults["task_action_trigger"]);
        if (trigger_mode === "ondemand") {
            // store all incoming files in the /jobs directory
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
            jobdir = path.join(jobdir, uid);
            if (!fs.existsSync(jobdir)){
                toolbox.logging('debug',req,"about to create jobdir folder: "+jobdir);
                fs.mkdirSync(jobdir);
            }
            var target_job_path = "";
            if (req.body.filename){
                var received_job_path = path.join(configuration.general_parameters.jobs_reception_dir, req.body.filename);
                target_job_path = path.join(jobdir, req.body.filename);
                if (fs.existsSync(received_job_path)){
                    fs.copyFileSync(received_job_path, target_job_path);
                    fs.unlinkSync(received_job_path);
                }
            }

            // create script to run
            var script_to_run = path.join(jobdir, 'run_task.py');
            var template = hogan_engine.compile(fs.readFileSync(__dirname+'/../template/run_task.py','utf8'),{delimiters: '<% %>'});
            var output = template.render({"channel":dbresults["task_action_queue"],"taskname":req.body.taskname,"method":"run", "author":req.decoded.userid});
            fs.writeFileSync(script_to_run,output);

            // create json containing params for the script
            var script_json = path.join(jobdir, 'params.json');
            var task_infos = {
                "job_request":{"jobid":uid,"jobdir":jobdir,"jobfile":target_job_path,"req_body":req.body,"status":"received"},
                "task":{}
            };
            task_infos["job_request"]["url"] = configuration.general_parameters.server_url;
            task_infos["job_request"]["displayrules"] = sec_policies.displayrules;
            task_infos["job_request"]["apikey"] = req.get('Authorization');
            task_infos["job_request"]["sessionid"] = req.headers["x-access-token"] || req.cookies.sessionid;
            task_infos["job_request"]["userid"] = req.decoded.userid;
            task_infos["job_request"]["type"] = req.decoded.type;
            task_infos["task"]["name"] = req.body.taskname;
            task_infos["task"]["key"] = dbresults["taskid"];
            task_infos["task"]["channel"] = dbresults["task_action_queue"];
            if (dbresults["task_action_parameters"] === ""){
                task_infos["task"]["task_action_parameters"] = {"empty":"ok"};
            } else{
                task_infos["task"]["task_action_parameters"] = JSON.parse(dbresults["task_action_parameters"]);
            }
            if (dbresults["task_auth_parameters"] === ""){
                task_infos["task"]["task_auth_parameters"] = {"empty":"ok"};
            } else{
                task_infos["task"]["task_auth_parameters"] = JSON.parse(dbresults["task_auth_parameters"]);
            }
            fs.writeFileSync(script_json,JSON.stringify(task_infos));

            // running script
            var cmdline = 'python '+script_to_run+' \''+uid+'\' \''+script_json+'\'';
            toolbox.logging('debug',req,"about to run: "+cmdline);
            // submit script execution to RabbitMQ
            exec(cmdline, function (error, stdout, stderr) {
                if (error) {
                    toolbox.logging('error',req,"exec error:"+JSON.stringify(error));
                    toolbox.logging('error',req,"job task could not be completed",'KO');
                    //apiResponse = new configuration.jsonResponse(500,'server could not process the event because: '+ error,'An exception occured during the processing of the event',"",default_results);
                    //return res.status(apiResponse.status).json(apiResponse);
                }
            });
        }

        var status = "received";
        var extras_data = {
            jobid:uid,
            trigger: trigger_mode,
            status:status,
            type:req.decoded.type,
            submission_parameters:JSON.stringify(req.body)
        };
        var new_doc = toolbox.setDocument(req,"Jobs",req.body,extras_data,true);

        Jobs.restapidbrequest(req, res, next, default_results, "create",
            {
                doc: new_doc
            },
            function(req, res, next, default_results, dbresults1){
                if (dbresults1){
                    apiResponse = new configuration.jsonResponse(201,'','',"",{
                        jobid:uid,
                        status:status});
                    toolbox.logging('info',req,"job task queued",'OK');
                    return res.status(apiResponse.status).json(apiResponse);
                } else {
                    var apiResponse = new configuration.jsonResponse(500,"",
                        "An exception occurred. Job has not been created","",default_results);
                    toolbox.logging('error',req,'job '+req.body.taskname+' has not been created','KO');
                    return res.status(apiResponse.status).json(apiResponse);
                }
            });
    } else {
        var errm = "Bad request:  no task "+req.body.taskname+" profile was found";
        toolbox.logging('error',req,errm,'KO');
        apiResponse = new configuration.jsonResponse(400,errm,errm,"",default_results);
        return res.status(apiResponse.status).json(apiResponse);
    }
}
exports.create_job = function(req, res, next){
    toolbox.req_log("-POST /api/jobs endpoint. submit a new job "+tables[0]+" job row-",req);

    //insert backend code here to fetch your data
    var apiResponse;
    var default_results = {};

    if (!req.body.taskname){
        var errm = "Bad request:  taskname is a required parameters for this endpoint";
        toolbox.logging('error',req,errm,'KO');
        apiResponse = new configuration.jsonResponse(400,errm,errm,"",default_results);
        return res.status(apiResponse.status).json(apiResponse);
    } else {
        Tasks.restapidbrequest(req, res, next, default_results, "findOne",
            {
                condition: {taskname: req.body.taskname, type: req.decoded.type},
                projection: {},
                options: {}
            }, handle_create_job);
    }
};

function handle_update_job(req, res, next, default_results, dbresults){
    var apiResponse;

    if (!dbresults) {
        apiResponse = new configuration.jsonResponse(204,"","","",default_results);
        toolbox.logging('error',req,"no job to update could be found",'KO');
        return res.status(apiResponse.status).json(apiResponse);
    } else {
        var doc_update = {};
        for (var key in req.body){
            if (dbresults[key] === "" || dbresults[key] !== undefined) {
                if (key.indexOf("_access")<0 && key.indexOf("jobid")<0){
                    doc_update[key] = req.body[key];
                }
            } else {
                apiResponse = new configuration.jsonResponse(500,key+" is not a valid parameter",key+" is not a valid parameter","",default_results);
                toolbox.logging('error',req,key+" is not a valid parameter",'KO');
                return res.status(apiResponse.status).json(apiResponse);
            }
        }
        Jobs.restapidbrequest(req, res, next, default_results, "updateOne",
            {
                condition: {jobid: req.params.resid, type: req.decoded.type},
                doc: doc_update,
                options: {}
            }, function(req, res, next, default_results, dbresults1){
                var apiResponse;
                if (dbresults1){
                    apiResponse = new configuration.jsonResponse(200,"","","",
                        toolbox.filter_data(dbresults1,req.decoded.userid,req.decoded.type));
                    toolbox.logging('info',req,'job '+req.params.resid+' was updated','OK');
                    return res.status(apiResponse.status).json(apiResponse);
                } else {
                    apiResponse = new configuration.jsonResponse(204,"","","",default_results);
                    toolbox.logging('info',req,'job does not exist','OK');
                    return res.status(apiResponse.status).json(apiResponse);
                }
            });
    }
}
exports.update_job = function(req, res, next){
    toolbox.req_log("-PUT /api/jobs/:resid endpoint. update "+tables[0]+" job row-",req);
    var default_results = {};

    //insert backend code here to fetch your data
    if (req.params.resid) {
        Jobs.restapidbrequest(req, res, next, default_results, "findOne",
            {
                condition: {jobid: req.params.resid, type: req.decoded.type},
                projection: {},
                options: {}
            }, handle_update_job);
    } else {
        var errm = 'Bad request, cannot update job without providing a jobid and the right privileges';
        toolbox.logging('error',req,errm,'KO');
        var apiResponse = new configuration.jsonResponse(400,errm,errm,"",default_results);
        return res.status(apiResponse.status).json(apiResponse);
    }
};


exports.cancel_job = function(req, res, next){
    toolbox.req_log("-DELETE /api/jobs endpoint. delete "+tables[0]+" job row-",req);
    var default_results = {};

    //insert backend code here to fetch your data
    if (req.params.resid){
        Jobs.restapidbrequest(req, res, next, default_results, "findOneAndDelete",
            {
                condition: {jobid: req.params.resid, type: req.decoded.type},
                options: {}
            },
            function(req, res, next, default_results, dbresults){
                if (dbresults){
                    apiResponse = new configuration.jsonResponse(200,"","","",
                        toolbox.filter_data(dbresults,req.decoded.userid,req.decoded.type));
                    toolbox.logging('info',req,'job '+req.params.resid+' was deleted','OK');
                    return res.status(apiResponse.status).json(apiResponse);
                } else {
                    var apiResponse = new configuration.jsonResponse(204,"","","",default_results);
                    toolbox.logging('info',req,'job '+req.params.resid+' does not exist or is not accessible','OK');
                    return res.status(apiResponse.status).json(apiResponse);
                }
            });
    } else{
        var errm = 'Bad request, cannot delete job without providing a username with the right privileges';
        toolbox.logging('error',req,errm,'KO');
        var apiResponse = new configuration.jsonResponse(400,errm,errm,"",default_results);
        return res.status(apiResponse.status).json(apiResponse);
    }

};
