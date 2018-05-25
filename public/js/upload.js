"use strict";
// upload.js
const COOKIE = 'chosenCookie';
var cookieValue = "not set";
var key4;
const SECTION = "Tools";

var debug = false;

function debugLog(text) {
    if (debug) {
        console.log(text);
    }
}

$(function () {
    $("#progress").hide();
    $("#spin").hide();
    $('#edit_func_type').on('click',
        () => window.location = './ftedits.html'
    );

    function f_t_edits(state) {
        $('#edit_func_type').prop('disabled', state); // enable/disable edits
    }

    function getSheetTagsFiles(tab) {
        //debugLog("getSheetTagsFiles");
        let key = JSON.parse(getCookie());
        return new Promise((resolve, reject) => {
            $.ajax({
                    url: "/sheetTags",
                    type: 'post',
                    data: {
                        "key": key,
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
    debugLog("running upload");
    $.getScript("/js/common.js")
        .done(function ( /*script, textStatus*/ ) {

            ////////////////////////////////////////////////////////////
            cookieValue = unescape(readCookie(COOKIE));
            key4 = getKey4();
            debugLog("upload.js key4 being set " + JSON.stringify(key4));
            //debugLog("upload Cookie: " + getCookie());

            var key5 = getParsedCookie();
            $("#job").text(
                [
                    key5.partId, key5.pName, key5.dept, key5.op, key5.machine
                ].join(" : ")
            );
            f_t_edits(true); // start disabled
            getSpec(getParsedCookie().machine)
                .then(machineSpecs => {
                    getSheetTagsFiles(SECTION).then(toolData => {
                        paintPage(machineSpecs, toolData);
                    });
                });


            ////////////////////////////////////////////////////////////
        })
        .fail(function ( /*jqxhr, settings, exception*/ ) {
            debugLog("getScript " + "Triggered ajaxError handler.");
        });


    function
    paintPage(machineSpecs, toolData) {
        let table = $('<table class="inputTable" id="setup"/>');
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


        // $('.hidehover').hover(
        //     () => $('div#pop-up').hide()
        // );


        // $('.hoverme').hover(
        //     () => {
        //         // get current count
        //         // else generate list of files
        //         let idFields = $(this).attr("id").split("_");
        //         idFields.shift();

        //         let id = '#' + idStr(idFields, "count");
        //         //debugLog(id);
        //         var num = $(id).text();
        //         let div = $('div#pop-up');
        //         if (num !== "0") {
        //             getFileNames(SECTION, idFields).then(
        //                 fileList => {
        //                     debugLog(fileList);
        //                     div.empty().html(
        //                         "Position " + idFields[1] +
        //                         ", Offset " + idFields[3] +
        //                         " &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(" +
        //                         num + " image" +
        //                         ((num === '1') ? '' : 's') + ')');

        //                     fileList.sort().forEach(fileName => {
        //                         div.append($("<br/>"))
        //                             .append($('<span class="popup"/>')
        //                                 .text(fileName));
        //                     });

        //                 }
        //             );
        //             setTimeout(function () {
        //                 $('div#pop-up').fadeIn(500);
        //             }, 500);
        //         }
        //     },
        //     () => {
        //         $('div#pop-up').hide();
        //     }
        // );
        // $('.hoverme').mousemove((e) => {
        //     // shift popup to avoid mouse
        //     let moveLeft = -300;
        //     let moveDown = 10;
        //     $("div#pop-up")
        //         .css('top', e.pageY + moveDown)
        //         .css('left', e.pageX + moveLeft);
        // });


        function groupSeparator(table) {
            let tr = $('<tr class="sep"/>');

            tr.append($('<td class="digit"/>')).append($('<td class="digit"/>'));

            for (var i = 0; i < 4; i++) {
                tr.append($('<td/>'));
            }

            table.append(tr);
        }

        function doRows(specs, turretStr, spindleStr, table, haves) {

            debugLog([turretStr, spindleStr].join(" : "));
            groupSeparator(table);
            let tr = $('<tr class="greyrow"/>');
            tr.append($('<th class="digit hidehover"/>').text(turretStr));
            tr.append($('<th class="digit hidehover"/>').text(spindleStr));
            for (var i = 0; i < 3; i++) {
                tr.append($('<td class="hidehover"/>'));
            }
            // add progress bar in this header row for last column
            let td = $('<td class="hidehover"/>');

            tr.append(td);
            table.append(tr);

            tr = $("<tr/>");
            let lowT = specs[turretStr].range[0];
            let highT = specs[turretStr].range[1];
            let lowS = specs[turretStr][spindleStr][0];
            let numT = numsOf(turretStr);
            let numS = numsOf(spindleStr);
            for (var t = lowT, s = lowS; t <= highT; t++, s++) {
                let link = [numT, t, numS, s].join("_");

                let trClass = "spaced";

                let tr = $('<tr class="' + trClass + '"/>');
                tr.attr("id", [
                    [turretStr, t, spindleStr, s].join("_")
                ]);

                // Turret
                let td = $('<td class="digit hidehover"/>');
                td.text(t);
                tr.append(td);

                // Spindle
                td = $('<td class="digit hidehover"/>');
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
                let u_input = $('<input class="fileUpload" ' +
                    'type="file" name="uploads[]" multiple/>');

                u_input.attr("id", idStr(link, "upload"));

                // Function Name
                td = $('<td class="hidehover"/>');

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
                td = $('<td class="hidehover"/>');

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
                td = $('<td class="hoverme"/>');
                td.attr("id", idStr(link, "count"));
                td.text(tData.files.length);
                tr.append(td);

                // Last columns has two buttons. Only one shows at a time.
                // Button to save document without files, thus keeping function and type
                var buttonTd = $('<td class="hidehover bcolumn"/>');
                buttonTd.attr("id", idStr(link, "buttons"));

                buttonTd.append(u_input);
                tr.append(buttonTd);

                //adjustUI(tr, u_input);

                table.append(tr);
            }
        }



        // function adjustUI(tr, uI) {
        //     if (fI.val() === '' || tI.val() === '') {
        //         uI.hide();
        //     } else {
        //         if (tr.attr('saved') === "1") {
        //             uI.show();
        //         }
        //     }
        // }

        // create image document, initially empty for files
        function saveContainer(rowID, tab) {
            let idFields = rowID.split('_');
            let turret = numsOf(idFields[0]);
            let position = idFields[1];
            let spindle = numsOf(idFields[2]);
            let offset = idFields[3];
            let funct = $('#' + idStr(idFields, "function")).val();
            let type = $('#' + idStr(idFields, "type")).val();

            return new Promise((resolve, reject) => {
                $.ajax({
                        url: "/create_container",
                        type: 'post',
                        data: {
                            "key4": getKey4id(),
                            "tab": tab,
                            "function": funct,
                            "type": type,
                            "turret": turret,
                            "position": position,
                            "spindle": spindle,
                            "offset": offset
                        }

                    }).done(
                        result => {
                            //console.log(JSON.stringify(result));
                            resolve(result);
                        })
                    .fail((request, status, error) => reject(error));
            });
        }

        function uploadProgressHandler(event) {
            // console.log(event.loaded + "/" + event.total);
            let percent = (event.loaded / event.total) * 100.0;
            let progress = Math.ceil(percent) + '%';
            if (progress === "100%") {
                $('.percent').text("Processing Images");
            } else {
                $('.percent').html("Upload:&nbsp;" + progress);
            }

            $('#progress_bar').css('width', progress);

        }

        function loadHandler(event) {
            // console.log("loaded");
            // $('#progress').hide();
            // $('#progress_bar').css('width', "0%");


            // $("#spin").hide();
        }

        function errorHandler(event) {
            console.log("failed");
        }

        function abortHandler(event) {
            console.log("aborted");
        }

        // function monitorProgress(id) {
        //     return new Promise((resolve, reject) => {
        //         $.get({
        //             url: '/progress/' + id,
        //             dataType: 'json'
        //             /*,
        //                             async: false*/
        //         }).then(
        //             success => {
        //                 console.log("progress: " + JSON.stringify(success));
        //                 let percent = Math.ceil(success.progress*100.0/success.total);
        //                 console.log("% " + percent);
        //                 $('.percent').text(percent + "%");
        //                 if (success.finished) {
        //                     console.log("stop progress");
        //                 }
        //                 resolve(success);
        //             },
        //             error => {
        //                 alert("monitor progress error " + JSON.stringify(success));
        //                 //monitor = false;
        //                 reject(success);
        //             }
        //         );
        //     });
        // }



        // let watch = {};

        function fileUpload() {
            let cell = $(this).parent();
            $("#progress").show();
            // $("#spin").show();
            $("div#pop-up").hide();
            let id = $(this).attr("id")
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
                formData.append("key4", JSON.stringify(key4)); // from cookie
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
                // let tick = 1;
                // let clock = setInterval(() => {
                //     $('.percent').text(tick);
                // }, 1000);

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
                                // clearInterval(clock);
                                resolve(result);
                            })
                        .fail((request, status, error) => {
                            // clearInterval(clock);
                            reject(error);
                        });
                }).then(
                    success => {
                        //clearInterval(progress_checker);
                        // $('#progress_border').hide();
                        $('#progress').hide();
                        $('#progress_bar').css('width', "0%");
                        $(".bcolumn > *").toggleClass("hidebuttons");
                        $(cell).toggleClass("stripes");
                        //$(".bcolumn").css("visibility", "visible");
                        enableActionsNow();
                        //let id = '#' + idStr(idFields, "count");
                        $(countField).removeClass("stripes");
                        $(countField).text(parseInt($(countField).text()) + success.count);
                    },
                    error => {
                        // clearInterval(progress_checker);
                        // $('#progress').hide();
                        $(countField).removeClass("stripes");
                        // $("#progress").hide();
                        $(".bcolumn > *").toggleClass("hidebuttons");
                        $('#progress').hide();
                        $('#progress_bar').css('width', "0%");
                        $(cell).toggleClass("stripes");
                        //$(".bcolumn").css("visibility", "visible");
                        enableActionsNow();
                        alert("Error: " + error);
                    }
                );
                // rma test

                // watch[id] = {
                //     "count": 0
                // };
                // watch[id]["interval"] = setInterval(() => {
                //     monitorProgress(id).then(
                //         (monitor) => {
                //             console.log("monitor " + JSON.stringify(monitor));
                //             if (monitor === false) {
                //                 console.log("done watching: error");
                //                 clearInterval(watch[id]["interval"]);
                //             }
                //             if (monitor.finished) {
                //                 console.log("done watching: success");
                //                 clearInterval(watch[id]["interval"]);
                //             } else {
                //                 console.log("still watching " + watch[id]["count"]++);
                //             }
                //         }
                //     )

                // }, 1000);
            }
            return;
        }

        $('.fileUpload').on('change', fileUpload);

        // function setPbar(percentage) {
        //     // alert(percentage);
        //     // $('#progress_bar').css('width',(50 * percentage) + 'px');
        // }
        function idStr(idFields, tag) {
            // returns input element id for a given turret, spindle, tnum, snum, and type(tag)
            let arr;
            if (isString(idFields)) {
                arr = idFields.split('_');
            } else {
                arr = idFields.slice();
            }

            if (arr.length === 5) {
                arr.shift();
            }
            // if (arr.length !== 4) {
            //     debugger;
            // }
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



        function getFileNames(tab, idFields) {
            // idFields has 4 numbers: turret,position, spindle, offset

            return new Promise((resolve, reject) => {
                $.ajax({
                        url: "/imagefiles",
                        type: 'post',
                        data: {
                            "key4": getKey4id(),
                            "tab": tab,
                            "turret": idFields[0],
                            "position": idFields[1],
                            "spindle": idFields[2],
                            "offset": idFields[3]
                        },
                        dataType: 'json'
                    })
                    .done((result) => {
                        debugLog("getFileNames " + result);
                        resolve(result);
                    })
                    .fail((request, status, error) => reject(error));
            });
        }

    }
});