"use strict";
// upload.js
const COOKIE = 'chosenCookie';
var cookieValue = "not set";
//var inputs = {};
//var mySpecs;
$(function () {
    //console.log("running upload");
    $.getScript("/js/common.js")
        .done(function (/*script, textStatus*/) {

            ////////////////////////////////////////////////////////////
            cookieValue = unescape(readCookie(COOKIE));

            //console.log("upload Cookie: " + getCookie());
            var title = "Uploads " + getParsedCookie().partId;
            //console.log("title " + title);
            $("title").text(title);

            $("#cookie").text(getCookie()); // trace
            getSpec(getParsedCookie().machine)
                .then(machineSpecs => {
                    getSheetTagsFiles("Tools").then((toolData) => {
                        paintPage(machineSpecs, toolData);
                    });
                });
            ////////////////////////////////////////////////////////////
        })
        .fail(function (/*jqxhr, settings, exception*/) {
            console.log("getScript " + "Triggered ajaxError handler.");
        });

});


/*
aggregate $group {
_id: { position: "$position", offset: "$offset"}, count: {$sum: {$size: "$files"}}
}
{ 
    "_id" : ObjectId("596163b82fbcdb3f24adf5f7"), 
    "key4" : "Lathe|A251A4802-1|30|LC40-2A", 
    "tab" : "Tools", 
    "function" : "Rough Turn", 
    "type" : "Turning Tool", 
    "position" : NumberInt(1), 
    "offset" : NumberInt(1), 
    "files" : [
        {
            "dir" : "/images/Tools/img", 
            "filename" : "UNADJUSTEDNONRAW_thumb_99c7.jpg", 
            "comment" : "comment 99c7"
        }, 
        {
            "dir" : "/images/Tools/img", 
            "filename" : "UNADJUSTEDNONRAW_thumb_99cd.jpg", 
            "comment" : "comment 99cd"
        }, 
        {
            "dir" : "/images/Tools/img", 
            "filename" : "UNADJUSTEDNONRAW_thumb_999c.jpg", 
            "comment" : "comment 999c"
        }
    ]
}
*/


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
            var idFields = $(this).attr("id").split("_");


            buttonActivity(idFields[1], idFields[2]);
            //alert($(this).val());
        }
    });
}
function groupSeparator(table) {
    let tr = $('<tr class="sep"/>');

    tr.append($('<td class="digit"/>'));
    tr.append($('<td class="digit"/>'));
    tr.append($('<td/>'));
    tr.append($('<td/>'));
    tr.append($('<td/>'));
    tr.append($('<td/>'));
    table.append(tr);
}

function doRows(specs, turret, spindle, table, haves) {
    groupSeparator(table);
    let tr = $('<tr class="greyrow"/>');

    tr.append($('<th class="digit"/>').text(turret));
    tr.append($('<th class="digit"/>').text(spindle));
    tr.append($('<td/>'));
    tr.append($('<td/>'));
    tr.append($('<td/>'));
    tr.append($('<td/>'));
    table.append(tr);

    tr = $("<tr/>");
    let lowT = specs[turret].range[0];
    let highT = specs[turret].range[1];
    let lowS = specs[turret][spindle][0];
    for (var t = lowT, s = lowS; t <= highT; t++ , s++) {
        var link = t + "-" + s;
        let trClass = "spaced";

        let tr = $('<tr class="' + trClass + '"/>');

        // Turret
        let td = $('<td class="digit"/>');
        td.text(t);
        tr.append(td);

        // Spindle
        td = $('<td class="digit"/>');
        td.text(s);
        tr.append(td);
        var tData;
        if (haves[link] !== undefined) {
            tData = haves[t + "-" + s];
        } else {
            tData = { "function": "N/A", "type": "N/A", "files": [] };
        }
        
        var empty = 0;

        // Function Name
        td = $('<td/>');
        var f_input = $('<input class="tinput" name="function" type="text"/>');
        f_input.attr("id", inputStr(t, s, "function"));
        if ((tData.function === "N/A")) {
            f_input.val("");
            f_input.addClass("noval");
            empty++;
        } else {
            f_input.val(tData.function);
            f_input.removeClass("noval");
        }
        // inputs[inputStr(t, s, "function")] = f_input;
        td.append(f_input);
        tr.append(td);

        // Type Name
        td = $('<td/>');
        var t_input = $('<input class="tinput" name="type" type="text"/>');
        t_input.attr("id", inputStr(t, s, "type"));
        if ((tData.type === "N/A")) {
            t_input.val("");
            t_input.addClass("noval");
            empty++;
        } else {
            t_input.val(tData.type);
            t_input.removeClass("noval");
        }
        // inputs[inputStr(t, s, "type")] = t_input;
        td.append(t_input);
        tr.append(td);

        // Number of existing Images
        td = $('<td/>');
        td.text(tData.files.length);
        tr.append(td);

        // Files Uploading Actuator
        td = $('<td/>');
        var u_input = $('<input type="file" name="files[]" multiple/>');

        u_input.attr("id", inputStr(t, s, "upload"));

        // inputs[inputStr(t, s, "upload")] = u_input;
        u_input.parent().addClass("disabled");
        u_input.prop("disabled", true);
        td.append(u_input);
        tr.append(td);
        setButton(t_input, f_input, u_input, true);

        tr.append(td);

        table.append(tr);
    }

}

function buttonActivity(t, s) {
    // enables or disables the upload button depending on values 
    // being present for
    var u_input =         $('#' + inputStr(t, s, "upload"));
    var f_input =         $('#' + inputStr(t, s, "function"));
    var t_input =         $('#' + inputStr(t, s, "type"));
    //console.log(t, s);
    
    setButton(t_input, f_input, u_input, false);
}
function setButton(t_input, f_input, u_input, quiet) {
    // quiet means that td containing upload button will not flash a color
    var f_val = (f_input.val() === undefined) ? "" : f_input.val();
    var t_val = (t_input.val() === undefined) ? "" : t_input.val();

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

function inputStr(t, s, tag) { 
    // returns input element id for a given turret, spindle, and type
    return [tag, t, s].join("_");
}

function getSheetTagsFiles(tab) {
    //console.log("getSheetTagsFiles");
    var key = JSON.parse(getCookie());
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
            .done((result) => resolve(result))
            .fail((request, status, error) => reject(error));
    });
}

