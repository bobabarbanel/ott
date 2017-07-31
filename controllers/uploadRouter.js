"use strict";
const assert = require('assert');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
var enfs = require("enfsmove");

const uploadDir = "uploadedImages"; // place to which images are uploaded
const SECTION = "Tools";
const debug = true;
function debugLog(text) {
    if (debug) { console.log(text); }
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



//console.log("uploadRouter loaded");
module.exports = function (dir, app, db) {
    const targetHeadString = "/images"; // needs section and more

    function calcFullTargetDir(key4, section) {
        // Directory path determined using first+second letter of Machine name,
        // and fixed targetHeadString. Has leading "public/".
        debugLog("calcFullTargetDir key4 " + JSON.stringify(key4));
        var machine = key4.machine.substring(0, 2);
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
        var s = "000000000000" + num;
        return s.substr(s.length - 3);
    }
    //debugLog("files functions defined");
    app.use(express.static(path.join(dir, '/public')));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    app.post('/movefile/', (req, res) => {
        let key4 = req.body.key4;
        let fileName = req.body.filename;
        debugLog("movefile " + fileName);
        let tail = fileName.substring(fileName.lastIndexOf("."));

        let position = (typeof req.body.position === "string")
            ? parseInt(req.body.position) : req.body.position;
        let offset = (typeof req.body.offset === "string")
            ? parseInt(req.body.offset) : req.body.offset;
        let from = path.normalize(dir + "/" + uploadDir + "/" + fileName);

        let ftd = calcFullTargetDir(key4, SECTION);

        debugLog("ftd " + ftd);
        // public/images/Tools/img/MLetter (first letter of machine name)
        let fullPath = path.normalize(dir + "/" + ftd);
        if (fs.existsSync(fullPath)) {
            debugLog("dir exists: " + fullPath);
        } else {
            debugLog("dir NOT exists creating: " + fullPath);
            fs.mkdirsSync(fullPath);
        }

        // [public/images/Tools/img/MLetter/Lathe_A251A4802-1_30_LC40-2A_10_10.jpg,
        //  Lathe_A251A4802-1_30_LC40-2A_10_10.jpg] 
        let base = calcFullTargetBaseFileName(key4, position, offset);
        let ffn = base + "_" + pad3(1) + tail;
        debugLog("ffn " + ffn);

        var to = path.normalize(addWebSitePublic(dir, ftd, ffn));
        debugLog("movefile to " + to);
        // does the target file already exist with default name?
        let addOn = 2;
        while (fs.existsSync(to)) { // while file 'to' exists
            //debugLog("using base " + base);
            //debugLog("exists ... rename loop " + addOn);
            // add _002 etc as needed
            ffn = base + "_" + pad3(addOn++, 3) + tail;
            to = path.normalize(addWebSitePublic(dir, ftd, ffn));
            //debugLog("try movefile to " + to);
        }

        debugLog("*** final new movefile to " + to);
        debugLog("*** last exists check " + fs.existsSync(to));

        enfs.moveSync(from, to);

        let query = {
            "key4": [key4.dept, key4.partId, key4.op, key4.machine].join("|"),
            "tab": "Tools",
            "position": position,
            "offset": offset
        };
        let updates = {
            $set: {
                "function": req.body.function,
                "type": req.body.type
            },
            $push: { "files": fileRef(ftd, ffn) }
        };
        let options = { "upsert": true, "returnNewDocument": true };
        debugLog("doing findOneAndUpdate");
        db.collection("images").findOneAndUpdate(
            query, updates, options,
            function (err, doc) {
                assert.equal(err, null);
                if (doc !== null) {
                    console.log(doc);
                    res.json(doc);
                }
            }
        );
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
};
