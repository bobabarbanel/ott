"use strict";
const assert = require('assert');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');

const debug = false;
const uploadDir = "uploadedImages";
const targetDir = "public/images/Tools/img"; 
const targetDirString = "/images/Tools/img";

function fileRef(fname) {
    return { "dir": targetDirString, "filename": fname, "comment": "empty" };
}
function debugLog(text) {
    if (debug) { console.log(text); }
}
//console.log("uploadRouter loaded");
module.exports = function (dir, app, db) {

    app.use(express.static(path.join(dir, '/public')));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    //debugLog("using dir " + dir);
    // main page 
	/*
    app.get('/', (req, res) => {
        //debugLog("controllers/uploadRouter.js");
        res.sendFile(dir + '/fileinput3.html');
    });
    */
    app.post('/movefile/', (req, res) => {

        var fileName = req.body.filename;
        let position = (typeof req.body.position == "string") ? parseInt(req.body.position) : req.body.position;
        let offset = (typeof req.body.offset == "string") ? parseInt(req.body.offset) : req.body.offset;
        var from = path.normalize(dir + "/" + uploadDir + "/" + fileName); //.replace(/\//, "\\");
        var to = path.normalize(dir + "/" + targetDir + "/" + fileName); //.replace(/\//, "\\");
        debugLog("movefile from " + from);

        fs.move(from, to).then(
            () => {
                let query = {
                    "key4": req.body.key4,
                    "tab": "Tools",
                    "position": position,
                    "offset": offset
                };
                let updates = {
                    $set: {
                        "function": req.body.function,
                        "type": req.body.type
                    },
                    $push: { "files": fileRef(fileName) }
                };
                let options = { "upsert": true, "returnNewDocument": true };
                db.collection("images").findOneAndUpdate(
                    query,
                    updates,
                    options,
                    function (err, doc) {
                        assert.equal(err, null);
                        if (doc != null) {
                            console.log(doc);
                            res.json(doc);
                        }
                    });
            },
            (error) => {
                debugLog("move error " + error.message);
                return res.json({ error: error.message });
            }).catch(function () {
                console.log("movefiles Promise Rejected");
            });
    });

    app.post('/imagefiles/', (req, res) => {
        let position = parseInt(req.body.position);
        let offset = parseInt(req.body.offset);
        
        let myPromise = db.collection("images").aggregate([
            {
                $match: {
                    "key4": req.body.key4,
                    "position": position,
                    "offset": offset,
                    "tab": req.body.tab
                }
            },
            { $project: { "files.filename": 1, _id: 0 } },
            { $unwind: { path: "$files" } }
        ]).toArray();

        myPromise.then(
            r => {
                res.json(r.map(obj => obj.files.filename));
            },
            () => res.json([])
        );

    });
}
