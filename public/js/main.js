"use strict";
/* globals Common, Util */
// main.js :: MAIN Page

window.name = "MAIN";
const COMMON = new Common();
const key4id = COMMON.getKey4id();
const key5 = COMMON.getParsedCookie();

const openMark = '&#9658;';
const closeMark = '&#9660;';
const right_caret = '<span class="caret">' + openMark + '</span>';

$(function () {

    ////////////////////////////////////////////////////////////
    //alert(JSON.stringify(key5,null,4));
    // var title = "Main | Job: <b>" + key5.partId + '</b>';
    $("title").html("Main"); // browser tab title

    Util.setUpTabs(key4id, window.name, {main: true, machine: true, tab: true, spec: true}).then(
        (tabs) => {
            Util.getMachineSpec(key5.machine)
                .then(machineSpecs => {
                    Util.getSheetTags(key5, "Tools").then((toolData) => {
                        paintPage(machineSpecs, toolData, tabs);
                        startUp();
                    });
                });
        }
    );
    ////////////////////////////////////////////////////////////

});

function startUp() {
    // $("#tab-menu-trigger").on('click',
    //     () => $("#topbar-menu").show()
    // );
    $('#navButtonDiv').css('display','none');
    $('.navDropDownButton').on('click',
        () => {
            $('navDropDown').css('display', 'flex');
            return false;
        });

    $('body').on('click', () => {
        $('navDropDown').css('display', 'none');
    });
}

function genLinkObj(tDoc) {
    return [tDoc.turret, tDoc.position, tDoc.spindle, tDoc.offset].join('_');
}

function genLinkList(aList) {
    return aList.join('_');
}

function paintPage(machineSpecs, toolData, tabs) {
    // page header
    let jobTitle = [key5.partId, key5.pName, key5.dept, key5.op, key5.machine].join(" : ");
    $('pageheader').append($(`<h1 class="pageTitle">${window.name}</h1><span class="jobTitle">${jobTitle}</span>`));

    // tools
    toolsTable(machineSpecs, toolData);

    // tabs
    tabsOutline(tabs);
}

/// tools display and response

function toolsTable(machineSpecs, toolData) {
    let aToolDiv = $(`<div class="tooldiv">${right_caret}<h2 class="toollink">Tools</t2></div>`);

    let aToolOuter = $(`<div class="toolouter"></div>`).append(aToolDiv);
    let table = $(`<table class="toolTable">`).hide();
    aToolOuter.append(table);

    aToolDiv.find('.caret').first().on('click', (ev) => {
        let caret = $(ev.target);
        let toolTable = caret.parent().parent().find('.toolTable');
        if (toolTable.css('display') === "none") {
            caret.html(closeMark);
            toolTable.show("slide", {
                direction: "left"
            }, "slow");
        } else {
            caret.html(openMark);
            toolTable.hide("slide", {
                direction: "left"
            }, "slow");
        }
    });

    let tr = $('<tr class="colnames"/>');
    ["", "Position<br/>#", "Offset<br/>#", "Function", "Type"].forEach((head) => tr.append($("<th/>").html(head)));
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
    $("tools").append(aToolOuter);
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
            var a = '<a target="_self" href="/tabs/2.html#' + link + '">' + "&#9675;" + '</a>';
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

/// tabs display and response

function tabsOutline(tabs) {
    // draw outline view of tab content
    if(tabs !== undefined) {
        tabs.forEach(
            (tab, index) => {
                drawMainTab(tab, index);
            }
        );
    }
    

}

function tabs_route(ev) {
    console.log('tabs_route ' + ev.data);
    return false;
}

function drawMainTab(tab, tab_index) {
    let aTabOuter = $(`<div class="tabouter"><div class="tabdiv">${right_caret}<h2 class="tablink">Tab: ${tab.tabName}</h2></div></div>`);
    let aTabDiv = aTabOuter.find('.tabdiv');
    aTabDiv.attr('tab_index', tab_index);
    aTabDiv.find('.tablink').on('click', [tab_index], tabs_route);
    aTabDiv.find('.caret').first().on('click', (ev) => {
        let caret = $(ev.target);
        let tabul = caret.parent().parent().find('.tabUL');
        if (tabul.css('display') === "none") {
            caret.html(closeMark);
            tabul.show("slide", {
                direction: "left"
            }, "slow");
        } else {
            caret.html(openMark);
            tabul.hide("slide", {
                direction: "left"
            }, "slow");
        }
    });
    let tabUL = $(`<ul class="tabUL"/>`); // id="tab_${tab_index+1}" 
    // let tbody = $('<tbody/>');
    tab.sections.forEach(
        (section, sect_index) => {
            let sectLI = $(`<li><span class="sectionRow sectionlink">${section.sectionName}</span></li>`);
            sectLI.attr('sect_index', sect_index);
            sectLI.on('click', [tab_index, sect_index], tabs_route);
            // let td = $('<td class="left"/>');
            tabUL.append(sectLI);
            // td = $(`<th class="stepcol" >${section.sectionName}</th>`);
            tabUL.append(sectLI);
            let sectUL = $(`<ul/>`);
            sectLI.append(sectUL);
            // tbody.append(tr);
            section.steps.forEach(
                (step, step_index) => {
                    let stepLI = $(`<li><span class="stepRow steplink">${step.stepName}</span></li>`);
                    stepLI.attr('step_index', step_index);
                    stepLI.on('click', [tab_index, sect_index, step_index], tabs_route);
                    sectUL.append(stepLI);
                }
            );
            // if(sect_index !== tab.sections.length-1){ // looks better with some space bellow last section
            sectUL.append($('<br/>')); // insert blank line between sections
            // }
        }
    );

    tabUL.hide();
    $('tab_outlines').append(aTabOuter.append(aTabDiv, tabUL));


}