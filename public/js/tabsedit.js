"use strict";
/* globals Common, Job, Tab, Section, Step */
// tabsedit.js


const openMark = '&#9658;';
const closeMark = '&#9660;';
const right_caret = '<span class="caret">' + closeMark + '</span>';
const sortableOptions = {
    axis: "y",
    cursor: "move",
    opacity: 0.5,
    cancel: '.empty',
    scroll: true
};

$(function () {
    // const key4 = 'LATHE|69-37869-2|30|ZL253-1';

    let cookie = new Common();
    ////////////////////////////////////////////////////////////
    let key4 = cookie.getKey4id();
    $("title").text("Edit Tabs");

    getTabsData(key4).then(
        (data) => {
            paintPage(key4, data);
            setup(key4);
        }
    );

    function setup(key4) {
        $('.caret').on('click', (e) => {
            let that = $(e.target);
            let openStr = that.text();
            let ul = that.closest('li').find('ul');

            if (ul.css('display') === 'none') {
                ul.slideDown('fast');
                ul.find('.caret').each(
                    (index, element) => {
                        let str = $(element).text();
                        if (str === openStr) {
                            $(element).closest('li').find('ul').slideUp(1);
                        }
                    });


                that.html(closeMark);
            } else {
                ul.slideUp('fast');
                that.html(openMark);
            }
        });

        $('.trash').on('click',
            (e) => {
                let li = $(e.target).closest('li');
                li.css('background', 'orange');
                li.fadeOut();
                setTimeout(function () {
                    li.addClass('deleted');
                }, 800);

            });

        $('button').on('click',
            (e) => {
                let doc = {
                    _id: key4,
                    user: "unknown",
                    tabs: []
                };

                let createTab = $(e.target).hasClass('createTab');
                $(".jobul > li:not(.deleted)").each(
                    (index, tabli) => {
                        let tabName = $(tabli).find('div.dflex input').val();
                        if (tabName !== "" && tabName !== undefined) {
                            let tabToSave = {
                                "tabname": tabName,
                                "sections": []
                            };


                            $(tabli).find('.tabul > li.sectionname:not(.deleted)').each(
                                (index, sectionli) => {
                                    let sectionName = $(sectionli).find('div.dflex input').val();
                                    console.log("\tSection val = " + sectionName);
                                    if (sectionName !== "" && sectionName !== undefined) {
                                        let aSection = {
                                            "sectionName": sectionName,
                                            "steps": []
                                        };
                                        $(sectionli).find('.sectionul > li.stepname:not(.deleted)').each(
                                            (index, stepsli) => {
                                                let stepName = $(stepsli).find('div.dflex input').val();
                                                if (stepName !== "" && stepName !== undefined) {
                                                    // console.log("\t\tStep NOT EMPTY" + stepName);
                                                    aSection.steps.push(stepName);
                                                }

                                            }
                                        );
                                        tabToSave.sections.push(aSection);
                                    }

                                }

                            );


                            doc.tabs.push(tabToSave);
                        }
                    }
                );

                putTabsData(doc).then(
                    r => {
                        if (r.error !== undefined) { // caught error
                            $.confirm({
                                title: 'Error on Saving Tabs',
                                icon: 'fas fa-exclamation-triangle',
                                content: 'Contact Supervisor',
                                useBootstrap: false,
                                boxWidth: "25%",
                                type: 'red',
                                typeAnimated: true,
                                buttons: {
                                    "Cancel": function () {}
                                }
                            });
                        } else { // success

                            $.confirm({
                                title: (createTab) ? "New Tab(s) Created" : 'Tab Changes Saved' ,
                                content: '',
                                autoClose: 'OK|3000',
                                useBootstrap: false,
                                boxWidth: "25%",
                                buttons: {
                                    OK: function () {}
                                }
                            });
                            if(createTab) {
                                createTab = false;
                                $(e.target).text('Edit Tab(s)').removeClass('createTab');
                            }
                        }
                    },
                    e => {
                        $.confirm({
                            title: 'Error on Saving Tabs',
                            icon: 'fas fa-exclamation-triangle',
                            content: e.error,
                            useBootstrap: false,
                            boxWidth: "25%",
                            type: 'red',
                            typeAnimated: true,
                            buttons: {
                                "Cancel": function () {}
                            }
                        });
                    }
                );
            });

        $('.sectionul, .tabul, .jobul').sortable(sortableOptions);

        //$(".sectional, .tabul, .jobul").disableSelection();
        $('input').on('dblclick', (e) => {
            let input = $(e.target);
            input.focus();
            var tmpStr = input.val();
            input.val('');
            input.val(tmpStr);
            return false;
        });



    }

    function insertNewLi2(e) { // click on plus circle icon
        let input = $(e.target).parent().parent().parent().find('input');
        if (input.val() !== "") {
            insertNewLiHelper(input);
        }
    }

    function insertNewLiHelper(that) {
        $(".sectionul, .tabul, .jobul").sortable("destroy");
        ///////////////////////////////////////////////////////////////////////////
        let myli = that.closest('li'); // can if be null?
        if (that.val() !== '') {
            if (myli.hasClass('stepname')) { // a stepname
                myli.before(li(that.val(), 'f', unique++, "stepname", false, "The Step Name")); // inside of containing section

            } else if (myli.hasClass('sectionname')) { // a sectionname
                let sectionli = li(that.val(), 's', unique++, "sectionname", true, "The Section Name");
                let sectionul = $('<ul class="sectionul"></ul>');
                sectionli.append(sectionul);

                sectionul.append(li("", 'f', unique++, "stepname empty", false, "The Step Name")); // add single empty step

                myli.before(sectionli); // inside of containing tab

            } else { // a tabname
                let tabli = li(that.val(), 't', unique++, "tabname", true, "The Tab Name");
                let tabul = $('<ul class="tabul"></ul>');
                tabul.append(li("", 's', unique++, "sectionname empty", false, "The Section Name"));
                tabli.append(tabul);
                // tabul.sortable(sortableOptions);
                myli.before(tabli);
                // add a section
            }
            // myli.closest('ul').sortable('refresh');
            that.val('');
            ///////////////////////////////////////////////////////////////////////////
            $('.sectionul, .tabul, .jobul').sortable(sortableOptions);
        }

    }

    function getTabsData(_id) {
        return new Promise((resolve, reject) => {
            $.post({
                    url: "/get_tabs",
                    data: {
                        _id: _id
                    },
                    dataType: 'json'
                })
                .done((result) => resolve(result))

                .fail((request, status, error) => reject(error));
        });
    }

    function putTabsData(doc) {
        console.log("putTabsData " + doc);
        return new Promise((resolve, reject) => {
            $.post({
                    url: "/set_tabs",
                    data: {
                        _id: doc._id,
                        doc: JSON.stringify(doc)
                    },
                    dataType: 'json'
                })
                .done((result) => resolve(result))

                .fail((request, status, error) => reject(error));
        });
    }

    function createJobObj(aJob, tabs) {
        let jobObj = new Job(aJob, "User");
        tabs.forEach(tab => {
            let aTab = new Tab(tab.tabname);
            tab.sections.forEach(section => {
                let aSection = new Section(section.sectionName);
                section.steps.forEach(stepname => {
                    aSection.pushStep(new Step(stepname));
                });
                aTab.pushSection(aSection);
            });
            jobObj.pushTab(aTab);
        });
        return jobObj;
    }

    let unique = 0; // numbering for li items // may not be needed
    function paintPage(aJob, jobDoc) { // tabs is a single document for one job
        let brandNew = false;
        if(jobDoc.tabs === undefined) {
            // no tabs defined yet
            jobDoc = {
                "_id": aJob, // a key4 string
                "user": "unknown",
                "tabs": [{
                        "tabname": "A New 1st Tab",
                        "sections": [{
                            "sectionName": "A New 1st Section",
                            "steps": [
                                "A New 1st Step"
                            ]
                        }]
                    }
                ]
            };
            brandNew = true;
        }

        // Initialize objects from data
        let jobObj = createJobObj(aJob, jobDoc.tabs);

        // create HTML

        $('body').empty().append($('<div id="top"></div>'), $('<div id="job"></div>'));

        let jobul = $('<ul class="jobul"></ul>');

        jobObj.getTabs().forEach(
            (tab) => {
                let tabli = li(tab.getTabName(), 't', unique++, "tabname", true, "The TAB Name");
                let tabul = $('<ul class="tabul"></ul>');
                tabli.append(tabul);
                tab.getSections().forEach(
                    (section) => {
                        let sectionli = li(section.getSectionName(), 's', unique++, "sectionname", true, "The Section Name");
                        let sectionul = $('<ul class="sectionul"></ul>');
                        sectionli.append(sectionul);
                        section.getSteps().forEach(
                            (step) => {
                                let stepli = li(step.getStepName(), 'f', unique++, "stepname", false, "The Step Name");
                                sectionul.append(stepli);
                            }
                        );
                        sectionul.append(li("", 'f', unique++, "stepname empty", false, "The Step Name"));
                        tabul.append(sectionli);
                    }
                );
                tabul.append(li("", 's', unique++, "sectionname empty", false, "The Section Name"));
                jobul.append(tabli);
            }
        );
        let button = $('<button class="button">Save Changes</button>');
        if(brandNew) {
            let rarr = $('<span class="newJob">&nbsp;&rarr;</span>');
            button.text('Create Tabs');
            button.addClass('createTab');
            $('#top').html('Job: ' + jobObj.getName()).append(rarr,button);
        }
        else {
            $('#top').html('Job: ' + jobObj.getName()).append(button);
        }
        let addItem = li("", 't', unique++, "tabname empty", false, "The Tab Name");
        jobul.append(addItem);
        $('#job').append(jobul);
    }

    function li(name, tag, num, aClass, addCaret, title) {
        let inputClass = "stepstyle";
        if (aClass.indexOf("section") !== -1) {
            inputClass = "sectionstyle";
        } else if (aClass.indexOf("tab") !== -1) {
            inputClass = "tabstyle";
        }
        let fclass = "dflex";
        if (name === "") {
            fclass = "dflexempty";
        }
        let result = '<li id="' + tag + '_' + num + '" class="ui-state-default ' +
            aClass + '"><div class="' + fclass + '">';
        if (addCaret) {
            result += right_caret;
        }
        let input;
        if (name === "") {
            let place = aClass.substr(0, aClass.indexOf('name'));
            place = '&rarr;&nbsp;Add a ' + place.charAt(0).toUpperCase() + place.substr(1);

            input = '<input class="emptyinput" placeholder="' + place + '" type="text" title="' + title + '"/>';
        } else {
            input = '<input class="' + inputClass + '" type="text" title="' + title + '" value="' + name + '"/>';
        }
        result += input;

        if (name !== "") {
            result += '<span class="trash">X</span>';
            result += '<span align-self="flex-end" class="arrow"><i  class="fas fa-arrows-alt-v"></i></span>';
        } else {
            result += '<span align-self="center" class="addcircle adddiv"><i class="fas fa-plus-circle"></i></i></span>';
        }

        result += '</div>';
        result = $(result);
        // result.on('keydown', insertNewLi);
        if ($(result).find('.addcircle')) {
            // if(aClass.indexOf('step') !== -1) {
            //     result.find('input').on('keydown', insertNewLi);
            // }
            $(result).find('.addcircle').on('click', insertNewLi2);
        }
        return result;
    }


});