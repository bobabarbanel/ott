"use strict";
// upload.js
const COOKIE = 'chosenCookie';
var cookieValue = "not set";
var key4;
const SECTION = "Tools";
let existingValues = {};

var debug = false;
function debugLog(text) { if (debug) { console.log(text); } }

$(function () {
    function disableButton(state) {
        if (state === true) { // disable button
            $('#ftSubmit').prop('disabled', 'disabled').css('background', 'transparent');

        } else { // enable button
            $('#ftSubmit').prop('disabled', false).css('background', 'yellow');
        }
    }

    disableButton(true);

    $('#ftSubmit').on('click', function (ev) {
        ev.preventDefault();
        // validate values !! no nulls
        let old = [];
        let nowNew = [];
        var evMod = jQuery.extend(true, {}, existingValues); // a deep copy
        Object.keys(evMod).forEach(
            link => {
                let ret = (evMod[link].f_change || 
                           evMod[link].t_change);
                if (ret) {
                    if (evMod[link].function === '') {
                        nowNew.push(link);
                        // now, modify the existing values
                        evMod[link].function = $('#' + idStr(link, 'function')).val();
                        evMod[link].type = $('#' + idStr(link, 'type')).val();
                    }
                    else {
                        // now, modify the existing values
                        evMod[link].function = $('#' + idStr(link, 'function')).val();
                        evMod[link].type = $('#' + idStr(link, 'type')).val();
                        old.push(link);
                    }
                }
                // evMod[link] now has all the editing/changed values for link
                //return true;
            }
        );
        let old_some_empty = old.some(link => hasEmptyString(evMod, link));
        let new_some_empty = nowNew.some(link => hasEmptyString(evMod, link));
        if ( old_some_empty || new_some_empty){
            alert("Must have both a non-empty Function and Type Name.");
        } else {
            let newPromises = nowNew.map(link => updateFT(evMod[link], true));
            let oldPromises = old.map(link => updateFT(evMod[link], false));
            //alert("new " + newPromises.length);
            //alert("old " + oldPromises.length);
            Promise.all(newPromises.concat(oldPromises)).then(
                complete => {
                    if(!complete[0].status) {
                        alert("Unable to complete updates.");
                    }
                    //alert("complete status " + complete[0].status);
                    window.location = window.location.href+'?eraseCache=true';
                    //window.location.reload(true);
                },
                error => {
                    //alert("error " + JSON.stringify(error));
                    //window.location.reload(true);
                    window.location = window.location.href+'?eraseCache=true';
                }
            );
        }
    });

    function hasEmptyString(evMod, link) { // check evMod for empty values
        return evMod[link].function === '' || evMod[link].type === '';
    }

    function updateFT(fields, addFiles) {
        fields.key4 = getKey4id();
        fields.addFiles = addFiles;
        fields.tab = SECTION;
        alert("updateFT " + fields.key4 + " " + fields.function);
        return new Promise((resolve, reject) => {
            $.ajax({
                url: "/updateFT",
                type: 'post',
                data: fields,
                datatype: "json",
                "Content-Type": "application/json"
            })
                .done(
                result => {
                    resolve(result);
                })
                .fail((request, status, error) => reject(error));
        });
    }

    function getSheetTags(tab) {

        let key = JSON.parse(getCookie());
        return new Promise((resolve, reject) => {
            $.ajax({
                url: "/sheetTags",
                type: 'post',
                data: {
                    "key": key,
                    "tab": tab,
                    "files": 0 // **do** retrieve files/images list
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


    $.getScript("/js/common.js")
        .done(function (/*script, textStatus*/) {

            ////////////////////////////////////////////////////////////
            cookieValue = unescape(readCookie(COOKIE));
            key4 = getKey4();
            var key5 = getParsedCookie();
            $("#job").text(
                [
                    key5.partId, key5.pName, key5.dept, key5.op, key5.machine
                ].join(" : ")
            );

            getSpec(getParsedCookie().machine)
                .then(machineSpecs => {
                    getSheetTags(SECTION).then(toolData => {
                        paintPage(machineSpecs, toolData);
                    });
                });


            ////////////////////////////////////////////////////////////
        })
        .fail(function (/*jqxhr, settings, exception*/) {
            debugLog("getScript " + "Triggered ajaxError handler.");
        }
        );


    function paintPage(machineSpecs, toolData) {
        let table = $('<table class="inputTable" id="setup"/>');
        let tr = $('<tr class="colnames"/>');

        let columns = [ // title and class
            ["Position<br/>#", "pCol"],
            ["Offset<br/>#", "oCol"],
            ["Function", "fCol"],
            ["Type", "tCol"]

        ];
        columns.forEach(head => {
            tr.append($('<th ' + 'class="' + head[1] + '"/>"').html(head[0]));
        });

        table.append(tr);


        toolData.forEach(tDoc => {
            existingValues[
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
                doRows(machineSpecs, turretStr, "Spindle1", table);
                if (machineSpecs[turretStr].Spindle2 !== undefined) {
                    doRows(machineSpecs, turretStr, "Spindle2", table);
                }
            }
        });
        $("content").append(table);
    }


    function groupSeparator(table) {
        let tr = $('<tr class="sep"/>');
        tr.append($('<td class="digit"/>'));
        tr.append($('<td class="digit"/>'));
        for (var i = 0; i < 2; i++) {
            tr.append($('<td/>'));
        }
        table.append(tr);
    }

    function doRows(specs, turretStr, spindleStr, table) {

        groupSeparator(table);
        let tr = $('<tr class="greyrow"/>');
        tr.append($('<th class="digit "/>').text(turretStr));
        tr.append($('<th class="digit "/>').text(spindleStr));
        for (var i = 0; i < 2; i++) {
            tr.append($('<th/>'));
        }

        table.append(tr);


        let lowT = specs[turretStr].range[0];
        let highT = specs[turretStr].range[1];
        let lowS = specs[turretStr][spindleStr][0];
        let numT = numsOf(turretStr);
        let numS = numsOf(spindleStr);
        for (var t = lowT, s = lowS; t <= highT; t++ , s++) {

            let link = [numT, t, numS, s].join("_");
            if (existingValues[link] === undefined) {
                existingValues[link] = {
                    "function": '',
                    "type": '',
                    "turret": parseInt(numsOf(turretStr)),
                    "position": t,
                    "spindle": parseInt(numsOf(spindleStr)),
                    "offset": s,
                    "f_change": false,
                    "t_change": false
                };
            }
            else {
                existingValues[link].f_change = false;
                existingValues[link].t_change = false;
            }
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

            // Function Name
            td = $('<td/>');
            let f_input = $('<input class="finput" name="function" type="text"/>');
            f_input.attr("id", idStr(link, "function"));
            f_input.val(existingValues[link].function);
            f_input.on("input", null, 'f_change', inputChanges); //function (ev) {
                // let now = $(this).val();
                // ev.preventDefault();

                // let ids = $(this).attr('id').split('_');
                // let inputId = ids.shift();
                // let link = ids.join('_');
                // if (existingValues[link][inputId] !== now) {
                //     disableButton('false');
                //     $(this).parent().addClass('changed');
                //     existingValues[link].f_change = true;
                // } else {
                //     $(this).parent().removeClass('changed');
                //     existingValues[link].f_change = false;
                // }
                // checkForChanges();

            //});
            td.append(f_input);
            tr.append(td);

            // Type Name
            td = $('<td/>');
            let t_input = $('<input class="tinput" name="type" type="text"/>');
            t_input.attr("id", idStr(link, "type"));
            t_input.val(existingValues[link].type);
            t_input.on("input", null, 't_change', inputChanges);
            // t_input.on("input", function (ev) {
            //     let now = $(this).val();
            //     ev.preventDefault();

            //     let ids = $(this).attr('id').split('_');
            //     let inputId = ids.shift();
            //     let link = ids.join('_');
            //     if (existingValues[link][inputId] !== now) {
            //         disableButton('false');
            //         $(this).parent().addClass('changed');
            //         existingValues[link].t_change = true;
            //     } else {
            //         $(this).parent().removeClass('changed');
            //         existingValues[link].t_change = false;
            //     }
            //     checkForChanges();
            // });
            td.append(t_input);
            tr.append(td);
            table.append(tr);
        }
    }
    function inputChanges(ev) { // called from type and function input text elements
        let now = $(this).val();
        ev.preventDefault();

        let ids = $(this).attr('id').split('_');
        let inputId = ids.shift();
        let link = ids.join('_');
        if (existingValues[link][inputId] !== now) {
            disableButton('false');
            $(this).parent().addClass('changed');
            existingValues[link][ev.data] = true;
        } else {
            $(this).parent().removeClass('changed');
            existingValues[link][ev.data] = false;
        }
        checkForChanges();
    }

    function checkForChanges() {
        let change = false;
        Object.keys(existingValues).forEach(
            link => {
                if (existingValues[link].f_change || existingValues.t_change) {
                    change = true;
                }
            }
        );
        disableButton(!change);
    }

    function idStr(idFields, tag) {
        // returns input element id for a given turret, spindle, tnum, snum, and type(tag)
        let arr;
        if (isString(idFields)) {
            arr = idFields.split('_');
        }
        else {
            arr = idFields.slice(); // copies array at top level
        }

        if (arr.length === 5) {
            arr.shift();
        }

        arr[0] = arr[0].replace(/^Turret|^Spindle/, '');
        arr[2] = arr[2].replace(/^Turret|^Spindle/, '');
        return tag + '_' + arr.join("_");
    }

});
