"use strict";
// two.js
const COOKIE = 'chosenCookie';
var cookieValue = "not set";
const floatName = "#floatMenu";
const SPACE = "&nbsp;";
const deletedImages = {}; // tracks list of deleted images for each link
const allImgWraps = []; // array of objects, {warp: the imgWrap jq object, deleted: boolean}
const lgp = [];
//const deletedImgWraps = [];
let maxImageShowing = 0; // incremneted as images are displayed
let LG;
let undoChoosing = false;
let deleteChoosing = false;

const TAB_KEY = 9;
const RIGHT_KEY = 39;
const LEFT_KEY = 37;
const DOWN_KEY = 40;
const UP_KEY = 38;
const ESCAPE_KEY = 27;
const ENTER_KEY = 13;

const SECTION = 'Tools';

let imageShowing = -1; // an integer, no image visible
$(function () {

    $.getScript("/js/common.js")
        .done(function (/*script, textStatus*/) {

            ////////////////////////////////////////////////////////////
            cookieValue = unescape(readCookie(COOKIE));
            let key5 = getParsedCookie();
            $("title").text("Part " + getParsedCookie().partId);

            $("#cookie").text(getCookie());
            setThisTab(2);
            $("#job p").text(
                [
                    key5.partId, key5.pName, key5.dept, key5.op, key5.machine
                ].join(" : ")
            );

            getSpec(getParsedCookie().machine)
                .then(machineSpecs => {
                    getImages(SECTION).then((toolData) => {
                        paintPage(machineSpecs, toolData);
                    });
                });
            setTimeout(delayedFragmentTargetOffset, 500);
            ////////////////////////////////////////////////////////////
        })
        .fail(function (/*jqxhr, settings, exception*/) {
            console.log("getScript " + "Triggered ajaxError handler.");
        });
    $("#floatButton").on('click', hideShowFloat);

    // $('body').on('keydown', nextImage);


    $('#Fullscreen').css('height', $(document).outerHeight() + 'px');
    $('#Fullscreen img').click(function () {
        $(this).fadeOut(); //this will hide the fullscreen div if you click away from the image. 
        $(this).parent().fadeOut();
        $('#expand').show();
    });

    $('#taButtonCancel').on("click", () => {
        enableActionsNow();
        $('#tadiv').css('display', 'none');
        $("#ta").text('');
        return false;
    });

    let form = $('#undoMenu').find('form');
    form.find('[value="Submit"]').on("click", undoSubmit);
    form.find('[value="Cancel"]').on("click",
        () => {
            $('#undoMenu').hide();
            enableActionsNow();
            $("#Fullscreen").hide();
            $("#Fullscreen img").show(); // reset for next use
            $('#checkAll').off(); // no need to keep function around
            undoChoosing = false;
            return false;
        });
});

function LinkGroup(prev, next, start, stop, link) {

    this.start = start;
    this.stop = stop;
    this.prev = prev;
    this.next = next;
    this.link = link;

    this.setPrev = (p) => this.prev = p;
    this.getPrev = () => this.prev;

    this.setNext = (n) => this.next = n;
    this.getNext = () => this.next;

    this.getLink = () => this.link;
    this.setLink = (n) => this.link = n;

    this.getStart = () => this.start;
    this.setStart = (s) => this.start = s;

    this.getStop = () => this.stop;
    this.setStop = (s) => this.stop = s;
}

function catchKeys(state, code) {
    // note: confim dialogs handle this on their own

    switch (state) {
        // Don't Catch Enter for editing comment... then can have no newlines.
        // case "comment": // Enter when editing comment will Submit (Update)
        // $('body').on('keypress', function(args) {
        //     if (args.keyCode == 13) {
        //         $('#taButtonUpdate').click();
        //         return false;
        //     }
        // });
        // break;

        // case "undo": // Enter for Undo Update triggers click on Submit button
        //     // $('body').on('keypress', function (args) {
        //     //     if (codes.indexOf(args.keyCode) != -1) {
        //     //         $('#undoSubmit').click();
        //     //         return false;
        //     //     }
        //     // });
        //     alert("catchKeys -- error: should not be here for undo");
        //     break;

        case "single":
            var $events = jQuery._data(jQuery("body")[0], "events");
            //validate if the element has an event attached
            if (typeof $events !== "undefined" && typeof $events.keydown[0] !== "undefined") {
                //iteration to get each one of the handlers
                // jQuery.each($events, function (i, event) {
                //     jQuery.each(event, function (i, handler) {
                //         console.log("has keydown " + handler); // write on console the handler
                //     });
                // });
                // keydown event for body already defined
            } else {
                //alert("catchKeys(" + state + "," + code + ")");

                $('body').on('keydown', function (args) {
                    if (args.keyCode === ENTER_KEY) {
                        if (undoChoosing === true) {
                            //alert("enter key");
                            $('#undoMenu form input[value=Submit]').trigger('click');
                            return false;
                        } else if (deleteChoosing == true) {
                            $('div.jconfirm').find('button.confirm-deletion').trigger('click');
                            return false;
                        }
                    }
                    else
                        switch (args.keyCode) {

                            case LEFT_KEY:
                                nextImage(-1);
                                break;

                            case TAB_KEY:
                            case RIGHT_KEY:
                                nextImage(1);
                                break;

                            case ESCAPE_KEY:
                                closeSingle();
                                break;

                            case UP_KEY:
                                moveToGroup('prev');
                                break;

                            case DOWN_KEY:
                                moveToGroup('next');
                                break;

                            default:
                                return true;
                        }
                    return false;
                });
            }
            break;

        case 'off':
            $('body').off(code);
            break;

    }
}

function moveToGroup(direction) {
    let myLG = lgp[imageShowing];
    // reset imageShowing for previous or next group
    if (direction === 'prev') {
        if (myLG.prev !== null) {
            imageShowing = myLG.prev.getStart();
            if (allImgWraps[imageShowing].deleted === true) {
                let i = imageShowing;
                for (; i > 0; i--) {
                    if (allImgWraps[imageShowing].deleted !== true) {
                        imageShowing = i;
                        break;
                    }
                }
                if (i === 0) return; // reached beginning so do not move
            }
            goGroup();
        } else {
            return;
        }
    } else {
        if (myLG.next !== null) {
            imageShowing = myLG.next.getStart();
            if (allImgWraps[imageShowing].deleted === true) {
                let i = imageShowing;
                for (; i < maxImageShowing; i++) {
                    if (allImgWraps[imageShowing].deleted !== true) {
                        imageShowing = i;
                        break;
                    }
                }
                if (i === maxImageShowing) return; // reached end so do not move
            }
            goGroup();
        } else {
            return;
        }
    }
}

function goGroup() { // move page and open first image in group
    let img = $(allImgWraps[imageShowing].wrap).find('img'); // get imag for this img-wrap
    let anchorName = img.attr('link'); // get link for the image group
    let aTag = $('#' + anchorName); // set aTag to the anchor for the link
    $('html,body').animate({ scrollTop: aTag.offset().top }); // scroll the page
    img.trigger('click'); // "click" on the image
}


function closeSingle() {
    singleToEmpty();
    $("pictures img[showingsingle='true']")
        .attr('showingsingle', false)
        .css("border-color", "transparent");
    catchKeys('off', 'keydown');
}

function fullscreenSingle() {
    let img = $('img.iv-large-image');
    let src = img.attr('src'); //get the source attribute of the clicked image

    $('#Fullscreen img').attr('src', src); //assign it to the tag for your fullscreen div
    $('#Fullscreen').fadeIn();
    $('#Fullscreen img').fadeIn();
}

function hideShowFloat() {
    $(floatName).toggleClass('hidden');
}

// function byDigits(a, b) {
//     return fnNum(a.filename) - fnNum(b.filename);
// }

// function fnNum(filename) {
//     return parseInt(
//         filename.slice(filename.lastIndexOf('_') + 1,
//             filename.lastIndexOf('.')).replace("0", ""));
// }

function paintPage(toolSpecs, toolData) {
    let links = []; // for float menu
    let pictures = $('pictures');
    let currentTurret = 0;
    let currentSpindle = 0;
    maxImageShowing = 0;
    let curLG = null;
    toolData.forEach(
        item => {
            let link = [item.turret, item.position, item.spindle, item.offset].join('_');
            deletedImages[link] = []; // empty to start

            if (curLG !== null) { // have a group
                if (curLG.getStart() !== curLG.getStop()) { // ignore groups with no images
                    curLG.setNext(new LinkGroup(curLG, null, maxImageShowing, null, link));
                    curLG = curLG.getNext();
                } else {
                    curLG.setLink(link);
                }
            } else { // initialize
                curLG = new LinkGroup(null, null, maxImageShowing, null, link);
                LG = curLG;
            }

            let text = item.position + '-' + item.offset + ") " +
                item.function + ":  " + item.type;
            let linkText = item.position + '-' + item.offset + ") " +
                item.function;

            if (currentTurret !== item.turret || currentSpindle !== item.spindle) {
                let headText = "Turret" + item.turret + " " + "Spindle" + item.spindle;
                let headLink = [item.turret, item.spindle].join('-');

                let anchor = $('<a class="anchor" id="' + headLink + '"/>');
                pictures.append(anchor);
                pictures.append(
                    $('<div class="headtext"/>').text(headText)
                );

                links.push(['#' + headLink, headText]);
                // set current values so can detect need for next UL on change
                currentTurret = item.turret;
                currentSpindle = item.spindle;
            }

            links.push(['#' + link, linkText]); // -- Jeff request to drop type
            let anchor = $('<a class="anchor" id="' + link + '"/>');
            pictures.append(anchor);
            let pic = $('<div class="pic" id="pic' + link + '">');
            let div = $('<div/>');
            let p = $('<p/>');

            let buttonHTML =
                '<button class="checkAllDel doAll" type="button">' +
                '&nbsp;&nbsp;&#10004; All</button>';

            p.html(buttonHTML + "&nbsp;&nbsp;" + text +
                '<i class="fa fa-undo redUndo"></i>');
            p.find('i').on('click', null, {
                "link": link
            }, undoChoices).hide();
            div.append(p);
            let pItems = $('<pItems/>');
            let count = 0;
            item.files.forEach(
                (path, index) => {
                    let small = path.dir.replace('/' + SECTION + '/',
                        '/' + SECTION + '_small/');
                    let large = path.dir.replace('/' + SECTION + '/',
                        '/' + SECTION + '_large/');

                    let idiv = $('<div class="img-wrap"/>');
                    idiv.append($('<span class="close">&times;</span>'));
                    idiv.append($('<input class="ckbx" name="' +
                        link +
                        '" type="checkbox">'));
                    // add handlers for video
                    let img = $('<img/>', {
                        height: "100px",
                        alt: item.function + ": " + item.type,
                        link: link,
                        tag: item.position + '-' + item.offset,
                        src: small + '/' + path.filename,
                        comment: path.comment,
                        dir: path.dir,
                        dir_small: small,
                        dir_large: large,
                        filename: path.filename,
                        showingSingle: false,
                        order: index,
                        spindle: item.spindle,
                        turret: item.turret,
                        sequence: maxImageShowing
                    });
                    idiv.attr('sequence', maxImageShowing + "");
                    lgp[maxImageShowing] = curLG; // save LinkGroup for each image

                    allImgWraps[maxImageShowing] = { wrap: idiv, deleted: false };
                    maxImageShowing++;

                    count = index + 1;
                    idiv.append(img);
                    pItems.append(idiv);
                }
            );
            let groupButton = p.find('button');
            groupButton.on('click', null, { link: link }, delSelectAll);
            groupButton.hide();
            if (count > 0) {
                groupButton.show();
            }
            pic.append(div);
            div.append(pItems);
            pictures.append(pic);

            curLG.setStop(maxImageShowing);
        });
    if (curLG.getStart() === curLG.getStop()) {
        // remove last LG
        curLG.getPrev().setNext(null);
        curLG = curLG.getPrev();
    }
    // form circle so that UP and DOWN arrows move in continuous circle
    curLG.setNext(LG);
    LG.setPrev(curLG);

    // alert("maxImageShowing " + maxImageShowing);
    $('.img-wrap .close').on('click', closeDelete);

    $("pictures img").on("click", imgClick);
    // $('body').on("keypress", nextImage);
    // build floating menu
    let float = $(floatName);
    let dash = /-/;
    let prev = '';
    links.forEach(
        link => {
            if (dash.test(link[0])) { // start (possibly end) ul
                if (prev !== '') {
                    let endUl = $('</ul>');
                    float.append(endUl);
                }
                let a1 = $('<a href="' + link[0] + '">').text(link[1]);
                prev = $('<ul/>').append(a1);
                float.append(prev);
            } else {
                let a2 = $('<a href="' + link[0] + '">').text(link[1]);
                prev.append($('<li/>').append(a2));
            }
        });
    float.append($('</ul>'));
    enableCheckBoxes();
}
function delSelectAll(e) {
    let link = e.data.link;
    let boxes = $('#pic' + link).find('.ckbx');
    let html = '';
    if ($(this).html().includes('un')) {
        html = ' &nbsp;&nbsp;'
        boxes.prop('checked', false);
        $(this).removeClass('undoAll').addClass('doAll');
    } else {
        html = 'un';
        boxes.prop('checked', true);
        $(this).removeClass('doAll').addClass('undoAll');
    }
    $(this).html(html + '&#10004; All');
    return false;
}
function nextImage(direction) {
    if (imageShowing != -1) {
        showNextSingle(direction);
    }
}
function showNextSingle(direction) {
    // console.log("showNextSingle(" + direction + ") " + imageShowing);
    // alert("showing " + imageShowing);
    imageShowing = imageShowing + direction;

    // are we rolling back over start, or beyond end?
    if (imageShowing >= maxImageShowing) imageShowing = 0;
    else if (imageShowing < 0) imageShowing = maxImageShowing - 1;  // RMA check range

    // replace single with new image
    if (allImgWraps[imageShowing].deleted === true) {
        // console.log("again");
        // find next imgWrap showing, then trigger click there
        showNextSingle(direction);
    }
    // console.log("showNextSingle calc: " + imageShowing);
    let img = $(allImgWraps[imageShowing].wrap).find('img');
    let anchorName = img.attr('link');
    let aTag = $('#' + anchorName);
    $('html,body').animate({ scrollTop: aTag.offset().top });

    img.trigger('click');
}
function singleToEmpty() {
    $('#expand').off().empty();
    $('single > form').empty();
    imageShowing = -1;

}

function imgClick() { // when small image clicked to show larger image
    $(".pic").removeClass('highlight');
    $(this).closest('.pic').addClass('highlight');
    let single = $("single > form");
    let wrapper = $(this).closest('.img-wrap');
    singleToEmpty();
    //catchKeys('off', 'keydown'); // turns off keydown on body
    $("pictures img[showingsingle='true']")
        .attr('showingsingle', false)
        .css("border-color", "transparent");

    single.append($('<h4/>')
        .html("Turret" + SPACE + $(this).attr("turret") +
        SPACE + SPACE + SPACE + "Spindle" + SPACE + $(this).attr("spindle")));
    let txt = "Tool " + $(this).attr("tag") + ") " + $(this).attr("alt");
    if (txt.length > 53) {
        txt = txt.substring(0, 53) + " <b>...</b>"
    }
    single.append($('<h2/>').html(txt));
    single.append('<p id="expand"/>');
    $(this).css("border-color", "blue");
    $(this).attr("showingSingle", true);

    $("#expand").html('<i class="fa fa-arrows-alt fa-2x"/>')
        .on("click", fullscreenSingle)
        .css('cursor', 'url(' + '"/img/expand.png"' + '), pointer');

    var img = $('<img class="pannable-image"/>');
    let fileName = $(this).attr('filename');
    img.attr('src', $(this).attr("dir") + '/' + fileName);
    img.attr('data-high-res-src', $(this).attr("dir_large") + '/' + fileName);
    img.attr('alt', $(this).attr('filename'));

    let in_single = $('<div id="image-gallery" class="in_single cf"/>');
    in_single.append(img);

    single.append(in_single);
    // img.focus();
    imageShowing = parseInt($(this).attr('sequence')); // global, impacts arrow/tab handling
    // alert("single for " + imageShowing);
    $('.pannable-image').ImageViewer();
    let commentP = $('<p class="comment">' + $(this).attr("comment") + "</p>")
        .on("click",
        null,
        { img: $(this) },
        editComment);
    single.append(commentP);
    catchKeys("single"); // on for keydown

}

function editComment(ev) {
    $('#ta').val(ev.data.img.attr("comment"));

    $('#taButtonUpdate').off()
        .on("click", null,
        { img: ev.data.img },
        updateComment);
    disableActionsNow();
    $("#tadiv").css("display", "flex");
    return false;
}

function closeDelete() { // when X is clicked in small image, invokes deletion

    let imgWrap = $(this).closest('.img-wrap');
    let siblings = imgWrap.closest('pitems').find('.ckbx:checked');
    let dCount = siblings.length;

    if (dCount !== 0) { // some checkboxes checked among siblings
        if (imgWrap.find('.ckbx:checked').length != 1) {
            $.confirm({
                title: '<br/>Please click X on one of<br/>the Selected images.',
                content: "",
                autoClose: 'ok|5000',
                icon: 'fa fa-warning',
                useBootstrap: false,
                boxWidth: '500px',
                type: 'orange',
                typeAnimated: true,
                buttons: {
                    ok: {
                        text: 'OK'
                    }
                }
            });
            
            return false;
        }
    }

    let ximg = imgWrap.find('img');
    if (dCount < 2) { // ONE item selected, or simply X with no selection
        //alert("one matching");
        let fileName = ximg.attr('filename');
        let dir_small = ximg.attr('dir_small');
        deleteChoosing = true;
        $.confirm({
            boxWidth: '500px',
            useBootstrap: false,
            type: 'dark',
            draggable: true,
            animation: 'left',
            title: "Image Deletion",
            content: '<img src="' + dir_small + '/' + fileName + '"/>' +
                SPACE + SPACE +
                'Do you want to delete this image?',

            buttons: {
                Yes: {
                    text: "Yes - Delete it!",
                    btnClass: 'btn-blue confirm-deletion',
                    keys: ['enter'],
                    action: function () {
                        delete1Image(imgWrap, ximg);
                        siblings.prop('checked',false);
                        deleteChoosing = false;
                    }
                },
                No: {
                    btnClass: 'btn-red',
                    action: function () {
                        deleteChoosing = false;
                    }
                },
            }
        });
    } else {
        deleteChoosing = true;
        $.confirm({
            // keyboardEnabled: true,
            boxWidth: '500px',
            useBootstrap: false,
            type: 'dark',
            draggable: true,
            animation: 'left',
            title: "Image Deletion",
            content: SPACE + SPACE +
                'Do you want to delete ' + dCount + ' images?',

            buttons: {
                Yes: {
                    text: "Yes - Delete them!",
                    btnClass: 'btn-blue confirm-deletion',
                    keys: ['enter'],
                    action: function () {
                        deleteNImages(siblings, ximg);
                        siblings.prop('checked',false);
                        deleteChoosing = false;
                    }
                },
                No: {
                    btnClass: 'btn-red',
                    action: function () {
                        deleteChoosing = false;
                    }
                },
            }
        });
    }
    return false;
}

function delete1Image(wrapper, ximg) {
    // remove from db
    let turret, position, spindle, offset;
    let link = ximg.attr('link');
    [turret, position, spindle, offset] =
        link.split('_').map(val => parseInt(val));
    let query = {
        "key4": getKey4id(),
        "turret": turret, // need int for actual query, have to convert in router code
        "spindle": spindle,
        "position": position,
        "offset": offset,
        "tab": SECTION
    };

    let img = ximg; // wrapper.find('img');
    let order = ximg.attr('order');
    let filedata = {
        "dir": ximg.attr('dir'),
        "filename": ximg.attr('filename'),
        "comment": ximg.attr('comment')
    };
    dbImagesDelete(query, filedata).then(
        () => {

            // remove single if showing this image
            if (img.attr("showingSingle") === "true") {
                wrapper.closest('.pic').css('background', '');
                wrapper.find('img').css('border-color', '');
                singleToEmpty();
            }

            let pic = $('#pic' + link);
            deletedImages[link][order] = wrapper;
            allImgWraps[parseInt(img.attr('sequence'))].deleted = true;

            pic.find("div > p > i").html(
                SPACE +
                deletedImages[link].filter(x => x !== null).length)
                .show();

            // adjust UI (hide imagewrap)

            renderCheckAllButton(wrapper, 'hide');

        },
        failure => alert(
            "Unable to perform database delete from images collection.\n" +
            JSON.stringify(failure))
    );
}

function deleteNImages(siblings, ximg) {
    let wrappers = siblings.map(
        (index, element) => {
            return $(element).closest('.img-wrap')
        }).get();
    // remove from db
    let turret, position, spindle, offset;
    let link = ximg.attr('link');
    [turret, position, spindle, offset] =
        link.split('_').map(val => parseInt(val));
    let query = {
        "key4": getKey4id(),
        "turret": turret, // need int for actual query, have to convert in router code
        "spindle": spindle,
        "position": position,
        "offset": offset,
        "tab": SECTION
    };

    $.makeArray(wrappers).forEach(
        element => {
            let wrapper = $(element);
            let img = wrapper.find('img');
            let order = img.attr('order');
            // alert(img.attr('filename'));
            let filedata = {
                "dir": img.attr('dir'),
                "filename": img.attr('filename'),
                "comment": img.attr('comment')
            };
            dbImagesDelete(query, filedata).then(
                () => {

                    // remove single if showing this image
                    if (img.attr("showingSingle") === "true") {
                        wrapper.closest('.pic').css('background', '');
                        wrapper.find('img').css('border-color', '');
                        singleToEmpty();
                    }

                    let pic = $('#pic' + link);
                    deletedImages[link][order] = wrapper;
                    allImgWraps[parseInt(img.attr('sequence'))].deleted = true;

                    pic.find("div > p > i").html(
                        SPACE +
                        deletedImages[link].filter(x => x !== null).length)
                        .show();

                    // adjust UI (hide imagewrap)

                    renderCheckAllButton(wrapper, 'hide');

                },
                failure => alert(
                    "Unable to perform database delete from images collection.\n" +
                    JSON.stringify(failure))
            );
        });
}

function countShowing(sibs) {
    let count = 0;
    sibs.each((index, element) => {
        // console.log(index + " " + $(element).css('display'));
        count += ($(element).css('display') !== 'none') ? 1 : 0;
    });
    return count;
}

function renderCheckAllButton(wrapper, action) {
    let sibs = wrapper.closest('pitems').find('.img-wrap');
    const delAllButtonClass = '.checkAllDel';

    let button = wrapper.closest('.pic').find(delAllButtonClass);

    if (action === 'hide') {
        wrapper.hide();
    } else {
        wrapper.show();
    }

    let stillShowing = countShowing(sibs);

    if (stillShowing === 0) {
        button.hide();
    } else {
        button.show();
    }
}

function updateComment(ev) { //RMA INWORK
    let currentVal = $('#ta').val();

    // modify the db
    $('single .comment').text(currentVal);   // modify the displayed large image comment
    ev.data.img.attr("comment", currentVal); // modify the small image comment
    dbUpdateImageComment(ev.data.img).then(
        success => {
            //alert("db updated comment");
        },
        failure => {
            alert("failure: db NOT updated comment");
        }
    );
    $('#tadiv').css('display', 'none');
    enableActionsNow();

    return false;
}

const dList = ".redUndo, .img-wrap .close, pictures img, .w3-bar a, #floatMenu a";

function disableActionsNow() {
    $("#Fullscreen").show();
    $("#Fullscreen img").hide();
    $(dList).css("pointer-events", "none");
}

function enableActionsNow() {
    $(dList).css("pointer-events", "auto");
    $("#Fullscreen img").show();
    $("#Fullscreen").hide();
}

function undoChoices(ev) {
    let link = ev.data.link;
    let undo = $('#undoMenu');
    let formUl = undo.find('form > ul').empty();
    // disable submit button
    let choices = deletedImages[link];
    let remaining = 0;
    choices.forEach(
        (aWrapper/*, index*/) => {
            if (aWrapper !== null) {
                let theImg = aWrapper.find('img');
                let showImg = '<img src="' +
                    theImg.attr('dir_small') + '/' +
                    theImg.attr('filename') + '">';
                let li = $(
                    '<li><input type="checkbox" name="undoItems" value="' +
                    link + ":" + theImg.attr('order') + '"> ' +
                    SPACE + (++remaining) + SPACE +
                    showImg + '</li>');
                formUl.append(li);
            }
        }
    );
    // start with Submit disabled
    let undoForm = undo.find('form');

    undoForm.find('[value="Submit"]').prop('disabled', true);
    formUl.find("input[type=checkbox]").on('click',
        () => { // RMA -- check if all unchecked?? If so - disable Submit
            undoForm.find('[value="Submit"]').prop('disabled', false).focus();
        });
    if (remaining > 0) {
        if (remaining > 1) {
            undo.find('p').text("Restore Images");
            let button = $('<button id="checkAll">Check All</button>');
            button.on("click", toggleAllUndos); // RMA do off for button after actions
            formUl.prepend(button);

        } else {
            undo.find('p').text("Restore Image");
        }

        disableActionsNow();
        //catchKeys([13], "undo");
        undoChoosing = true;
        undo.show();
    }
}

function toggleAllUndos() {
    if ($("#checkAll").text() === "Check All") {
        toUnCheckAll()
    } else {
        toCheckAll();
    }

    return false;
}

function toUnCheckAll() {
    $("#checkAll").text("Uncheck All");
    $('#undoMenu form input[name=undoItems]').prop('checked', true);
    $('#undoMenu form input[value=Submit]').prop('disabled', false);
}

function toCheckAll() {
    $("#checkAll").text("Check All");
    $('#undoMenu form input[name=undoItems]').prop('checked', false);
    $('#undoMenu form input[value=Submit]').prop('disabled', true);
}

function undoSubmit(/*ev*/) {
    let undo = $('#undoMenu');
    $('#undoMenu form input[name=undoItems]:checked').each(
        (index, ele) => {
            let item = $(ele).val();
            let link, order;
            [link, order] = item.split(":");
            let imgWrap = deletedImages[link][parseInt(order)];
            let sequence = parseInt(imgWrap.attr('sequence'));
            let img = imgWrap.find('img');
            let filedata = {
                "dir": img.attr('dir'),
                "filename": img.attr('filename'),
                "comment": img.attr('comment')
            };

            //console.log("undo " + img.attr('filename'));
            let turret, position, spindle, offset;
            [turret, position, spindle, offset] = link.split(/_/); // Careful!
            let query = {
                "key4": getKey4id(),
                "turret": turret, // need int for actual query
                "spindle": spindle,
                "position": position,
                "offset": offset,
                "tab": SECTION
            };
            // puts "archived" back in "files"
            dbImagesRestore(query, filedata).then(
                success => { },
                error => alert("dbImagesRestore " + error)
            );

            // restore imgWrap

            renderCheckAllButton(imgWrap, 'show');
            // uncheck restored image
            imgWrap.find('.ckbx').prop('checked', false);
            // indicate restored images with orange border

            img.css("border-color", "orange");
            setTimeout(
                () => {
                    // remove orange border
                    img.css("border-color", "transparent");
                }, 1000);

            allImgWraps[sequence].deleted = false;

            deletedImages[link][parseInt(order)] = null;
            let remaining = deletedImages[link].filter(x => x !== null).length;
            let icon = $("#pic" + link).find("div > p > i");
            if (remaining === 0) {
                icon.hide();
            } else {
                icon.html(SPACE + remaining);
            }
        }
    );
    //$('#undoMenu form input[name=undoItems]').prop('checked', false);
    undoChoosing = false;
    enableActionsNow();

    undo.hide();
    $('#checkAll').off(); // no need to keep function around
    return false;
}

function dbUpdateImageComment(img) {
    let turret, position, spindle, offset;
    [turret, position, spindle, offset] =
        img.attr("link").split(/_/)
            .map(val => parseInt(val));
    let query = {
        "key4": getKey4id(),
        "turret": turret,
        "spindle": spindle,
        "position": position,
        "offset": offset,
        "tab": SECTION
    };
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/updateImageComment",
            type: 'post',
            data: {
                "query": query,
                "filename": img.attr('filename'),
                "dir": img.attr('dir'),
                "comment": img.attr('comment')
            },
            dataType: 'json'
        })
            .done(result => {
                //alert("updateImageComment " + JSON.stringify(result));
                resolve(result);
            })
            .fail((request, status, error) => reject(error));
    });
}
// function archiveImages(dirs, fileName) {
//     return new Promise((resolve, reject) => {
//         $.ajax({
//             url: "/archiveImages",
//             type: 'post',
//             data: {
//                 "dirs": dirs,
//                 "fileName": fileName
//             },
//             dataType: 'json'
//         })
//             .done((result) => resolve(result))
//             .fail((request, status, error) => reject(error));
//     });
// }

function dbImagesDelete(query, filedata) {
    //console.log(JSON.stringify(query));
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/deleteDbImages",
            type: 'post',
            data: {
                "query": query,
                "filedata": filedata
            },
            dataType: 'json'
        })
            .success((result) => {

                //console.log("dbImagesDelete done " + JSON.stringify(result));
                if (result.nModified === 1) {
                    resolve(result);
                }
                else {
                    reject(result);
                }

            })
            .fail((request, status, error) => {
                //debugger;
                console.log("dbImagesDelete fail " + JSON.stringify(error));
                reject(error);
            });
    });
}

function dbImagesRestore(query, filedata) {
    //console.log(JSON.stringify(query));
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/restoreDbImages",
            type: 'post',
            data: {
                "query": query,
                "filedata": filedata
            },
            dataType: 'json'
        })
            .success(
            result => {


                if (result.nModified === 1) {
                    resolve(result);
                }
                else {
                    //////////////////DEBUG
                    //debugLogReport(query, result, filedata.filename);

                    // console.log("dbImagesRestore done " + JSON.stringify(result));
                    // console.log(JSON.stringify(query));
                    // console.log(filedata.filename);
                    alert("result.nModified !== 1");
                    //////////////////DEBUG
                    reject(result);
                }

            })
            .fail((request, status, error) => {
                //debugger;
                console.log("dbImagesRestore fail " + JSON.stringify(error));
                reject(error);
            });
    });
}

function debugLogReport(q, r, f) {
    $.ajax({
        url: "/reportLog",
        type: 'post',
        data: {
            "q": q,
            "r": r,
            "f": f
        },
        dataType: 'json'
    })
}

function getImages(tab) {
    var key = getParsedCookie();
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/images",
            type: 'post',
            data: {
                "key": key,
                "tab": tab
            },
            dataType: 'json'
        })
            .done((result) => resolve(result))
            .fail((request, status, error) => reject(error));
    });
}

// add scroll offset to fragment target (if there is one)
function delayedFragmentTargetOffset() {
    var url = $(":target").context.URL;

    var hashCharPosition = url.lastIndexOf("#");
    if (hashCharPosition !== -1) {
        var div = $(url.substring(hashCharPosition));

        var offset = div.offset();

        var scrollto = offset.top - 50; // minus fixed header height
        $('html, body').animate({ scrollTop: scrollto }, 0);
        div.css("background-color", "yellow");
        setTimeout(function () {
            div.css("background-color", "");
        }, 3000);
    }
}
// function checkboxHandler(action, checked) {
//     alert("checkbox handler");
//     // switch (action) {
//     //   case "test1":
//     //       console.log("1", action, checked);
//     //       break;
//     //   case "test2":
//     //       console.log("2", action, checked);
//     //       break;
//     //   case "test3":
//     //       console.log("3", action, checked);
//     //       break;
//     //   default:
//     //       console.log(action + " not found", checked);
// }

function enableCheckBoxes() {

    // Using Sibling Icon as Checkbox
    // $(".ckbx").on("click", function () {
    //     var //$icon = $(this),
    //         //$checkbox = $icon.siblings(":checkbox"),
    //         $checkbox = $(this),
    //         checked = !$checkbox.prop("checked"),
    //         action;

    //     $checkbox.prop("checked", checked);
    //     // $icon.toggleClass('fa-check-square-o', checked)
    //     //     .toggleClass('fa-square-o', !checked);
    //     //action = $checkbox.data('action');

    //     // Run Action
    //     //checkboxHandler.call(undefined, action, checked);
    //     return false;
    // });
    //$(".ckbx").siblings(":checkbox").hide();
    // As a convenience, hide native checkboxes, when sibling with .ckbx
    //$(document).ready(function () { $(".ckbx").siblings(":checkbox").hide(); });
}