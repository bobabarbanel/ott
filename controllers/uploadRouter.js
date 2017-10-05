"use strict";
// uploadRouter.js
const assert = require('assert');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const util = require('util');
const formidable = require('formidable');

const uploadDir = "uploadedImages"; // place to which images are uploaded
const SECTION = "Tools";
const debug = false;
function debugLog(text, extra) {
    if (debug && extra !== undefined) { console.log("\n" + text); }
}

function fileRef(aDir, aFname) {
    let obj = {
        "dir": aDir,
        "filename": aFname,
        "comment": "empty"
    };
    debugLog("fileRef " + JSON.stringify(obj));
    return obj;
}

module.exports = function (dir, app, db) {
    const targetHeadString = "/images"; // needs section and more

    function calcFullTargetDir(key4, section) {
        // Directory path determined using first+second letter of Machine name,
        // and fixed targetHeadString. Has leading "public/".
        debugLog("calcFullTargetDir key4 " + JSON.stringify(key4));
        let machine = key4.machine.substring(0, 2);
        // e.g., /images/Tools/LC
        return [targetHeadString, section, machine].join("/");
    }
    function addWebSitePublic(dir1, dir2, fname) {
        return [dir1, "public", dir2, fname].join("/");
    }
    function calcFullTargetBaseFileName(key4, position, offset) {
        return [key4.partId, key4.op, key4.machine, position, offset].join("_");
    }
    function pad3(num) {
        let s = "000000000000" + num;
        return s.substr(s.length - 3);
    }

    app.use(express.static(path.join(dir, '/public')));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    app.post('/upload', (req, res) => {
        let retVal = [];
        let form = new formidable.IncomingForm();
        form.multiples = true;
        let myFiles = [];;
        form.parse(req, function (err, fields, files) {

            let key4 = JSON.parse(fields['key4']);

            let turret = (typeof fields['turret'] === "string")
                ? parseInt(fields['turret']) : fields['turret'];
            let spindle = (typeof fields['spindle'] === "string")
                ? parseInt(fields['spindle']) : fields['spindle'];
            let position = (typeof fields['position'] === "string")
                ? parseInt(fields['position']) : fields['position'];
            let offset = (typeof fields['offset'] === "string")
                ? parseInt(fields['offset']) : fields['offset'];
            let tab = fields['tab'];
            let func = fields['func'];
            let type = fields['type'];

            myFiles = files['uploads[]'];

            // if only a single file is selected, it does NOT come in array
            if (myFiles.length === undefined) myFiles = [myFiles];

            let ftd = calcFullTargetDir(key4, SECTION);

            //console.log("ftdir " + ftd);
            // public/images/Tools/img/MLetters (first 2 letters of machine name)
            let fullPath = path.normalize(dir + "/public/" + ftd);
            if (fs.existsSync(fullPath)) {
                //console.log("******* dir exists: " + fullPath);
            } else {
                //console.log("******* dir NOT exists creating: " + fullPath);
                fs.mkdirSync(fullPath);
            }
            let tailnum = 1;
            let uploadCount = 0;
            for (let i = 0; i < myFiles.length; i++) {
                let fileName = myFiles[i].name;
                //console.log("file name " + fileName);
                let tail = fileName.substring(fileName.lastIndexOf("."));

                //  public/images/Tools/img/MLetter/Lathe_A251A4802-1_30_LC40-2A_10_10.jpg,
                let base = calcFullTargetBaseFileName(key4, position, offset);
                //console.log("base " + base);
                let ffn = base + "_" + pad3(tailnum++) + tail; // _001 file
                //console.log("ffname " + ffn);

                let to = path.normalize(addWebSitePublic(dir, ftd, ffn));
                //console.log("rename File to " + to);
                // does the target file already exist with default name?

                while (fs.existsSync(to)) { // while file 'to' exists
                    // add _002 etc as needed
                    ffn = base + "_" + pad3(tailnum++, 3) + tail; // file changed to 002, 003, ...
                    to = path.normalize(addWebSitePublic(dir, ftd, ffn));
                    //console.log("rename again " + to);
                }

                //console.log("*** final new movefile to " + to);
                //console.log("*** last exists check " + fs.existsSync(to));
                fs.renameSync(myFiles[i].path, to);
                let mongoKey4 = [key4.dept, key4.partId, key4.op, key4.machine].join("|");
                let query = {
                    "key4": mongoKey4,
                    "tab": tab,
                    "position": position,
                    "offset": offset,
                    "turret": turret,
                    "spindle": spindle
                };
                let updates = {
                    $set: {
                        "function": func,
                        "type": type
                    },
                    $push: { "files": fileRef(ftd, ffn) }
                };
                let options = { "upsert": true, "returnNewDocument": true };
                //console.log("doing findOneAndUpdate\n\t" + mongoKey4 + " p " + position + " o " + offset +
                //" f " + func + " t " + type);
                db.collection("images").findOneAndUpdate(
                    query, updates, options,
                    function (err, doc) {
                        assert.equal(err, null);
                        if (doc !== null) {
                            if (++uploadCount == myFiles.length) {
                                res.json({ "count": uploadCount });
                                return;
                            }
                        }
                    }
                );
            }

        });

    });

    app.post('/imagefiles/', (req, res) => {

        let myPromise = db.collection("images").aggregate([
            {
                $match: {
                    "key4": req.body.key4,
                    "turret": parseInt(req.body.turret),
                    "position": parseInt(req.body.position),
                    "spindle": parseInt(req.body.spindle),
                    "offset": parseInt(req.body.offset),
                    "tab": req.body.tab
                }
            },
            { $project: { "files.filename": 1, _id: 0 } },
            { $unwind: { path: "$files" } }
        ]).toArray();

        myPromise.then(
            r => {
                //console.log('/imagefiles/');
                //console.log(util.inspect(r));
                res.json(r.map(obj => obj.files.filename));
            },
            () => res.json([])
        );

    });

    app.post('/create_container', (req, res) => {
        console.log('/create_container');
        console.log(JSON.stringify(req.body));
        let document = {
            "key4": req.body.key4,
            "turret": parseInt(req.body.turret),
            "spindle": parseInt(req.body.spindle),
            "position": parseInt(req.body.position),
            "offset": parseInt(req.body.offset),
            "tab": req.body.tab,
            "function": req.body.function,
            "type": req.body.type,
            "files": []
        };
        console.log(JSON.stringify(document));

        db.collection("images").insertOne(document).then(
            result => {
                res.json({ "status": true, "result": result });
            },
            err => {
                res.json({ "status": false, "result": err });
            }
        );
    });

};
