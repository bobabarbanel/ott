"use strict";
/* globals ImageViewer */
// two.js
const COOKIE = 'chosenCookie';
var cookieValue = "not set";
const floatName = "#floatMenu";
const SPACE = "&nbsp;";
const deletedImages = {}; // tracks list of deleted images for each link
const allImgWraps = []; // array of objects, {wrap: the imgWrap jq object, deleted: boolean}
const lgp = [];
//const deletedImgWraps = [];
let maxImageShowing = 0; // incremneted as images are displayed
let LG;
// let undoChoosing = false;
let deleteChoosing = false;
// let isFullPage = false;
const viewers = {};


const TAB_KEY = 9;
const RIGHT_KEY = 39;
const LEFT_KEY = 37;
const DOWN_KEY = 40;
const UP_KEY = 38;
const ESCAPE_KEY = 27;
const ENTER_KEY = 13;

const SECTION = 'Tools';
let deleteMode = false;
let deleteCount = 0;
let imageShowing = -1; // an integer, no image visible

$(function () {
    // $(window).unload(function () {
    //     cleanViews();
    // });



    function offsetAnchor() {
        if (location.hash.length !== 0) {
            window.scrollTo(window.scrollX, window.scrollY - 100);
        }
    }
    setDeleteButtons('init');

    // Captures click events of all <a> elements with href starting with #
    $(document).on('click', 'a[href^="#"]', function ( /*event*/ ) {
        // Click events are captured before hashchanges. Timeout
        // causes offsetAnchor to be called after the page jump.
        window.setTimeout(function () {
            offsetAnchor();
        }, 0);
    });
    $('#doDelete').on('click', deleteImages);
    $(floatName).removeClass().addClass('showfloat'); // start with menu not showing
    $.getScript("/js/common.js")
        .done(function ( /*script, textStatus*/ ) {

            ////////////////////////////////////////////////////////////
            cookieValue = unescape(readCookie(COOKIE));
            let key5 = getParsedCookie();
            $("title").text("Part " + getParsedCookie().partId);

            setThisTab(2);
            $('job').text(
                [
                    key5.partId, key5.pName, key5.dept, key5.op, key5.machine
                ].join(" : ")
            );

            getSpec(getParsedCookie().machine)
                .then(machineSpecs => {
                    getImages(SECTION, false).then((toolData) => {
                        if (toolData.length === 0) {
                            alert("No images available.");
                        } else {
                            paintPage(machineSpecs, toolData);
                            startUp();
                        }
                    });
                });
        })
        .fail(function ( /*jqxhr, settings, exception*/ ) {
            console.log("getScript " + "Triggered ajaxError handler.");
        });
});

function startUp() {
    $("#tab-menu-trigger").on('click',
        () => {
            $("#topbar-menu").show();
            return false;
        }
    );
    $('body').on('click', () => $("#topbar-menu").hide());


    setTimeout(delayedFragmentTargetOffset, 500);

    $('#taButtonCancel').on("click", () => {
        enableActionsNow();
        $('#tadiv').css('display', 'none');
        $("#ta").text('');
        return false;
    });

    spaceForDeleteMenu(false);
}

function wideScreen() {
    return $('#topbar').css('display') !== 'none';
}

function scrollerAction() {
    var target = $(this.hash);
    if (target.length !== 0) {
        target = $('a[name="' + this.hash.substr(1) + '"]');
    } else {
        target = $('html');
    }
    if (deleteMode || wideScreen()) {
        $('html, body').animate({
            scrollTop: target.offset().top - 100
        }, 500);
    }
    if (!deleteMode) {
        if (this.hash.split('_').length === 4) {
            $('#pic' + this.hash.substr(1))
                .find('pitems > div')
                .first()
                .find('img')
                .trigger('click');
        }
    }
    return false;
}

function LinkGroup(prev, next, start, stop, link) {
    // console.log("Linkgroup " + start + " -> " + stop + "     " + link);
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
let keystate;

function catchKeys(state, code) {
    // alert("catchKeys "  + state)
    // note: confim dialogs handle this on their own
    keystate = state;

    switch (state) {
        // case "comment on":
        // // do we need this?
        // break;

        // case "comment off":
        // break;

        case "single":
            var $events = jQuery._data(jQuery("body")[0], "events");

            // keydown event for body already defined
            if ($events.keydown === undefined) {
                $('body').on('keydown', function (args) {
                    if (args.which === ENTER_KEY) {
                        // if (undoChoosing === true) {
                        //     $('#undoMenu form input[value=Submit]').trigger('click');
                        //     return false;
                        // } else 
                        if (keystate === "comment") {
                            $(".comment").text($(".comment").text() + "\n");
                            return false;
                        } else if (deleteChoosing) {
                            $('div.jconfirm').find('button.confirm-deletion').trigger('click');
                            return false;
                        }
                    } else

                        switch (args.which) {

                            case LEFT_KEY:
                                // console.log("left");
                                if (keystate !== "comment") {
                                    nextImage(-1);
                                }
                                break;

                            case TAB_KEY:
                                if (keystate !== "comment") {
                                    nextImage((args.shiftKey) ? -1 : 1);
                                } // shift Tab goes left(-1)
                                break;

                            case RIGHT_KEY:
                                // console.log("right tab");
                                if (keystate !== "comment") {
                                    nextImage(1);
                                }
                                break;

                            case ESCAPE_KEY:
                                // console.log("escape");
                                if (keystate !== "comment") {
                                    closeSingle();
                                }
                                break;

                            case UP_KEY:
                                // console.log("up");
                                if (keystate !== "comment") {
                                    moveToGroup('prev');
                                }
                                break;

                            case DOWN_KEY:
                                // console.log("down");
                                if (keystate !== "comment") {
                                    moveToGroup('next');
                                }
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
    debugger;
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
                if (i === 0) {
                    return;
                } // reached beginning so do not move
            }
            goGroup();
        } else {
            return;
        }
    } else {
        if (myLG.next !== null) {
            imageShowing = myLG.next.getStart();
            if (allImgWraps[imageShowing].deleted) {
                let i = imageShowing;
                for (; i < maxImageShowing; i++) {
                    if (!allImgWraps[imageShowing].deleted) {
                        imageShowing = i;
                        break;
                    }
                }
                if (i === maxImageShowing) {
                    return;
                } // reached end so do not move
            }
            goGroup();
        } else {
            return;
        }
    }
}

function goGroup() { // move page and open first image in group
    let img = $(allImgWraps[imageShowing].wrap).find('img'); // get img for this img-wrap
    let anchorName = img.attr('link'); // get link for the image group
    let aTag = $('#' + anchorName); // set aTag to the anchor for the link
    modeScroll(aTag);

    img.trigger('click'); // "click" on the image
}


function closeSingle() {
    hideSingle();
    $("pitems").find("img[showingsingle='true']")
        .attr('showingsingle', false)
        .closest('.img-wrap')
        .addClass("transparent")
        .removeClass("deleting showing");
    catchKeys('off', 'keydown');
}

function fullscreenSingle() {
    let srcLarge = $('#expand').attr('large');
    let srcNormal = $('#expand').attr('small');

    let viewLarge = getViewer('full');
    viewLarge.show(srcNormal, srcLarge);
}

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
            let _id = item._id;
            if (curLG !== null) { // have a group?
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
                item.function+":  " + item.type;
            let linkText = item.position + '-' + item.offset + ") " +
                item.function;

            if (currentTurret !== item.turret || currentSpindle !== item.spindle) {
                let headText = "Turret" + item.turret + " " + "Spindle" + item.spindle;
                let headLink = [item.turret, item.spindle].join('-');

                let anchor = $('<a class="anchor head" id="' + headLink + '"/>');
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
            let pic = $('<div class="pic" id="pic' + link + '" collection="' + _id + '">');
            let div = $('<div/>');
            let p = $('<p/>');

            let buttonHTML =
                '<button class="checkAllDel" type="button">' +
                '&#10004; All</button>';

            p.html(buttonHTML + " &nbsp;&nbsp;" + text);


            div.append(p);
            let pItems = $('<pItems/>');
            let count = 0;
            if (item.files.length > 0) {
                item.files.forEach(
                    (path, index) => {
                        let small = path.dir.replace('/' + SECTION + '/',
                            '/' + SECTION + '_small/');
                        let large = path.dir.replace('/' + SECTION + '/',
                            '/' + SECTION + '_large/');

                        let idiv = $('<div class="img-wrap"/>');
                        idiv.addClass("transparent");

                        // add handlers for video
                        let img = $('<img/>', {
                            height: "100px",
                            alt: item.function+": " + item.type,
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
                            sequence: maxImageShowing,
                            _id: _id
                        });
                        idiv.attr('sequence', maxImageShowing + "");
                        lgp[maxImageShowing] = curLG; // save LinkGroup for each image

                        allImgWraps[maxImageShowing] = { // initialized here
                            wrap: idiv,
                            deleted: false
                        };
                        maxImageShowing++;

                        count = index + 1;
                        idiv.append(img);
                        // img.mouseover((e) =>
                        //     console.log($(e.target).attr('sequence')));
                        let span = $('<span class="close">&times;</span>');
                        span.css('display', 'none');
                        idiv.append(span);
                        pItems.append(idiv);
                    }
                );
                let groupButton = p.find('button').hide(); //initially invisible
                groupButton.on('click', null, {
                    link: link
                }, delSelectAll);

                pic.append(div);
                div.append(pItems);
                pictures.append(pic);
            } else {
                div.append($("<p>&nbsp;&nbsp;No Images</p>"));
                pictures.append(div);
            }

            curLG.setStop(maxImageShowing);
        });
    if (curLG.getStart() === curLG.getStop()) {
        // remove last LG as it is empty
        curLG.getPrev().setNext(null);
        curLG = curLG.getPrev();
    }
    // form circle so that UP and DOWN arrows move in continuous circle
    curLG.setNext(LG);
    LG.setPrev(curLG);

    $("pictures img").on("click", imgClick);

    // build floating menu
    let float = $(floatName);
    let dash = /-/;
    let prev = '';
    let icon = '<span><i class="fab fa-steam-symbol" style="color:yellow"></i>&nbsp;&nbsp;</span>';
    links.forEach(
        link => {
            if (dash.test(link[0])) { // start (possibly end) ul
                if (prev !== '') {
                    let endUl = $('</ul>');
                    float.append(endUl);
                }
                let a1 = $('<a class="floathead scroller" href="' + link[0] + '">').html(icon + link[1]);
                prev = $('<ul />').append(a1);
                a1.on('click', scrollerAction);
                float.append(prev);
            } else {
                let a2 = $('<a class="scroller" href="' + link[0] + '">').text(link[1]);
                a2.on('click', scrollerAction);
                prev.append($('<li/>').append(a2));
            }
        });
    float.append($('</ul>'));
}


function delSelectAll(e) {
    let link = e.data.link;
    // let boxes = $('#pic' + link).find('.ckbx');
    let html = '';
    if ($(this).html().includes('un')) {
        html = ' &nbsp;&nbsp;';
        markGroup(link, false); // undelete group
    } else {
        html = 'un';
        markGroup(link, true); // delete group
    }
    $(this).html(html + '&#10004; All');
    return false;
}

function nextImage(direction) {
    if (imageShowing !== -1) {
        showNextSingle(direction);
    }
}

function showNextSingle(direction) {

    imageShowing = imageShowing + direction;

    // are we rolling back over start, or beyond end?
    if (imageShowing >= maxImageShowing) {
        imageShowing = 0;
    } else if (imageShowing < 0) {
        imageShowing = maxImageShowing - 1;
    }

    // replace single with new image
    if (allImgWraps[imageShowing].deleted) {
        // find next imgWrap showing, then trigger click there
        showNextSingle(direction);
    }
    let img = $(allImgWraps[imageShowing].wrap).find('img');
    let anchorName = img.attr('link');
    let aTag = $('#' + anchorName);

    modeScroll(aTag);


    img.trigger('click');
    return false;
}

function modeScroll(tag) {
    if (wideScreen()) { // Scroll to TAG
        $('html,body').animate({ // RMA
            scrollTop: tag.offset().top - 150
        });
    } else { // Keep Page Scrolled to Top
        $('html, body').animate({
            scrollTop: $('body').offset().top - 100
        }, 500);
    }
}

function hideSingle() {
    $('single').hide();

    let prev = $('#tsSection').html();

    imageShowing = -1;

    return prev;
}

function markImageDeletedForce(image, desiredState) {
    let alreadyDeleted = image.hasClass('dim');
    if ((desiredState && !alreadyDeleted) || (!desiredState && alreadyDeleted)) {
        flipImgDelState(image);
    }
}

function flipImgDelState(image) {
    image.toggleClass("dim");

    if (image.hasClass('dim')) {
        setImgWrapClass(image.closest(".img-wrap"), 'deleting');
        $("#delCount").text('Count: ' + (++deleteCount));
    } else {
        setImgWrapClass(image.closest(".img-wrap"), 'transparent');
        $("#delCount").text('Count: ' + (--deleteCount));
    }
    setDeleteButtons('running');
}

function markGroup(link, state) { // state true ==> delete, otheruise undelete
    $('#pic' + link).find('img').each(
        (index, element) =>
        markImageDeletedForce($(element), state)
    );
}


let one_time = false;

function do_once() {
    if (one_time) { // this functiuon will execute only one time
        return;
    }
    one_time = true;
    // outer div to contain expand, and navigation icons
    let out_single = $('<div id="out_single"/>');
    let in_single = $('<div id="image-gallery" class="in_single cf"/>');

    // expand decoration
    let expand = $('<span id="expand"/>');
    expand.html('<i class="fas fa-expand-arrows-alt fa-2x" style="color:yellow"></i>')
        .on("click", fullscreenSingle);

    // left decoration
    let left = $('<span id="left" class="direction"/>');
    left.html('<i class="fas fa-caret-left fa-4x"></i>')
        .on("click", () => {
            nextImage(-1);
            return false;
        });
    left.css('top', "50%");

    // right decoration
    let right = $('<span id="right" class="direction"/>');
    right.html('<i class="fas fa-caret-right fa-4x"></i>')
        .on("click", () => {
            nextImage(1);
            return false;
        });
    right.css('top', "50%");

    // down decoration
    let down = $('<span id="down" class="direction"/>');
    down.html('<i class="fas fa-caret-down fa-4x"></i>')
        .on("click", () => {
            moveToGroup('next');
            return false;
        });
    down.css('left', "50%");

    // up decoration
    let up = $('<span id="up" class="direction"/>');
    up.html('<i class="fas fa-caret-up fa-4x"></i>')
        .on("click", () => {
            moveToGroup('prev');
            return false;
        });
    up.css('left', "50%");

    // comment field
    let commentP = $('<textarea id="commentta" class="comment"></textarea>');

    let single_pannable = $('<img id="pannable-image"></img>');
    // containers
    in_single
        .append(single_pannable);
    out_single
        .append(in_single);
    out_single
        .append(expand)
        .append(left)
        .append(right)
        .append(down)
        .append(up);
    // <br> will be displayed OR not depending on orientation of image
    let br = $('<br id="singlebreak"/>');
    $("singleImg").append(out_single, br, commentP).css('display', 'block');
}

function getViewer(id, container) {
    const options = { // container for imageViewer
        maxZoom: 800
    };
    if (typeof viewers[id] === 'undefined') {
        // alert("new viewer");
        if (typeof container === 'undefined') {
            viewers[id] = new ImageViewer(options);
        } else {
            viewers[id] = new ImageViewer(container, options);
        }
    }
    // else {
    //     alert("old viewer");
    // }
    return viewers[id];
}

function loadViewer(viewer,small,large) {
    viewer.load(small, large);
}

function imgClick() { // when small image clicked to show larger image
    debugger;

    let prev = hideSingle(); // prev holds the title string from last single image shown
    $(".pic").removeClass('highlight'); // un-highlight any previous image

    if (deleteMode) {
        flipImgDelState($(this)); // allow to flip state of one image
    } else {
        showSingleLargeImage($(this), prev); // show image in <single> container
    }
}

function showSingleLargeImage(this_img, prev) {

    this_img.closest('.pic').addClass('highlight'); // visible mark for clicked image

    let wrapper = this_img.closest('.img-wrap'); // wrapper for the clicked image

    // flip showingsingle attribute in currently shown image wrapper 
    let showingImg = $("pictures img[showingsingle='true']").attr('showingsingle', false);
    // unhighlight wrapper of previous single image 
    setImgWrapClass(showingImg.closest('.img-wrap'), 'transparent');

    // set title information
    $("#tsinfo")
        .html("Turret" + SPACE + this_img.attr("turret") +
            SPACE + SPACE + SPACE + "Spindle" +
            SPACE + this_img.attr("spindle"));
    let txt = "Tool " + this_img.attr("tag") + ") " + this_img.attr("alt");
    $("#tsSection").html(txt);
    if (prev !== txt) { // if changed, show orange background for 1 second
        $("#tsSection").css("background", "orange");
        setTimeout(
            () => {
                // remove temporary orange border
                $("#tsSection").css("background", "transparent");
            }, 1000);
    }
    setImgWrapClass(wrapper, "showing"); // mark wrapper as showing

    this_img.attr("showingSingle", true); // mark image itself with showingSingle

    let fileName = this_img.attr('filename');
    // global, impacts arrow/tab handling
    imageShowing = parseInt(this_img.attr('sequence'));

    do_once(); // set up navigation and single display elements, and comment block
    let narrowImage = this_img.height() > this_img.width();
    if (narrowImage) {
        $('#singlebreak').addClass('wide'); // hiding <br>
    } else {
        $('#singlebreak').removeClass('wide'); // showing <br>
    }

    $('#commentta').html(this_img.attr("comment"))
        .on("click",
            null, {
                img: this_img, // has _id, filename and dir
                collection: this_img.closest('.pic').attr('collection')
            },
            editComment);

    let single_pannable = $('#pannable-image');
    let shortened = $(window).height() * 0.85;
    let commentP = $("single textArea");
    if (narrowImage) { // comment shows next to image
        $('#commentta').css("margin-left", "30px");
        single_pannable.height(shortened + "px");
        single_pannable.width(
            ((shortened * this_img.width() / this_img.height() - 4) +
                "px"));
        commentP.width("250px").height(shortened / 2 + "px")
            .css({
                "position": "absolute",
                "top": "25%",
                "margin-left": 50
            });
    } else { // comment shows below image
        let width = $(window).height() * 0.80 * this_img.width() / this_img.height();
        commentP
            .width((width - 4) + "px")
            .height("40px")
            .css({
                "position": "inherit",
                "margin-top": 25,
                "margin-left": 0
            });
        shortened -= 40; // amke room for comment
        single_pannable.width(width + "px");
        single_pannable.height(shortened + "px");
    }

    let viewSmallH = getViewer('smallh', single_pannable);
    let smallImg = ".." + this_img.attr("dir") + '/' + fileName;
    let largeImg = ".." + this_img.attr("dir_large") + '/' + fileName;
    // relative path to images -- fix this!  // RMA
    // viewSmallH.load(smallImg, largeImg);
    loadViewer(viewSmallH, smallImg, largeImg);
    $('#expand').attr("small", smallImg).attr("large", largeImg);
    $('single').show();

    if (!wideScreen()) {
        $('html, body').scrollTop(0);
    }
    catchKeys("single"); // on for keydown
}

function editComment(ev) {

    disableActionsNow();

    catchKeys("off", "keydown");

    $.confirm({
        title: 'Edit the Comment',
        animation: 'scale',
        content: '' +
            '<form action="">' +
            '<div class="form-group">' +
            '<textarea class="taedit" type="text" style="height:100px">' +
            ev.data.img.attr("comment") +
            '</textarea>' +
            '</div>' +
            '</form>',
        boxWidth: (wideScreen()) ? '60%' : '80%',
        useBootstrap: false,
        buttons: {
            formSubmit: {
                text: 'Submit',
                btnClass: 'btn-blue',
                action: function () {
                    var text = this.$content.find('.taedit').val();
                    ev.data.img.attr("comment", text);
                    // $(ev.target).text(text);
                    $(".comment").text(text);
                    updateComment(ev.data.img);
                    // $.alert('New text ' + text);
                    catchKeys("single");
                }
            },
            cancel: function () {
                //close
                catchKeys("single");
                enableActionsNow();
            },
        },
        onContentReady: function () {
            // bind to events
            var jc = this;
            this.$content.find('form').on('submit', function (e) {
                // if the user submits the form by pressing enter in the field.
                e.preventDefault();
                jc.$$formSubmit.trigger('click'); // reference the button and click it
            });
        }
    });

    disableActionsNow();
    // $("#tadiv").css("display", "flex");
    return false;
}



function updateComment(img) { //RMA INWORK

    // modify the db
    //$('.comment').text(currentVal); // modify the displayed large image comment
    //ev.data.img.attr("comment", currentVal); // modify the small image comment

    dbUpdateImageComment(img).then(
        () => {
            //alert("db updated comment");
        },
        () => {
            alert("failure: db NOT updated comment");
        }
    );
    //$('#tadiv').css('display', 'none');
    enableActionsNow();

    return false;
}

// list of selectors that will be disabled when fullscreen mode on
const dList = "pictures img, .w3-bar a, #floatMenu a"; //, #deleteButton, #floatButton";

function disableActionsNow() {

    $(dList).css("pointer-events", "none");
}

function enableActionsNow() {
    $(dList).css("pointer-events", "auto");

}

function setImgWrapClass(wrapper, className) {
    //if (wrapper.hasClass(className)) return;
    wrapper.removeClass().addClass('img-wrap').addClass(className); // exclusive
}

// function toggleAllUndos() {
//     if ($("#checkAll").text() === "Check All") {
//         toUnCheckAll();
//     } else {
//         toCheckAll();
//     }

//     return false;
// }

// function toUnCheckAll() {
//     $("#checkAll").text("Uncheck All");
//     // $('#undoMenu form input[name=undoItems]').prop('checked', true);
//     // $('#undoMenu form input[value=Submit]').prop('disabled', false);
// }

// function toCheckAll() {
//     $("#checkAll").text("Check All");
//     // $('#undoMenu form input[name=undoItems]').prop('checked', false);
//     // $('#undoMenu form input[value=Submit]').prop('disabled', true);
// }

// function undoSubmit( /*ev*/ ) {
//     let undo = $('#undoMenu');
//     $('#undoMenu form input[name=undoItems]:checked').each(
//         (index, ele) => {
//             let item = $(ele).val();
//             let link, order;
//             [link, order] = item.split(":");
//             let imgWrap = deletedImages[link][parseInt(order)];
//             let sequence = parseInt(imgWrap.attr('sequence'));
//             let img = imgWrap.find('img');
//             let filedata = {
//                 "dir": img.attr('dir'),
//                 "filename": img.attr('filename'),
//                 "comment": img.attr('comment')
//             };

//             //console.log("undo " + img.attr('filename'));
//             let turret, position, spindle, offset;
//             [turret, position, spindle, offset] = link.split(/_/); // Careful!
//             let query = {
//                 "key4": getKey4id(),
//                 "turret": turret, // need int for actual query
//                 "spindle": spindle,
//                 "position": position,
//                 "offset": offset,
//                 "tab": SECTION
//             };
//             // puts "archived" back in "files"
//             dbImagesRestore(query, filedata).then(
//                 () => {},
//                 error => alert("dbImagesRestore " + error)
//             );

//             // restore imgWrap

//             renderCheckAllButton(imgWrap, 'show');
//             // uncheck restored image
//             imgWrap.find('.ckbx').prop('checked', false);
//             // indicate restored images with orange border

//             img.css("border-color", "orange");
//             setTimeout(
//                 () => {
//                     // remove orange border
//                     img.css("border-color", "transparent");
//                 }, 1000);

//             allImgWraps[sequence].deleted = false;

//             deletedImages[link][parseInt(order)] = null;
//             let remaining = deletedImages[link].filter(x => x !== null).length;
//             let icon = $("#pic" + link).find("div > p > i");
//             if (remaining === 0) {
//                 icon.hide();
//             } else {
//                 icon.html(SPACE + remaining);
//             }
//         }
//     );
//     //$('#undoMenu form input[name=undoItems]').prop('checked', false);
//     undoChoosing = false;
//     enableActionsNow();

//     undo.hide();
//     $('#checkAll').off(); // no need to keep function around
//     return false;
// }

function dbUpdateImageComment(img) {

    return new Promise((resolve, reject) => {
        $.ajax({
                url: "/updateImageComment",
                type: 'post',
                data: {
                    "_id": img.attr("_id"),
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


// function dbImagesDelete(query, filedata) {
//     //console.log(JSON.stringify(query));
//     return new Promise((resolve, reject) => {
//         $.ajax({
//                 url: "/deleteDbImages",
//                 type: 'post',
//                 data: {
//                     "query": query,
//                     "filedata": filedata
//                 },
//                 dataType: 'json'
//             })
//             .success((result) => {

//                 //console.log("dbImagesDelete done " + JSON.stringify(result));
//                 if (result.nModified === 1) {
//                     resolve(result);
//                 } else {
//                     reject(result);
//                 }

//             })
//             .fail((request, status, error) => {
//                 console.log("dbImagesDelete fail " + JSON.stringify(error));
//                 reject(error);
//             });
//     });
// }

// function dbImagesRestore(query, filedata) {
//     //console.log(JSON.stringify(query));
//     return new Promise((resolve, reject) => {
//         $.ajax({
//                 url: "/restoreDbImages",
//                 type: 'post',
//                 data: {
//                     "query": query,
//                     "filedata": filedata
//                 },
//                 dataType: 'json'
//             })
//             .success(
//                 result => {


//                     if (result.nModified === 1) {
//                         resolve(result);
//                     } else {

//                         alert("result.nModified !== 1");
//                         //////////////////DEBUG
//                         reject(result);
//                     }

//                 })
//             .fail((request, status, error) => {
//                 console.log("dbImagesRestore fail " + JSON.stringify(error));
//                 reject(error);
//             });
//     });
// }

// function debugLogReport(q, r, f) {
//     $.ajax({
//         url: "/reportLog",
//         type: 'post',
//         data: {
//             "q": q,
//             "r": r,
//             "f": f
//         },
//         dataType: 'json'
//     });
// }

function getImages(tab, archived) {
    var key = getParsedCookie();
    let data = {
        "key": key,
        "tab": tab,
        "archived": archived
    };

    return new Promise((resolve, reject) => {
        $.ajax({
                url: "/images",
                type: 'post',
                data: data,
                dataType: 'json'
            })
            .done((result) => {
                resolve(result);
            })
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
        $('html, body').animate({
            scrollTop: scrollto
        }, 0);
        div.css("background-color", "yellow");
        setTimeout(function () {
            div.css("background-color", "");
        }, 3000);
    }
}



function spaceForDeleteMenu(deleting) {
    let ptop;

    // console.log("ptop 1 " + $("container").css("padding-top"));
    if (!wideScreen()) {
        ptop = (deleting) ? 120 : 5;
    } else {
        ptop = 30;
    }
    // console.log("ptop 2 " + ptop + "\n");
    $("container").css("padding-top", ptop + "px");
}


function setDeleteButtons(state) {
    $("#deleteMenu p").text('Count: ' + deleteCount);
    switch (state) {
        case 'init':
            $("#doDone")
                .css("display", "none");
            $("#doClear")
                .prop('disabled', true)
                .css("background", "grey")
                .css('display', 'block')
                .text("Clear");
            $("#doDelete")
                .prop('disabled', true)
                .css("background", "grey")
                .css('display', 'block');
            $("#undoDelete")
                .css("display", "none");
            break;
        case 'running':
            if (deleteCount > 0) {
                $("#doDelete").prop('disabled', false).css("background", "pink");
                $("#doClear").prop('disabled', false).css("background", "lightgreen");
                $("#doDone").css("display", "none");
            } else {
                $("#doDelete").prop('disabled', true).css("background", "grey");
                $("#doClear").prop('disabled', true).css("background", "grey");
                $("#doDone").css("display", "none");
            }
            break;
        case 'deleting':
            $("#doDelete").css("display", "none");
            $("#doDone").css("display", "block");
            $("#doClear").css("display", "none");
            $("#undoDelete").css("display", "block");
            break;
    }
}

function setArchiveForImages(list) {
    // list, a (jq)list of images to be marked as archived in db
    let data = {}; // construct data object for deletion route
    list.each(
        (index, img) => {
            let image = $(img);
            image.removeClass('dim');
            let allIW = allImgWraps[parseInt(image.attr('sequence'))];
            allIW.deleted = true; // mark as deleted
            allIW.wrap.css('display', 'none');

            let _id = image.closest('.pic').attr('collection');
            let filename = image.attr('filename');
            if (data[_id] === undefined) {
                data[_id] = [];
            }
            data[_id].push(filename);
        }
    );

    setDeleteButtons('deleting');

    return new Promise((resolve, reject) => {
        $.ajax({
                url: "/archiveImages",
                type: 'post',
                data: {
                    "fileinfo": data
                },
                dataType: 'json'
            })
            .done(result => {
                // alert("setArchiveForImages success: " + JSON.stringify(result));
                resolve(result);
            })
            .fail((request, status, error) => {
                alert("setArchiveForImages failure: " + status + " " +
                    JSON.stringify(error));
                reject(error);
            });
    });
}




function deleteImages(evt) {
    evt.preventDefault();
    let toDelete = $('pitems').find('img.dim');

    let content = listDeleting(toDelete);
    $.confirm({
        title: 'Please Confirm <u>Deletion</u> of ' + toDelete.length + ' Images',
        boxWidth: '60%',
        useBootstrap: false,
        content: content,
        buttons: {
            confirm: function () {
                setArchiveForImages(toDelete).then(
                    () => {
                        // no action
                    },
                    (error) => {
                        alert('Archive Images failure: ' + error);
                    }
                );
            },
            cancel: function () {
                // no action

            }
        }
    });
    return false;
}

function listDeleting(images) {
    let links = [];
    let org = {};
    let str = "<ul>";
    images.each(
        (index, img) => {
            img = $(img);
            let link = img.attr('link');
            if (!links.includes(link)) {
                links.push(link);
                org[link] = [];
            }
            org[link].push(img.attr('src'));
        });
    links.forEach(
        (link) => {

            let f = link.split('_');
            let doc = "T" + f[0] + ' ' + "S" + f[2] + ' ' + f[1] + ' ' + f[3];
            str += '<li class"delItem">' + doc + '<div class="delList">';
            org[link].forEach(
                (src) => {
                    str += '<img src="' + src + '"/>';
                }
            );
            str += '</div></li>';
        }
    );
    str += '</ul>';
    return str;
}