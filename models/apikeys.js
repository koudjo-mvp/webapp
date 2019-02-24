/**
 * Created by P.K.V.M. on 11/30/2017.
 */
var configuration = require('../config');
var toolbox = require('../controllers/toolbox');
var uuid_generator = require('uuid/v4');
var jwt = require("jsonwebtoken");
var path = require('path');
var fs = require('fs');
var hogan_engine = require('hogan.js');
var sec_policies = require('../controllers/security_policies');

var mongoose = require('mongoose'), Schema = mongoose.Schema;

var ApiKeysSchema = new Schema({
    appname: {type: String, unique: true},
    apikey: {type: String, unique: true}
});

ApiKeysSchema.statics.restdbrequest = function(op, opargs, cb, cbfailure) {
    return toolbox.handledbrequest(this, "ApiKeys", op, opargs, cb, cbfailure);
};
ApiKeysSchema.statics.restapidbrequest = function(req, res, next, defaultres, op, opargs, cb, cbfailure) {
    return toolbox.handlerestapidbrequest(req, res, next, defaultres, this, "ApiKeys", op, opargs, cb, cbfailure);
};

mongoose.model('ApiKeys', ApiKeysSchema);

// add default clientapp/devices apikeys
var apikey1 = jwt.sign({keyid:uuid_generator(), appname:"ios"}, configuration.general_parameters.secret, {
    expiresIn: 60*60*24*730 // expires in 24 hours * 730 days
}), apikey2 = jwt.sign({keyid:uuid_generator(), appname:"android"}, configuration.general_parameters.secret, {
    expiresIn: 60*60*24*730 // expires in 24 hours * 730 days
}), apikey3 = jwt.sign({keyid:uuid_generator(), appname:"browsers"}, configuration.general_parameters.secret, {
    expiresIn: 60*60*24*730 // expires in 24 hours * 730 days
});
var ApiKeys = mongoose.model('ApiKeys');
ApiKeys.restdbrequest("create",{
    doc:{
        appname: "ios",
        apikey: apikey1
    }
},function(err, results){
    if (err) {
        toolbox.logging('debug',null,err);
    }
    else {
        toolbox.logging('debug',null,'apikey table\'s default record created');
    }
});

ApiKeys.restdbrequest("create",{
    doc:{
        appname: "android",
        apikey: apikey2
    }
},function(err, results){
    if (err) {
        toolbox.logging('debug',null,err);
    }
    else {
        toolbox.logging('debug',null,'apikey table\'s default record created');
    }
});

ApiKeys.restdbrequest("create",{
    doc:{
        appname: "browsers",
        apikey: apikey3
    }
    },function(err, results){
    toolbox.logging('debug',null,'apikey table\'s default record created');
    ApiKeys.restdbrequest("findOne",
        {
            condition: {appname: "browsers"},
            projection: {},
            options: {}
        },
        function(err, dbresults){
            if (dbresults){
                var template = hogan_engine.compile(fs.readFileSync(__dirname+'/../template/apikey.js','utf8'),{delimiters: '<% %>'});
                var output = template.render({apikey:dbresults["apikey"]});
                fs.writeFileSync(path.join(__dirname+'/../public/javascripts', "apikey.js"),output);
            }
        });
}, function(err, results){
    if (!fs.existsSync(path.join(__dirname+'/../public/javascripts', "apikey.js"),"")) {
        ApiKeys.restdbrequest("findOne",
            {
                condition: {appname: "browsers"},
                projection: {},
                options: {}
            },
            function(err, dbresults){
                if (dbresults){
                    var template = hogan_engine.compile(fs.readFileSync(__dirname+'/../template/apikey.js','utf8'),{delimiters: '<% %>'});
                    var output = template.render({apikey:dbresults["apikey"]});
                    fs.writeFileSync(path.join(__dirname+'/../public/javascripts', "apikey.js"),output);
                }
            });
    }
});