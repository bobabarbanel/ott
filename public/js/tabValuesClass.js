"use strict";
/* exported TabValues */
/* globals Common, ImageViewer */
// tabValues.js

class TabValues {

    static catchKeys(state, code) {
        // alert("catchKeys "  + state)
        // note: confim dialogs handle this on their own
        TabValues.keystate = state;

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
                        if (args.which === TabValues.KEYS.ENTER_KEY) {
                            // if (undoChoosing === true) {
                            //     $('#undoMenu form input[value=Submit]').trigger('click');
                            //     return false;
                            // } else 
                            if (TabValues.keystate === "comment") {
                                $(".comment").text($(".comment").text() + "\n");
                                return false;
                            } else if (TabValues.deleteChoosing) {
                                $('div.jconfirm').find('button.confirm-deletion').trigger('click');
                                return false;
                            }
                        } else

                            switch (args.which) {

                                case TabValues.KEYS.LEFT_KEY:
                                    // console.log("left");
                                    if (TabValues.keystate !== "comment") {
                                        TabValues.nextImage(-1);
                                    }
                                    break;

                                case TabValues.KEYS.TAB_KEY:
                                    if (TabValues.keystate !== "comment") {
                                        TabValues.nextImage((args.shiftKey) ? -1 : 1);
                                    } // shift Tab goes left(-1)
                                    break;

                                case TabValues.KEYS.RIGHT_KEY:
                                    // console.log("right tab");
                                    if (TabValues.keystate !== "comment") {
                                        TabValues.nextImage(1);
                                    }
                                    break;

                                case TabValues.KEYS.ESCAPE_KEY:
                                    // console.log("escape");
                                    if (TabValues.keystate !== "comment") {
                                        TabValues.closeSingle();
                                    }
                                    break;

                                case TabValues.KEYS.UP_KEY:
                                    // console.log("up");
                                    if (TabValues.keystate !== "comment") {
                                        TabValues.moveToGroup('prev');
                                    }
                                    break;

                                case TabValues.KEYS.DOWN_KEY:
                                    // console.log("down");
                                    if (TabValues.keystate !== "comment") {
                                        TabValues.moveToGroup('next');
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

    static clearDeleteSelections() {
        TabValues.deleteCount = 0;
        $(".img-wrap").removeClass("deleting showing").addClass("transparent");
        $(".img-wrap img").removeClass("dim");

        TabValues.setDeleteButtons('init');
    }

    static closeSingle() {
        TabValues.hideSingle();
        $("pitems").find("img[showingsingle='true']")
            .attr('showingsingle', false)
            .closest('.img-wrap')
            .addClass("transparent")
            .removeClass("deleting showing");
        TabValues.catchKeys('off', 'keydown');
    }

    static dbUpdateImageComment(img) {
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

    static deleteImages(evt, setArchiveForImages, listDeleting) {
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

    static deletionsComplete() {
        $('#deleteMenu').hide();
        TabValues.setDeleteButtons('init');
        TabValues.clearDeleteSelections(); // also sets TabValues.deleteCount to 0
        $(".pic").removeClass('highlight');

        TabValues.spaceForDeleteMenu(false);
        $('.checkAllDel').hide();
        TabValues.deleteMode = false;
    }

    static delSelectAll(e) {
        let link = e.data.link;
        // let boxes = $('#pic' + link).find('.ckbx');
        let html = '';
        if ($(this).html().includes('un')) {
            html = TabValues.SPACE + TabValues.SPACE2;
            TabValues.markGroup(link, false); // undelete group
        } else {
            html = 'un';
            TabValues.markGroup(link, true); // delete group
        }
        $(this).html(html + '&#10004; All');
        return false;
    }

    static disableActionsNow() {
        $(TabValues.DLIST).css("pointer-events", "none");
    }

    static editComment(ev) {
        TabValues.disableActionsNow();

        TabValues.catchKeys("off", "keydown");

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
            boxWidth: (TabValues.wideScreen()) ? '60%' : '80%',
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
                        TabValues.updateComment(ev.data.img);
                        // $.alert('New text ' + text);
                        TabValues.catchKeys("single");
                    }
                },
                cancel: function () {
                    //close
                    TabValues.catchKeys("single");
                    TabValues.enableActionsNow();
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

        TabValues.disableActionsNow();
        // $("#tadiv").css("display", "flex");
        return false;
    }

    static enableActionsNow() {
        $(TabValues.DLIST).css("pointer-events", "auto");
    }

    static flipImgDelState(image) {
        image.toggleClass("dim");

        if (image.hasClass('dim')) {
            TabValues.setImgWrapClass(image.closest(".img-wrap"), 'deleting');
            $("#delCount").text('Count: ' + (++TabValues.deleteCount));
        } else {
            TabValues.setImgWrapClass(image.closest(".img-wrap"), 'transparent');
            $("#delCount").text('Count: ' + (--TabValues.deleteCount));
        }
        TabValues.setDeleteButtons('running');
    }

    static fullscreenSingle() {
        let srcLarge = $('#expand').attr('large');
        let srcNormal = $('#expand').attr('small');

        let viewLarge = TabValues.geTabValuesiewer('full');
        viewLarge.show(srcNormal, srcLarge);
    }

    static geTabValuesiewer(id, container) {
        const options = { // container for imageViewer
            maxZoom: 800
        };
        if (typeof TabValues.VIEWERS[id] === 'undefined') {
            // alert("new viewer");
            if (typeof container === 'undefined') {
                TabValues.VIEWERS[id] = new ImageViewer(options);
            } else {
                TabValues.VIEWERS[id] = new ImageViewer(container, options);
            }
        }

        return TabValues.VIEWERS[id];
    }

    static goGroup() { // move page and open first image in group
        let img = $(TabValues.ALL_IMGWARPS[TabValues.imageShowing].wrap).find('img'); // get img for this img-wrap
        let anchorName = img.attr('link'); // get link for the image group
        let aTag = $('#pic' + anchorName); // set aTag to the anchor for the link
        
        TabValues.modeScroll(aTag);
        img.trigger('click'); // "click" on the image
    }

    static hideShowFloat() { // KEEP THIS! called frop HTML tabs.html
        $(TabValues.FLOATNAME).toggleClass('showfloat');
    }

    static hideSingle() {
        $('single').hide();
        TabValues.imageShowing = -1;
        return $('#tsSection').html();
    }

    static loadViewer(viewer, small, large) {
        viewer.load(small, large);
    }

    static markGroup(link, state) { // state true ==> delete, otheruise undelete
        $('#pic' + link).find('img').each(
            (index, element) =>
            TabValues.markImageDeletedForce($(element), state)
        );
    }

    static markImageDeletedForce(image, desiredState) {
        let alreadyDeleted = image.hasClass('dim');
        if ((desiredState && !alreadyDeleted) || (!desiredState && alreadyDeleted)) {
            TabValues.flipImgDelState(image);
        }
    }

    static modeScroll(tag) {
        if (TabValues.wideScreen()) { // Scroll to TAG
            $('html,body').animate({ // RMA
                scrollTop: tag.offset().top - 150
            });
        } else { // Keep Page Scrolled to Top
            $('html, body').animate({
                scrollTop: $('body').offset().top - 100
            }, 500);
        }
    }

    static moveToGroup(direction) {
        let myLG = TabValues.LGP[TabValues.imageShowing];
        // reset TabValues.imageShowing for previous or next group
        if (direction === 'prev') {
            if (myLG.prev !== null) {
                TabValues.imageShowing = myLG.prev.getStart();
                if (TabValues.ALL_IMGWARPS[TabValues.imageShowing].deleted === true) {
                    let i = TabValues.imageShowing;
                    for (; i > 0; i--) {
                        if (TabValues.ALL_IMGWARPS[TabValues.imageShowing].deleted !== true) {
                            TabValues.imageShowing = i;
                            break;
                        }
                    }
                    if (i === 0) {
                        return;
                    } // reached beginning so do not move
                }
                TabValues.goGroup();
            } else {
                return;
            }
        } else {
            if (myLG.next !== null) {
                TabValues.imageShowing = myLG.next.getStart();
                if (TabValues.ALL_IMGWARPS[TabValues.imageShowing].deleted) {
                    let i = TabValues.imageShowing;
                    for (; i < TabValues.maxImageShowing; i++) {
                        if (!TabValues.ALL_IMGWARPS[TabValues.imageShowing].deleted) {
                            TabValues.imageShowing = i;
                            break;
                        }
                    }
                    if (i === TabValues.maxImageShowing) {
                        return;
                    } // reached end so do not move
                }
                TabValues.goGroup();
            } else {
                return;
            }
        }
    }

    static nextImage(direction) {
        if (TabValues.imageShowing !== -1) {
            TabValues.showNextSingle(direction);
        }
    }

    static offsetAnchor() {
        if (location.hash.length !== 0) {
            window.scrollTo(window.scrollX, window.scrollY - 100);
        }
    }

    static reverseArchiveForImages(reverseURL) {
        // toReverse, a list of images to be UNmarked as archived in db
        let toReverse = $('pitems').find('.deleting').find('img');
        let data = [];
        let allIW = [];
        toReverse.each(
            (index, image) => {
                image = $(image);
                let wrap = TabValues.ALL_IMGWARPS[parseInt(image.attr('sequence'))];
                wrap.deleted = false; // mark as not-deleted
                let imgWrap = wrap.wrap;
                imgWrap.css('display', 'block').removeClass('deleting'); // make visible
                allIW.push(imgWrap);
                let filename = image.attr('filename');
    
                data.push(filename);
            }
        );
        TabValues.setDeleteButtons('init');
        return new Promise((resolve, reject) => {
            $.ajax({
                    url: reverseURL,
                    type: 'post',
                    data: {
                        "job_id": TabValues.key4id,
                        "fileinfo": data
                    },
                    dataType: 'json'
                })
                .done(result => {
                    allIW.forEach(
                        (imgWrap) => {
                            imgWrap.addClass('orange');
                            setTimeout(
                                () => {
                                    // remove orange border
                                    imgWrap.removeClass('orange').addClass('transparent');
                                }, 1000);
                        }
                    );
                    resolve(result);
                })
                .fail((request, status, error) => reject(error));
        });
    }

    static scrollerAction() {
        let target = $(this.hash);
        if (target.length === 0) {
            target = $('html');
        }
    
        $('html, body').animate({
            scrollTop: target.offset().top - 100
        }, 500);
    
        return false;
    }

    static setDeleteButtons(state) {
        $("#deleteMenu p").text('Count: ' + TabValues.deleteCount);
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
                $('.checkAllDel').html(TabValues.SPACE + TabValues.SPACE2 + '&#10004; All');
                break;
            case 'running':
                if (TabValues.deleteCount > 0) {
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

    static setImgWrapClass(wrapper, className) {
        wrapper.removeClass().addClass('img-wrap').addClass(className); // exclusive
    }

    static showNextSingle(direction) {
        TabValues.imageShowing = TabValues.imageShowing + direction;

        // are we rolling back over start, or beyond end?
        if (TabValues.imageShowing >= TabValues.maxImageShowing) {
            TabValues.imageShowing = 0;
        } else if (TabValues.imageShowing < 0) {
            TabValues.imageShowing = TabValues.maxImageShowing - 1;
        }

        // replace single with new image
        if (TabValues.ALL_IMGWARPS[TabValues.imageShowing].deleted) {
            // find next imgWrap showing, then trigger click there
            TabValues.showNextSingle(direction);
        }
        let img = $(TabValues.ALL_IMGWARPS[TabValues.imageShowing].wrap).find('img');
        let anchorName = img.attr('link');
        let aTag = $('#pic' + anchorName);
        
        TabValues.modeScroll(aTag);

        img.trigger('click');
        return false;
    }

    static showSingleLargeImage(this_img, prev, dirPathToImages, setTitlesForSingle) {
        this_img.closest('.pic').addClass('highlight'); // visible mark for clicked image
    
        let wrapper = this_img.closest('.img-wrap'); // wrapper for the clicked image
    
        // flip showingsingle attribute in currently shown image wrapper 
        let showingImg = $("pictures img[showingsingle='true']").attr('showingsingle', false);
        // unhighlight wrapper of previous single image 
        TabValues.setImgWrapClass(showingImg.closest('.img-wrap'), 'transparent');
    
        // set title/head information for this section and step
        let txt = setTitlesForSingle(this_img);
    
        if (prev !== txt) { // if changed, show orange background for 1 second
            $("#tsSection").css("background", "orange");
            setTimeout(
                () => {
                    // remove temporary orange border
                    $("#tsSection").css("background", "transparent");
                }, 1000);
        }
        TabValues.setImgWrapClass(wrapper, "showing"); // mark wrapper as showing
    
        this_img.attr("showingSingle", true); // mark image itself with showingSingle
    
        let fileName = this_img.attr('filename');
        // global, impacts arrow/tab handling
        TabValues.imageShowing = parseInt(this_img.attr('sequence'));
    
        TabValues.do_once(); // set up navigation and single display elements, and comment block
        let narrowImage = this_img.height() > this_img.width();
        if (narrowImage) {
            $('#singlebreak').addClass('wide'); // hiding <br>
        } else {
            $('#singlebreak').removeClass('wide'); // showing <br>
        }
    
        let single_pannable = $('#pannable-image');
        let shortened = $(window).height() * 0.85;
        let commentP = $("single textArea").html(this_img.attr("comment"))
            .on("click",
                null, {
                    img: this_img, // has _id, filename and dir
                    collection: this_img.closest('.pic').attr('collection')
                },
                TabValues.editComment);
        if (narrowImage) { // comment shows next to image
            commentP.css("margin-left", "30px");
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
    
        let viewSmallH = TabValues.geTabValuesiewer('smallh', single_pannable);
        /**************** . had to add another elevel of ../ here **************/
        let smallImg = dirPathToImages + this_img.attr("dir") + '/' + fileName;
        let largeImg = dirPathToImages + this_img.attr("dir_large") + '/' + fileName;
        // relative path to images -- fix this!  // RMA
        // viewSmallH.load(smallImg, largeImg);
        TabValues.loadViewer(viewSmallH, smallImg, largeImg);
        $('#expand').attr("small", smallImg).attr("large", largeImg);
        $('single').show();
    
        if (!TabValues.wideScreen()) {
            $('html, body').scrollTop(0);
        }
        TabValues.catchKeys("single"); // on for keydown
    }

    static spaceForDeleteMenu(deleting) {
        if (!TabValues.wideScreen()) {
            let ptop = (deleting) ? 140 : 30;
            $("container").css("padding-top", ptop + "px");
        }
    }

    static toggleDeleteMode() {
        $("#deleteMenu p").text("Count: " + TabValues.deleteCount);
        if (TabValues.deleteMode) { // currently in delete mode
            $("#deleteMenu").hide();
            $('.checkAllDel').hide();
            if (TabValues.deleteCount > 0) {
                // undelete all deleted images
                TabValues.clearDeleteSelections();
            }
            TabValues.deleteMode = !TabValues.deleteMode;
            TabValues.spaceForDeleteMenu(false);
            TabValues.setDeleteButtons('init');
        } else { // not currently in delete mode
            TabValues.deleteMode = !TabValues.deleteMode;
            TabValues.closeSingle(); // also removes blue border on .img-wrap
            $(".pic").removeClass('highlight');
            $("#deleteMenu").show();
            TabValues.spaceForDeleteMenu(true);
            $('.checkAllDel').show();
            TabValues.setDeleteButtons('running');
        }
    
    }

    static updateComment(img) { //RMA INWORK
        // modify the db
        TabValues.dbUpdateImageComment(img).then(
            () => {
                //alert("db updated comment");
            },
            () => {
                alert("failure: db NOT updated comment");
            }
        );
        TabValues.enableActionsNow();
        return false;
    }

    static unDeleteImages(ev, reverseURL) {
        ev.preventDefault();
        TabValues.reverseArchiveForImages(reverseURL).then(
            () => {
                $("#deleteMenu").hide();
                $('.checkAllDel').hide();
                TabValues.clearDeleteSelections();
                TabValues.deleteMode = false;
                TabValues.spaceForDeleteMenu(false);
                TabValues.setDeleteButtons('init');
            },
            error => {
                alert("reverseArchiveForImages error: " + JSON.stringify(error));
            }
        );
    }

    static wideScreen() {
        return $('.topnav').css('display') !== 'none';
    }

}

TabValues.KEYS = {
    TAB_KEY: 9,
    RIGHT_KEY: 39,
    LEFT_KEY: 37,
    DOWN_KEY: 40,
    UP_KEY: 38,
    ESCAPE_KEY: 27,
    ENTER_KEY: 13
};
// Constants
TabValues.SPACE = "&nbsp;";
TabValues.SPACE2 = TabValues.SPACE + TabValues.SPACE;
TabValues.VIEWERS = {};
TabValues.LGP = [];
TabValues.ALL_IMGWARPS = []; // array of objects, {wrap: the imgWrap jq object, deleted: boolean}
TabValues.FLOATNAME = "#floatMenu";
TabValues.DELETEDIMAGES = {};
// list of selectors that will be disabled when fullscreen mode on
TabValues.DLIST = "pictures img, .topnav a, navDropDown a, #floatMenu a";

// Variables
TabValues.maxImageShowing = 0;
TabValues.deleteChoosing = false;
TabValues.deleteMode = false;
TabValues.deleteCount = 0;
TabValues.imageShowing = -1; // an integer, no image visible
TabValues.keystate = null;

const common = new Common();
TabValues.key4id = common.getKey4id();
TabValues.key5 = common.getParsedCookie();

TabValues.do_once = function () {
    TabValues.do_once = function () {}; // prevents a second execution

    // outer div to contain expand, and navigation icons
    let out_single = $('<div id="out_single"/>');
    let in_single = $('<div id="image-gallery" class="in_single cf"/>');

    // expand decoration
    let expand = $('<span id="expand"/>');
    expand.html('<i class="fas fa-expand-arrows-alt fa-2x" style="color:yellow"></i>')
        .on("click", TabValues.fullscreenSingle);

    // left decoration
    let left = $('<span id="left" class="direction"/>');
    left.html('<i class="fas fa-caret-left fa-4x"></i>')
        .on("click", () => {
            TabValues.nextImage(-1);
            return false;
        });
    left.css('top', "50%");

    // right decoration
    let right = $('<span id="right" class="direction"/>');
    right.html('<i class="fas fa-caret-right fa-4x"></i>')
        .on("click", () => {
            TabValues.nextImage(1);
            return false;
        });
    right.css('top', "50%");

    // down decoration
    let down = $('<span id="down" class="direction"/>');
    down.html('<i class="fas fa-caret-down fa-4x"></i>')
        .on("click", () => {
            TabValues.moveToGroup('next');
            return false;
        });
    down.css('left', "50%");

    // up decoration
    let up = $('<span id="up" class="direction"/>');
    up.html('<i class="fas fa-caret-up fa-4x"></i>')
        .on("click", () => {
            TabValues.moveToGroup('prev');
            return false;
        });
    up.css('left', "50%");

    // comment field
    let commentP = $('<textarea id="commentta" class="comment"></textarea>'); // <button id="editcomment">Edit Comment</button></div>');

    let single_pannable = $('<img id="pannable-image"></img>');
    // containers
    in_single
        .append(single_pannable);

    out_single
        .append(in_single, expand, left, right, down, up);

    // <br> will be displayed OR not depending on orientation of image
    let br = $('<br id="singlebreak"/>');
    $("singleImg").append(out_single, br, commentP).css('display', 'block');
};