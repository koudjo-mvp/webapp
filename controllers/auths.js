/**
 * Created by P.K.V.M. on 11/30/2017.
 */
var configuration = require('../config');
var toolbox = require('./toolbox');
var sec_policies = require('./security_policies');
var uuid_generator = require('uuid/v4');
var mongoose = require('mongoose');
var hogan_engine = require('hogan.js');
var jwt = require('jsonwebtoken');
var owasp_checker = require('owasp-password-strength-test');
var fs = require('fs');
var Users = mongoose.model('Users');
var ApiKeys = mongoose.model('ApiKeys');
if (configuration.general_parameters.users_creation_mode === "b2c") {
    var UsersSignUp = mongoose.model('UsersSignUp');
}
/*
 var currentdate = new Date();
 var expirationdate = new Date();
 expirationdate.setHours(currentdate.getHours() + EXPIRATION_TIME);
 var expirationdate = expirationdate.toISOString().slice(0, 19).replace('T', ' '); //toolbox.yyyymmdd(new Date());
* */
function handle_login(req, res, next, default_results, dbresults){
    var err;

    if (!dbresults){
        toolbox.logging('error',req,'Authentication failed. User '+req.body.username+' not found','KO');
        err = 'Authentication failed. Wrong username or password';
        apiResponse = new configuration.jsonResponse(404,err,err,"",default_results);
        return res.status(apiResponse.status).json(apiResponse);
    } else if (dbresults.password === toolbox.hashPW(req.body.password.toString())) {
        var logindate = new Date();
        logindate = logindate.toISOString().slice(0, 19).replace('T', ' ');
        // create a token
        var sessionid = jwt.sign({userid:dbresults["username"],uid:dbresults["userid"],roles:dbresults["roles"],type:dbresults["type"]}, configuration.general_parameters.secret, {
            expiresIn: configuration.general_parameters.login_timeout // expires in 24 hours * 31 days
        });
        var sessions = dbresults["login_sessionid"];
        sessions.push(sessionid);
        Users.restapidbrequest(req, res, next, default_results, "updateOne",
            {
                condition: {username: dbresults["username"]},
                doc: {login_date: logindate, login_sessionid: sessions}
            },
            function(req, res, next, default_results, results){
                var apiResponse = new configuration.jsonResponse(201,"","","",{
                    username: dbresults["username"],
                    sessionid: sessionid,
                    url:'/'
                });
                toolbox.logging('info',req,'a new session token for '+dbresults["username"]+' was created','OK');
                return res.status(apiResponse.status).json(apiResponse);
        });
    }else{
        toolbox.logging('error',req,'Authentication failed. User '+req.body.username+' entered a wrong password');
        err = 'Authentication failed. Wrong username or password';
        var apiResponse = new configuration.jsonResponse(404,err,err,"",default_results);
        toolbox.logging('error',req,"apiResponse = "+JSON.stringify(apiResponse),'KO');
        return res.status(apiResponse.status).json(apiResponse);
    }
}
exports.login = function(req, res, next){
    toolbox.req_log("-POST /api/login endpoint. login-",req);
    var default_results = {};

    if (!req.body.password || !req.body.username) {
        err = 'Bad request. Username or password not provided';
        var apiResponse = new configuration.jsonResponse(400,err,err,"",default_results);
        toolbox.logging('error',req,"apiResponse = "+JSON.stringify(apiResponse),'KO');
        return res.status(apiResponse.status).json(apiResponse);
    } else {
        Users.restapidbrequest(req, res, next, default_results, "findOne", {
                condition: {username:req.body.username},
                projection: {},
                options: {}
            }, handle_login
        );
    }
};

exports.logout = function(req, res, next){
    toolbox.req_log("-POST /api/logout endpoint. logout-",req);
    var default_results = {};

    Users.restapidbrequest(req, res, next, default_results, "findOne",
        {
            condition: {username: req.decoded.userid},
            projection: {},
            options: {}
        },
        function(req, res, next, default_results, dbresults){
            if (dbresults){
                var sessions = dbresults["login_sessionid"];
                sessions.splice(dbresults["login_sessionid"].indexOf(req.headers["x-access-token"]),1);
                Users.restapidbrequest(req, res, next, default_results, "updateOne",
                    {
                        condition: {username: dbresults["username"]},
                        doc: {login_sessionid: sessions}
                    },
                    function(req, res, next, default_results, dbresults1){
                        var apiResponse = new configuration.jsonResponse(200,"","","",default_results);
                        toolbox.logging('info',req,'session token for '+req.decoded.userid+' was deleted','OK');
                        return res.status(apiResponse.status).json(apiResponse);
                    });
            } else {
                var apiResponse = new configuration.jsonResponse(500,"","","",default_results);
                toolbox.logging('error',req,'session token for '+req.decoded.userid+' couldnt be deleted','KO');
                return res.status(apiResponse.status).json(apiResponse);
            }

    });
};

exports.handle_apikeys = function(req, res, next){
    toolbox.req_log("-POST /apikeys endpoint. create an new api key-",req);
    var default_results = {};

    if ((req.body.licensekey === configuration.general_parameters.secret && configuration.general_parameters.users_creation_mode === "b2b")
        || configuration.general_parameters.users_creation_mode === "b2c"){
        var apikey = jwt.sign({keyid:uuid_generator(), appname:req.body.appname}, configuration.general_parameters.secret, {
            expiresIn: 60*60*24*730 // expires in 24 hours * 730 days
        });

        ApiKeys.restapidbrequest(req, res, next, default_results, "create",
            {
                doc: {appname: req.body.appname, apikey: apikey}
            },
            function(req, res, next, default_results, dbresults){
                apiResponse = new configuration.jsonResponse(201,"","","",{"apikey":apikey});
                toolbox.logging('info',req,'a new Api Key for '+req.body.appname+' was created','OK');
                return res.status(apiResponse.status).json(apiResponse);
            });
    } else{
        toolbox.logging('error',req,'Fraudulent licence key, request rejected','KO');
        var err = 'Fraudulent licence request';
        var apiResponse = new configuration.jsonResponse(400,err,err,"",default_results);
        return res.status(apiResponse.status).json(apiResponse);
    }

};

exports.handle_delete_apikey = function(req, res, next){
    toolbox.req_log("-DELETE /apikeys/:apikeyid endpoint. revoke an api key-",req);
    var default_results = {};

    if ((req.body.licensekey === configuration.general_parameters.secret && configuration.general_parameters.users_creation_mode === "b2b")
        || configuration.general_parameters.users_creation_mode === "b2c"){
        ApiKeys.restapidbrequest(req, res, next, default_results, "findOneAndDelete",
            {
                condition: {appname: req.params.apikeyid},
                options: {}
            },
            function(req, res, next, default_results, dbresults){
                if (dbresults){
                    var apiResponse = new configuration.jsonResponse(200,"","","",default_results);
                    toolbox.logging('info',req,'the apikey of the '+dbresults["appname"]+' client app was deleted','OK');
                    return res.status(apiResponse.status).json(apiResponse);
                } else {
                    var apiResponse = new configuration.jsonResponse(204,"Bad request",'the apikey of the '+
                        req.params.apikeyid+' client app was not found',"",default_results);
                    toolbox.logging('info',req,'the apikey of the '+req.params.apikeyid+' client app was not found','OK');
                    return res.status(apiResponse.status).json(apiResponse);
                }

            });
    } else{
        toolbox.logging('error',req,'Fraudulent licence key, request rejected','KO');
        var err = 'Fraudulent licence request';
        var apiResponse = new configuration.jsonResponse(400,err,err,"",default_results);
        return res.status(apiResponse.status).json(apiResponse);
    }
};

if (configuration.general_parameters.users_creation_mode === "b2c") {
    // SignUp

    var API_KEY = configuration.general_parameters.mailgun_api_key;
    var DOMAIN = configuration.general_parameters.mailgun_domain;
    var FROM_WHO = configuration.general_parameters.mailgun_from_who;
    var MAILGUN = require('mailgun-js')({apiKey: API_KEY, domain: DOMAIN});
    var EXPIRATION_TIME = configuration.general_parameters.mailgun_EXPIRATION_TIME;
    var COMPANY= configuration.general_parameters.mailgun_COMPANY;
    var EMAILSUBJECT = configuration.general_parameters.mailgun_subject;

    exports.usernamecheck = function(req, res, next){
        toolbox.req_log("-GET /usercheck endpoint. Check username availability-",req);
        var default_results = {};

        var username = req.query.username || "";
        if (!username) {
            var apiResponse = new configuration.jsonResponse(400,"Bad request","url parameter username must be past","",default_results);
            toolbox.logging('error',req,"url parameter username must be past",'KO');
            return res.status(apiResponse.status).json(apiResponse);
        } else {
            Users.restapidbrequest(req, res, next, default_results, "findOne",
                {
                    condition: {username: username},
                    projection:{username:1},
                    options: {}
                },
                function(req, res, next, default_results, dbresults){
                    var apiResponse;
                    if (dbresults){
                        apiResponse = new configuration.jsonResponse(200,"","","",default_results);
                        toolbox.logging('info',req,'username exists','OK');
                        return res.status(apiResponse.status).json(apiResponse);
                    } else {
                        apiResponse = new configuration.jsonResponse(204,"","","",default_results);
                        toolbox.logging('info',req,'username does not exist','OK');
                        return res.status(apiResponse.status).json(apiResponse);
                    }

                },function(req, res, next, default_results, dberr, dbresults){
                    var apiResponse = new configuration.jsonResponse(204,"","","",default_results);
                    toolbox.logging('info',req,'username does not exist','OK');
                    return res.status(apiResponse.status).json(apiResponse);
                });
        }
    };

    exports.generate_newpassword = function(req, res, next){
        toolbox.req_log("-POST /lostpass endpoint. generate new password-",req);
        var default_results = {};

        var email = req.body.email || "";
        if (!email) {
            var apiResponse = new configuration.jsonResponse(400,"Bad request","email parameter must be past","",default_results);
            toolbox.logging('error',req,"email parameter must be past",'KO');
            return res.status(apiResponse.status).json(apiResponse);
        } else {
            Users.restapidbrequest(req, res, next, default_results, "findOne",
                {
                    condition: {email: email},
                    projection: {},
                    options: {}
                },
                function(req, res, next, default_results, dbresults){
                    if (dbresults){
                        var new_password = "?"+uuid_generator()+"!";
                        new_password = new_password.replace(/-/g,"I");

                        Users.restapidbrequest(req, res, next, default_results, "updateOne",
                            {
                                condition: {email: email},
                                doc: {password: toolbox.hashPW(new_password), login_sessionid: []},
                                options: {}
                            },
                            function(req, res, next, default_results, dbresults1){
                                var emailtemplate = hogan_engine.compile(fs.readFileSync(__dirname + '/../views/passwordemail.hjs', 'utf8'));
                                var htmlemail = emailtemplate.render({'COMPANY':COMPANY, 'newpassword':new_password});
                                var data = {
                                    from: FROM_WHO,
                                    to: email,
                                    subject: "Password Renewal Request",
                                    html: htmlemail
                                };
                                var apiResponse;

                                MAILGUN.messages().send(data, function (error, body) {
                                    if (error){
                                        apiResponse = new configuration.jsonResponse(500,toolbox.prettyErr(error),"Email address "+email+" could not be reached","",default_results);
                                        toolbox.logging('error',req,toolbox.prettyErr(error),'KO');
                                        toolbox.logging('error',req,'password could not be updated because the email provider had an issue','KO');
                                        return res.status(apiResponse.status).json(apiResponse);
                                    } else {
                                        var apiResponse = new configuration.jsonResponse(200,"","","",default_results);
                                        toolbox.logging('info',req,'password updated, check your mailbox','OK');
                                        return res.status(apiResponse.status).json(apiResponse);
                                    }
                                });

                            });
                    } else {
                        var apiResponse = new configuration.jsonResponse(400,"Bad request","email could not be found","",default_results);
                        toolbox.logging('error',req,'Bad request, email not found','KO');
                        return res.status(apiResponse.status).json(apiResponse);
                    }
                });
        }
    };

    exports.handle_signup = function(req, res, next){
        toolbox.req_log("-POST /signup endpoint. onboard a new user-",req);
        var default_results = {};

        var username = req.body.username || "";
        var firstname = req.body.firstname || "";
        var lastname = req.body.lastname || "";
        var email = req.body.email || "";
        email = email.toLowerCase();
        var password = req.body.password || "";
        var age = parseInt(req.body.age) || 17;
        var gender = req.body.gender || "F";
        var type = req.body.type || "default";
        var currentdate = new Date();
        var expirationdate = new Date();
        expirationdate.setHours(currentdate.getHours() + EXPIRATION_TIME);
        var ip_splits;
        try {
            ip_splits = req.get('X-Real-IP').split(':');
        } catch(er) {
            ip_splits = ["","98.113.191.237"];
        }
        var signup_request_ip = ip_splits[ip_splits.length-1];
        var signup_location = toolbox.get_geolocation(signup_request_ip);

        if (!username || !firstname || !lastname || !email || !password || !age || !gender || !type) {
            var apiResponse = new configuration.jsonResponse(400,"Bad request","POST request parameters are missing or have incorrect values","",default_results);
            toolbox.logging('error',req,'request format error','KO');
            return res.status(apiResponse.status).json(apiResponse);
        } else {

            // check password complexity

            var password_check = owasp_checker.test(password);
            if (password_check.errors.length > 0) {
                var error_message = "";
                for (var key1 in password_check.errors) {
                    error_message += password_check.errors[key1] + ", ";
                }
                apiResponse = new configuration.jsonResponse(400, error_message, error_message + "Please set a stronger password", "", {});
                toolbox.logging('error', req, "user signup aborted because: " + error_message, 'KO');
                return res.status(apiResponse.status).json(apiResponse);
            } else if (password.indexOf(username) >= 0) {
                apiResponse = new configuration.jsonResponse(400, "Please set a stronger password, username shouldnt be in your password",
                    "Please set a stronger password, username shouldnt be in your password", "", {});
                toolbox.logging('error', req, "user password update aborted because: " + "Please set a stronger password, " +
                    "username shouldnt be in your password", 'KO');
                return res.status(apiResponse.status).json(apiResponse);
            } else {
                // password OK, let's go on
                var token = uuid_generator();
                var extras_data = {
                    password: toolbox.hashPW(password),
                    signup_ip: signup_request_ip,
                    signup_location: signup_location,
                    signup_date: currentdate.toISOString(),
                    expiration_date: expirationdate.toISOString(),
                    signup_token: token
                };
                var new_doc = toolbox.setDocument(req,"UsersSignUp",req.body,extras_data,false);
                UsersSignUp.restapidbrequest(req, res, next, default_results, "create",
                    {
                        doc: new_doc
                    },
                    function(req, res, next, default_results, dbresults){
                        var newurl = req.protocol+'://'+configuration.general_parameters.domainname+'/signup#!?token='+token;
                        var emailtemplate = hogan_engine.compile(fs.readFileSync(__dirname + '/../views/signupemail.hjs', 'utf8'));
                        var htmlemail = emailtemplate.render({'user':username, 'COMPANY':COMPANY, 'newurl':newurl});
                        var data = {
                            from: FROM_WHO,
                            to: email,
                            subject: "Registration",
                            html: htmlemail
                        };
                        var apiResponse;

                        MAILGUN.messages().send(data, function (error, body) {
                            if (error){
                                apiResponse = new configuration.jsonResponse(500,toolbox.prettyErr(error),"Email address "+email+" could not be reached","",default_results);
                                toolbox.logging('error',req,toolbox.prettyErr(error),'KO');
                                toolbox.logging('error',req,'sign up step 1 KO because the email is incorrect','KO');
                                return res.status(apiResponse.status).json(apiResponse);
                            } else {
                                apiResponse = new configuration.jsonResponse(202,"","To activate your account, click on the link in the email that we just sent you at this @mail address: " + email,"",default_results);
                                toolbox.logging('info',req,'sign up step 1 OK','OK');
                                return res.status(apiResponse.status).json(apiResponse);
                            }
                        });

                    },function(req, res, next, default_results, dberr, dbresults){
                        var mess = dberr.message || dberr.errmsg;
                        if (mess.indexOf('duplicate key') >= 0) {
                            var apiResponse = new configuration.jsonResponse(400,toolbox.prettyErr(dberr),'You already signed up as' +
                                ' [ User: '+req.body.username+', Email: '+req.body.email+' ]' +
                                '. Please login with this account or sign up with a new user name and email address.',"",default_results);
                            toolbox.logging('error',req,toolbox.prettyErr(dberr),'KO');
                            toolbox.logging('error',req,'You already signed up as' +
                                ' [ User: '+req.body.username+', Email: '+req.body.email+' ]' +
                                '. Please login with this account or sign up with a new user name and email address.','KO');
                            return res.status(apiResponse.status).json(apiResponse);
                        } else {
                            var apiResponse = new configuration.jsonResponse(500,toolbox.prettyErr(dberr),"Backend DB is DOWN or unreachable","",default_results);
                            toolbox.logging('error',req,toolbox.prettyErr(dberr),'KO');
                            return res.status(apiResponse.status).json(apiResponse);
                        }
                    });
            }
        }
    };

    exports.handle_completesignup = function(req, res, next){
        toolbox.req_log("-POST /signup?signup_token=123456 endpoint. complete new user signup-",req);
        var default_results = {};

        var signup_token = req.body.signup_token || "";

        if (!signup_token)  {
            var apiResponse = new configuration.jsonResponse(400,"Bad request","GET request parameters are missing or have incorrect values","",default_results);
            toolbox.logging('error',req,'request format error','KO');
            return res.status(apiResponse.status).json(apiResponse);
        } else {
            UsersSignUp.restapidbrequest(req, res, next, default_results, "findOne",
                {
                    condition: {signup_token: req.body.signup_token},
                    projection: {},
                    options: {}
                },
                function(req, res, next, default_results, dbresults){
                    var extras_data = {
                        recovery_email: dbresults["email"],
                        login_sessionid: [],
                        picture: "/uploads/default/avatars/"+toolbox.pickAvatar(dbresults["gender"])
                    };
                    var new_doc = toolbox.setDocument(req,"Users",dbresults,extras_data,true);
                    Users.restapidbrequest(req, res, next, default_results, "create",
                        {
                            doc: new_doc
                        },
                        function(req, res, next, default_results, dbresults1){
                            var apiResponse = new configuration.jsonResponse(201,"","","",{
                                message: "Thanks for using our service! Please Log in with" +
                                " your username and password, enjoy our platform!"});
                            toolbox.logging('info',req,'sign up step 2 OK','OK');
                            return res.status(apiResponse.status).json(apiResponse);
                        }, function(req, res, next, default_results, dberr, dbresults2){
                            var apiResponse;
                            if (dberr.errmsg.indexOf('duplicate key') >= 0) {
                                apiResponse = new configuration.jsonResponse(400,toolbox.prettyErr(dberr),'You already signed up as' +
                                    ' [ User: '+dbresults["username"]+', Email: '+dbresults["email"]+' ]' +
                                    '. Please login with this account or sign up with a new user name and email address.',"",default_results);
                                toolbox.logging('error',req,toolbox.prettyErr(dberr),'KO');
                                toolbox.logging('error',req,'You already signed up as' +
                                    ' [ User: '+dbresults["username"]+', Email: '+dbresults["email"]+' ]' +
                                    '. Please login with this account or sign up with a new user name and email address.','KO');
                                return res.status(apiResponse.status).json(apiResponse);
                            } else {
                                apiResponse = new configuration.jsonResponse(500,toolbox.prettyErr(dberr),"Backend DB is DOWN or unreachable","",default_results);
                                toolbox.logging('error',req,toolbox.prettyErr(dberr),'KO');
                                toolbox.logging('error',req,dberr,'KO');
                                return res.status(apiResponse.status).json(apiResponse);
                            }
                        });
                });
        }
    };
}