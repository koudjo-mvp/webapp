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
var http = require("http");
//delete require.cache[require.resolve('package.json')];
var webappversion  = require('../package.json').version + ".${BUILD-VERSION}";

var http_options = {
    host: configuration.general_parameters.monitoring_servername,
    port: configuration.general_parameters.monitoring_serverport,
    path: "/api/workers",
    headers: {}
};

exports.handle_monitoring = function(req, res, next) {
    var apiResponse;
    var results = {"backend":{status:"OK",details:{version:webappversion}},"db":{status:"OK",details:{}},"workers":{status:"",details:{}}};
    // check cassandradb
    var request_options = JSON.parse(JSON.stringify(http_options));
    request_options["path"] = "/api/workers?status=true";
    var http_request = http.request(request_options, function(res1){
        var responseString="";
        res1.on("data", function(data){
            responseString += data;
        });
        res1.on("end", function(){
            var response = JSON.parse(responseString);
            if (Object.keys(response).length > 0){
                results.workers.status = "OK";
                var atleastoneworkerdown = false;
                for (var key in response) {
                    if (!response[key]){
                        atleastoneworkerdown = true;
                        break;
                    }
                }
                if (atleastoneworkerdown){
                    results.workers.status = "KO";
                }
            } else {
                results.workers.status = "KO";
            }

            var mrequest_options = JSON.parse(JSON.stringify(http_options));
            var mhttp_request = http.request(mrequest_options, function(res2){
                var responseString="";
                res2.on("data", function(data){
                    responseString += data;
                });
                res2.on("end", function(){
                    var mresponse = JSON.parse(responseString);
                    if (Object.keys(mresponse).length > 0){
                        var atleastoneworkerfree = false, nbthreads = 0;
                        for (var key in mresponse) {
                            nbthreads = mresponse[key]["stats"]["pool"]["max-concurrency"];
                            if (mresponse[key]["active"].length  < nbthreads){
                                atleastoneworkerfree = true;
                                break;
                            }
                        }
                        for (var key1 in mresponse) {
                            if ( response[key1] ){
                                mresponse[key1]["status"] = "UP";
                            } else {
                                mresponse[key1]["status"] = "DOWN";
                            }
                        }
                        if (!atleastoneworkerfree && results.workers.status === "OK"){
                            results.workers.status = "BUSY";
                        }
                    }
                    results.workers.details = mresponse;

                    apiResponse = new configuration.jsonResponse(200,"","","",results);
                    toolbox.logging('debug',req,"checking webapp heatlh",'OK');
                    return res.status(apiResponse.status).json(apiResponse);
                });
            }).on("error", function (err2){
                results.workers.status = "N/A worker monitoring process down";
                apiResponse = new configuration.jsonResponse(200,"","","",results);
                toolbox.logging('debug',req,"checking webapp heatlh",'OK');
                return res.status(apiResponse.status).json(apiResponse);
            });
            mhttp_request.write("");
            mhttp_request.end();
        });
    }).on("error", function (err){
        results.workers.status = "N/A worker monitoring process down";
        apiResponse = new configuration.jsonResponse(200,"","","",results);
        toolbox.logging('debug',req,"checking webapp heatlh",'OK');
        return res.status(apiResponse.status).json(apiResponse);
    });
    http_request.write("");
    http_request.end();
};