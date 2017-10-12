"use strict";
/*exported  calcFullTargetDir, calcFullTargetPath*/
// files.js
module.exports = function () {
 
    const targetHeadString = "images"; // needs section and more

    function calcFullTargetDir(key4, section) {
        // Directory path determined using first+second letter of Machine name,
        // and fixed targetHeadString. Has leading "public/".
        var machine = key4.machine.substring(0, 2);
        return ["public" + targetHeadString, section, machine].join("/");
    }
    /*private*/function calcTargetFileName(key4, position, offset, tail) {
        return [key4.partId, key4.op, key4.machine, position, offset].join("_") + tail;
    }
    function calcFullTargetPath(appDir, key4, section, position, offset, tail) {
        let myDir = calcFullTargetDir(key4, section);
        let myFileName = calcTargetFileName(key4, position, offset, tail);
        let myPath = myDir + "/" + myFileName;

        if (fs.existsSync(path.normalize(appDir + "/" + myPath))) {
            // add chars to name until no dup
            return "dup " + myFilename;
        }
        return [myDir, myFileName];
    }
    
};
