/**
 * Created by P.K.V.M. on 11/30/2017.
 */
var configuration = require('../config');
var toolbox = require('../controllers/toolbox');
var sec_policies = require('../controllers/security_policies');

var mongoose = require('mongoose'), Schema = mongoose.Schema;

var JobSchema = new Schema({
    jobid: {type: String, unique: true},
    jobid_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Jobs"]["jobid"]},
    taskname: {type: String, default: "helloworld"},
    taskname_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Jobs"]["taskname"]},
    trigger: {type: String, default: "helloworld"},
    trigger_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Jobs"]["trigger"]},
    status: {type: String, default: "received"},
    status_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Jobs"]["status"]},
    reason: {type: String, default: ""},
    reason_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Jobs"]["reason"]},
    submission_parameters: {type: String, default: ""},
    submission_parameters_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Jobs"]["submission_parameters"]},
    type: {type: String, default: "default"},
    type_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Jobs"]["type"]}
});

JobSchema.statics.restdbrequest = function(op, opargs, cb, cbfailure) {
    return toolbox.handledbrequest(this, "Jobs", op, opargs, cb, cbfailure);
};
JobSchema.statics.restapidbrequest = function(req, res, next, defaultres, op, opargs, cb, cbfailure) {
    return toolbox.handlerestapidbrequest(req, res, next, defaultres, this, "Jobs", op, opargs, cb, cbfailure);
};

mongoose.model('Jobs', JobSchema);
