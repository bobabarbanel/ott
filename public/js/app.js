"use strict";
$(function () {
    //console.log("\napp.js");

    setUpTable();

    getData().then(
        (data) => {
            jsonData = data; // now global
            // Choosers
            FIELDS.forEach(initField); // QUERY empty to start
            // Table
            refreshFilterTable();
            $("#run").hide();
            $("#upload_action").hide();
        },
        (error) => console.log("getData error " + error));

    $("#reset").on("click", function () {
        resetVars().then(
            () => {
                //console.log("resetVars " + signal)
            },

            error => console.log("resetVars Error: " + error)
        );

        location.reload();
    });

    $("#run").on("click", function () {

        if (existingWindow !== undefined && existingWindow !== null) {
            existingWindow.close();
            existingWindow = null;
        }
        handleChoice().then(
            () => {
                //console.log("run plus " + signal);
                openInNewTab("/tabs/1.html");
            },
            error => console.log("handleChoice Error: " + error));
    });

    $("#upload_action").on("click", function () {

        if (existingWindow !== undefined && existingWindow !== null) {
            existingWindow.close();
            existingWindow = null;
        }
        uploadChoice().then(
            () => {
                //console.log("upload plus " + signal);
                openInNewTab("/tabs/upload.html");
            },
            error => console.log("uploadChoice Error: " + error));
    });

    // handle changes in choosers - that is, selection of a particular item
    $(".chooser", "#container").on("change", function () {
        var chooser = $(this);
        //For each <a> that is class chosen-single that is NOT also chosen-default... reset values
        var field = chooser.attr("id").replace("_select", "");
        var newval = chooser.val();
        QUERY[field] = newval;
        STATUS[field] = 1;
        $("#" + field + "_num", "#container").text(1);


        // find possible values for other fields
        FIELDS.forEach((f) => {
            if (QUERY[f] === undefined) { updateField(f); }
        });

        var selector = "#" + $(this).attr("id");
        $(selector, "#container").empty();

        // single select for this field; add only one option to <select> 
        $(selector, "#container").append($("<option>").val(newval).text(newval));
        // update
        $(selector, "#container").prop('disabled', true).trigger("chosen:updated");

        // Table
        refreshFilterTable();
        // count how many columns have set values now

        if (isFullySelected()) {
            pageComplete();
        }
    });

});
var existingWindow;

function handleChoice() {
    //console.log("handleChoice " + QUERY.partId);
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/go_parts",
            type: 'post',
            data: QUERY
        })
            .done((result) => resolve(result))
            .fail((request, status, error) => reject(error));
        //.always(() => console.log("handlechoice complete"));
    });
}

function uploadChoice() {
    //console.log("uploadChoice " + JSON.stringify(QUERY));
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/go_parts",
            type: 'post',
            data: QUERY
        })
            .done((result) => resolve(result))
            .fail((request, status, error) => reject(error));
        //.always(() => console.log("handlechoice complete"));
    });
}

function resetVars() {
    //console.log("resetVars existingWindow = " + existingWindow);
    if (existingWindow !== undefined && existingWindow !== null) {
        //console.log("closing existing resetVars");
        existingWindow.close();
        existingWindow = null;
    }
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/reset",
            type: 'get'
        })
            .done((result) => resolve(result))

            .fail((request, status, error) => reject(error));

        // .always(() => console.log("resetVars complete"));
    });

}

function openInNewTab(url) {
    if (existingWindow !== undefined && existingWindow !== null) {
        //console.log("closing existing openInNewTab");
        existingWindow.close();
    }
    existingWindow = window.open(url, '_blank');
    existingWindow.focus();
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
const STATUS = {
    "partId": 0,
    "pName": 0,
    "dept": 0,
    "op": 0,
    "machine": 0
};
const QUERY = {};

function updateTable(rows) {
    $("#dataTable").tabulator("setData", rows);
    formatTableCells();
    annotateTableCount(rows.length);
}
function refreshFilterTable() { // set new (reduced) jsonData in table, uses QUERY
    updateTable(jsonData.filter((row) => rowMatchesQuery(row)));
}
/*
function QUERYtoString() {
    var ret = 'QUERY {';
    var nameVals = FIELDS.map((f) => f + ": " + QUERY[f]);
    ret += nameVals.join(", ");

    return ret + '}';
}
*/

function setUpTable() {
    $("#dataTable").tabulator({
        //height:"450px", // set height of table (optional)
        fitColumns: true, //fit columns to width of table (optional)
        pagination: "local",
        columns: [ //Define Table Columns
            // first column is checkbox for choosing all the values in the row
            {
                title: "&#x2714;",
                field: "row",
                align: "center",
                width: "20px",
                onClick: cellSingleClick,
                sortable: false,
                formatter: function (/*value, data, cell, row, options, formatterParams*/) {
                    return '<div><input type="radio"></div>';
                }
            },
            {
                title: "Part Number",
                //width: "150px",
                field: "partId",
                sorter: "string",
                cssClass: "partIdCol",
                onClick: cellSingleClick
            },
            {
                title: "Part Name",
                //width: "200px",
                field: "pName",
                sorter: "string",
                align: "center",
                cssClass: "pNameCol",
                onClick: cellSingleClick
            },
            {
                title: "Department",
                //width: "150px",
                field: "dept",
                sorter: "string",
                align: "center",
                cssClass: "deptCol",
                onClick: cellSingleClick
            },
            {
                title: "Operation",
                //width: "120px",
                field: "op",
                sorter: "number",
                align: "center",
                cssClass: "opCol",
                onClick: cellSingleClick
            },
            {
                title: "Machine",
                //width: "120px",
                field: "machine",
                sorter: "string",
                cssClass: "machineCol",
                onClick: cellSingleClick
            },

        ],
        sortBy: 'partId', // when data is loaded into the table, sort it by partId
        sortDir: 'asc'
    });
}

function getData(/*message*/) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/data",
            type: 'get',
            dataType: 'json'
        })
            .done((result) => resolve(result))

            .fail((request, status, error) => reject(error));

        // .always(() => console.log("getdata complete: " + message));
    });
}

/*
function filterData(filter) {
    return new Promise((resolve, reject) => {

        resolve(jsonData.filter((row) =>
            Object.keys(QUERY).every((field) => (row[field] === QUERY[field]))));

    });
}
*/
function formatTableCells() { // marks column in table when field is determined
    FIELDS.forEach((f) => {
        if (STATUS[f] === 1) {
            $("." + f + "Col")
                .css("font-weight", "bold")
                .css("border", "1px solid blue")
                .css("background", "pink");
        }

    });
}



function annotateTableCount(count) {
    $("#tabCounter").remove(); // remove old one if present
    $(".tabulator-footer").prepend($("<span>").attr("id", "tabCounter").addClass("counter").text(count));
}

function rowMatchesQuery(row) { // does a table row match current selectors
    if (Object.keys(QUERY).length === 0) { return true; }
    return Object.keys(QUERY).every((key) => (row[key] === QUERY[key]));
}
function isFullySelected() {
    return FIELDS.every((f) => (STATUS[f] === 1));
}

function rowSelected(rowData) {
    Object.keys(STATUS).filter((key) => STATUS[key] !== 1).forEach((fName) => {
        var val = rowData[fName];
        QUERY[fName] = val;
        var selector = "#" + fName + "_select";
        $(selector, "#container").empty();
        $("#" + fName + "_num", "#container").text(1);
        var option = $("<option>").val(val).text(val);
        $(selector, "#container").append(option);
        STATUS[fName] = 1;
        //console.log("rowSelected " + fName);
        $(selector, "#container").prop('disabled', true).trigger("chosen:updated");
    });
    pageComplete();
}

function pageComplete() {
    $("#dataTable").hide();
    $("#run").show();
    $("#upload_action").show();
}


function cellSingleClick(e, cell, value, data) {
    //e - the click event object
    //cell - the DOM element of the cell
    //value - the value of the cell
    //data - the data for the row the cell is in
    if (value === "") { // radio button, first cell
        rowSelected(data); // select all the values from this row
    } else { // other cells; use only the cell's value as new selection
        var fName = $(this)[0].field;
        QUERY[fName] = data[fName];
        STATUS[fName] = 1;

        $("#" + fName + "_num", "#container").text(1);

        updateField(fName);
        // find possible values for other fields
        FIELDS.forEach((f) => {
            if (QUERY[f] === undefined) { updateField(f); }
        });

        var selector = "#" + fName + "_select";
        $(selector, "#container").empty();

        // single select for this field; add only one option to <select> 
        $(selector, "#container").append($("<option>").val(value).text(value));
        // update
        $(selector, "#container").prop('disabled', true).trigger("chosen:updated");

        // Table
        refreshFilterTable();
        // count how many columns have set values now

        if (isFullySelected()) {
            pageComplete();
        }

    }
}

/*
function genQuery(field, obj) {
    var query = {};
    var val = obj[field];
    // replacing &nbsp;'s that were added for support indenting in some columns for strings
    query[field] = (typeof val === 'string') ? val.replace(/(&nbsp;)+/, "") : val;
    return query;
}
*/
function findUnique(fName) {
    var oneColVals = jsonData.filter((row) => keyMatch(row)).map((row) => row[fName]);
    return [...new Set(oneColVals)]; // return distinct values only
}

function keyMatch(row) {
    if (Object.keys(QUERY).length === 0) { return true; }
    return Object.keys(QUERY).every((key) => (row[key] === QUERY[key]));
}

function initField(fName) { // set up options for one field fName .chosen and initiate chosen

    const selector = "#" + fName + "_select";
    // QUERY will be empty to start with
    ///////////////////////////////////
    var oneColVals = findUnique(fName); // returns field fName as array of unique values, passing filters from QUERY
    ///////////////////////////////////
    oneColVals = oneColVals.sort(FIELDSORTER[fName]);

    $(selector, "#container").empty();
    var howMany = oneColVals.length;
    $("#" + fName + "_num", "#container").text(howMany);
    STATUS[fName] = howMany;
    //console.log("init   "+ fName + ": " + oneColVals.length);
    //FOUND[fName] = oneColVals.slice(0); // a copy
    if (howMany > 1) {
        oneColVals.unshift(""); // add empty option at top of list
    }
    else {
        //console.log("initField QUERY field " + fName + " = " + oneColVals[0]);
        QUERY[fName] = oneColVals[0];
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
    }

    //formatTableCells();
    //annotateTableCount(jsonData.length);

    //return howMany;
}

function alphaCompare(a, b) { // useed by sort for alpha fields
    return a.localeCompare(b);
}

function updateField(fName) { // set up options for one field fName .chosen and initiate chosen
    //console.log("updateField "+ fName);
    const selector = "#" + fName + "_select";

    ///////////////////////////////////
    // get sorted field value for field=fName as array of unique values, passing filters from pats
    ///////////////////////////////////
    var oneColVals = findUnique(fName).sort(FIELDSORTER[fName]);

    $(selector, "#container").empty();
    var howMany = oneColVals.length;
    STATUS[fName] = howMany;
    //console.log("init   "+ fName + ": " + oneColVals.length);

    if (howMany > 1) {
        oneColVals.unshift("");       // add empty option at top of list
    } else {
        QUERY[fName] = oneColVals[0]; // QUERY now adjusted for this new found single value
    }

    oneColVals.forEach((datum) => { $(selector, "#container").append($("<option>").val(datum).text(datum)); });

    $("#" + fName + "_num", "#container").text(howMany); // update count for this field's unqiue values
    if (howMany === 1) { // always disable if there is but one value
        $(".chosen-" + fName, "#container").prop('disabled', true);
    }
    $(".chosen-" + fName, "#container").trigger("chosen:updated");

    // update Table too
    refreshFilterTable();


    //console.log(STATUS);
    return howMany;
}
