"use strict";
/* globals Common, Util */
// one.js

const SECTION = 'Tools';

$(function () {
    
    ////////////////////////////////////////////////////////////
    let common = new Common();
    var key5 = common.getParsedCookie();
    var title = "Setup " + key5.partId;
    $("title").text(title);

    Util.setThisTab(1);

    $("#job").text(
        [
            key5.partId, key5.pName, key5.dept, key5.op, key5.machine
        ].join(" : ")
    );
    $(".floatButton").hide();
    $("#tab-menu-trigger").on('click',
        () => $("#topbar-menu").show()
    );
    Util.getMachineSpec(key5.machine)
        .then(machineSpecs => {
            Util.getSheetTags(common.getParsedCookie(), SECTION).then((toolData) => {
                paintPage(machineSpecs, toolData);
            });
        });
    ////////////////////////////////////////////////////////////
});



function genLinkObj(tDoc) {
    return [tDoc.turret, tDoc.position, tDoc.spindle, tDoc.offset].join('_');
}

function genLinkList(aList) {
    return aList.join('_');
}

function paintPage(machineSpecs, toolData) {
    let table = $('<table id="setup"/>');
    let tr = $('<tr class="colnames"/>');
    ["", "Position<br/>#", "Offset<br/>#", "Function", "Type"]
    .forEach((head) => tr.append($("<th/>").html(head)));
    table.append(tr);

    let haves = {}; // lookup for position-offset pairs
    toolData.forEach(tDoc => {
        haves[genLinkObj(tDoc)] = tDoc;
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
}

function doRows(specs, turret, spindle, table, haves) {
    let tr = $('<tr class="greyrow"/>');
    tr.append("$<td/>");
    tr.append($('<th/>').text(turret));
    tr.append($('<th/>').text(spindle));
    tr.append("$<td/>");
    tr.append("$<td/>");
    table.append(tr);

    tr = $("<tr/>");
    let lowT = specs[turret].range[0];
    let highT = specs[turret].range[1];
    let lowS = specs[turret][spindle][0];
    //let highS = specs[turret][spindle][1];
    for (var t = lowT, s = lowS; t <= highT; t++, s++) {
        var link = genLinkList([Util.numsOf(turret), t, Util.numsOf(spindle), s]);
        //console.log("link: " + link);
        let trClass = (haves[link] !== undefined) ? "slightgrey" : "nogrey";

        let tr = $('<tr class="' + trClass + '"/>');
        var td = $('<td class="left"/>');
        if (haves[link] !== undefined) {
            // white circle symbol in first column
            var a = '<a target="_blank" href="/tabs/2.html#' + link + '">' + "&#9675;" + '</a>';
            td.html(a);
        }

        tr.append(td);

        td = $('<td class="digit"/>');
        td.text(t);
        tr.append(td);

        td = $('<td class="digit"/>');
        td.text(s);
        tr.append(td);
        var tData;
        if (haves[link] !== undefined) {
            tData = haves[link];
        } else {
            tData = {
                "function": "N/A",
                "type": "N/A"
            };
        }
        td = $('<td/>');
        td.text(tData.function);
        tr.append(td);

        td = $('<td/>');
        td.text(tData.type);
        tr.append(td);

        table.append(tr);
    }
}

// function getSheetTags(keyObj, tab) {
   
//     return new Promise((resolve, reject) => {
//         $.ajax({
//                 url: "/sheetTags",
//                 type: 'post',
//                 data: {
//                     "key": keyObj,
//                     "tab": tab,
//                     "files": false // do not retrieve files/images list
//                 },
//                 dataType: 'json'
//             })
//             .done((result) => resolve(result))
//             .fail((request, status, error) => reject(error));
//     });
// }