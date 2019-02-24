/**
 * Created by P.K.V.M. on 6/2/18.
 */

var configuration = require('../config');
var toolbox = require('./toolbox');
var formidable = require('formidable');
var fs = require('fs');


exports.upload_file = function(req, res, next){
    toolbox.req_log("-upload file-",req);

    var apiResponse;
    var default_results = {};
    // create an incoming form object
    var form = new formidable.IncomingForm();
    var imagepath = "", imageurl="", media = "", tmpfile;
    //toolbox.logging('debug',req,"formidable instanciated");

    // specify that we want to allow the user to upload multiple files in a single request
    form.multiples = false;

    // store all uploads in the /uploads directory
    form.uploadDir = path.join(__dirname, '../public/uploads', req.decoded.userid);
    imageurl = "/uploads/"+req.decoded.userid;
    //toolbox.logging('debug',req,"uploaddir set: "+form.uploadDir);
    if (!fs.existsSync(form.uploadDir)){
        //toolbox.logging('debug',req,"about to create uploaddir folder: "+form.uploadDir);
        fs.mkdirSync(form.uploadDir);
    }
    form.keepExtensions = true;

    // parse the incoming request containing the form data
    //form.parse(req);
    form.parse(req, function(err, fields, files) {
        // parsing form
        if (err) {
            //toolbox.logging('debug',req,err);
            apiResponse = new configuration.jsonResponse(500,'An exception occured during the upload: ' + JSON.stringify(err),'An exception occured during the upload: ' + JSON.stringify(err),"",default_results);
            return res.status(apiResponse.status).json(apiResponse);
        }
        else {
            //toolbox.logging('debug',req,"fields: "+JSON.stringify(fields));
            if (fields.type === "profile"){
                // deals with profile picture upload
                form.uploadDir = path.join(form.uploadDir, "avatars");
                imageurl += '/'+"avatars";
                if (!fs.existsSync(form.uploadDir)){
                    fs.mkdirSync(form.uploadDir);
                }

            } else {
                // deals with stream cover upload
                form.uploadDir = path.join(form.uploadDir, "custom_images");
                imageurl += '/'+"custom_images";
                if (!fs.existsSync(form.uploadDir)){
                    fs.mkdirSync(form.uploadDir);
                }
                media = fields.media;
            }
            //toolbox.logging('debug',req,"files: "+JSON.stringify(files));
            tmpfile = files.file;
            imagepath = path.join(form.uploadDir, tmpfile.name);//uuid_generator()+'.jpg');
            imageurl += '/'+tmpfile.name;

            //toolbox.logging('debug',req,"about to put "+tmpfile.name+" in: "+imagepath);
            fs.rename(tmpfile.path, imagepath);
            apiResponse = new configuration.jsonResponse(201,"","","",{"url":imageurl});
            return res.status(apiResponse.status).json(apiResponse);
        }
    });
};