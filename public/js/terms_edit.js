"use strict";
/* globals Util */
// terms_edit.js :: Term adds, delete, plus image uploads

// const ENTER = 13;
// const TABCHAR = 9;
let TABLE;
const DATA = [];
let NEW_TERM_INPUT;
let WORDLISTS;

$(function () {

    const STYPE = "Edit/Upload Terminology"
    $("title").html(`${STYPE} Edit`);

    $("pageheader").append(
        $(
            `<h1 class="pageTitle">${STYPE}</h1>` // <h3 class="jobTitle">${jobTitle}</h3>`
        )
    );
    $("#filter-value").keyup(() =>
        TABLE.setFilter("term", "like", $("#filter-value").val())
    );

    // const startStringMatcher = function (strs) {
    //     return function findMatches(q, cb) {
    //         let matches = [],
    //             substrRegex = new RegExp("^" + q, "i");
    //         $.each(strs, function (i, str) {
    //             if (substrRegex.test(str)) {
    //                 matches.push(str);
    //             }
    //         });
    //         cb(matches);
    //     };
    // };

    // const TOOLLIST = $("#toollist");

    Util.setUpTabs(null /*key4id*/, "", {
        tab: false,
        spec: false,
        main: false,
        machine: false,
        tabmenus: false
    }).then(() => {
        getAllTerms().then(
            (data) => {
                tableSetup();
                pageSetup();
            }
        );
    });


});

// function notKnown(objArray, value) {
//     for (let obj of objArray) {
//         if (obj.term === value) return false;
//     }
//     return true;
// }

async function getAllTerms() {
    WORDLISTS = {};
    await Promise.all(
        ["type", "function", "other"].map(which => {
            return new Promise((resolve, reject) => {
                $.get({
                    url: `/terms/get_main_term_counts/${which}`,
                    dataType: "json"
                })
                    .done(docs => {
                        // alert(result);
                        WORDLISTS[which] = {};
                        docs.forEach(
                            doc => {
                                doc.image_count = 0;
                                doc.type = which;
                                DATA.push(doc);
                                WORDLISTS[which][doc.term] = doc;
                            }
                        );
                        resolve(true);
                    })
                    .fail((request, status, error) => {
                        // alert(error);
                        reject(false);
                    });
            });
        })
    );
    return new Promise((resolve, reject) => {
        $.get({
            url: '/terms/get_term_image_counts',
            dataType: 'json'
        })
            .done(docs => { // [{type: "type", term: "term", count: #files }, ...]
                // alert(result);
                docs.forEach(
                    (doc) => {
                        const { type, term, image_count } = doc;
                        if (WORDLISTS[type][term] === undefined) {
                            doc.mt_count = 0;
                            WORDLISTS[type][term] = doc;
                            DATA.push(doc);
                        } else {
                            WORDLISTS[type][term].image_count = image_count;
                        }
                    }
                );

                DATA.forEach(
                    (doc, index) => {
                        doc.id = index;
                    }
                )
                resolve(true);
            })

            .fail((request, status, error) => {
                // alert(error);
                reject(false);
            });
    });
}

function notKnown(newTerm, newType) {
    for (let i = 0, max = DATA.length; i < max; i++) {
        if (DATA[i].type === newType && DATA[i].term === newTerm) {
            return false;
        }
    }
    return true;
}

function handleInputNewTerm() {
    const newTerm = NEW_TERM_INPUT.val().toUpperCase();
    const newType = $('input:checked', '#theForm').val();
    if (notKnown(newTerm, newType)) {
        addTerm(newTerm, newType).then(
            success => {
                const newRowId = DATA.length
                DATA.push(
                    {
                        id: newRowId,
                        image_count: 0,
                        mt_count: 0,
                        term: newTerm,
                        type: newType
                    }
                );
                // TABLE is reactive so changing DATA will modify UI
                NEW_TERM_INPUT.toggleClass("action");
                TABLE.setSort(SORTERS);
                const newRow = TABLE.getRow(newRowId);

                newRow.pageTo()
                    .then(function () {
                        //run code after table has been successfuly updated
                        $(newRow.getElement()).toggleClass("action");
                    })
                    .catch(function (error) {
                        //handle error loading data
                        alert("unable to page when adding term.");
                    }).finally(function () {
                        NEW_TERM_INPUT.val("");
                        enableButton($('#addTermButton', '#theForm'), false); // since term input cleared
                        setTimeout(() => {
                            $(newRow.getElement()).toggleClass("action");
                            NEW_TERM_INPUT.toggleClass("action");
                        }, 1000);
                    });
            },
            error => {
                alert("unable to add term.");
            }
        );
    } else {
        NEW_TERM_INPUT.toggleClass("dup");
        $('duplicate').toggleClass('visible'); // message
        setTimeout(() => {
            NEW_TERM_INPUT.toggleClass("dup");
            $('duplicate').toggleClass('visible'); // message
        }, 1200);
    }
    NEW_TERM_INPUT.focus();
}

function addTerm(term, type) {
    return new Promise((resolve, reject) => {
        $.post({
            url: '/terms/create_term_images',
            dataType: 'json',
            data: {
                term: term,
                type: type
            }
        })
            .done(results => {
                console.log('\addTerm', results);
                resolve(results);
            })
            .fail(error => {
                alert("/addTerm Error " + JSON.stringify(error, null, 4));
                reject(error);
            });
    });
}


async function removeTerm(term) {
    return new Promise((resolve, reject) => {
        $.post({
            url: "/removeTerm",
            data: {
                type: window.name,
                term: term
            },
            datatype: "json"
        })
            .done(success => {
                resolve(success);
            })
            .fail(error => reject(error));
    });
}
const SORTERS = [
    {
        column: "term",
        dir: "asc"
    },
    {
        column: "type",
        dir: "asc"
    },
];

function tableSetup() {
    $("#terms-table").css("width", "800px");
    let signal = false;
    TABLE = new Tabulator("#terms-table", {
        layout: "fitColumns",
        data: DATA,
        pagination: "local",
        paginationSize: 15,
        initialSort: SORTERS,
        // persistentSort:true, //Enable sort persistence
        groupBy: "type",
        groupHeader: function (value, count) {
            //value - the value all members of this group share
            //count - the number of rows in this group
            //data - an array of all the row data objects in this group
            //group - the group component for the group
            value = value.charAt(0).toUpperCase() + value.slice(1);
            return value + "<span style='color:#d00; margin-left:10px;'>(" + count + " item)</span>";
        },
        groupToggleElement: "header",
        reactiveData: true, //enable reactive data TODO: use for updates to images_count, and added rows
        columns: [
            {
                field: "type",
                visible: false,
                // formatter:function(cell){
                //     let string = cell.getValue();
                //     return string.charAt(0).toUpperCase() + string.slice(1);
                // },
            },
            {
                title: "Term by Types",
                field: "term",
                minWidth: 150,
                widthGrow: 3,
                headerSort: true,
                formatter: function (cell, formatterParams, onRendered) {
                    //cell - the cell component
                    //formatterParams - parameters set for the column
                    //onRendered - function to call when the formatter has been rendered

                    return "<b>" + cell.getValue() + "</b>";
                },
            },
            {
                title: "# Uses",
                field: "mt_count",
                minWidth: 110,
                widthGrow: 1,
                headerSort: true,
                align: "center"
            },
            {
                title: "# Images",
                field: "image_count",
                minWidth: 70,
                widthGrow: 1,
                headerSort: false,
                align: "center"

            },
            {
                title: "Upload Images",
                width: 270,
                align: "center",
                headerSort: false,
                tooltip: "Select Images to Upload",
                formatter: function (cell, formatterParams, onRendered) {
                    //cell - the cell component
                    //formatterParams - parameters set for the column
                    //onRendered - function to call when the formatter has been rendered
                    const TERM = cell.getData().term;
                    let fup = `<input class="fileUpload" onchange="specFileUpload(this)" type="file" data="${TERM}" 
					name="uploads[]" accept="image/jpg" multiple/>`;
                    return fup;
                }
            },
            {
                title: '&nbsp;<i class="far fa-trash-alt"></i>',
                formatter: "buttonCross",
                width: 50,
                align: "center",
                headerSort: false,
                cellClick: function (e, cell) {
                    const row = cell.getRow();
                    const jqRowCells = $(row.getElement())
                        .find(".tabulator-cell")
                        .addClass("del_highlight");
                    // confirm deletion
                    const data = row.getData();

                    $.confirm({
                        title: "<br/>Confirm Term Deletion!",
                        columnClass: "col-md-4",
                        type: "orange",
                        content: `<div class="confirm">Term: <b>${
                            data.term
                            }</b>&nbsp;&nbsp;File Count: ${data.count}</div>`,
                        buttons: {
                            confirm: {
                                btnClass: "btn-primary",
                                action: function () {
                                    removeTerm(data.term).then(() => {
                                        setTimeout(() => {
                                            jqRowCells.removeClass("del_highlight");
                                            row.delete();
                                        }, 700);
                                    });
                                },
                                keys: ["enter"]
                            },
                            cancel: function () {
                                jqRowCells.removeClass("del_highlight");
                            }
                        }
                    });
                }
            }
        ]
    });
}

// function specFileUpload(obj) {
//     const fup_input = $(obj);
//     const jqRow = fup_input.parent().parent();
//     const row = TABLE.getRow(jqRow[0]);
//     const files = fup_input.get(0).files;
//     if (files.length > 0) {
//         jqRow.addClass("stripes");
//         $(".fileUpload").hide();
//         $("#spin").show();
//         const current_count = row.getData().count;
//         fupChange(files, fup_input.attr("data"), current_count)
//             .then(success => {
//                 const cell = row.getCell("count");
//                 cell.setValue(cell.getValue() + success.count, false);
//                 // alert("success");
//             })
//             .catch(failure => {
//                 alert("error " + failure);
//             })
//             .finally(() => {
//                 jqRow.removeClass("stripes");
//                 $(".fileUpload").show();
//                 $("#spin").hide();
//             });
//     }
// }

// function fupChange(files, term, nowCount) {
//     var formData = new FormData();
//     formData.append("term", term);
//     formData.append("tab", SPEC_TYPE);
//     formData.append("setPrimary", nowCount === 0);

//     // loop through all the selected files and add them to the formData object
//     for (var i = 0; i < files.length; i++) {
//         // add the files to formData object for the data payload
//         formData.append("uploads[]", files[i], files[i].name);
//     }

//     return new Promise((resolve, reject) => {
//         $.ajax({
//             url: "/spec_upload",
//             type: "post",
//             data: formData,
//             processData: false,
//             contentType: false
//         })
//             .done(result => {
//                 resolve(result);
//             })
//             .fail((request, status, error) => {
//                 reject(error);
//             });
//     });
// }

function pageSetup() {
    const button = $('#addTermButton', '#theForm');
    enableButton(button, false);
    button.on('click', e => {
        handleInputNewTerm();
        // TODO: check for dups
        return false; // Mandatory to prevent page refresh.
    });
    $('input[type=radio]').on('change', e => {

        if ($('#add').val() !== '') {
            enableButton(button, true);
        } else {
            enableButton(button, false);
        }
    });
    $('#add').on('keyup', e => {

        if ($('input:checked', '#theForm').val()) {
            enableButton(button, true);
        } else {
            enableButton(button, false);
        }
    });
    NEW_TERM_INPUT = $("input#add", '#theForm');

}
function enableButton(button, state) {
    button.attr("disabled", !state).removeClass().addClass((state) ? 'btn-primary' : 'btn-lgiht');
}
