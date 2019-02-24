/**
 * Created by P.K.V.M. on 4/9/2018.
 */

//var urlparser = require('url');
var mongoose = require('mongoose');
var configuration = require('../config');
var crypto = require('crypto');
var winston = require('winston');
var restapi = winston.loggers.get('webapp_restapi');

var uuid_generator = require('uuid/v4');
var formidable = require('formidable');
var jwt = require('jsonwebtoken');

var http = require("http");
var geoip = require('geoip-lite');
var hogan_engine = require('hogan.js');
var path = require('path');
var fs = require('fs');
var sec_policies = require('./security_policies');
const exec = require('child_process').exec;
var apiResponse = null;
/*connect to mongoose DB and elasticsearch and redis*/
/*
 var elasticSearch = require('elasticsearch');

 var appsearch_conn = new elasticSearch.Client({
 host: 'localhost:9200',
 log: 'trace'
 });
 function update_index(data,action_status){
 appsearch_conn.update({
 index: data['index'],
 type: 'Names',
 id: data['name'],
 refresh: true,
 body: {
 doc : {
 likes : data['likes'],
 location: data['location']
 }
 }
 }, function (err, response) {
 if (err){
 return err;
 } else{
 return 'OK';
 }
 });
 }*/

//indexof

exports.pickAvatar = function(gender){
    var list_images;
    if (gender === "M") {
        list_images = ["M1.png","M2.png","M3.png","M4.png"];
    } else if (gender === "F") {
        list_images = ["F1.png","F2.png","F3.png","F4.png"];
    } else if (gender === "M/F") {
        list_images = ["T1.png","T2.png","T3.png","T4.png"];
    } else{
        list_images = ["M1.png","F1.png","T1.png","F2.png"];
    }
    return list_images[Math.floor((Math.random() * 4) + 1)-1];
};

function encryptPW(pwd){
    return crypto.createHash('sha256').update(pwd).digest('base64').toString();
}
exports.hashPW = encryptPW;

function toLog(level, ip, who, withrights, dowhat, forwhichresult, message){
    var _who = "unidentified user", _ip = "127.0.0.1", _roles = [], _dowhat = "", _forwr = "no result yet", _message = "";
    if (who){_who = who;}
    if (ip){_ip = ip;}
    if (dowhat){_dowhat = dowhat;}
    if (withrights){_roles = withrights;}
    if (message){_message = message;}
    if (forwhichresult){ _forwr = forwhichresult;}
    if (level === "error" || level === "warn" || level === "info" || level === "verbose" || level === "debug" || level === "silly"){
        //console.log(JSON.stringify({"level":level,"pid":process.pid,"ip":_ip,"who":_who,"roles":_roles,"resourcerequested":_dowhat,"result":_forwr,"message":_message}));
        restapi.log({"level":level,"pid":process.pid,"ip":_ip,"who":_who,"roles":_roles,"resourcerequested":_dowhat,"result":_forwr,"message":_message});
    } else {
        //console.log(JSON.stringify({"level":"debug","pid":process.pid,"ip":_ip,"who":_who,"roles":_roles,"resourcerequested":_dowhat,"result":_forwr,"message":_message}));
        restapi.log({"level":"debug","pid":process.pid,"ip":_ip,"who":_who,"roles":_roles,"resourcerequested":_dowhat,"result":_forwr,"message":_message});
    }
}
exports.req_log = function (controller_fctn, req){
    var ip, userid, uid, type, roles, appname;
    try{
        var new_req_body = {};
        if (req.body){
            for (var key in req.body) {
                if (req.body[key] && key !== "password" && key !== "Authorization" && key !== "authorization" && key !== "x-access-token" && key !== "licensekey"){
                    new_req_body[key] = req.body[key];
                }
            }
        }

        var new_req_header = {};
        if (req.headers){
            for (var key1 in req.headers) {
                if (req.headers[key1] && key1 !== "password" && key1 !== "Authorization" && key1 !== "authorization" && key1 !== "x-access-token" && key1 !== "licensekey"){
                    new_req_header[key1] = req.headers[key1];
                }
            }
        }

        ip = req.headers["x-real-ip"];
        if (req.decoded){
            if (!req.decoded.userid) {
                userid = "";
                uid = "";
                type = "";
                roles = [];
            } else {
                userid = req.decoded.userid;
                uid = req.decoded.uid;
                type = req.decoded.type;
                roles = req.decoded.roles;
            }
            appname = (req.decoded.appname || "");
            toLog("debug", ip+" -|- "+req["hostname"], userid +" -|- "+ uid +" -|- "+ type +" -|- "+ appname, roles, req.url, "RECEIVED", "calling "+controller_fctn+" with req url paths: "+JSON.stringify(req.url));
            toLog("debug", ip+" -|- "+req["hostname"], userid +" -|- "+ uid +" -|- "+ type +" -|- "+ appname, roles, req.url, "RECEIVED", "calling "+controller_fctn+" with req url query params: "+JSON.stringify(req.query));
            toLog("debug", ip+" -|- "+req["hostname"], userid +" -|- "+ uid +" -|- "+ type +" -|- "+ appname, roles, req.url, "RECEIVED", "calling "+controller_fctn+" with req header: "+JSON.stringify(new_req_header));

            toLog("debug", ip+" -|- "+req["hostname"], userid +" -|- "+ uid +" -|- "+ type +" -|- "+ appname, roles, req.url, "RECEIVED", "calling "+controller_fctn+" with req body: "+JSON.stringify(new_req_body));
            toLog("debug", ip+" -|- "+req["hostname"], userid +" -|- "+ uid +" -|- "+ type +" -|- "+ appname, roles, req.url, "RECEIVED", "calling "+controller_fctn+" with req url express params: "+JSON.stringify(req.params));
            //toLog("debug", ip+" -|- "+req["hostname"], userid +" -|- "+ uid +" -|- "+ type +" -|- "+ req.decoded.appname +" -|- "+ req.decoded.keyid, roles, req.url, "RECEIVED", "calling "+controller_fctn+" with req cookies: "+JSON.stringify(req.cookies));

            toLog("info", ip+" -|- "+req["hostname"], userid +" -|- "+ uid +" -|- "+ type +" -|- "+ appname, roles, req.url, "RECEIVED", "calling "+controller_fctn);
        } else {
            toLog("debug", ip+" -|- "+req["hostname"], "", "", req.url, "RECEIVED", "calling "+controller_fctn+" with req url paths: "+JSON.stringify(req.url));
            toLog("debug", ip+" -|- "+req["hostname"], "", "", req.url, "RECEIVED", "calling "+controller_fctn+" with req url query params: "+JSON.stringify(req.query));
            toLog("info", ip+" -|- "+req["hostname"], "", "", req.url, "RECEIVED", "calling "+controller_fctn+" with req header: "+JSON.stringify(new_req_header));

            toLog("info", ip+" -|- "+req["hostname"], "", "", req.url, "RECEIVED", "calling "+controller_fctn+" with req body: "+JSON.stringify(new_req_body));
            toLog("debug", ip+" -|- "+req["hostname"], "", "", req.url, "RECEIVED", "calling "+controller_fctn+" with req url express params: "+JSON.stringify(req.params));
            toLog("debug", ip+" -|- "+req["hostname"], "", "", req.url, "RECEIVED", "calling "+controller_fctn+" with req cookies: "+JSON.stringify(req.cookies));
        }
    } catch(err){
        ip = req.headers["x-real-ip"];
        if (req.decoded){
            if (!req.decoded.userid) {
                userid = "";
                uid = "";
                type = "";
                roles = [];
            } else {
                userid = req.decoded.userid;
                uid = req.decoded.uid;
                type = req.decoded.type;
                roles = req.decoded.roles;
            }
            appname = (req.decoded.appname || "");
            toLog("error", ip+" -|- "+req["hostname"], userid +" -|- "+ uid +" -|- "+ type +" -|- "+ appname, roles, req.url, "KO", "error trying to log request infos: "+err);
        } else {
            toLog("error", ip+" -|- "+req["hostname"], "", "", req.url, "KO", "error trying to log request infos: "+err);
        }
    }
};
function prepareLog(level, req, message, result, path){
    var ip, userid, uid, type, roles, appname;
    try{
        if (req){
            ip = req.headers["x-real-ip"];
            if (req.decoded){
                if (!req.decoded.userid) {
                    userid = "";
                    uid = "";
                    type = "";
                    roles = [];
                } else {
                    userid = req.decoded.userid;
                    uid = req.decoded.uid;
                    type = req.decoded.type;
                    roles = req.decoded.roles;
                }
                appname = (req.decoded.appname || "");
                toLog(level, ip+" -|- "+req["hostname"], userid +" -|- "+ uid +" -|- "+ type +" -|- "+ appname, roles, req.url, result, message);
            } else {
                toLog(level, ip+" -|- "+req["hostname"], "", "", req.url, result, message);
            }
        } else {
            toLog(level, "", "", "", path, result, message);
        }
    } catch(err){
        if (req){
            ip = req.headers["x-real-ip"];
            if (req.decoded){
                if (!req.decoded.userid) {
                    userid = "";
                    uid = "";
                    type = "";
                    roles = [];
                } else {
                    userid = req.decoded.userid;
                    uid = req.decoded.uid;
                    type = req.decoded.type;
                    roles = req.decoded.roles;
                }
                appname = (req.decoded.appname || "");
                toLog(level, ip+" -|- "+req["hostname"], userid +" -|- "+ uid +" -|- "+ type +" -|- "+ appname, roles, req.url, "KO", "error trying to log: "+err);
            } else {
                toLog(level, ip+" -|- "+req["hostname"], "", "", req.url, "KO", "error trying to log: "+err);
            }
        } else{
            toLog("error", "", "", "", "", "KO", "error trying to log: "+err);
        }
    }
}
exports.logging = prepareLog;

exports.yyyymmdd = function yyyymmdd(x) {
    var y = x.getFullYear().toString();
    var m = (x.getMonth() + 1).toString();
    var d = x.getDate().toString();
    (d.length == 1) && (d = '0' + d);
    (m.length == 1) && (m = '0' + m);
    var res = y +'-'+ m +'-'+ d;
    return res;
};

exports.paginateResults = function(data, start, limit) {
    //prepareLog('debug',null,'paginateResults called with start= '+start+', limit= '+limit+', length= '+data.length);
    if (Array.isArray(data)){
        if (data.length === 0){
            return data;
        } else {
            var beginidx = 0, endidx;
            if (limit === null) {
                limit = 5000;
            } else {
                limit = 1 * limit;
            }
            if (!isNaN(start) && start !== null){
                beginidx = Math.abs(start)-1;
                if (beginidx < 0) {
                    // start out of bound case -
                    beginidx = 0;
                }
                if (beginidx > (data.length - 1)) {
                    // start out of bound case +
                    beginidx = data.length - 1;
                }
            }

            if (limit > data.length){
                // limit out of bound case +
                endidx = data.length - 1;
            } else {
                endidx = (beginidx + limit) - 1;
                if (endidx >= data.length) {
                    // start+limit out of bound case +
                    endidx = data.length - 1;
                }
            }
            //prepareLog('debug',null,'paginateResults filtering beginidx= '+beginidx+', endidx= '+endidx+', total length= '+data.length);
            var new_data = [];
            for (var i = 0; i < data.length; i++) {
                if (i >= beginidx && i <= endidx ){
                    new_data.push(data[i]);
                }
            }
            return new_data;
        }
    } else {
        //var type = typeof data;
        //prepareLog('debug',null,'paginateResults called but data '+data+'is not an array but is '+type);
        return data;
    }
};

exports.http_request_options = {
    host: 'localhost',
    port: '5000',
    path: "/",
    method: "PUT",
    headers: {
        "Content-Type": "application/json"
    }
};

exports.get_table = function(dbdriver,tbname){
    //prepareLog('debug',null,'getting db schema connector for '+ tbname);
    if (tbname === 'user'){
        return dbdriver.model('User');
    }
    if (tbname === 'luser'){
        return dbdriver.model('UserGPublic');
    }
    if (tbname === 'usertemp'){
        return dbdriver.model('UserTemp');
    }
};

exports.filter_data = function(res,uid,type){
    var filtered_jsonresult;
    if (Array.isArray(res)){
        var arrayLength = res.length;
        filtered_jsonresult = [];
        for (var i = 0; i < arrayLength; i++) {
            filtered_jsonresult[i] = {};
            for (var key in res[i]) {
                if (!key.endsWith("_access")) {
                    //prepareLog('debug',null,key);
                    if (res[i][key+'_access']){
                        try{ //(res[i][key+'_access'].split(",")[2]==='pr' || res[i][key+'_access'].split(",")[2]==='cf')
                            if ((res[i][key+'_access'].split(",")[0]===uid && res[i][key+'_access'].split(",")[2]!=='in') ||
                                (type === res[i][key+'_access'].split(",")[1] && res[i][key+'_access'].split(",")[2]==='pr') ||
                                (res[i][key+'_access'].split(",")[2]==='pu')){
                                filtered_jsonresult[i][key] = res[i][key];
                            }
                        } catch(err){
                            console.error("An unexpected error occured due to the existence of wrongly formatted data in DB");
                            return [];
                        }

                    }

                }
            }
        }
    }
    if (typeof res==='object' && res!==null && !(res instanceof Array) && !(res instanceof Date)){
        filtered_jsonresult = {};
        for (var key1 in res) {
            if (!key1.endsWith("_access")) {
                //prepareLog('debug',null,key);
                if (res[key1+'_access']){
                    try{//(res[key1+'_access'].split(",")[2]==='pr' || res[key1+'_access'].split(",")[2]==='cf')
                        if ((res[key1+'_access'].split(",")[0]===uid && res[key1+'_access'].split(",")[2]!=='in') ||
                            (type === res[key1+'_access'].split(",")[1] && res[key1+'_access'].split(",")[2]==='pr') ||
                            (res[key1+'_access'].split(",")[2]==='pu')){
                            filtered_jsonresult[key1] = res[key1];
                        }
                    } catch(err){
                        console.error("An unexpected error occured due to the existence of wrongly formatted data in DB");
                        return {};
                    }
                }
            }
        }
    }
    return filtered_jsonresult;
};

function secure_res(res){
    var filtered_jsonresult;
    if (Array.isArray(res)){
        var arrayLength = res.length;
        filtered_jsonresult = [];
        for (var i = 0; i < arrayLength; i++) {
            filtered_jsonresult[i] = {};
            for (var key in res[i]) {
                if (key !== "userid" && key !== "password" && key !== "apikey" && key !== "sessionid" && key.indexOf("_access")<0) {
                    //prepareLog('debug',null,key);
                    filtered_jsonresult[i][key] = res[i][key];
                }
            }
        }
    }
    if (typeof res==='object' && res!==null && !(res instanceof Array) && !(res instanceof Date)){
        filtered_jsonresult = {};
        for (var key1 in res) {
            if (key1 !== "userid" && key1 !== "password" && key1 !== "apikey" && key1 !== "sessionid" && key1.indexOf("_access")<0) {
                //prepareLog('debug',null,key);
                filtered_jsonresult[key1] = res[key1];
            }
        }
    }
    return filtered_jsonresult;
}
exports.filter_res = secure_res;

exports.handledbrequest = function(dbdriver, name, op, opargs, cb, cbfailure) {
    if (op === "findOne") {
        return dbdriver.model(name).findOne(opargs.condition, opargs.projection, opargs.options, function(err, results){
            return handleDbRequestCb(err, results, cb, cbfailure);
        });
    } else if (op === "findOneAndUpdate") {
        return dbdriver.model(name).findOneAndUpdate(opargs.condition, opargs.doc, { upsert: true, new: true, setDefaultsOnInsert: true }, function(err, results){
            return handleDbRequestCb(err, results, cb, cbfailure);
        });
    } else if (op === "update") {
        return dbdriver.model(name).updateMany(opargs.condition, opargs.doc, opargs.options, function(err, results){
            return handleDbRequestCb(err, results, cb, cbfailure);
        });
    } else if (op === "updateOne") {
        return dbdriver.model(name).updateOne(opargs.condition, opargs.doc, opargs.options, function(err, results){
            return handleDbRequestCb(err, results, cb, cbfailure);
        });
    } else if (op === "deleteOne") {
        return dbdriver.model(name).deleteOne(opargs.condition, function(err, results){
            return handleDbRequestCb(err, results, cb, cbfailure);
        });
    } else if (op === "create") {
        return dbdriver.model(name).create(opargs.doc, function(err, results){
            return handleDbRequestCb(err, results, cb, cbfailure);
        });
    } else {
        throw new Error("misuse of dbrequest instance method");
    }
};

exports.handlerestapidbrequest = function(req, res, next, default_results, dbdriver, name, op, opargs, cb, cbfailure) {
    if (op === "find"){
        dbdriver.model(name).countDocuments(opargs.condition, function (err, count) {
            if (!err) {
                try {
                    var total = count;
                    //prepareLog('debug',req,'total search results: '+total);
                    var limit = req.query.limit || configuration.general_parameters.pagination_limit;
                    if (limit > configuration.general_parameters.pagination_limit) {
                        // to limit client's req.query.limit setting to the max records authorized by the server
                        limit = configuration.general_parameters.pagination_limit;
                    }
                    var page = req.query.page || 1;
                    var pages = Math.ceil(total / limit) || 1;
                    var offset = (page - 1) * limit;
                    var lastidx = offset + (limit - 1);
                    if (lastidx > count) {
                        // to avoid outbound
                        lastidx = count;
                    }
                    var cursor = dbdriver.model(name).find(opargs.condition, opargs.projection, opargs.options).cursor();
                    var data = [], result = {}, cpt = 0;
                    cursor.on('data', function(doc) {
                        // Called once for every document
                        if (cpt >= offset  && cpt <= lastidx){
                            data.push(doc);
                            //prepareLog('debug',req,'pulling data');
                        }
                        cpt = cpt + 1;
                    });
                } catch(derr) {
                    prepareLog('error',req,prettyError(derr),'KO');
                    apiResponse = new configuration.jsonResponse(500,prettyError(derr),"An unexpected error occured when " +
                        "trying to fetch DB data page","",default_results);
                    res.status(apiResponse.status).json(apiResponse);
                }

                cursor.on('close', function(err2) {
                    // Called when done
                    result["total"] = total;
                    result["limit"] = limit;
                    result["page"] = page;
                    result["pages"] = pages;
                    result["data"] = data;
                    return handleRestApiDbRequestCb(req, res, next, default_results, err2, result, cb, cbfailure);
                });
            } else {
                prepareLog('error',req,prettyError(err),'KO');
                var apiResponse = new configuration.jsonResponse(500,prettyError(err),"An unexpected error occured when " +
                    "trying to fetch DB data","",default_results);
                res.status(apiResponse.status).json(apiResponse);
            }
        });
    } else if (op === "findOne") {
        return dbdriver.model(name).findOne(opargs.condition, opargs.projection, opargs.options, function(err, results){
            return handleRestApiDbRequestCb(req, res, next, default_results, err, results, cb, cbfailure);
        });
    } else if (op === "update") {
        return dbdriver.model(name).updateMany(opargs.condition, opargs.doc, opargs.options, function(err, results){
            return handleRestApiDbRequestCb(req, res, next, default_results, err, results, cb, cbfailure);
        });
    } else if (op === "updateOne" || op === "findOneAndUpdate") {
        return dbdriver.model(name).updateOne(opargs.condition, opargs.doc, opargs.options, function(err, results){
            return handleRestApiDbRequestCb(req, res, next, default_results, err, results, cb, cbfailure);
        });
    } else if (op === "findOneAndUpdateIfNotExists") {
        return dbdriver.model(name).updateOne(opargs.condition, opargs.doc, { upsert: true, new: true, setDefaultsOnInsert: true }, function(err, results){
            return handleRestApiDbRequestCb(req, res, next, default_results, err, results, cb, cbfailure);
        });
    } else if (op === "deleteOne") {
        return dbdriver.model(name).deleteOne(opargs.condition, function(err, results){
            return handleRestApiDbRequestCb(req, res, next, default_results, err, results, cb, cbfailure);
        });
    } else if (op === "findOneAndDelete") {
        return dbdriver.model(name).findOneAndDelete(opargs.condition, opargs.options, function(err, results){
            return handleRestApiDbRequestCb(req, res, next, default_results, err, results, cb, cbfailure);
        });
    } else if (op === "create") {
        return dbdriver.model(name).create(opargs.doc, function(err, results){
            return handleRestApiDbRequestCb(req, res, next, default_results, err, results, cb, cbfailure);
        });
    } else {
        throw new Error("misuse of dbrequest instance method");
    }
};

function handleDbRequestCb(err, results, cb, cbfailure){
    if (!err){
        try {
            return cb(err, results);
        }
        catch(cberr) {
            prepareLog('error',null,prettyError(cberr),'KO');
            prepareLog('error',null,"An unexpected error occured when trying to handle DB request results",'KO');
        }
    } else {
        prepareLog('error',null,prettyError(err),'KO');
        if (cbfailure && typeof(cbfailure) === 'function'){
            try {
                return cbfailure(err, results);
            }
            catch(cberr) {
                prepareLog('error',null,prettyError(cberr),'KO');
                prepareLog('error',null,"An unexpected error occured when trying to handle DB request error",'KO');
            }
        }
    }
}
function handleRestApiDbRequestCb(req, res, next, default_results, err, results, cb, cbfailure){
    var apiResponse;
    if (!err){
        try {
            return cb(req, res, next, default_results, results);
        }
        catch(cberr) {
            prepareLog('error',req,prettyError(cberr),'KO');
            apiResponse = new configuration.jsonResponse(500,prettyError(cberr),"An unexpected error occured when trying handle DB request results","",default_results);
            res.status(apiResponse.status).json(apiResponse);
        }
    } else{
        prepareLog('error',req,prettyError(err), 'KO');
        if (cbfailure && typeof(cbfailure) === 'function'){
            try {
                return cbfailure(req, res, next, default_results, err, results);
            }
            catch(cberr) {
                prepareLog('error',req,prettyError(cberr),'KO');
                apiResponse = new configuration.jsonResponse(500,prettyError(cberr),"An unexpected error occured when trying handle DB request error","",default_results);
                res.status(apiResponse.status).json(apiResponse);
            }
        } else if ((err.errmsg && err.name) || (err.message && err.name)){
            if (err.name === "MongoError"){
                apiResponse = new configuration.jsonResponse(500,prettyError(err),"The resource you\'re trying to create already " +
                    "exists or the Backend DB is DOWN or unreachable","",default_results);
                return res.status(apiResponse.status).json(apiResponse);
            } else {
                apiResponse = new configuration.jsonResponse(500,prettyError(err),err.errmsg,"",default_results);
                return res.status(apiResponse.status).json(apiResponse);
            }
        } else {
            apiResponse = new configuration.jsonResponse(500,prettyError(err),"An unexpected error occured when trying to retrieve data from the backend","",default_results);
            return res.status(apiResponse.status).json(apiResponse);
        }
    }
}

function prettyError(err){
    var prettyerr = "";
    var message = err.message || err.errmsg || "";
    var filename = err.fileName || "";
    var line = err.lineNumber || "";
    prettyerr = "### EXCEPTION { name = "+err.name;
    if (message){
        prettyerr =  prettyerr+", message = "+message;
    }
    if (filename){
        prettyerr =  prettyerr+", file = "+filename;
    }
    if (line){
        prettyerr =  prettyerr+", line = "+line;
    }
    prettyerr = prettyerr + "} ### ALL INFOS { ";
    var cpt = 0;
    for (var key in err) {
        prettyerr = prettyerr + key + " = " + err[key];
        cpt = cpt + 1;
        if (cpt < (Object.keys(err).length)){
            prettyerr = prettyerr + ", ";
        }
    }
    prettyerr = prettyerr + " }";
    return prettyerr;
}
exports.prettyErr = prettyError;

exports.setDocument = function(req, table, data, extras, accessrights){
    if (typeof(data) === "object"){
        var result = {}; //Object.create(data);
        for (var key1 in data) {
            if (sec_policies.displayrules[table][key1]) {
                result[key1] = data[key1];
            }
        }
        for (var key1 in extras) {
            if (sec_policies.displayrules[table][key1]) {
                result[key1] = extras[key1];
            }
        }
        if (accessrights) {
            var userid = req.decoded.userid || result["username"];
            var type = req.decoded.type || result["type"];
            for (var key2 in sec_policies.displayrules[table]) {
                result[key2+"_access"] = userid+","+type+","+sec_policies.displayrules[table][key2];
            }
        }
        //prepareLog('debug',req,result);
        return result;
    } else {
        return data;
    }
};

exports.tryjson = function(action, paramname, paramvalue, req, res, next, default_results){
    //prepareLog('debug',null,'getting db schema connector for '+ tbname);
    var apiResponse;
    if (action === 'parse'){
        try {
            return JSON.parse(paramvalue);
        }
        catch(err) {
            apiResponse = new configuration.jsonResponse(500,err,paramname+" must be a JSON string","",default_results);
            return res.status(apiResponse.status).json(apiResponse);
        }
    } else if (action === 'stringify'){
        try {
            return JSON.stringify(paramvalue);
        }
        catch(err) {
            apiResponse = new configuration.jsonResponse(500,err,paramname+" must be a JSON object","",default_results);
            return res.status(apiResponse.status).json(apiResponse);
        }
    } else {
        apiResponse = new configuration.jsonResponse(500,"internal wrong usage of tryjson","An unexpected error occured when trying to process your request","",default_results);
        return res.status(apiResponse.status).json(apiResponse);
    }
};

exports.get_geolocation = function(request_url){
    switch (request_url) {
        case '127.0.0.1':
            request_url = '24.218.249.16';
            //prepareLog('debug',null,'IP to geolocalize is 127.0.0.1. Replacing it to:');
            break;
        case 'localhost':
            request_url = '24.218.249.16';
            //prepareLog('debug',null,'IP to geolocalize is localhost. Replacing it to:');
            break;
        default:
        //prepareLog('debug',null,'IP to geolocalize is public');
    }
    //prepareLog('debug',null,'IP to geolocalize is:'+request_url);
    var resu = geoip.lookup(request_url);
    //prepareLog('debug',null,'ip geolocation result: '+resu+' for ip: '+request_url);
    if (!resu){//resu===null || resu==='undefined')
        resu = {range: [ 417003520, 417004159 ], country: 'US', region: 'MA', city: 'Revere', ll: [42.4163, -70.9969] };
    }
    return resu;
};

function rimraf(dir_path) {
    if (fs.existsSync(dir_path)) {
        fs.readdirSync(dir_path).forEach(function(entry) {
            var entry_path = path.join(dir_path, entry);
            if (fs.lstatSync(entry_path).isDirectory()) {
                rimraf(entry_path);
            } else {
                fs.unlinkSync(entry_path);
            }
        });
        fs.rmdirSync(dir_path);
    }
}
exports.rm_rf = rimraf;
