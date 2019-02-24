/**
 * Created by P.K.V.M. on 11/30/2017.
 */
var configuration = require('../config');
var toolbox = require('../controllers/toolbox');
var sec_policies = require('../controllers/security_policies');
var uuid_generator = require('uuid/v4');

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var UsersSchema = new Schema({
    username: {type: String, unique: true},
    username_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Users"]["username"]},
    userid: {type: String, unique: true, default: uuid_generator()},
    userid_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Users"]["userid"]},
    firstname: {type: String, default: ""},
    firstname_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Users"]["firstname"]},
    lastname: {type: String, default: ""},
    lastname_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Users"]["lastname"]},
    email: {type: String, unique: true},
    email_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Users"]["email"]},
    password: String,
    password_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Users"]["password"]},
    facebook         : {
        id           : {type: String, default: ""},
        email        : {type: String, default: ""},
        name         : {type: String, default: ""},
        photos       : {type: String, default: ""}
    },
    facebook_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Users"]["facebook"]},
    facebook_token: {type: String, default: ""},
    facebook_token_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Users"]["facebook_token"]},
    facebook_tokensecret: {type: String, default: ""},
    facebook_tokensecret_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Users"]["facebook_tokensecret"]},
    twitter          : {
        id           : {type: String, default: ""},
        displayName  : {type: String, default: ""},
        username     : {type: String, default: ""},
        photos       : {type: String, default: ""}
    },
    twitter_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Users"]["twitter"]},
    twitter_token: {type: String, default: ""},
    twitter_token_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Users"]["twitter_token"]},
    twitter_tokensecret: {type: String, default: ""},
    twitter_tokensecret_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Users"]["twitter_tokensecret"]},
    recovery_email: {type: String, default: ""},
    recovery_email_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Users"]["recovery_email"]},
    age: {type:Number, min:16, default: 17},
    age_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Users"]["age"]},
    gender: {type: String, default: "F"},
    gender_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Users"]["gender"]},
    picture: {type: String, default: ""},
    picture_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Users"]["picture"]},
    type: {type: String, default: "default"},
    type_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Users"]["type"]},
    login_ip: {type: String, default: "98.113.191.237"},
    login_ip_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Users"]["login_ip"]},
    signup_ip: {type: String, default: "98.113.191.237"},
    signup_ip_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Users"]["signup_ip"]},
    signup_location: {range: [ Number ], country: String, region: String, city: String, ll: [Number] },
    signup_location_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Users"]["signup_location"]},
    login_location: {range: [ Number ], country: String, region: String, city: String, ll: [Number] },
    login_location_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Users"]["login_location"]},
    login_sessionid: [String],
    login_sessionid_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Users"]["login_sessionid"]},
    login_date: {type: Date, default: Date.now()},
    login_date_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Users"]["login_date"]},
    roles: {type: String, default: "consumer"},
    roles_access: {type: String, default: "admean,default,"+sec_policies.displayrules["Users"]["roles"]}
});

UsersSchema.statics.restdbrequest = function(op, opargs, cb, cbfailure) {
    return toolbox.handledbrequest(this, "Users", op, opargs, cb, cbfailure);
};
UsersSchema.statics.restapidbrequest = function(req, res, next, defaultres, op, opargs, cb, cbfailure) {
    return toolbox.handlerestapidbrequest(req, res, next, defaultres, this, "Users", op, opargs, cb, cbfailure);
};

if (configuration.general_parameters.users_creation_mode === "b2c") {
    var UsersSignUpSchema = new Schema({
        username: {type: String, unique: true},
        firstname: {type: String, default: ""},
        lastname: {type: String, default: ""},
        email: {type: String, unique: true},
        password: String,
        age: {type: Number, min: 16, default:21},
        gender: {type: String, default: "M"},
        type: {type: String, default: "default"},
        signup_ip: {type: String, default: ""},
        signup_location: {range: [Number], country: String, region: String, city: String, ll: [Number]},
        signup_date: {type: Date, default: Date.now()},
        expiration_date: {type: Date, default: Date.now()},
        signup_token: {type: String, unique: true, default:uuid_generator()}
    });

    UsersSignUpSchema.statics.restdbrequest = function(op, opargs, cb, cbfailure) {
        return toolbox.handledbrequest(this, "UsersSignUp", op, opargs, cb, cbfailure);
    };
    UsersSignUpSchema.statics.restapidbrequest = function(req, res, next, defaultres, op, opargs, cb, cbfailure) {
        return toolbox.handlerestapidbrequest(req, res, next, defaultres, this, "UsersSignUp", op, opargs, cb, cbfailure);
    };
}

var PreviewSessionsSchema = new Schema({
    sessionid: {type: String, unique: true},
    preview_ip: {type: String, default: ""},
    preview_token: {type: String, default: uuid_generator()}
});

PreviewSessionsSchema.statics.restdbrequest = function(op, opargs, cb, cbfailure) {
    return toolbox.handledbrequest(this, "PreviewSessions", op, opargs, cb, cbfailure);
};
PreviewSessionsSchema.statics.restapidbrequest = function(req, res, next, defaultres, op, opargs, cb, cbfailure) {
    return toolbox.handlerestapidbrequest(req, res, next, defaultres, this, "PreviewSessions", op, opargs, cb, cbfailure);
};


mongoose.model('Users', UsersSchema);
if (configuration.general_parameters.users_creation_mode === "b2c") {
    mongoose.model('UsersSignUp', UsersSignUpSchema);
}
mongoose.model('PreviewSessions', PreviewSessionsSchema);

if (configuration.general_parameters.users_creation_mode === "b2b") {
    // add default user
    var Users = mongoose.model('Users');
    Users.restdbrequest("create",{doc:{
        username: "admean",
        userid: uuid_generator()+"",
        firstname: "Ad",
        lastname: "Mean",
        email: "admean@business.com",
        password: "!aD1mE3aN5?",
        recovery_email: "admean@business.com",
        age: 27,
        gender: "F",
        picture: "/uploads/default/avatars/"+toolbox.pickAvatar("F"),
        signup_location: { "range" : [ 1651621504, 1651622399 ], "ll" : [ 40.6763, -73.7752 ], "city" : "Jamaica", "region" : "NY", "country" : "US" },
        login_location: { "range" : [ 1651621504, 1651622399 ], "ll" : [ 40.6763, -73.7752 ], "city" : "Jamaica", "region" : "NY", "country" : "US" },
        login_sessionid: [],
        roles: "admin"
    }},function(err, results){
        if (err) {
            toolbox.logging('debug',null,err);
        } else {
            toolbox.logging('debug',null,'users table\'s default record created');
        }
    });
}