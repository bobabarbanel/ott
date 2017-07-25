//fileinput3.js

$(function () {
    var debug = true;
    function debugLog(text) {
        if (debug) console.log(text);
    }

    $("#fileupload").on('change', function () {
        if ($("#fileupload")[0].files !== undefined) {
            debugLog("change files ");
            var fl = $("#fileupload")[0].files.length;
            var files = $("#fileupload")[0].files;
            var i = 0;
            var fnameList = [];
            while (i < fl) {
                // localize file var in the loop
                var file = files[i];
                debugLog("\t" + file.name);
                fnameList.push(file.name);
                i++;
            }
            debugLog("################### # of files " + fl);
            fnameList.forEach((fname) => {
                debugLog("calling doMove1\t" + fname);

                doMove1(fname).then(
                    (result) => { console.log("change files moved " + JSON.stringify(result)) },
                    (err) => { console.log("change error: " + err.error) }
                );
            });
        }
    });

    function doMove1(fname) {
        debugLog("doMove files ajax " + fname);
        var jQueryPromise = $.ajax({
            url: "/move1",
            type: 'put',
            data: { "fname": fname },
            dataType: 'json'
        });
        var realPromise = new Promise(function (fulfill, reject) {
            jQueryPromise.then(fulfill, reject);
        });
        return realPromise;
        // .done((result) => {
        //     debugLog("doMove1 success "+JSON.stringify(result));
        //     resolve(result);
        // })
        // .fail((request, status, error) => {
        //     debugLog("doMove1 failure "+JSON.stringify(error));
        //     reject(error);
        // })
        // .always(() => { console.log("doMove1 ajax always"); })
    }

    function doMove(files) {
        debugLog("doMove files ");
        var fl = files.length;
        var i = 0;
        var nameList = { "files": [] };
        while (i < fl) {
            // localize file var in the loop
            var file = files[i];
            debugLog("\t" + file.name);
            nameList.files.push(file.name);
            i++;
        }

        debugLog("doMove files ajax");
        return $.ajax({
            url: "/move2",
            type: 'post',
            data: nameList,
            dataType: 'json'
        })
            .done((result) => {
                debugLog("doMove success " + JSON.stringify(result));
                resolve(result);
            })
            .fail((request, status, error) => {
                debugLog("doMove failure " + JSON.stringify(error));
                reject(error);
            })
            .always(() => { console.log("doMove ajax always"); })

    }
});