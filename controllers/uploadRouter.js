"use strict";
// uploadRouter.js
const assert = require('assert');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const formidable = require('formidable');

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

    app.post('/archiveImages', (req, res) => {
        let dirs = req.body.dirs;
        let fileName = req.body.fileName;

        //console.log(dirs[0]);
        //console.log(fileName);
        dirs.forEach(
            aDir => {
                let archiveDir = aDir.replace("Tools", "Archive/Tools");

                let fullPath = path.normalize(dir + "/public" + archiveDir);
                if (!fs.existsSync(fullPath)) {
                    //console.log("creating " + aDir + " : " + fullPath);
                    fs.mkdirSync(fullPath);
                }
                fs.renameSync(
                    path.normalize(dir + "/public" + aDir + '/' + fileName),
                    fullPath + '/' + fileName
                );
            }
        );

        res.json("success");
        return;
    });
    function isString (value) {
        return typeof value === 'string' || value instanceof String;
        };

    app.post('/deleteDbImages', (req, res) => {
        //console.log('/deleteDbImages');
        //console.log(req.body);
        let query = req.body.query;
        ["turret","position","spindle","offset"].forEach(
            term => query[term] = parseInt(query[term])
        );

        let deleteItem = {
            "$pull": {
                "files": req.body.filedata
            }
        };
        //console.log("deleteItem\n" + JSON.stringify(deleteItem))
        db.collection("images").update(query, deleteItem).then(
            doc => {
                //console.log("deleteDbImages delete ok " + JSON.stringify(doc));
                res.json(doc);
            },
            err => {
                console.log("deleteDbImages error " + JSON.stringify(err));
                res.json(err);
            }
        );
    });

    app.post('/upload', (req, res) => {
        let form = new formidable.IncomingForm();
        form.multiples = true;
        let myFiles = [];
        form.parse(req, function (err, fields, files) {

            let key4 = JSON.parse(fields['key4']);

            let turret = (typeof fields['turret'] === "string") ?
                parseInt(fields['turret']) : fields['turret'];
            let spindle = (typeof fields['spindle'] === "string") ?
                parseInt(fields['spindle']) : fields['spindle'];
            let position = (typeof fields['position'] === "string") ?
                parseInt(fields['position']) : fields['position'];
            let offset = (typeof fields['offset'] === "string") ?
                parseInt(fields['offset']) : fields['offset'];
            let tab = fields['tab'];
            let func = fields['func'];
            let type = fields['type'];

            myFiles = files['uploads[]'];

            // if only a single file is selected, it does NOT come in array
            if (myFiles.length === undefined) { myFiles = [myFiles]; }

            let ftd = calcFullTargetDir(key4, SECTION);

            // public/images/Tools/img/MLetters (first 2 letters of machine name)
            let fullPath = path.normalize(dir + "/public/" + ftd);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath);
            }
            let tailnum = 1;
            let uploadCount = 0;
            for (let i = 0; i < myFiles.length; i++) {
                let fileName = myFiles[i].name;
                let tail = fileName.substring(fileName.lastIndexOf("."));

                //  public/images/Tools/img/MLetter/Lathe_A251A4802-1_30_LC40-2A_10_10.jpg,
                let base = calcFullTargetBaseFileName(key4, position, offset);
                let ffn = base + "_" + pad3(tailnum++) + tail; // _001 file

                let to = path.normalize(addWebSitePublic(dir, ftd, ffn));
                // does the target file already exist with default name?

                while (fs.existsSync(to)) { // while file 'to' exists
                    // add _002 etc as needed
                    ffn = base + "_" + pad3(tailnum++, 3) + tail; // file changed to 002, 003, ...
                    to = path.normalize(addWebSitePublic(dir, ftd, ffn));
                }

                fs.renameSync(myFiles[i].path, to);
                let mongoKey4 = [key4.dept, key4.partId, key4.op, key4.machine].join("|");
                let query = {
                    "key4": mongoKey4,
                    "tab": tab,
                    "position": position,
                    "offset": offset,
                    "turret": turret,
                    "spindle": spindle,
                    "type": type,
                    "function": func
                };
                let updates = {
                    $push: { "files": fileRef(ftd, ffn) }
                };
                let options = { "upsert": true, "returnNewDocument": true };

                db.collection("images").findOneAndUpdate(
                    query, updates, options,
                    function (err, doc) {
                        assert.equal(err, null);
                        if (doc !== null) {
                            if (++uploadCount === myFiles.length) {
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
        let rq = req.body;
        let myPromise = db.collection("images").aggregate([
            {
                $match: {
                    "key4": rq.key4,
                    "turret": parseInt(rq.turret),
                    "position": parseInt(rq.position),
                    "spindle": parseInt(rq.spindle),
                    "offset": parseInt(rq.offset),
                    "tab": rq.tab
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

    app.post('/updateFT', (req, res) => {
        let rq = req.body;
        let doc;
        if (rq.addFiles === "true") { //do an insert
            doc = {
                "key4": rq.key4,
                "turret": parseInt(rq.turret),
                "position": parseInt(rq.position),
                "spindle": parseInt(rq.spindle),
                "offset": parseInt(rq.offset),
                "tab": rq.tab,
                "function": rq.function,
                "type": rq.type,
                "files": [],
            };
            db.collection('images').insert(doc).then(
                () => res.json({ 'status': true }),
                failure => res.json({ 'status': false, 'error': failure })
            );

        } else { // do an update on an existing document, changing function and type strings
            doc = {
                "key4": rq.key4,
                "turret": parseInt(rq.turret),
                "position": parseInt(rq.position),
                "spindle": parseInt(rq.spindle),
                "offset": parseInt(rq.offset),
                "tab": rq.tab
            };
            let update = {
                $set:
                    {
                        "function": rq.function,
                        "type": rq.type
                    }
            };

            db.collection('images').findOneAndUpdate(
                doc,
                update,
                {
                    "upsert": false, // if cannot find, do not create a new document
                    "returnNewDocument": true // return new doc
                }
            ).then(
                success => {
                    res.json({ 'status': true, 'result': success });
                },
                failure => {
                    res.json({ 'status': false, 'result': failure });
                }
                );
        }
    });



    app.post('/create_container', (req, res) => {
        let rq = req.body;
        let document = {
            "key4": rq.key4,
            "turret": parseInt(rq.turret),
            "spindle": parseInt(rq.spindle),
            "position": parseInt(rq.position),
            "offset": parseInt(rq.offset),
            "tab": rq.tab,
            "function": rq.function,
            "type": rq.type,
            "files": []
        };

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
