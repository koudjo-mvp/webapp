/**
 * Created by P.K.V.M. on 11/30/2017.
 */
var configuration = require('../config');
var toolbox = require('../controllers/toolbox');
var sec_policies = require('../controllers/security_policies');

var mongoose = require('mongoose'), Schema = mongoose.Schema;

var CronTabSchema = new Schema({
    name: {type: String, unique: true},
    name_access: {type: String, default: "admean,default,"+sec_policies.displayrules["CronTabs"]["name"]},
    jobid: {type: String, unique: true},
    jobid_access: {type: String, default: "admean,default,"+sec_policies.displayrules["CronTabs"]["jobid"]},
    args: {type: String, default: ""},
    args_access: {type: String, default: "admean,default,"+sec_policies.displayrules["CronTabs"]["args"]},
    lastrun: {type: String, default: ""},
    lastrun_access: {type: String, default: "admean,default,"+sec_policies.displayrules["CronTabs"]["lastrun"]},
    period: {type: Number, default: 180},
    period_access: {type: String, default: "admean,default,"+sec_policies.displayrules["CronTabs"]["period"]},
    type: {type: String, default: "default"},
    type_access: {type: String, default: "admean,default,"+sec_policies.displayrules["CronTabs"]["type"]}
});

CronTabSchema.statics.restdbrequest = function(op, opargs, cb, cbfailure) {
    return toolbox.handledbrequest(this, "CronTabs", op, opargs, cb, cbfailure);
};
CronTabSchema.statics.restapidbrequest = function(req, res, next, defaultres, op, opargs, cb, cbfailure) {
    return toolbox.handlerestapidbrequest(req, res, next, defaultres, this, "CronTabs", op, opargs, cb, cbfailure);
};

mongoose.model('CronTabs', CronTabSchema);
