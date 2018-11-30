"use strict";
/* globals Common, Util */
// upload.js

/* //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// WARNING - concurrency -- adding files to Tools for a job needs to be made to allow multiple users to update in parallel !!!
Currently - a single user effectively holds onto the entire tols file set during this page's lifetime. No check on that.
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////// */

const SECTION = "Tools";

// var debug = false;

// function debugLog(text) {
//     if (debug) {
//         console.log(text);
//     }
// }
const common = new Common();
const key4id = common.getKey4id();

const FTEDIT_PAGE = '/tabs/ftedits.html';
$(function () {


    $("#spin").hide();


    // alert(key4id);

    function getSheetTagsFiles(common, tab) {
        //debugLog("getSheetTagsFiles");
        let keyObj = common.getParsedCookie();
        return new Promise((resolve, reject) => {
            $.ajax({
                    url: "/sheetTags",
                    type: 'post',
                    data: {
                        "key": keyObj,
                        "tab": tab,
                        "files": true // **do** retrieve files/images list
                    },
                    dataType: 'json'
                })
                .done(
                    result => {
                        resolve(result);
                    })
                .fail((request, status, error) => reject(error));
        });
    }
    // debugLog("running upload");


    ////////////////////////////////////////////////////////////

    let key5 = common.getParsedCookie();
    $("#job").text(
        [
            key5.partId, key5.pName, key5.dept, key5.op, key5.machine
        ].join(" : ")
    );
    f_t_edits(true); // edit button disabled
    Util.getMachineSpec(common.getParsedCookie().machine)
        .then(
            machineSpecs => {
                getSheetTagsFiles(common, SECTION).then(
                    toolData => {
                        paintPage(machineSpecs, toolData);
                        $("#progress").hide();

                    });
            });
    ////////////////////////////////////////////////////////////
});

function f_t_edits(state) {
    $('#edit_func_type').prop('disabled', state); // enable/disable edits
}

function paintPage(machineSpecs, toolData) {
    let table = $('<table class="inputTable" id="setup"/>');
    table.append($('<tr id="eftrow"><td/><td/><td colspan="2">' +
        '<button id="edit_func_type">Edit Functions and Types</button>' +
        '</td><td colspan="2"><div id="progress">/div><td/></tr>'));
    let tr = $('<tr class="colnames"/>');
    let action = '&nbsp;'.repeat(30) + 'Action' + '&nbsp;'.repeat(30);
    let columns = [ // title and class
        ["Position<br/>#", "pCol"],
        ["Offset<br/>#", "oCol"],
        ["Function", "fCol"],
        ["Type", "tCol"],
        ["# Images", "iCol"],
        [action, "aCol"]
    ];
    columns.forEach(head => {
        tr.append($('<th ' + 'class="' + head[1] + '"/>"').html(head[0]));
    });

    table.append(tr);

    let haves = {}; // lookup for turret-position-spindle-offset
    toolData.forEach(tDoc => {
        haves[
            [
                tDoc.turret,
                tDoc.position,
                tDoc.spindle,
                tDoc.offset
            ].join('_')
        ] = tDoc;
    });

    ["Turret1", "Turret2"].forEach(turretStr => {
        if (machineSpecs[turretStr] !== undefined) {
            doRows(machineSpecs, turretStr, "Spindle1", table, haves);
            if (machineSpecs[turretStr].Spindle2 !== undefined) {
                doRows(machineSpecs, turretStr, "Spindle2", table, haves);
            }
        }
    });
    $("content").append(table);
    $('#edit_func_type').on('click',
        () => {
            window.location = FTEDIT_PAGE;
        }
    );


    function groupSeparator(table) {
        let tr = $('<tr class="sep"/>');

        tr.append($('<td class="digit"/>')).append($('<td class="digit"/>'));
        tr.append($('<td/>'), $('<td/>'), $('<td/>'), $('<td/>'));
        table.append(tr);
    }

    function doRows(specs, turretStr, spindleStr, table, haves) {

        //debugLog([turretStr, spindleStr].join(" : "));
        groupSeparator(table);
        let tr = $('<tr class="greyrow"/>');
        tr.append($('<th class="digit"/>').text(turretStr));
        tr.append($('<th class="digit"/>').text(spindleStr));
        for (var i = 0; i < 3; i++) {
            tr.append($('<td />'));
        }
        let td = $('<td />');

        tr.append(td);
        table.append(tr);

        tr = $("<tr/>");
        let lowT = specs[turretStr].range[0];
        let highT = specs[turretStr].range[1];
        let lowS = specs[turretStr][spindleStr][0];
        let numT = Util.numsOf(turretStr);
        let numS = Util.numsOf(spindleStr);
        for (var t = lowT, s = lowS; t <= highT; t++, s++) {
            let link = [numT, t, numS, s].join("_");

            let trClass = "spaced";

            let tr = $('<tr class="' + trClass + '"/>');
            tr.attr("id", [
                [turretStr, t, spindleStr, s].join("_")
            ]);

            // Turret
            let td = $('<td class="digit"/>');
            td.text(t);
            tr.append(td);

            // Spindle
            td = $('<td class="digit"/>');
            td.text(s);
            tr.append(td);
            let tData;
            if (haves[link] !== undefined) {
                tData = haves[link]; // from db
                tr.attr("saved", "1");
            } else {
                tData = { // no data in db
                    "function": "N/A",
                    "type": "N/A",
                    "files": [],
                    "turret": parseInt(numT),
                    "position": t,
                    "spindle": parseInt(numS),
                    "offset": s
                };
            }

            // Files Uploading Actuator
            let u_input = $('<input class="fileUpload" type="file" name="uploads[]" accept="image/jpg" multiple/>');

            u_input.attr("id", idStr(link, "upload"));

            // Function Name
            td = $('<td />');

            if ((tData.function !== "N/A")) {

                let f_input = $('<input class="finput" name="function" type="text"/>');
                f_input.attr("id", idStr(link, "function"));
                f_input.val(tData.function);
                f_input.removeClass("noval");
                f_input.prop('disabled', true);
                f_t_edits(false);
                td.append(f_input);
            } else {
                u_input.hide();
            }

            tr.append(td);

            // Type Name
            td = $('<td />');

            if ((tData.type !== "N/A")) {
                let t_input = $('<input class="tinput" name="type" type="text"/>');
                t_input.attr("id", idStr(link, "type"));
                t_input.val(tData.type);
                t_input.removeClass("noval");
                t_input.prop('disabled', true);
                f_t_edits(false);
                td.append(t_input);
            } else {
                u_input.hide();
            }

            tr.append(td);

            // Number of existing Images
            tr.append($('<td/>').attr("id", idStr(link, "count")).text(tData.files.length));

            // Last columns has two buttons. Only one shows at a time.
            // Button to save document without files, thus keeping function and type
            var buttonTd = $('<td class="bcolumn"/>');
            buttonTd.attr("id", idStr(link, "buttons"));

            buttonTd.append(u_input);
            tr.append(buttonTd);
            table.append(tr);

        }
    }


    let polling;

    function checkProgress(iid) {
        // console.log("checkprogress " + iid);

        $.get({
                url: "/get_progress/" + iid,
                dataType: 'json'
            })
            .done(
                result => {
                    if (result !== null && result.progress !== undefined) {
                        let percent = Math.floor(result.progress * 100 / result.total) + "%";
                        $('#progress').css('background', 'tan').text("Processing...  " + percent);
                        if (result.progress === result.total) {

                            clearInterval(polling);

                            // remove tracking tuple
                            $.get({
                                    url: "/clear_progress/" + iid,
                                    dataType: 'json'
                                })
                                .fail(() => {
                                    //lert("checkProgress/clear failure: " + error);
                                });
                        }
                    }
                })
            .fail((request, status, error) => {
                alert("checkProgress failure: " + error);
            });
    }

    function uploadProgressHandler(event) {
        let progress = Math.ceil(event.loaded * 100.0 / event.total) + '%';
        if (event.loaded === event.total) {

            $('#progress').css('background', '#33B8FF').html("Uploading:&nbsp;Complete");
            setTimeout(() => {
                $('#progress').html("Now Processing Images");
                checkProgress(key4id);
                polling = setInterval(checkProgress, 500, key4id);
            }, 700);

        } else {
            $('#progress').css('background', '#33FF68').html("Uploading:&nbsp;" + progress);
        }
    }

    function loadHandler( /*event*/ ) {
        console.log("loaded");
    }

    function errorHandler( /*event*/ ) {
        console.log("failed");
    }

    function abortHandler( /*event*/ ) {
        console.log("aborted");
    }


    function fileUpload() {
        
        let cell = $(this).parent();

        $('#spin').show();
        $('#edit_func_type').hide();
        $('#progress').show().text('');

        let id = $(this).attr("id");

        var idFields = id.split("_");

        var func = $("#" + idStr(idFields, "function")).val();
        var type = $("#" + idStr(idFields, "type")).val();
        var button, turret, position, spindle, offset;
        [button, turret, position, spindle, offset] = idFields;

        var tab = SECTION;

        var files = $(this).get(0).files;

        if (files.length > 0) {
            // create a FormData object which will be sent as the data payload in the
            // AJAX request
            var formData = new FormData();
            // add data used to put images in database
            formData.append("func", func);
            formData.append("type", type);
            formData.append("key4", JSON.stringify(common.getKey4())); // from cookie
            formData.append("tab", tab);

            formData.append("turret", turret);
            formData.append("position", position);
            formData.append("spindle", spindle);
            formData.append("offset", offset);

            // loop through all the selected files and add them to the formData object
            for (var i = 0; i < files.length; i++) {
                // add the files to formData object for the data payload
                formData.append('uploads[]', files[i], files[i].name);
            }
            disableActionsNow();

            $(".bcolumn > *").toggleClass("hidebuttons");
            $(cell).toggleClass("stripes");
            let countField = '#' + idStr(idFields, "count");
            $(countField).addClass("stripes");


            new Promise((resolve, reject) => {
                $.ajax({
                        url: "/upload",
                        type: 'post',
                        data: formData,
                        processData: false,
                        contentType: false,
                        xhr: () => {
                            let xhr = new window.XMLHttpRequest();
                            xhr.upload.addEventListener("progress",
                                uploadProgressHandler, false);
                            xhr.upload.addEventListener("load",
                                loadHandler, false);
                            xhr.upload.addEventListener("error",
                                errorHandler, false);
                            xhr.upload.addEventListener("abort",
                                abortHandler, false);
                            return xhr;
                        }
                    })
                    .done(
                        result => {
                            resolve(result);
                        })
                    .fail((request, status, error) => {
                        reject(error);
                    });
            }).then(
                success => {



                    $(".bcolumn > *").toggleClass("hidebuttons");
                    $(cell).toggleClass("stripes");

                    enableActionsNow();
                    $(countField).removeClass("stripes");
                    $("#spin").hide();
                    $(countField).text(parseInt($(countField).text()) + success.count);

                    $('#progress').text('Processing... 100%').fadeOut('slow');
                    //$('#progress').delay(1000);
                    $('#edit_func_type').show();
                },
                error => {
                    $(countField).removeClass("stripes");
                    $(".bcolumn > *").toggleClass("hidebuttons");
                    $('#progress').hide();
                    $('#edit_func_type').show();

                    $(cell).toggleClass("stripes");
                    $("#spin").hide();
                    enableActionsNow();
                    alert("Error: " + error);
                }
            );

        }
        return;
    }


    function idStr(idFields, tag) {
        // returns input element id for a given turret, spindle, tnum, snum, and type(tag)
        let arr;
        if (Util.isString(idFields)) {
            arr = idFields.split('_');
        } else {
            arr = idFields.slice();
        }

        if (arr.length === 5) {
            arr.shift();
        }

        arr[0] = arr[0].replace(/^Turret|^Spindle/, '');
        arr[2] = arr[2].replace(/^Turret|^Spindle/, '');
        return tag + '_' + arr.join("_");
    }

    const dList = ".fileUpload, .savebutton";

    function disableActionsNow() {
        $(dList).css("pointer-events", "none");
    }

    function enableActionsNow() {
        $(dList).css("pointer-events", "auto");
    }



    $('.fileUpload').on('change', fileUpload);
}