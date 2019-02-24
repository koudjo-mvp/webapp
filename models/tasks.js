/**
 * Created by P.K.V.M. on 11/30/2017.
 */
var configuration = require('../config');
var toolbox = require('../controllers/toolbox');
var sec_policies = require('../controllers/security_policies');

var mongoose = require('mongoose'), Schema = mongoose.Schema;

var TaskSchema = new Schema({
    taskid: {type: String, unique: true},
    taskid_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Tasks"]["taskid"]},
    taskname: {type: String, unique: true},
    taskname_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Tasks"]["taskname"]},
    task_auth_parameters: {type: String, default: ""},
    task_auth_parameters_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Tasks"]["task_auth_parameters"]},
    task_action_queue: {type: String, default: "ondemand_channel"},
    task_action_queue_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Tasks"]["task_action_queue"]},
    task_action_parameters: {type: String, default: ""},
    task_action_parameters_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Tasks"]["task_action_parameters"]},
    task_action_trigger: {type: String, default: "ondemand"},
    task_action_trigger_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Tasks"]["task_action_trigger"]},
    task_action_frequency: {type: Number, default: 300},
    task_action_frequency_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Tasks"]["task_action_frequency"]},
    type: {type: String, default: "default"},
    type_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Tasks"]["type"]}
});

TaskSchema.statics.restdbrequest = function(op, opargs, cb, cbfailure) {
    return toolbox.handledbrequest(this, "Tasks", op, opargs, cb, cbfailure);
};
TaskSchema.statics.restapidbrequest = function(req, res, next, defaultres, op, opargs, cb, cbfailure) {
    return toolbox.handlerestapidbrequest(req, res, next, defaultres, this, "Tasks", op, opargs, cb, cbfailure);
};

mongoose.model('Tasks', TaskSchema);

var Tasks = mongoose.model('Tasks');
Tasks.restdbrequest("create",{
    doc:{
        taskname: "helloworld"
    }
},function(err, results){
    if (err) {
        toolbox.logging('debug',null,err);
    }
    else {
        toolbox.logging('debug',null,'helloworld task table\'s default record created');
    }
});