"use strict";
/* globals Util, LinkGroup, TabValues, Common */
// tools.js

const TV = TabValues; // constants and variables

const pageName = "Tools";
const dirPathToImages = "../";
const reverseURL = "/unArchiveToolImages";
const COMMON = new Common();

$(function () { // onload

    TV.setDeleteButtons('init');

    // Captures click events of all <a> elements with href starting with #
    $(document).on('click', 'a[href^="#"]', function ( /*event*/) {
        // Click events are captured before hashchanges. Timeout
        // causes offsetAnchor to be called after the page jump.
        window.setTimeout(function () {
            TV.offsetAnchor();
        }, 0);
    });
    $('#doDelete').on('click', callDeleteImages);
    $(TV.floatName).removeClass().addClass('showfloat'); // start with menu not showing

    $('head > title', window.parent.document).text("Tools for " + TV.key5.partId);

    Util.setUpTabs(TV.key4id, pageName,
        {
            main: true,
            machine: true,
            tab: true,
            spec: true,
            tabmenus: true
        }).then(
            () => {
                // Util.getMachineSpec(TV.key5.machine)
                //     .then(machineSpecs => {
                        getToolImages(false).then((toolData) => {

                            if (toolData.length === 0) {
                                alert("No images available.");
                            } else {
                                paintPage(toolData);
                                startUp();
                            }
                        });
                    // });
            });
});

function callDeleteImages(ev) {
    TV.deleteImages(ev, setArchiveForToolImages, listDeleting);
}


function getToolImages() {
    //debugLog("getSheetTagsFiles");
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/sheetTags_new",
            type: "post",
            data: {
                key4id: COMMON.getKey4id(),
                files: true, // **do** retrieve files/images list
                images_id: true
            },
            dataType: "json"
        })
            .done(results => {
                resolve(results);
            })
            .fail((request, status, error) => reject(error));
    });
}

function imgClick() { // when small image clicked to show larger image
    $('single textarea').off('click');
    let prev = TV.hideSingle(); // prev holds the title string from last single image shown
    $(".pic").removeClass('highlight'); // un-highlight any previous image

    if (TV.deleteMode) {
        TV.flipImgDelState($(this)); // allow to flip state of one image
    } else {
        TV.showSingleLargeImage($(this), prev, dirPathToImages, setTitlesForSingle, "images"); // show image in <single> container
    }
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
            let doc = "Turret " + f[0] + TV.SPACE + "Spindle " + f[2] + ':' + TV.SPACE2 + f[1] + TV.SPACE + f[3];
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

function paintPage(toolData) {
    let links = []; // for float menu
    let pictures = $('pictures');
    let currentTurret = 0;
    let currentSpindle = 0;
    let LG;
    TV.maxImageShowing = 0;
    let curLG = null;
    toolData.forEach(
        item => {

            let link = [item.turret, item.position, item.spindle, item.offset].join('_');
            TV.DELETEDIMAGES[link] = []; // empty to start
            // console.log(item, item.files);

            let _id = (item.files.length > 0) ? item.files[0]._id : "none"; // _id of IMAGES linked document
            if (curLG !== null) { // have a group?
                if (curLG.getStart() !== curLG.getStop()) { // ignore groups with no images
                    curLG.setNext(new LinkGroup(curLG, null, TV.maxImageShowing, null, link));
                    curLG = curLG.getNext();
                } else {
                    curLG.setLink(link);
                }
            } else { // initialize
                curLG = new LinkGroup(null, null, TV.maxImageShowing, null, link);
                LG = curLG;
            }

            let text = item.position + '-' + item.offset + ") " +
                item.function + ":  " + item.type;
            let tag = item.position + '-' + item.offset;


            if (currentTurret !== item.turret || currentSpindle !== item.spindle) {
                let headText = "&nbsp;&nbsp;Turret&nbsp;" + item.turret + "&nbsp;&nbsp;&nbsp;&nbsp;" + "Spindle&nbsp;" + item.spindle;
                let headLink = [item.turret, item.spindle].join('-');

                let anchor = $('<a class="anchor head" id="' + headLink + '"/>');
                pictures.append(anchor);
                pictures.append($('<div class="headtext"/>').html(headText));

                links.push(['#' + headLink, headText]);
                // set current values so can detect need for next UL on change
                currentTurret = item.turret;
                currentSpindle = item.spindle;
            }

            links.push(['#' + link, item.function, tag]); // -- Jeff request to drop type
            let anchor = $('<a class="anchor" id="' + link + '"/>');
            pictures.append(anchor);
            let pic = $('<div class="pic" id="pic' + link + '" collection="' + _id + '">');
            let div = $('<div/>');
            let p = $('<p class="boldindent"/>');

            let buttonHTML =
                '<button class="checkAllDel" type="button">&#10004; All</button>';


            let pItems = $('<pItems/>');
            //let count = 0;
            if (item.files.length === 0) {
                let classText = '';
                if (item.function === "" || item.type === "") {
                    classText = 'class="noimages"';
                }
                p.html(`<span ${classText}>${text} - 0 images</span>`);

                div.append(p);
                pictures.append(div);

            }
            else {
                p.html(buttonHTML + " " + TV.SPACE2 + text);

                div.append(p);
                item.files[0].files.forEach(
                    (path, index) => {
                        let small = path.dir.replace('/' + pageName + '/',
                            '/' + pageName + '_small/');
                        let large = path.dir.replace('/' + pageName + '/',
                            '/' + pageName + '_large/');

                        let idiv = $('<div class="img-wrap"/>');
                        idiv.addClass("transparent");

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
                            sequence: TV.maxImageShowing,
                            _id: _id
                        });
                        idiv.attr('sequence', TV.maxImageShowing + "");
                        TV.LGP[TV.maxImageShowing] = curLG; // save LinkGroup for each image

                        TV.ALL_IMGWARPS[TV.maxImageShowing] = { // initialized here
                            wrap: idiv,
                            deleted: false
                        };
                        TV.maxImageShowing++;

                        //count = index + 1;
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
                }, TV.delSelectAll);

                pic.append(div);
                div.append(pItems);
                pictures.append(pic);
            }

            curLG.setStop(TV.maxImageShowing);
        });

    if (curLG !== null && (curLG.getStart() === curLG.getStop())) {
        // remove last LG as it is empty
        if (curLG.getStop() === null || curLG.getStop() === 0) { // no images at all
            curLG = null; // new LinkGroup(null, null, 0, null, "");;
        } else {
            curLG.getPrev().setNext(null);
            curLG = curLG.getPrev();
            // form circle so that UP and DOWN arrows move in continuous circle
            curLG.setNext(LG);
            LG.setPrev(curLG);
        }
    }


    $("pictures img").on("click", imgClick);

    // build floating menu
    let float = $(TV.FLOATNAME).empty();
    let dash = /-/;
    let prev = '';
    let icon = '<span><i class="fab fa-steam-symbol" style="color:yellow"></i>' + TV.SPACE2 + '</span>';

    // contruct flotmenu - links to sections of page
    links.forEach(
        link => {
            if (dash.test(link[0])) { // start (possibly end) ul
                if (prev !== '') {
                    let endUl = $('</ul>');
                    float.append(endUl);
                }

                let a1 = $('<a class="floathead scroller" href="' + link[0] + '">').html(icon + link[1]);
                prev = $('<ul class="floatgroup"/>').append(a1);
                a1.on('click', TV.scrollerAction);
                float.append(prev);
            } else {
                let line = '<div class="floatlink"><div class="floattag">' + TV.SPACE + link[2] + TV.SPACE2 + '</div><div>' + link[1] + TV.SPACE2 + '</div></div>';
                let a2 = $('<a class="scroller" href="' + link[0] + '">').html(line);
                a2.on('click', TV.scrollerAction);
                prev.append($('<li/>').append(a2));
            }
        });
    float.append($('</ul>')).addClass('showfloat'); // hide to start
}

function setArchiveForToolImages(list) {
    // list, a (jq)list of images to be marked as archived in db
    let data = {}; // construct data object for deletion route

    list.each(
        (index, img) => {
            let image = $(img);
            image.removeClass('dim');
            let allIW = TV.ALL_IMGWARPS[parseInt(image.attr('sequence'))];
            allIW.deleted = true; // mark as deleted
            allIW.wrap.css('display', 'none');

            let _id = image.closest('.pic').attr('collection');
            // console.log("list img collection", _id);
            let filename = image.attr('filename');
            if (data[_id] === undefined) {
                data[_id] = [];
            }
            data[_id].push(filename);
        }
    );

    TV.setDeleteButtons('deleting');

    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/archiveToolImages",
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

function setTitlesForSingle(img) {
    $("#tsinfo")
        .html("Turret" + TV.SPACE + img.attr("turret") +
            TV.SPACE2 + TV.SPACE + "Spindle" +
            TV.SPACE + img.attr("spindle"));

    let txt = "Tool " + img.attr("tag") + ") " + img.attr("alt");
    $("#tsSection").html(txt);
    return txt;
}
function scrollToElement() {
    const hash = location.hash;
    const jq = $(hash);

    if (jq.offset()) {
        let start = jq.offset().top - 120;
        start = (start > 0) ? start : 0;
        $(window).scrollTop(start).scrollLeft(0);
        $(hash + "+ div").addClass('highlight');
    }
}

function startUp() {
    $('body').on('click', () => $("navDropDown").hide());

    setTimeout(() => scrollToElement(), 500);

    $('.checkAllDel').hide();

    $('job').html(COMMON.jobTitle());

    //setTimeout(delayedFragmentTargetOffset, 500);

    $('#taButtonCancel').on("click", () => {
        TV.enableActionsNow();
        $('#tadiv').css('display', 'none');
        $("#ta").text('');
        return false;
    });

    $('.navDropDownButton').on('click',
        () => {
            $('navDropDown').css('display', 'flex');
            return false;
        });

    TV.spaceForDeleteMenu(false);

    $('#doDone').on('click', TV.deletionsComplete);
    $('#doClear').on('click', TV.clearDeleteSelections);
    $('#undoDelete').on('click', callUndeleteImages);

    $(".deleteButton").on('click', TV.toggleDeleteMode);
    $(".floatButton").on('click', TV.hideShowFloat);
}

function callUndeleteImages() {
    TV.unDeleteImages(reverseURL);
}
