"use strict";
// upload.js
const COOKIE = 'chosenCookie';
var cookieValue = "not set";
var key4;
const SECTION = "Tools";

var debug = false;
function debugLog(text) { if (debug) { console.log(text); } }

$(function () {
    //$('.progress-bar').text('0%');
    //$('.progress-bar').width('0%');
    function getSheetTagsFiles(tab) {
        //console.log("getSheetTagsFiles");
        let key = JSON.parse(getCookie());
        return new Promise((resolve, reject) => {
            $.ajax({
                url: "/sheetTags",
                type: 'post',
                data: {
                    "key": key,
                    "tab": tab,
                    "files": 1 // **do** retrieve files/images list
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
        .done(function (/*script, textStatus*/) {

            ////////////////////////////////////////////////////////////
            cookieValue = unescape(readCookie(COOKIE));
            key4 = getKey4();
            debugLog("upload.js key4 being set " + JSON.stringify(key4));
            //console.log("upload Cookie: " + getCookie());
            var title = "Uploads " + getParsedCookie().partId;
            //console.log("title " + title);
            $("title").text(title);

            $("#cookie").text(getCookie()); // trace
            getSpec(getParsedCookie().machine)
                .then(machineSpecs => {
                    getSheetTagsFiles(SECTION).then(toolData => {

                        paintPage(machineSpecs, toolData);
                    });
                });
            ////////////////////////////////////////////////////////////
        })
        .fail(function (/*jqxhr, settings, exception*/) {
            console.log("getScript " + "Triggered ajaxError handler.");
        }
        );


    function paintPage(machineSpecs, toolData) {
        let table = $('<table class="inputTable" id="setup"/>');
        let tr = $('<tr class="colnames"/>');
        ["Position<br/>#", "Offset<br/>#", "Function", "Type", "# Images", "Upload Images"]
            .forEach((head) => tr.append($("<th/>").html(head)));
        table.append(tr);

        let haves = {}; // lookup for position-offset pairs
        toolData.forEach(tDoc => {
            haves[tDoc.position + "-" + tDoc.offset] = tDoc;
        });

        ["Turret1", "Turret2"].forEach((turret) => {
            if (machineSpecs[turret] !== undefined) {
                doRows(machineSpecs, turret, "Spindle1", table, haves);
                if (machineSpecs[turret].Spindle2 !== undefined) {
                    doRows(machineSpecs, turret, "Spindle2", table, haves);
                }

            }
        });
        $("content").append(table);
        $(".tinput").on("input", function () {
            if ($(this).val() !== undefined && $(this).val() !== "") {
                $(this).removeClass("noval");
            }
            if ($(this).data("lastval") !== $(this).val()) {
                $(this).data("lastval", $(this).val());
                if ($(this).val() === "") {
                    $(this).addClass("noval");
                }
                //change action
                let idFields = $(this).attr("id").split("_");

                buttonActivity(idFields[1], idFields[2]);
                //alert($(this).val());
            }

        });

        $('.hidehover').hover(
            () => $('div#pop-up').hide()
        );


        $('.hoverme').hover(
            function () {
                // get current count
                // else generate list of files
                let idFields = $(this).attr("id").split("_");
                //$("#pop-up ul").text("Position "+idFields[1]+", Offset "+idFields[2]);
                let id = '#' + idStr(idFields[1], idFields[2], "count");
                let div = $('div#pop-up');
                if ($(id).text() !== "0") {
                    getFileNames(SECTION, idFields[1], idFields[2]).then(
                        fileList => {

                            div.empty().html(
                                "Position " + idFields[1] +
                                ", Offset " + idFields[2] +
                                " &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(" + $(id).text() + " images)");

                            fileList.sort().forEach(fileName => {
                                div.append($("<br/>"))
                                    .append($('<span class="popup"/>')
                                        .text(fileName));
                            });

                        }
                    );
                    setTimeout(function () {
                        $('div#pop-up').fadeIn(500);
                    }, 500);
                }
            },
            function () {
                $('div#pop-up').hide();
            }
        );
        $('.hoverme').mousemove(function (e) {
            // shift popup to avoid mouse
            let moveLeft = -300;
            let moveDown = 10;
            $("div#pop-up")
                .css('top', e.pageY + moveDown)
                .css('left', e.pageX + moveLeft);
        });


        function groupSeparator(table) {
            let tr = $('<tr class="sep"/>');

            tr.append($('<td class="digit"/>'));
            tr.append($('<td class="digit"/>'));
            for (var i = 0; i < 4; i++) {
                tr.append($('<td/>'));
            }

            table.append(tr);
        }

        function doRows(specs, turret, spindle, table, haves) {
            groupSeparator(table);
            let tr = $('<tr class="greyrow"/>');

            tr.append($('<th class="digit"/>').text(turret));
            tr.append($('<th class="digit"/>').text(spindle));
            for (var i = 0; i < 3; i++) {
                tr.append($('<td/>'));
            }
            // add progress bar in this header row for last column
            let td = $('<td/>').html('<div id="myProgress"><div id="myBar"></div></div>');
            tr.append(td);
            table.append(tr);

            tr = $("<tr/>");
            let lowT = specs[turret].range[0];
            let highT = specs[turret].range[1];
            let lowS = specs[turret][spindle][0];
            for (var t = lowT, s = lowS; t <= highT; t++ , s++) {
                let link = t + "-" + s;
                let trClass = "spaced";

                let tr = $('<tr class="' + trClass + '"/>');

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
                    tData = haves[t + "-" + s];
                } else {
                    tData = { "function": "N/A", "type": "N/A", "files": [] };
                }
                console.log([t, s, tData.files.length]);

                let empty = 0; // count the empty name fields (function and type)

                // Function Name
                td = $('<td class="hidehover"/>');
                let f_input = $('<input class="tinput" name="function" type="text"/>');
                f_input.attr("id", idStr(t, s, "function"));
                if ((tData.function === "N/A")) {
                    f_input.val("");
                    f_input.addClass("noval");
                    empty++;
                } else {
                    f_input.val(tData.function);
                    f_input.removeClass("noval");
                }
                // inputs[idStr(t, s, "function")] = f_input;
                td.append(f_input);
                tr.append(td);

                // Type Name
                td = $('<td class="hidehover"/>');
                let t_input = $('<input class="tinput" name="type" type="text"/>');
                t_input.attr("id", idStr(t, s, "type"));
                if ((tData.type === "N/A")) {
                    t_input.val("");
                    t_input.addClass("noval");
                    empty++;
                } else {
                    t_input.val(tData.type);
                    t_input.removeClass("noval");
                }

                td.append(t_input);
                tr.append(td);

                // Number of existing Images
                td = $('<td class="hoverme"/>');
                td.attr("id", idStr(t, s, "count"));
                td.text(tData.files.length);
                tr.append(td);

                // Files Uploading Actuator
                td = $('<td class="hidehover"/>');
                //let form = $('<form>');
                let u_input = $('<input class="fileUpload" type="file" name="uploads[]" multiple/>');

                u_input.attr("id", idStr(t, s, "upload"));
                //form.append(u_input);
                //form.append($('<input value="' + idStr(t, s, "upload") + '" type="text" name="nums">'));
                //inputs[idStr(t, s, "upload")] = u_input;
                u_input.parent().addClass("disabled"); // disable the td
                u_input.prop("disabled", true);
                td.append(u_input);
                tr.append(td);
                setButton(t_input, f_input, u_input, true);

                tr.append(td);

                table.append(tr);
            }
        }

        $('.fileUpload').on('change', function () {
            //console.log("fileUpload change");
            //$('.progress-bar').text('0%');
            //$('.progress-bar').width('0%');
            $("div#pop-up").hide();
            var idFields = $(this).attr("id").split("_");
            var func = $("#" + idStr(idFields[1], idFields[2], "function")).val();
            var type = $("#" + idStr(idFields[1], idFields[2], "type")).val();
            //console.log("fileupload change " + $(this).attr("id") + " " + func + " " + type);
            var position = idFields[1];
            var offset = idFields[2];
            var tab = SECTION;
            $("#myBar").show().width('0%').text("0%");
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
                formData.append("position", position);
                formData.append("offset", offset);

                // loop through all the selected files and add them to the formData object
                for (var i = 0; i < files.length; i++) {
                    // add the files to formData object for the data payload
                    formData.append('uploads[]', files[i], files[i].name);
                }
                new Promise((resolve, reject) => {
                    $.ajax({
                        url: "/upload",
                        type: 'post',
                        data: formData,
                        processData: false,
                        contentType: false,
                        xhr: () => {
                            // create an XMLHttpRequest
                            var xhr = new XMLHttpRequest();

                            // listen to the 'progress' event
                            xhr.upload.addEventListener('progress', function (e) {

                                if (e.lengthComputable) {
                                    // calculate the percentage of upload completed
                                    var done = e.position || e.loaded,
                                        total = e.totalSize || e.total;
                                    var present = Math.floor(done / total * 100);

                                    // update progress bar with the new percentage
                                    $('#myBar')
                                        .text(present + '%')
                                        .width(present + '%');

                                    // once the upload reaches 100%, set the progress bar text to done
                                    if (present === 100) {
                                        $('#myBar').html('Done');
                                        setTimeout(
                                            () =>
                                                $("#myBar").width('0%').text(""),
                                            3000);
                                    }

                                }


                            }, false);

                            return xhr;

                        }
                    })
                        .done(
                        result => {
                            //console.log("/upload success "+JSON.stringify(result));
                            resolve(result);
                        })
                        .fail((request, status, error) => reject(error))


                }).then(
                    success => {
                        //console.log("/upload then success "+JSON.stringify(success));
                        let id = '#' + idStr(position, offset, "count");

                        $(id).text(parseInt($(id).text()) + success.count);
                    },
                    error => {
                        //console.log("/upload then failure "+error); 
                    }
                    );
            }

            return;
        });

        function buttonActivity(t, s) {
            // enables or disables the upload button depending on values 
            // being present for
            let u_input = $('#' + idStr(t, s, "upload"));
            let f_input = $('#' + idStr(t, s, "function"));
            let t_input = $('#' + idStr(t, s, "type"));
            //console.log(t, s);

            setButton(t_input, f_input, u_input, false);
        }
        function setButton(t_input, f_input, u_input, quiet) {
            // quiet means that td containing upload button will not flash a color
            let f_val = (f_input.val() === undefined) ? "" : f_input.val();
            let t_val = (t_input.val() === undefined) ? "" : t_input.val();

            //console.log("\tf\t" + f_val);
            //console.log("\tt\t" + t_val);
            if (f_val === "" || t_val === "") { // disable
                // disable
                //console.log("\tdisable");
                u_input.parent().removeClass("enabled");
                // u_input.parent().addClass("disabled");
                u_input.prop("disabled", true);
            }

            else {
                // enable
                //console.log("\tenable");
                u_input.prop("disabled", false);
                u_input.parent().removeClass("disabled");
                if (!quiet) {
                    u_input.parent().addClass("enabled");
                    // flash background in <td>
                    setTimeout(function () {
                        u_input.parent().removeClass("enabled");
                    }, 1000);
                }
            }

        }

        function idStr(t, s, tag) {
            // returns input element id for a given turret, spindle, and type
            return [tag, t, s].join("_");
        }



        function getFileNames(tab, position, offset) {
            //console.log("getFileNames " + tab + "," + position + "," + offset);

            return new Promise((resolve, reject) => {
                $.ajax({
                    url: "/imagefiles",
                    type: 'post',
                    data: {
                        "key4": getKey4id(),
                        "tab": tab,
                        "position": position,
                        "offset": offset
                    },
                    dataType: 'json'
                })
                    .done((result) => {
                        //console.log("getFileNames " + result);
                        resolve(result);
                    })
                    .fail((request, status, error) => reject(error));
            });
        }
        function getFileCount(tab, position, offset) {

            return new Promise((resolve, reject) => {
                $.ajax({
                    url: "/countfiles",
                    type: 'post',
                    data: {
                        "key4": getKey4id(),
                        "tab": tab,
                        "position": position,
                        "offset": offset
                    },
                    dataType: 'json'
                })
                    .done(result => {
                        //console.log("getFileCount " + result.path);
                        resolve(result.path);
                    })
                    .fail((request, status, error) => reject(error));
            });
        }
    }
});
