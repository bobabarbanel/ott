"use strict";
/* globals Util */
// terms_edit.js :: Term adds, delete, plus image uploads

let TABLE;
const DATA = [];
let NEW_TERM_INPUT;
let WORDLISTS;

$(function () {

    const STYPE = "Add/Delete Terms, Upload Images for Terminology"
    $("title").html(`${STYPE} Edit`);

    $("pageheader").append(
        $(
            `<h1 class="pageTitle">${STYPE}</h1>`
        )
    );
    $("#filter-value").keyup(() =>
        TABLE.setFilter("term", "like", $("#filter-value").val())
    );

    Util.setUpTabs(null /*key4id*/, "", {
        tab: false,
        spec: false,
        main: false,
        machine: false,
        tabmenus: false
    }).then(
        () => {
            getAllTerms().then(
                () => {
                    tableSetup();
                    pageSetup();
                }
            )
        }
    );
});

async function getAllTerms() {
    WORDLISTS = {};
    await Promise.all(
        ["type", "function", "other"].map(tfo => {
            return new Promise((resolve, reject) => {
                $.get({
                    url: `/terms/get_main_term_counts/${tfo}`,
                    dataType: "json"
                })
                    .done(docs => {
                        // alert(result);
                        WORDLISTS[tfo] = {};
                        docs.forEach(
                            doc => {
                                doc.image_count = 0;
                                doc.type = tfo;
                                DATA.push(doc);
                                WORDLISTS[tfo][doc.term] = doc;
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

function termStatus(term, type) {
    return new Promise((resolve, reject) => {
        $.post({
            url: "/terms/status",
            data: {
                type: type,
                term: term
            },
            datatype: "json"
        })
            .done(success => {
                resolve(success);
            })
            .fail(error => {
                reject(error);
            });
    });
}

async function handleInputNewTerm() {
    const newTerm = NEW_TERM_INPUT.val().toUpperCase();
    const newType = $('input:checked', '#theForm').val();
    const status = await termStatus(newTerm, newType);

    switch (status) {
        case 'archived':
            NEW_TERM_INPUT.toggleClass("archived");
            $('information').text('This Term has been archived.').toggleClass('visible'); // message
            setTimeout(() => {
                NEW_TERM_INPUT.toggleClass("archived");
                $('information').text('').toggleClass('visible'); // message
            }, 1500);
            break;
        case 'known':
            NEW_TERM_INPUT.toggleClass("dup");
            $('information').text('This is an existing Term.').toggleClass('visible'); // message
            setTimeout(() => {
                NEW_TERM_INPUT.toggleClass("dup");
                $('information').text('').toggleClass('visible'); // message
            }, 1500);
            break;
        case 'unknown':
            addTerm(newTerm, newType).then(
                success => {
                    const newRowId = DATA.length;
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
            break;
        default: //error
            alert("termStatus: improper status return");
    }
    NEW_TERM_INPUT.focus();
    return status;

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
                console.log('/addTerm', results);
                resolve(results);
            })
            .fail(error => {
                alert("/addTerm Error " + JSON.stringify(error, null, 4));
                reject(error);
            });
    });
}

async function removeTerm({ term, type }) {
    return new Promise((resolve, reject) => {
        $.post({
            url: "/terms/remove_term_image",
            data: {
                type: type,
                term: term
            },
            datatype: "json"
        })
            .done(success => {
                // also must remove row from table?
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
    TABLE = new Tabulator("#terms-table", {
        layout: "fitColumns",
        data: DATA,
        pagination: "local",
        paginationSize: 15,
        initialSort: SORTERS,
        // persistentSort:true, //Enable sort persistence
        groupBy: "type",
        groupHeader: function (value, count) {
            value = value.charAt(0).toUpperCase() + value.slice(1);
            return value + "<span style='color:#d00; margin-left:10px;'>(" + count + " item)</span>";
        },
        groupToggleElement: "header",
        reactiveData: true, //enable reactive data TODO: use for updates to images_count, and added rows
        columns: [
            {
                field: "type",
                visible: false
            },
            {
                title: "Term by Types",
                field: "term",
                minWidth: 150,
                widthGrow: 3,
                headerSort: true,
                formatter: function (cell, formatterParams, onRendered) {
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
                    const TERM = cell.getData().term;
                    let fup = `<input class="fileUpload" onchange="termFileUpload(this)" 
                        type="file" data="${TERM}" 
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
                    const capType = data.type.charAt(0).toUpperCase() + data.type.slice(1)
                    $.confirm({
                        title: "<br/>Confirm Term Deletion!",
                        columnClass: "col-md-4",
                        type: "orange",
                        content: `<div class="confirm"><u>${capType}</u>&nbsp;
                        Term:&nbsp;&nbsp;<b>${data.term}</b><br/>
                            &nbsp;&nbsp;Used in Job Main Tables: ${data.mt_count > 0 ? data.mt_count : "none"}<br/>
                            &nbsp;&nbsp;Image File(s): ${data.image_count > 0 ? data.image_count : "none"}</div>`,
                        buttons: {
                            confirm: {
                                text: 'Confirm Deletion',
                                btnClass: "btn-warning",
                                action: function () {
                                    removeTerm(data).then(() => {
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

function termFileUpload(obj) {
    const fup_input = $(obj);
    const jqRow = fup_input.parent().parent();
    const row = TABLE.getRow(jqRow[0]);
    const files = fup_input.get(0).files;
    if (files.length > 0) {
        jqRow.addClass("stripes");
        $(".fileUpload").hide();
        $("#spin").show();
        const data = row.getData();
        // const current_count = data.count;

        fupChange(files, fup_input.attr("data"), data.type)
            .then(success => {
                const cell = row.getCell("image_count");
                cell.setValue(cell.getValue() + success.count, false);
                // alert("success");
            })
            .catch(failure => {
                alert("error " + failure);
            })
            .finally(() => {
                jqRow.removeClass("stripes");
                $(".fileUpload").show();
                $("#spin").hide();
            });
    }
}

function fupChange(files, term, type) {
    const formData = new FormData();
    formData.append("term", term);
    formData.append("type", type);

    // loop through all the selected files and add them to the formData object
    // warning: files is not an ordinary Array, cannot use .forEach
    for (let i = 0; i < files.length; i++) {
        // add the files to formData object for the data payload
        formData.append("uploads[]", files[i], files[i].name);
    }

    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/term_upload",
            type: "post",
            data: formData,
            processData: false,
            contentType: false
        })
            .done(result => {
                resolve(result);
            })
            .fail((request, status, error) => {
                reject(error);
            });
    });
}

function pageSetup() {

    const addButton = $('#addTermButton', '#theForm');
    enableButton(addButton, false);

    addButton.on('click', async (e) => {
        await handleInputNewTerm();
        e.preventDefault();
    });
    $('input[type=radio]').on('change', e => {
        enableButton(addButton, $('#add').val() !== '');
    });
    $('#add').on('keyup', e => {
        enableButton(addButton, $('input:checked', '#theForm').val());
    });
    NEW_TERM_INPUT = $("input#add", '#theForm');
}
function enableButton(button, state) {
    button.attr("disabled", !state).removeClass().addClass((state) ? 'btn-primary' : 'btn-lgiht');
}
