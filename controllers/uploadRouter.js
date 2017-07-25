
const assert = require('assert');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');

const debug = true;
const uploadDir = "uploadedImages";
const targetDir = "public\\images\\Tools\\img"; // /images/Tools/img
const targetDirString = "/images/Tools/img";

function fileRef(fname) {
    return { "dir": targetDirString, "filename": fname, "comment": "empty" };
}
function debugLog(text) {
    if (debug) console.log(text);
}
module.exports = function (dir, app) {

    app.use(express.static(path.join(dir, '/public')));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    //debugLog("using dir " + dir);
    // main page 
    app.get('/', (req, res) => {
        //debugLog("controllers/uploadRouter.js");
        res.sendFile(dir + '/fileinput3.html');
    });
    
    app.put('/move1/', (req, res) => {
        
        var fname = req.body.fname;
       
        
        var from = path.join(dir, uploadDir, fname).replace(/\//, "\\");
        var to   = path.join(dir, targetDir, fname).replace(/\//, "\\");
        debugLog("move1 from " + from);
        
        fs.move(from, to).then(
            () => res.json({"moved 1 file": fname}),

            (error) => {
                debugLog("move error "+error.message);
                return res.json({error:error.message});
            }).catch(function () {
                   console.log("Move1 Promise Rejected");
              });
    });


    
    
};
