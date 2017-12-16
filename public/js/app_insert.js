"use strict";
// app_insert.js
$(function () {
    $("#submit").hide();
    doGetData();

    $("#reset").on("click", function () {
        location.reload();
    });

    $("#submit").on("click", function () {
        $("#insertNotice").hide();
        isMachineSpecKnown(KEY5.machine).then(
            result => {
                if (!result) {
                    $.confirm({
                        boxWidth: '700px',
                        useBootstrap: false,
                        type: 'red',
                        animation: 'left',
                        title: KEY5.machine + "\nWarning: Machine Specs Are Unknown.",
                        content: 'Do you want to submit this new Identifier?',
                        buttons: {
                            Yes: {
                                btnClass: 'btn-blue',
                                action: function () { performPut(); }
                            },
                            No: {
                                btnClass: 'btn-red'
                            },
                        }
                    });
                } else {
                    performPut();
                }
            },
            error => {
                alert(error);
            }
        );

    });

    $(".chooser", "#container").on('change', handleChooseOne);
    $("input").on('change keyup paste', handleInputOne);

});
const idOrderedKeys = ["dept", "machine", "op", "pName", "partId"];
function performPut() {
    putKey5().then(
        value => {
            if (value.error) {
                $("#submit").hide();
                $("#insertNotice").css("background-color", "red");
                $("#insertNotice").text("Error: Duplicate Identifier.").show();
            } else {
                $("#insertNotice").css("background-color", "green");
                $("#insertNotice").text("1 New Identifier Added.").show();
                setTimeout(function () { location.reload(); }, 2000);
            }
        },
        error => alert("/insert app_insert.js performPut error " + error)
    );
}
function doGetData() {
    getData("Parts Startup").then(
        (data) => {
            jsonData = data; // now global
            // Choosers
            FIELDS.forEach(initField); // KEY5 empty to start
            //console.log("doGetData complete " + data.length);
            $("#submit").hide();
        }); // need error handler for this Promise
}
function handleInputOne(who) {
    var input = $(who.currentTarget);
    var field = input.attr("id").replace("_new", "");
    var newval = input.val();

    KEY5[field] = newval;
    STATUS[field] = 1;

    if (isFullySelected()) {
        doneChoosing();
    }
}
// handle changes in choosers - that is, selection of a particular item
function handleChooseOne(who) {
    var chooser = $(who.currentTarget);
    //For each <a> that is class chosen-single that is NOT also chosen-default... reset values
    var field = chooser.attr("id").replace("_select", "");
    var newval = chooser.val();
    KEY5[field] = newval;
    STATUS[field] = 1;

    // also put chosen value in input field
    var insertSelector = "#" + field + "_new";
    $(insertSelector, "#new_key_input ").val(newval);

    if (isFullySelected()) {
        doneChoosing();
    }
}

function doneChoosing() {
    $("#insertNotice").removeClass().hide();
    $("#submit").show(); // exposes go button
    // also show edit tools??
}



function isMachineSpecKnown(mname) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/machine/" + mname,
            type: 'get'
        })
            .done(result => {
                //alert("isMachineSpecKnown: " + result);
                resolve(result !== null);
            })

            .fail((request, status, error) => {
                //alert("isMachineSpecKnown error: " + error);
                reject(error);
            });
    });
}



var jsonData;
const FIELDS = ["partId", "pName", "dept", "op", "machine"];
const FIELDSORTER = {
    "partId": "alphaCompare",
    "pName": "alphaCompare",
    "dept": "alphaCompare",
    "op": (a, b) => a - b,
    "machine": "alphaCompare"
};

const FWIDTH = "180px";
const STATUS = {};
const KEY5 = {};


function getData(message) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/data",
            type: 'get',
            dataType: 'json'
        })
            .done(result => resolve(result))

            .fail((request, status, error) => reject(error))

            .always(() => console.log("getdata complete: " + message));
    });
}

function putKey5() {
    return new Promise((resolve, reject) => {
        KEY5._id = idOrderedKeys.map(key => KEY5[key]).join("|");

        $.ajax({
            url: "/addkey",
            type: 'post',
            data: KEY5
        })
            .success(result => resolve(result))
            .error((request, status, error) => reject(error));
    });
}


function isFullySelected() {
    return FIELDS.every((f) => (STATUS[f] === 1));
}

function findUnique(fName) {
    var oneColVals = jsonData.filter((row) => keyMatch(row)).map((row) => row[fName]);
    return [...new Set(oneColVals)]; // return distinct values only
}

function keyMatch(row) {
    if (Object.keys(KEY5).length === 0) { return true; }
    return Object.keys(KEY5).every((key) => (row[key] === KEY5[key]));
}

function initField(fName) { // set up options for one field fName .chosen and initiate chosen

    const selector = "#" + fName + "_select";
    // KEY5 will be empty to start with
    ///////////////////////////////////
    var oneColVals = findUnique(fName); // returns field fName as array of unique values, passing filters from KEY5
    ///////////////////////////////////
    oneColVals = oneColVals.sort(FIELDSORTER[fName]);

    $(selector, "#container").empty();
    var howMany = oneColVals.length;
    $("#" + fName + "_num", "#container").text(howMany);

    if (howMany > 1) {
        oneColVals.unshift(""); // add empty option at top of list
    }
    else {
        KEY5[fName] = oneColVals[0];
    }

    oneColVals.forEach((datum) => {
        $(selector, "#container").append($("<option>").val(datum).text(datum));
    });

    // setup format for this chooser
    $(".chosen-" + fName, "#container").chosen({
        width: FWIDTH,
        search_contains: false
    });


    if (howMany === 1) {
        // always disable if there is but one value
        $(".chosen-" + fName, "#container").prop('disabled', true).trigger("chosen:updated");
        // have the containing td act as a button to select the one value
        $("#" + fName + "_select", "#container").parent().on("click",
            () => {
                STATUS[fName] = 1;

                // put chosen value in input field
                var insertSelector = "#" + fName + "_new";
                $(insertSelector, "#new_key_input ").val(oneColVals[0]);

                if (isFullySelected()) {
                    $("#insertNotice").removeClass().hide();
                    $("#submit").show(); // exposes go button
                }
            });
    }
}