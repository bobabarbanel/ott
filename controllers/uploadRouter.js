"use strict";
// uploadRouter.js
const assert = require('assert');
const path = require('path');

const fs = require('fs-extra');
const formidable = require('formidable');
var Jimp = require("jimp");

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
        // debugLog("calcFullTargetDir key4 " + JSON.stringify(key4));
        /******************************/
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
    function pad4(num) { // pads for number tail of length 4
        let s = "000000000000" + num;
        return s.substr(s.length - 4);
    }

    // app.post('/archiveImages', (req, res) => {
    //     let dirs = req.body.dirs;
    //     let fileName = req.body.fileName;

    //     dirs.forEach(
    //         aDir => {
    //             let archiveDir = aDir.replace("Tools", "Archive/Tools");

    //             let fullPath = path.normalize(dir + "/public" + archiveDir);
    //             if (!fs.existsSync(fullPath)) {
    //                 fs.mkdirSync(fullPath);
    //             }
    //             fs.renameSync(
    //                 path.normalize(dir + "/public" + aDir + '/' + fileName),
    //                 fullPath + '/' + fileName
    //             );
    //         }
    //     );

    //     res.json("success");
    //     return;
    // });
    // function isString(value) {
    //     return typeof value === 'string' || value instanceof String;
    // };



    app.post('/deleteDbImages', (req, res) => {
        // RMA - do this in bulk??
        let query = req.body.query;
        // convert the string attrs to integers
        ["turret", "position", "spindle", "offset"].forEach(
            term => query[term] = parseInt(query[term])
        );

        // copy chosen fileRef to archived slot; and dlete from files slot
        let arch = Object.assign({}, req.body.filedata);
        arch.when = new Date();      // add datetime 
        let updates = {
            "$pull": {
                "files": req.body.filedata
            },
            "$push": {
                "archived": arch
            }
        };

        //////////////////DEBUG
        fs.appendFileSync('undoLog.txt', 'Delete ' + req.body.filedata.filename + "\n");
        //////////////////DEBUG

        db.collection("images").update(query, updates).then(
            doc => {
                res.json(doc);
                return (doc);
            },
            err => {
                console.log("deleteDbImages files out error " + JSON.stringify(err));
                res.json(err);
            });

    });

    ///////////////////DEBUG
    app.post('/reportLog', (req, res) => {
        fs.appendFileSync('undoLog.txt', '\n\nReport ' +
            JSON.stringify(req.body.f) + "\n" +
            JSON.stringify(req.body.q) + "\n" +
            JSON.stringify(req.body.r) + "\n\n");
    });
    //////////////////DEBUG



    app.post('/updateImageComment', (req, res) => {
        let query = req.body.query;
        query.turret = parseInt(query.turret);
        query.spindle = parseInt(query.spindle);
        query.position = parseInt(query.position);
        query.offset = parseInt(query.offset);
        let filename = req.body.filename;
        let dir = req.body.dir;
        let new_comment = req.body.comment;

        query.files = { $elemMatch: { filename: filename, dir: dir } };

        db.collection('images').update(
            query,
            { $set: { "files.$.comment": new_comment } },
            {
                arrayFilters: [
                    { "$.filename": filename }, { "$.dir": dir }
                ]
            }
        ).then(
            doc => {
                console.log(doc);
                res.json(doc);
            },
            err => {
                console.log("updateImageComment error " +
                    JSON.stringify(err));
                res.json(err);
            }
            );
    });

    app.post('/restoreDbImages', (req, res) => {
        let query = req.body.query;

        // convert the string attrs to integers
        ["turret", "position", "spindle", "offset"].forEach(
            term => query[term] = parseInt(query[term])
        );
        // remove timestamp if present
        if (req.body.filedata.when !== undefined)
            delete req.body.filedata.when;
        // let comment = req.body.filedata.comment;
        // delete req.body.filedata.comment;
        let deleteItem = {
            "$pull": {
                "archived": req.body.filedata
            }
        };
        ////////////////DEBUG
        fs.appendFileSync('undoLog.txt', 'Restore ' +
            req.body.filedata.filename + "\n");
        ////////////////DEBUG
        db.collection("images").update(query, deleteItem).then(
            doc => {
                return (doc);
            },
            err => {
                console.log("restoreDbImages archived out error " +
                    JSON.stringify(err));
                res.json(err);
            }
        ).then(
            doc => {
                // add timestamp
                req.body.filedata.when = new Date();
                // req.data.filedata.comment = comment;
                let addItem = {
                    "$push": {
                        "files": req.body.filedata
                    }
                };
                db.collection("images").update(query, addItem).then(
                    doc => {
                        res.json(doc);
                    },
                    err => {
                        console.log("deleteDbImages files in error " +
                            JSON.stringify(err));
                        res.json(err);
                    }
                );
            });
    });

    app.post('/countImages', (req, res) => {

        let myPromise = db.collection("images").aggregate([
            {
                $match: {
                    "key4": req.body.key4,
                    "tab": req.body.tab
                }
            },
            { $project: { "files.filename": 1, _id: 0 } },
            { $unwind: { path: "$files" } },
            { $count: "fileCount" }
        ]).toArray();

        myPromise.then(
            r => {// result looks like { "fileCount" : 67 }
                res.json(r);
            },
            err => res.json(err)
        );
    });

    // app.post('/jobArchive', (req, res) => {
    //     let key4 = req.body.key4; // key4 of parts.images
    //     let tab = req.body.tab; // part of primary key on parts.images
    //     let key5 = req.body.key5; // _id of parts.main
    //     let idOrderedKeys = req.body.idOrderedKeys;
    //     // console.log("jobArchive: " + key4 + " " + tab + " " + key5);
    //     db.collection("main").remove(
    //         { "_id": key5 }
    //     ).then(
    //         success => {
    //             // console.log("main removed " + success);
    //             let keyFields = key5.split('|');
    //             let archiveMainEntry = {
    //                 "_id": key5
    //             };
    //             idOrderedKeys.forEach(
    //                 (k, i) => {
    //                     archiveMainEntry[k] = keyFields[i];
    //                 }
    //             );
    //             db.collection("archive_main").create(archiveMainEntry).then(
    //                 success => {
    //                     // console.log("archive_main created " + success);
    //                     db.collection("images").remove(
    //                         {
    //                             "key4": key4,
    //                             "tab": tab
    //                         }
    //                     ).then(
    //                         // archive images (Tools,Tools_large, Tools_small) TBD
    //                         );
    //                 },
    //                 error => {
    //                     console.log("archive_main NOT created " + error);
    //                     res.json({ "main": true, "archive_main": false, "images": false })
    //                 }
    //             );


    //         },
    //         error => {
    //             console.log("main NOT removed " + error);
    //             res.json({ "main": false, "archive_main": false, "images": false })
    //         }
    //         );

    // });

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
            let ftdMedium, ftdSmall, ftdLarge;

            ftdLarge = calcFullTargetDir(key4, SECTION + '_large');
            ftdMedium = calcFullTargetDir(key4, SECTION);
            ftdSmall = calcFullTargetDir(key4, SECTION + '_small');

            // public/images/Tools_large/img/MLetters (first 2 letters of machine name)
            let fullPath = path.normalize(dir + "/public/" + ftdLarge);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath);
            }
            let tailnum = 1;
            let uploadCount = 0;

            for (let i = 0; i < myFiles.length; i++) {
                let fileName = myFiles[i].name;
                let tail = fileName.substring(fileName.lastIndexOf("."));

                //  public/images/Tools_large/img/MLetter/Lathe_A251A4802-1_30_LC40-2A_10_10.jpg,
                let base = calcFullTargetBaseFileName(key4, position, offset);
                let ffn = base + "_" + pad4(tailnum) + tail; // _001 file

                let toLarge = path.normalize(addWebSitePublic(dir, ftdLarge, ffn));
                // does the target file already exist with default name?

                while (fs.existsSync(toLarge)) { // while file 'to' exists
                    // add _002 etc as needed
                    ffn = base + "_" + pad4(++tailnum, 3) + tail; // file changed to 002, 003, ...
                    toLarge = path.normalize(addWebSitePublic(dir, ftdLarge, ffn));
                }

                // now 'toLarge' is our _large target full path

                // save original image in _large directory
                fs.renameSync(myFiles[i].path, toLarge);

                Jimp.read(toLarge).then(function (image) {
                    let img = image.clone();

                    // create _small version of image in Tools_small
                    let toSmall = path.normalize(
                        addWebSitePublic(dir, ftdSmall, ffn));
                    img.resize(Jimp.AUTO, 100)      // resize height 100
                        .quality(99)                  // set JPEG quality
                        .write(toSmall);            // save

                    let toMedium = path.normalize(
                        addWebSitePublic(dir, ftdMedium, ffn));
                    // create medium sized image in /Tools
                    image.resize(300, Jimp.AUTO)      // resize width 300
                        .quality(99)                  // set JPEG quality
                        .write(toMedium);            // save

                    // update Mongo entry for this job
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
                        $push: { "files": fileRef(ftdMedium, ffn) }
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
                    // success res
                }).catch(function (err) {
                    console.error(err);
                    // error res
                });


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
