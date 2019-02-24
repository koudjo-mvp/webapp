/**
 * Created by P.K.V.M. on 11/30/2017.
 */
var mongoose = require('mongoose');
var configuration = require('../config');
var toolbox = require('./toolbox');
var sec_policies = require('./security_policies');
var middleware = require('../routes/middleware');
var uuid_generator = require('uuid/v4');
var owasp_checker = require('owasp-password-strength-test');
var tables = ['Users'];
var lookupkeys = ['username'];
var Users = mongoose.model('Users');

exports.search_all_users = function(req, res, next){
    toolbox.req_log("-GET /api/users endpoint. search all users-",req);
    var default_results = [];

    //insert backend code here to fetch your data
    var find_filters = {};
    for (var key1 in req.query) {
        if (sec_policies.displayrules[tables[0]][key1]) {
            find_filters[key1] = req.query[key1];
        }
    }

    find_filters["type"] = req.decoded.type;
    Users.restapidbrequest(req, res, next, default_results, "find",
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
                toolbox.logging('info',req,"get users completed",'OK');
                return res.status(apiResponse.status).json(apiResponse);
            } else {
                apiResponse = new configuration.jsonResponse(204,"","","",default_results);
                toolbox.logging('info',req,'no user record found','OK');
                return res.status(apiResponse.status).json(apiResponse);
            }
        });
};

exports.get_user = function(req, res, next){
    toolbox.req_log("-GET /api/users/:resid endpoint. get user-",req);
    var default_results = {};

    //insert backend code here to fetch your data
    if (req.params.resid) {
        Users.restapidbrequest(req, res, next, default_results, "findOne",
            {
                condition: {username: req.params.resid, type: req.decoded.type},
                projection:{},
                options: {}
            },
            function(req, res, next, default_results, dbresults){
                var apiResponse;
                if (dbresults){
                    var data_filtered = toolbox.filter_data(dbresults,req.decoded.userid,req.decoded.type);
                    apiResponse = new configuration.jsonResponse(200,"","","",data_filtered);
                    toolbox.logging('info',req,"get user completed",'OK');
                    return res.status(apiResponse.status).json(apiResponse);
                } else {
                    apiResponse = new configuration.jsonResponse(204,"","","",default_results);
                    toolbox.logging('info',req,'username '+req.params.resid+' does not exist','OK');
                    return res.status(apiResponse.status).json(apiResponse);
                }

            });
    } else {
        var errm = 'Bad request, cannot get user infos without providing a username and the right privileges';
        toolbox.logging('error',req,errm,'KO');
        var apiResponse = new configuration.jsonResponse(400,errm,errm,"",default_results);
        return res.status(apiResponse.status).json(apiResponse);
    }
};

exports.get_user_info = function(req, res, next){
    toolbox.req_log("-GET /api/users/:resid?info=infoname endpoint. get user info-",req);
    var default_results = {};

    //insert backend code here to fetch your data
    if (req.params.resid && req.query.info) {
        Users.restapidbrequest(req, res, next, default_results, "findOne",
            {
                condition: {username: req.params.resid, type: req.decoded.type},
                projection:{},
                options: {}
            },
            function(req, res, next, default_results, dbresults){
                var apiResponse;
                if (dbresults){
                    var data_filtered = toolbox.filter_data(dbresults,req.decoded.userid,req.decoded.type);
                    if (data_filtered[req.query.info]){
                        apiResponse = new configuration.jsonResponse(200,"","","",data_filtered[req.query.info]);
                        toolbox.logging('info',req,"get user info completed",'OK');
                        return res.status(apiResponse.status).json(apiResponse);
                    } else {
                        apiResponse = new configuration.jsonResponse(400,'Bad request: '+req.query.info+" parameter " +
                            "does not exist, or has a restricted access",'Bad request: '+req.query.info+" parameter " +
                            "does not exist, or has a restricted access","",default_results);
                        toolbox.logging('error',req,"get user info aborted because: "+'Bad request: '+req.query.info+" " +
                            "parameter does not exist, or has a restricted access",'KO');
                        return res.status(apiResponse.status).json(apiResponse);
                    }
                } else {
                    apiResponse = new configuration.jsonResponse(204,"","","",default_results);
                    toolbox.logging('info',req,'username does not exist','OK');
                    return res.status(apiResponse.status).json(apiResponse);
                }

            });
    } else {
        var errm = 'Bad request, cannot get user info without providing a username and the right privileges';
        toolbox.logging('error',req,errm,'KO');
        var apiResponse = new configuration.jsonResponse(400,errm,errm,"",default_results);
        return res.status(apiResponse.status).json(apiResponse);
    }
};

function handle_updateuser(req, res, next, default_results, dbresults){
    var apiResponse;
    var password_change = false;

    if (!dbresults) {
        apiResponse = new configuration.jsonResponse(204,"","","",default_results);
        toolbox.logging('error',req,"no user to update",'KO');
        return res.status(apiResponse.status).json(apiResponse);
    } else {
        var doc_update = {};
        var cpt = 0;
        for (var key in req.body) {
            if (key === "password") {
                var password_check = owasp_checker.test(req.body.password);
                if (password_check.errors.length > 0) {
                    var error_message = "";
                    for (var key1 in password_check.errors) {
                        error_message += password_check.errors[key1] + ", ";
                    }
                    apiResponse = new configuration.jsonResponse(400, error_message, error_message + "Please set a stronger password", "", {});
                    toolbox.logging('error', req, "user password update aborted because: " + error_message, 'KO');
                    return res.status(apiResponse.status).json(apiResponse);
                } else if (req.body.password.indexOf(req.decoded.userid) >= 0) {
                    apiResponse = new configuration.jsonResponse(400, "Please set a stronger password, userid shouldnt be in your password", "Please set a stronger password, userid shouldnt be in your password", "", {});
                    toolbox.logging('error', req, "user password update aborted because: " + "Please set a stronger password, userid shouldnt be in your password", 'KO');
                    return res.status(apiResponse.status).json(apiResponse);
                } else if (req.body.old_password) {
                    if (dbresults[key] === toolbox.hashPW(req.body.old_password.toString())) {
                        toolbox.logging('debug', req, "user password update aborted because: " + "old password matches current password, password change will proceed");
                    } else {
                        apiResponse = new configuration.jsonResponse(400, "old password doesnt match", "Please provide a valid current password", "", {});
                        toolbox.logging('error', req, "user password update aborted because: " + "old password doesnt match", "Please provide a valid current password", 'KO');
                        return res.status(apiResponse.status).json(apiResponse);
                    }
                } else {
                    apiResponse = new configuration.jsonResponse(400, "old password was not provided", "Please provide your current password along with the new one in order to be able to change your current password", "", {});
                    toolbox.logging('error', req, "user password update aborted because: " + "old password was not provided", 'KO');
                    return res.status(apiResponse.status).json(apiResponse);
                }
            } else if (key === "roles") {
                // now check roles exists
                var roles = req.body.roles.trim().split(",");
                var check_roles = true;
                for (var idx in roles) {
                    if (sec_policies.roles.indexOf(roles[idx]) < 0) {
                        check_roles = false;
                        break;
                    }
                }
                if (!check_roles) {
                    apiResponse = new configuration.jsonResponse(400, "Invalid roles: The roles you can assign to a user are: " + sec_policies.roles, "Invalid roles: The roles you can assign to a user are: " + sec_policies.roles, "", default_results);
                    toolbox.logging('error', req, "user update aborted because: " + "Invalid roles: The roles you can assign to a user are: " + sec_policies.roles, 'KO');
                    return res.status(apiResponse.status).json(apiResponse);
                }
            }
            if (key !== "old_password" && (dbresults[key] === "" || dbresults[key] !== undefined)) {
                if (key.indexOf("_access")<0 && key.indexOf("username")<0 && key.indexOf("userid")<0){
                    if (key === "password"){
                        doc_update[key] = toolbox.hashPW(req.body.password);
                        password_change = true;
                    }
                    else{
                        doc_update[key] = req.body[key];
                    }
                }
            } else if (key === "old_password") {
                toolbox.logging('debug',req,"passing old_password param",'OK');
            } else {
                apiResponse = new configuration.jsonResponse(500,key+" is not a valid parameter",key+" is not a valid parameter","",default_results);
                toolbox.logging('error',req,key+" is not a valid parameter",'KO');
                return res.status(apiResponse.status).json(apiResponse);
            }
            if (cpt === (Object.keys(req.body).length - 1)){
                // all parameters have been checked, we can do the update
                if (password_change) {
                    doc_update["login_sessionid"] = [];
                }
                Users.restapidbrequest(req, res, next, default_results, "updateOne",
                    {
                        condition: {username: req.params.resid},
                        doc: doc_update,
                        options: {}
                    }, function(req, res, next, default_results, dbresults1){
                        var apiResponse;
                        if (dbresults1){
                            apiResponse = new configuration.jsonResponse(200,"","","",
                                toolbox.filter_data(dbresults1,req.decoded.userid,req.decoded.type));
                            toolbox.logging('info',req,'user '+req.params.resid+' was updated','OK');
                            return res.status(apiResponse.status).json(apiResponse);
                        } else {
                            apiResponse = new configuration.jsonResponse(204,"","","",default_results);
                            toolbox.logging('info',req,'username does not exist','OK');
                            return res.status(apiResponse.status).json(apiResponse);
                        }
                    });
            }
            cpt = cpt + 1;
        }
    }
}
exports.update_user = function(req, res, next){
    toolbox.req_log("-PUT /api/users/:resid endpoint. update user-",req);
    var default_results = {};

    //insert backend code here to fetch your data
    if (req.params.resid && req.params.resid === req.decoded.userid) {
        Users.restapidbrequest(req, res, next, default_results, "findOne",
            {
                condition: {username: req.params.resid, type: req.decoded.type},
                projection: {},
                options: {}
            }, handle_updateuser);
    } else {
        var errm = 'Bad request, cannot update user without providing a username and the right privileges';
        toolbox.logging('error',req,errm,'KO');
        var apiResponse = new configuration.jsonResponse(400,errm,errm,"",default_results);
        return res.status(apiResponse.status).json(apiResponse);
    }
};

exports.delete_user = function(req, res, next){
    toolbox.req_log("-DELETE /api/users/:resid endpoint. delete user-",req);
    var default_results = {};

    if (req.params.resid && (req.decoded.roles.indexOf("admin") >= 0 || req.params.resid === req.decoded.userid)){
        Users.restapidbrequest(req, res, next, default_results, "findOneAndDelete",
            {
                condition: {username: req.params.resid, type: req.decoded.type},
                options: {}
            },
            function(req, res, next, default_results, dbresults){
                if (dbresults){
                    apiResponse = new configuration.jsonResponse(200,"","","",
                        toolbox.filter_data(dbresults,req.decoded.userid,req.decoded.type));
                    toolbox.logging('info',req,'user '+req.params.resid+' was deleted','OK');
                    return res.status(apiResponse.status).json(apiResponse);
                } else {
                    var apiResponse = new configuration.jsonResponse(204,"","","",default_results);
                    toolbox.logging('info',req,'username does not exist or is not accessible','OK');
                    return res.status(apiResponse.status).json(apiResponse);
                }
            });
    } else{
        var errm = 'Bad request, cannot delete user without providing a username with the right privileges';
        toolbox.logging('error',req,errm,'KO');
        var apiResponse = new configuration.jsonResponse(400,errm,errm,"",default_results);
        return res.status(apiResponse.status).json(apiResponse);
    }
};

if (configuration.general_parameters.users_creation_mode === "b2b") {
    exports.create_user = function(req, res, next){
        toolbox.req_log("-create_user-", req);
        var apiResponse;
        var default_results = {};

        // request variables check
        if(req.body.username && req.body.password && req.body.type && req.body.roles){
            if(req.body.username.trim() && req.body.type.trim() && req.body.roles.trim()){
                //password complexity test
                var password_check = owasp_checker.test(req.body.password);
                if (password_check.errors.length === 0){
                    if (req.body.password.indexOf(req.decoded.userid)>=0) {
                        apiResponse = new configuration.jsonResponse(400,"Please set a stronger password, userid shouldnt be in your password","Please set a stronger password, userid shouldnt be in your password","",{});
                        toolbox.logging('error',req,"user creation failed because: "+"Please set a stronger password, userid shouldnt be in your password",'KO');
                        return res.status(apiResponse.status).json(apiResponse);
                    } else{
                        // now check roles exists
                        var roles = req.body.roles.trim().split(",");
                        var check_roles = true;
                        for (var idx in roles){
                            if (sec_policies.roles.indexOf(roles[idx])<0){
                                check_roles = false;
                                break;
                            }
                        }
                        if(check_roles){
                            //insert user infos in DB
                            var ip_splits = req.get('X-Real-IP').split(':');
                            var signup_request_ip = ip_splits[ip_splits.length-1];
                            var signup_location = toolbox.get_geolocation(signup_request_ip);
                            var type = req.body.type.trim() || "default";

                            var extras_data = {
                                recovery_email: req.body.email,
                                password: toolbox.hashPW(req.body.password),
                                picture: "/uploads/default/avatars/"+toolbox.pickAvatar("req.body.gender"),
                                signup_ip: signup_request_ip,
                                signup_location: signup_location,
                                login_sessionid: [],
                                signup_token: token
                            };
                            var new_doc = toolbox.setDocument(req,"Users",req.body,extras_data,true);

                            Users.restapidbrequest(req, res, next, default_results, "create",
                                {
                                    doc: new_doc
                                },
                                function(req, res, next, default_results, dbresults1){
                                    Users.restapidbrequest(req, res, next, default_results, "findOne",
                                        {
                                            condition: {username: req.body.username.trim()},
                                            projection: {},
                                            options: {}
                                        },
                                        function(req, res, next, default_results, dbresults2){
                                            if (dbresults2){
                                                var apiResponse = new configuration.jsonResponse(201,"","","",
                                                    toolbox.filter_data(dbresults2,req.decoded.userid,req.decoded.type));
                                                toolbox.logging('info',req,"User creation completed",'OK');
                                                return res.status(apiResponse.status).json(apiResponse);
                                            } else {
                                                var apiResponse = new configuration.jsonResponse(500,"",
                                                    "An exception occurred. User has not been created","",default_results);
                                                toolbox.logging('error',req,'user '+req.decoded.userid+' has not been created','KO');
                                                return res.status(apiResponse.status).json(apiResponse);
                                            }
                                        });
                                }, function(req, res, next, default_results, dberr, dbresults3){
                                    var apiResponse;
                                    if (dberr.errmsg.indexOf('duplicate key') >= 0) {
                                        apiResponse = new configuration.jsonResponse(400,toolbox.prettyErr(dberr),'You already created the resource as' +
                                            ' [ User: '+req.body.username.trim()+', Email: '+req.body.email+' ]' +
                                            '. Please login with this account or create a new user name and email address.',"",default_results);
                                        toolbox.logging('error',req,toolbox.prettyErr(dberr),'KO');
                                        toolbox.logging('error',req,'You already the resource as' +
                                            ' [ User: '+req.body.username.trim()+', Email: '+req.body.email+' ]' +
                                            '. Please login with this account or create a new user name and email address.','KO');
                                        return res.status(apiResponse.status).json(apiResponse);
                                    } else {
                                        apiResponse = new configuration.jsonResponse(500,toolbox.prettyErr(dberr),"Backend DB is DOWN or unreachable","",default_results);
                                        toolbox.logging('error',req,toolbox.prettyErr(dberr),'KO');
                                        toolbox.logging('error',req,dberr,'KO');
                                        return res.status(apiResponse.status).json(apiResponse);
                                    }
                                });
                        } else{
                            apiResponse = new configuration.jsonResponse(400,"Invalid roles: The roles you can assign to a user are: "+sec_policies.roles, "Invalid roles: The roles you can assign to a user are: "+sec_policies.roles,"",default_results);
                            toolbox.logging('error',req,"user creation failed because: "+"Invalid roles: The roles you can assign to a user are: "+sec_policies.roles,'KO');
                            return res.status(apiResponse.status).json(apiResponse);
                        }
                    }
                } else {
                    //owasp password strenght weak
                    var error_message = "";
                    for (var key in password_check.errors) {
                        error_message += password_check.errors[key] + ", ";
                    }
                    apiResponse = new configuration.jsonResponse(400,error_message,error_message + "Please set a stronger password","",default_results);
                    toolbox.logging('error',req,"user creation failed because: "+error_message,'KO');
                    return res.status(apiResponse.status).json(apiResponse);
                }
            } else {
                //bad request
                apiResponse = new configuration.jsonResponse(400,"username, password, email, type and roles POST request parameters values must be NOT be empty","username, password, email, type and roles POST request parameters values must be NOT be empty","",default_results);
                toolbox.logging('error',req,"user creation failed because: "+"username, password, email, type and roles POST request parameters values must be NOT be empty","username, password, email, type and roles POST request parameters values must be NOT be empty",'KO');
                return res.status(apiResponse.status).json(apiResponse);
            }
        } else {
            //bad request
            apiResponse = new configuration.jsonResponse(400,"username, password, email, type and roles must be passed in the POST request body","username, password, email, type and roles must be passed in the POST request body","",default_results);
            toolbox.logging('error',req,"user creation failed because: "+"username, password, email, type and roles must be passed in the POST request body","username, password, email, type and roles must be passed in the POST request body",'KO');
            return res.status(apiResponse.status).json(apiResponse);
        }
    };
}