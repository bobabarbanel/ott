"use strict";
/* globals Common, Util */
// tab_upload.js

// var debug = false;

// function debugLog(text) {
//     if (debug) {
//         console.log(text);
//     }
// }
/* //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// WARNING - concurrency -- adding files to tab steps needs to be made to allow multiple users to update in parallel !!!
Currently - a single user effectively holds onto the entire tab set during this page's lifetime. No check on that.
Also - global STORE has to be intact for each user.
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////// */
const COMMON = new Common();

const KEY5 = COMMON.getParsedCookie();
const STORE = { // object to hold constant key4id and tabs when retrieved
    tabs: null,
    key4id: COMMON.getKey4id()
};
const DOM = {}; // object to hold constant DOM jquery objects when defined

$(function () {
    DOM.SPIN = $('spin');
    const hideSpin = () => DOM.SPIN.css('visibility', 'hidden');
    const showSpin = () => DOM.SPIN.css('visibility', 'visible');
    

    
    


    // retrieve tab data and draw page
    const start = function () {
        Util.getTabsData(STORE.key4id).then(
            (data) => {
                STORE.tabs = data.tabs;
                getFileCounts(data.tabs).then( // count the number of non-archived files in each step
                    (result) => { // returns key:value pairs of images_id:count of files
                        paintPage(result.tallyObj);
                        // STORE.nextStepNum = result.nextStepNum;
                        setUp();
                    }
                );
            }
        );
    };

    // get a single count for one step image_id
    const getFileCounts = function (tabs) {
        let images_id_array = [];
        tabs.forEach(
            (tab) => {
                tab.sections.forEach(
                    (section) => {
                        section.steps.forEach(
                            (step) => {
                                images_id_array.push(step.images_id);
                            }
                        );
                    }
                );
            }
        );

        return new Promise((resolve, reject) => {
            $.post({
                url: "/countTabImages/", // db.collection('tab_images') in uploadRouter (an aggregate)
                data: {
                    "job_id": STORE.key4id,
                    "images_id_array": images_id_array
                }
            })
                .done(result => {
                    // result is array e.g. [{"image_id": "5b830a7c2559c27d843cda83","count": 1, "nextStepNum": 60}, ...]
                    let tallyObj = {};
                    // let nextStepNum;
                    if (result.nonArchivedFileCountsByImageId !== undefined) {
                        result.nonArchivedFileCountsByImageId.forEach(
                            (element) => {
                                // nextStepNum = element.nextStepNum;

                                tallyObj[element._id] = element.count; // _id is the images_id for a step
                            }
                        );
                    }

                    resolve({
                        "tallyObj": tallyObj // will be {} if there are no tabs
                        // "nextStepNum": nextStepNum
                    });
                }).fail((request, status, error) => {
                    reject(error);
                });
        });
    };

    const paintPage = function (tallyObj) {

        $('tabs').empty();

        // ol
        let tabsOL = $('<ol id="outer"/>');
        STORE.tabs.forEach(
            (tab, tabIndex) => {
                let tabLI = $('<li/>');
                // ul
                if (tab.sections.length > 0) {
                    let sectionUL = $('<ul class="tabname"><span>' + tab.tabName + '</span></ul>');
                    tab.sections.forEach(
                        (section) => {
                            let sectionLI;
                            let hasSteps = section.steps.length > 0;
                            if (hasSteps) {
                                // table
                                sectionLI = $('<li class="sectionname"/>').text(section.sectionName);
                                let sectionBody = $('<tbody/>');
                                section.steps.forEach(
                                    (step) => {

                                        let uploadButton =
                                            $(`<input class="fileUpload" 
                                        type="file" 
                                        name="uploads[]" 
                                        accept="image/jpg"
                                        multiple/>`);
                                        uploadButton.attr("images_id", step.images_id).on('change', fileUpload);

                                        let tr = $('<tr/>');
                                        let count = tallyObj[step.images_id]; // may be zero
                                        let knownImageId = "true";
                                        if (count === undefined) {
                                            // no known db doc for this images_id, none defined yet
                                            count = 0;
                                            knownImageId = "false";
                                        }
                                        count = (count === undefined) ? 0 : count;
                                        tr.append($('<td class="sname"><span class="text">' + step.stepName + '</span></td>'),
                                            $('<td class="numimages" knownImageId=' + knownImageId + '">' + count + '</td>'),
                                            $('<td/>').append(uploadButton));

                                        sectionBody.append(tr);

                                    }
                                );
                                sectionLI.append($('<table class="steptable"/>').append(sectionBody));
                            } else {
                                // announce empty section
                                sectionLI = $('<li class="sectionname"/>').html(section.sectionName + ": <u>empty</u>");
                            }
                            sectionUL.append(sectionLI);
                        }


                    );

                    tabLI.append(sectionUL);
                } else {
                    tabLI = $('<li class="tabname"/>').html(tab.tabName + ": <u>empty</u>");
                }

                tabsOL.append(tabLI);
                if (tabIndex !== STORE.tabs.length - 1) { // don't add separator after last tab
                    tabsOL.append($('<hr class="tabsep">'));
                }

            }
        );
        $('tabs').append(tabsOL);
    };

    // const openInSameTab = function (url) {
    //     let existingWindow = window.open(url, '_self');
    //     existingWindow.focus();
    // };

    // set event handlers for this page
    const setUp = function () { // TODO: Consider same navigation as other pages?
        hideSpin();

        // Prepare "buttons" on NAV bar
        // $("#nav_1").append($('<button id="home_button" class="navButton"><img src="/img/Ott.jpg" alt="Home" class="imageButton"></button>'));
        // $("#nav_2").append($('<button id="tabedit_button" class="navButton"><i class="far fa-edit fa-lg"></i>&nbsp;&nbsp;Edit Tabs</button>'));
        // $("#nav_3").html('');
        // $("#nav_4").append($('<button id="run" tabindex="1" class="active navButton" type="button"><i class="fas fa-bolt fa-lg"></i>&nbsp;&nbsp;Main</button>'));


        // $('#nav_2 .navButton').on('click', () => {
        //     Util.openInSameTab("/tabs/tabsedit.html");
        // });
        // $('#nav_1 .navButton').on('click', () => {
        //     Util.openInSameTab("/");
        // });
        // $('#nav_4 .navButton').on('click', () => {
        //     Util.openInSameTab("/tabs/main.html");
        // });
    };


    /////////////// supporting functions

    // handler for changes to <input type="file"> buttons on steps tables on page
    const fileUpload = function (ev) {

        ev.preventDefault();
        const files = $(this).get(0).files;
        if (files.length > 0) {
            const images_id = $(this).attr('images_id');

            DOM.CELL = $(this).parent();
            DOM.COUNTFIELD = $(this).closest('tr').find('.numimages');
            DOM.FILEUPLOADS = $(".fileUpload");
            // DOM.PROGRESS.hide().text('');
            DOM.NAV1 = $("#nav_1");
            DOM.NAV2 = $("#nav_2");
            DOM.NAV3 = $("#nav_3");
            DOM.NAV4 = $("#nav_4");
            showSpin();
            DOM.PROGRESS.show().text('');

            doTabUploads(files, images_id).then(
                () => {
                    // hideSpin();
                }
            )
                .catch((error) => {
                    // hideSpin();
                    // TODO: use catch, handle these errors
                    alert("tab upload failure: " + error);
                })
                .finally(hideSpin);
        }
    };

    const doTabUploads = function (files, images_id) {
        // create a FormData object which will be sent as the data payload in the
        // AJAX request
        const FORMDATA = new FormData();

        FORMDATA.append("id", images_id); // the ObjectId for this step in section of a tab
        FORMDATA.append("key4id", STORE.key4id); // job's key4id
        // FORMDATA.append("nextStepNum", STORE.tabs.nextStepNum); // tab's next available number for creating filenames
        FORMDATA.append("knownImageId", DOM.COUNTFIELD.attr('knownImageId')); // whether images_id setpFiles array element exists
        // loop through all the selected files and add them to the formData object
        for (let i = 0; i < files.length; i++) {
            // add the files to formData object for the data payload
            FORMDATA.append('uploads[]', files[i], files[i].name);
        }
        disableActionsNow();

        DOM.FILEUPLOADS.toggleClass("hidebuttons");
        DOM.CELL.toggleClass("stripes");
        DOM.COUNTFIELD.toggleClass("stripes");

        return new Promise((resolve, reject) => {
            $.ajax({
                url: "/tabUploads",
                type: 'post',
                data: FORMDATA,
                processData: false,
                contentType: false,
                xhr: () => {
                    let xhr = new window.XMLHttpRequest();
                    let upload = xhr.upload;
                    upload.addEventListener("progress",
                        uploadProgressHandler, false);
                    upload.addEventListener("load",
                        generic_loadHandler, false);
                    upload.addEventListener("error",
                        generic_errorHandler, false);
                    upload.addEventListener("abort",
                        generic_abortHandler, false);
                    return xhr;
                }
            })
                .done(
                    result => {
                        resolve(result);
                    })
                .fail((request, status, error) => {
                    console.log(status);
                    console.log(error);
                    reject(error);
                });
        }).then(
            (success) => {
                DOM.COUNTFIELD.text(parseInt(DOM.COUNTFIELD.text()) + success.count);
                DOM.PROGRESS.text('Processing... 100%').fadeOut('slow');
            },
            (error) => {
                DOM.PROGRESS.hide();
                alert("Error: " + error);
            }
        ).finally(
            () => {
                DOM.FILEUPLOADS.toggleClass("hidebuttons");
                DOM.CELL.toggleClass("stripes");
                enableActionsNow();
                DOM.COUNTFIELD.toggleClass("stripes");
                hideSpin();
            }
        );
    };


    let polling;

    function checkProgress(iid) {
        // console.log("checkprogress " + iid);

        $.get({
            url: "/get_progress/" + iid,
            dataType: 'json'
        })
            .done(
                result => {
                    if (result !== null && result.progress !== undefined) {
                        let percent = Math.floor(result.progress * 100 / result.total) + "%";
                        DOM.PROGRESS.css('background', 'tan').text("Processing...  " + percent);
                        // console.log("check: " + JSON.stringify(result.progress === result.total));
                        if (result.progress === result.total) {

                            clearInterval(polling);
                            // remove tracking tuple
                            $.get({
                                url: "/clear_progress/" + iid,
                                dataType: 'json'
                            })
                                .fail(() => {
                                    // alert("checkProgress/clear failure: " + error);
                                })
                                .done(() => {
                                    // alert("checkProgress success: " + doc);
                                });
                        }
                    }
                })
            .fail((request, status, error) => {
                alert("checkProgress failure: " + error);
            });
    }

    function uploadProgressHandler(event) {
        let progress = Math.ceil(event.loaded * 100.0 / event.total) + '%';
        if (event.loaded === event.total) {
            // alert("upload progress finish");
            DOM.PROGRESS.css('background', '#33B8FF').html("Uploading:&nbsp;Complete");
            setTimeout(() => {
                DOM.PROGRESS.html("Now Processing Images");
                checkProgress(STORE.key4id);
                polling = setInterval(checkProgress, 700, STORE.key4id);
            }, 700);

        } else {
            DOM.PROGRESS.css('background', '#33FF68').html("Uploading:&nbsp;" + progress);
        }
    }


    const dList = ""; // disabled during upload and processing: jQuery selector(s)

    const disableActionsNow = function () {
        if (dList !== "") {
            $(dList).css("pointer-events", "none");
        }
    };

    const enableActionsNow = function () {
        if (dList !== "") {
            $(dList).css("pointer-events", "auto");
        }
    };

    const generic_loadHandler = function ( /*event*/) {
        console.log("loaded " + new Date());
    };

    const generic_errorHandler = function ( /*event*/) {
        console.log("failed " + new Date());
    };

    const generic_abortHandler = function ( /*event*/) {
        console.log("aborted " + new Date());
    };


    /////////////////
    hideSpin();
    DOM.NAV = $('nav');
    DOM.PROGRESS = $('#progress').hide();
    DOM.JOB = $('job').html(COMMON.jobTitle());
    Util.setUpTabs(STORE.key4id, "", {
        tab: true,
        spec: true,
        main: true,
        machine: true,
        tabmenus: false
    }).then(
        () => start()
    );


});