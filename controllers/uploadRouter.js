"use strict";
// uploadRouter.js
const path = require('path');
const ObjectId = require('mongodb').ObjectID;

const fs = require('fs-extra');
const formidable = require('formidable');
var Jimp = require("jimp");

const SECTION = "Tools";
const debug = false;

function debugLog(text, extra) {
    if (debug && extra !== undefined) {
        console.log("\n" + text);
    }
}

function fileRef(aDir, aFname) {
    let obj = {
        "dir": aDir,
        "filename": aFname,
        "comment": "empty",
        "created": new Date(),
        "archived": false
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

    function calcFullTargetBaseFileName(key4, turret, position, spindle, offset) {
        return [key4.partId, key4.op, key4.machine,
            turret, position, spindle, offset
        ].join("_");
    }

    function pad4(num) { // pads for number tail of length 4
        let s = "000000000000" + num;
        return s.substr(s.length - 4);
    }
    let uploadCount = 0; // tie to key4
    function processUploads(key4, _id, base, tailnum, numberOfFiles,
        myFiles, idirs, executionDir, res) {
        let ftdLarge = idirs[0],
            ftdMedium = idirs[1],
            ftdSmall = idirs[2];
        uploadCount = 0;
        myFiles.forEach(
            (aFile, index) => {
                let fileName = aFile.name;
                // console.log(index + "> " + fileName);
                let tail = fileName.substring(fileName.lastIndexOf("."));

                //  public/images/Tools_large/img/MLetter/Lathe_A251A4802-1_30_LC40-2A_10_10.jpg,

                let ffn = base + "_" + pad4(tailnum + index) + tail; // _0001 file

                let toLarge = path.normalize(addWebSitePublic(executionDir, ftdLarge, ffn));
                // now 'toLarge' is our _large target full path

                // save original large image in _large directory
                fs.renameSync(aFile.path, toLarge);

                Jimp.read(toLarge).then(function (image) {
                    let img = image.clone();

                    // create _small version of image in Tools_small
                    let toSmall = path.normalize(
                        addWebSitePublic(executionDir, ftdSmall, ffn));
                    img.resize(Jimp.AUTO, 100) // resize height 100
                        .quality(99) // set JPEG quality
                        .write(toSmall); // save small image

                    let toMedium = path.normalize(
                        addWebSitePublic(executionDir, ftdMedium, ffn));
                    // create medium sized image in /Tools
                    image.resize(300, Jimp.AUTO) // resize width 300
                        .quality(99) // set JPEG quality
                        .write(toMedium); // save medium image

                    // update Mongo entry for this job

                    let query = { // use id for finding document
                        "_id": _id
                    };
                    let updates = { // adding one file reference
                        $push: {
                            "files": fileRef(ftdMedium, ffn)
                        }
                    };

                    let promise = db.collection("images")
                        .findOneAndUpdate(query, updates);
                    promise.then(
                        () => {
                            if (++uploadCount === numberOfFiles) {
                                res.json({
                                    "count": uploadCount
                                });
                                return;
                            } else {
                                // console.log(uploadCount);
                            }
                        },

                        (err) => {
                            res.json({
                                "error": err
                            });
                        }
                    );
                });
            }
        );
    }
    // const seen = {};
    // function repeat(finfo) {
    //     if(Object.keys(finfo).forEach(
    //         (key) => seen[key] != undefined && 
    //         JSON.stringify(seen[key]) === JSON.stringify(finfo[key])
    //     ).length != 0) {
    //         console.log("REPEAT!");
    //         return false;
    //     }

    //     return true;
    // }

    // rma test
    app.get('/progress/:id', (req, res) => {
        // console.log("/progress " + req.params.id + " " + uploadCount);
        res.json({
            "progress": uploadCount,
            "total": numberOfFiles,
            "id": req.params.id,
            "finished": uploadCount === numberOfFiles
        });

    });

    app.post('/archiveImages', (req, res, next) => {
        // console.log("/archiveImages");
        let col = db.collection('images');
        let promises =
            Object.keys(req.body.fileinfo).map(
                (identifier) => {
                    let p = new Promise((resolve, reject) => {
                        let _id = new ObjectId(identifier);
                        let filenames = req.body.fileinfo[identifier];
                        // repeat(req.body.fileinfo);
                        // console.log("del id / count = " + identifier + " " + filenames.length);
                        let query = {
                            "_id": _id,
                            "files.archived": false
                        };
                        let update = {
                            $set: {
                                "files.$[elem].archived": true
                            }
                        };
                        let other = {
                            "arrayFilters": [{
                                "elem.archived": false,
                                "elem.filename": {
                                    "$in": filenames
                                }
                            }]
                        };
                        let result = col.updateMany(query, update, other);

                        return result;
                    });
                    p.catch(error => {
                        return error
                    });
                });
        Promise.all(promises).then(

            (success) => {
                // console.log("all promises success: " + JSON.stringify(success));

                return res.json({
                    "success": success
                });
                // res.end();
            },
            (error) => {
                console.log("all promises failure: " + JSON.stringify(error));

                return res.json({
                    "error": error
                });
                // res.end();
            }
        );
        // console.log("all promises running");
        // return;
    });


    app.post('/unArchiveImages', (req, res) => {
        // console.log("/unArchiveImages");
        let col = db.collection('images');
        let promises =
            Object.keys(req.body.fileinfo).map(
                (identifier) => {
                    let p = new Promise((resolve, reject) => {
                        let _id = new ObjectId(identifier);
                        let filenames = req.body.fileinfo[identifier];
                        // repeat(req.body.fileinfo);
                        // console.log("UNdel id / count = " + identifier + " " + filenames.length);
                        let query = {
                            "_id": _id,
                            "files.archived": true
                        };
                        let update = {
                            $set: {
                                "files.$[elem].archived": false
                            }
                        };
                        let other = {
                            "arrayFilters": [{
                                "elem.archived": true,
                                "elem.filename": {
                                    "$in": filenames
                                }
                            }]
                        };
                        let result = col.updateMany(query, update, other);

                        return result;
                    });
                    p.catch(error => {
                        return error
                    });
                });
        Promise.all(promises).then(
            (success) => {
                // console.log("all promises success: " + JSON.stringify(success));
                return res.json({
                    "success": success
                });
                // res.end();
            },
            (error) => {
                // console.log("all promises failure: " + JSON.stringify(error));
                return res.json({
                    "error": error
                });
                // res.end();
            }
        );
        // console.log("all promises running");
        // return;
    });

    // app.post('/deleteDbImages', (req, res) => {
    //     // RMA - do this in bulk??
    //     let query = req.body.query;
    //     // convert the string attrs to integers
    //     ["turret", "position", "spindle", "offset"].forEach(
    //         term => query[term] = parseInt(query[term])
    //     );

    //     // copy chosen fileRef to archived slot; and dlete from files slot
    //     let arch = Object.assign({}, req.body.filedata);
    //     arch.when = new Date(); // add datetime 
    //     let updates = {
    //         "$pull": {
    //             "files": req.body.filedata
    //         },
    //         "$push": {
    //             "archived": arch
    //         }
    //     };

    //     //////////////////DEBUG
    //     //fs.appendFileSync('undoLog.txt', 'Delete ' + req.body.filedata.filename + "\n");
    //     //////////////////DEBUG

    //     db.collection("images").update(query, updates).then(
    //         doc => {
    //             res.json(doc);
    //             return (doc);
    //         },
    //         err => {
    //             console.log("deleteDbImages files out error " + JSON.stringify(err));
    //             res.json(err);
    //         });

    // });

    ///////////////////DEBUG
    // app.post('/reportLog', (req, res) => {
    //     fs.appendFileSync('undoLog.txt', '\n\nReport ' +
    //         JSON.stringify(req.body.f) + "\n" +
    //         JSON.stringify(req.body.q) + "\n" +
    //         JSON.stringify(req.body.r) + "\n\n");
    // });
    //////////////////DEBUG



    app.post('/updateImageComment', (req, res) => {
        db.collection('images').updateOne({
            "_id": new ObjectId(req.body._id)
        }, {
            $set: {
                "files.$[elem].comment": req.body.comment
            }
        }, {
            arrayFilters: [{
                $and: [{
                    "elem.filename": req.body.filename
                }, {
                    "elem.dir": req.body.dir
                }, {
                    "elem.archived": false
                }]
            }]
        }).then(
            doc => {
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
        if (req.body.filedata.when !== undefined) {
            delete req.body.filedata.when;
        }
        // let comment = req.body.filedata.comment;
        // delete req.body.filedata.comment;
        // let deleteItem = {
        //     "$pull": {
        //         "archived": req.body.filedata
        //     }
        // };

        let updates = {
            "$pull": {
                "archived": req.body.filedata
            },
            "$push": {
                "files": {
                    filename: req.body.filedata.filename,
                    dir: req.body.filedata.dir,
                    comment: req.body.filedata.comment,
                    date: new Date()
                }
            }
        };
        ////////////////DEBUG
        // fs.appendFileSync('undoLog.txt', 'Restore ' +
        //     req.body.filedata.filename + "\n");
        ////////////////DEBUG
        db.collection("images").update(query, updates).then(
            doc => {
                res.json(doc);
            },
            err => {
                console.log("restoreDbImages updates error " +
                    JSON.stringify(err));
                res.json(err);
            }
        );
    });

    app.post('/countImages', (req, res) => {

        let myPromise = db.collection("images").aggregate([{
                $match: {
                    "key4": req.body.key4,
                    "tab": req.body.tab
                }
            },
            {
                $project: {
                    "files.filename": 1,
                    _id: 0
                }
            },
            {
                $unwind: {
                    path: "$files"
                }
            },
            {
                $count: "fileCount"
            }
        ]).toArray();

        myPromise.then(
            r => { // result looks like { "fileCount" : 67 }
                res.json(r);
            },
            err => res.json(err)
        );
    });
    // rma test
    let numberOfFiles;
    // 

    app.post('/upload', (req, res) => {
        // be sure we have /images directory

        let imagesPath = path.normalize(dir + "/public/images");
        if (!fs.existsSync(imagesPath)) {
            fs.mkdirSync(imagesPath);
        }

        // be sure we have /images/Tools[_large,_small] directories
        [SECTION + '_large', SECTION, SECTION + '_small'].forEach(
            toolDir => {
                let aDir = targetHeadString + '/' + toolDir;
                let aPath = path.normalize(dir + "/public/" + aDir);

                if (!fs.existsSync(aPath)) {
                    fs.mkdirSync(aPath);
                }
            }
        );

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

            let mongoKey4 = [key4.dept, key4.partId, key4.op, key4.machine].join("|");
            let query = {
                "key4": mongoKey4,
                "tab": tab,
                "position": position,
                "offset": offset,
                "turret": turret,
                "spindle": spindle
            };

            myFiles = files['uploads[]'];

            // if only a single file is selected, it does NOT come in array
            if (myFiles.length === undefined) {
                myFiles = [myFiles];
            }
            //let numberOfFiles = myFiles.length;
            numberOfFiles = myFiles.length;
            // add machine (2 chars) to directories
            let ftdMedium, ftdSmall, ftdLarge;
            ftdLarge = calcFullTargetDir(key4, SECTION + '_large');
            ftdMedium = calcFullTargetDir(key4, SECTION);
            ftdSmall = calcFullTargetDir(key4, SECTION + '_small');
            // public/images/Tools_large/img/MLetters (first 2 letters of machine name)

            [ftdLarge, ftdMedium, ftdSmall].forEach(
                mDir => {
                    let fullPath = path.normalize(dir + "/public/" + mDir);
                    if (!fs.existsSync(fullPath)) {
                        fs.mkdirSync(fullPath);
                    }
                }
            );

            // transaction ??console.log("files count " + numberOfFiles);
            let promise = db.collection("images").findOneAndUpdate(
                query, {
                    "$inc": {
                        "nextNum": numberOfFiles
                    }
                });
            promise.then(
                (doc) => {
                    processUploads(
                        key4,
                        doc.value._id,
                        calcFullTargetBaseFileName(key4, turret, position, spindle, offset),
                        doc.value.nextNum,
                        numberOfFiles,
                        myFiles, [ftdLarge, ftdMedium, ftdSmall],
                        dir,
                        res);
                    //console.log("nextNum " + nextNum);
                },
                (err) => console.error(err)
            );



        });

    });

    app.post('/imagefiles', (req, res) => {
        let rq = req.body;
        let myPromise = db.collection("images").aggregate([{
                $match: {
                    "key4": rq.key4,
                    "turret": parseInt(rq.turret),
                    "position": parseInt(rq.position),
                    "spindle": parseInt(rq.spindle),
                    "offset": parseInt(rq.offset),
                    "tab": rq.tab
                }
            },
            {
                $project: {
                    "files": {
                        $filter: {
                            input: "$files",
                            as: "fileref",
                            cond: {
                                $eq: ["$$fileref.archived", false]
                            }
                        }
                    },
                    _id: 0
                }
            },
            {
                $unwind: {
                    path: "$files"
                }
            },
            {
                $project: {
                    "files.filename": 1
                }
            }
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
                "nextNum": 1
            };
            db.collection('images').insert(doc).then(
                () => res.json({
                    'status': true
                }),
                failure => res.json({
                    'status': false,
                    'error': failure
                })
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
                $set: {
                    "function": rq.function,
                    "type": rq.type
                }
            };

            db.collection('images').findOneAndUpdate(
                doc,
                update, {
                    "upsert": false, // if cannot find, do not create a new document
                    "returnNewDocument": true // return new doc
                }
            ).then(
                success => {
                    res.json({
                        'status': true,
                        'result': success
                    });
                },
                failure => {
                    res.json({
                        'status': false,
                        'result': failure
                    });
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
                res.json({
                    "status": true,
                    "result": result
                });
            },
            err => {
                res.json({
                    "status": false,
                    "result": err
                });
            }
        );
    });

};