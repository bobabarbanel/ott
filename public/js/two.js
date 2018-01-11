"use strict";
// two.js
const COOKIE = 'chosenCookie';
var cookieValue = "not set";
const floatName = "#floatMenu";
const SPACE = "&nbsp;";
const deletedImages = {}; // tracks list of deleted images for each link
$(function () {

    $.getScript("/js/common.js")
        .done(function (/*script, textStatus*/) {

            ////////////////////////////////////////////////////////////
            cookieValue = unescape(readCookie(COOKIE));
            let key5 = getParsedCookie();
            $("title").text("Part " + getParsedCookie().partId);

            $("#cookie").text(getCookie());
            setThisTab(2);
            $("#job").text(
                [
                    key5.partId, key5.pName, key5.dept, key5.op, key5.machine
                ].join(" : ")
            );

            getSpec(getParsedCookie().machine)
                .then(machineSpecs => {
                    getImages("Tools").then((toolData) => {
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

    
    

    $('#Fullscreen').css('height', $(document).outerHeight() + 'px');
    $('#Fullscreen img').click(function () {
        $(this).fadeOut(); //this will hide the fullscreen div if you click away from the image. 
        $(this).parent().fadeOut();
        $('#expand').show();
    });

    $('#taButtonCancel').on("click", () => {
        enableActionsNow();
        ignoreEnter();
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
            return false;
        });
});

function catchEnter(dialog) {
    switch(dialog) {
        case "comment": // Enter when editing comment will Submit (Update)
        $('body').on('keypress', function(args) {
            if (args.keyCode == 13) {
                $('#taButtonUpdate').click();
                return false;
            }
        });
        break;

        case "undo": // Enter for Undo Update triggers click on Submit button
        $('body').on('keypress', function(args) {
            if (args.keyCode == 13) {
                $('#undoSubmit').click();
                return false;
            }
        });
        break;
    }
}

// Enter to trigger "Yes Delete it!"

function ignoreEnter() {
    $('body').off('keypress');
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
    toolData.forEach(
        item => {
            let link = [item.turret, item.position, item.spindle, item.offset].join('_');
            deletedImages[link] = []; // empty to start
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
            p.html(text +
                '<i class="fa fa-undo redUndo"></i>');
            p.find('i').on('click', null, {
                "link": link
            }, undoChoices).hide();
            div.append(p);
            let pItems = $('<pItems/>');
            item.files.forEach(
                (path, index) => {
                    let small = path.dir.replace('/Tools/', '/Tools_small/');
                    let large = path.dir.replace('/Tools/', '/Tools_large/');
                    let idiv = $('<div class="img-wrap"><span class="close">' +
                        '&times;</span></div>');
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
                        turret: item.turret
                    });
                    idiv.append(img);
                    pItems.append(idiv);
                }
            );
            pic.append(div);
            div.append(pItems);
            pictures.append(pic);
        });

    $('.img-wrap .close').on('click', closeDelete);

    $("pictures img").on("click", imgClick);
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
}
function singleToEmpty() {
    $('#expand').off().empty();
    $('single').empty();
}

function imgClick() { // when small image clicked to show larger image
    $(".pic").removeClass('highlight');
    $(this).closest('.pic').addClass('highlight');
    let single = $("single");

    singleToEmpty();
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
        .css('cursor', 'url(' + '"/images/expand.png"' + '), pointer');

    var img = $('<img class="pannable-image"/>');
    let fileName = $(this).attr('filename');
    img.attr('src', $(this).attr("dir") + '/' + fileName);
    img.attr('data-high-res-src', $(this).attr("dir_large") + '/' + fileName);
    img.attr('alt', $(this).attr('filename'));

    let in_single = $('<div id="image-gallery" class="in_single cf"/>');
    in_single.append(img);

    single.append(in_single);
    $('.pannable-image').ImageViewer();
    let commentP = $('<p class="comment">' + $(this).attr("comment") + "</p>")
        .on("click",
        null,
        { img: $(this) },
        editComment);
    single.append(commentP);
}

function editComment(ev) {

    $('#ta').val(ev.data.img.attr("comment"));
    //$('taButtonUpdate').attr('img', ev.data.img);
    $('#taButtonUpdate').off()
        .on("click", null,
        { img: ev.data.img },
        updateComment);
    disableActionsNow();
    catchEnter("comment");
    $("#tadiv").css("display", "flex");
    return false;
}

function closeDelete() { // when X is clicked in small image, invokes deletion

    let imgWrap = $(this).closest('.img-wrap');
    let img = imgWrap.find('img');
    //let link = img.attr('link');
    let fileName = img.attr('filename');
    let comment = img.attr('comment');
    let dirs = [img.attr('dir'), img.attr('dir_small'), img.attr('dir_large')];

    $.confirm({
        boxWidth: '500px',
        useBootstrap: false,
        type: 'dark',
        draggable: true,
        animation: 'left',
        title: "Image Deletion",
        content: '<img src="' + dirs[1] + '/' + fileName + '"/>' + SPACE + SPACE +
            'Do you want to delete this image?',
        buttons: {
            Yes: {
                text: "Yes - Delete it!",
                btnClass: 'btn-blue',
                keys: ['enter'],
                action: function () {
                    // remove from 2.html (small and large)
                    //deletedImages[link].push(imgWrap);
                    deleteImage(imgWrap, img, dirs, fileName, comment);
                }
            },
            No: {
                btnClass: 'btn-red'
            },
        }
    });

    return false;
}

function deleteImage(wrapper, img, dirs, fileName, comment) {
    // remove from db
    let turret, position, spindle, offset;
    let link = img.attr('link');
    let order = img.attr('order');
    [turret, position, spindle, offset] =
        link.split('_').map(val => parseInt(val));

    let query = {
        "key4": getKey4id(),
        "turret": turret, // need int for actual query, have to convert in router code
        "spindle": spindle,
        "position": position,
        "offset": offset,
        "tab": "Tools"
    };
    let filedata = {
        "dir": dirs[0],
        "filename": fileName,
        "comment": comment
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

            pic.find("div > p > i").html(
                SPACE +
                deletedImages[link].filter(x => x !== null).length)
                .show();

            // adjust UI (hide imagewrap)
            wrapper.hide();
        },
        failure => alert(
            "Unable to perform database delete from images collection.\n" +
            JSON.stringify(failure))
    );
}

function updateComment(/*ev*/) { //RMA INWORK
    //alert("change text");
    let currentVal = $('#ta').val();
    //ev.data.img.attr("comment", ); // change image's comment attribute
    // modify the small image displayed
    // modify the db
    $('single .comment').text(currentVal);
    enableActionsNow();
    ignoreEnter();
    $('#tadiv').css('display', 'none');

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
    let checkboxes = undo.find('form > ul').empty();
    let choices = deletedImages[link];
    let remaining = 0;
    choices.forEach(
        (aWrapper/*, index*/) => {
            if (aWrapper !== null) {
                let theImg = aWrapper.find('img');
                let showImg = '<img src="' +
                    theImg.attr('dir_small') + '/' +
                    theImg.attr('filename') + '">';
                checkboxes.append($(
                    '<li><input type="checkbox" name="undoItems" value="' +
                    link + ":" + theImg.attr('order') + '"> ' +
                    SPACE + (++remaining) + SPACE +
                    showImg + '</li>'));
            }
        }
    );
    if (remaining > 0) {
        if (remaining > 1) {
            undo.find('p').text("Restore Images");
            let button = $('<button id="checkAll" tabIndex="-1">Check All</button>');
            button.on("click", checkAllUndos); // RMA do off for button after actions
            checkboxes.prepend(button);
        } else {
            undo.find('p').text("Restore Image");
        }

        
        disableActionsNow();
        catchEnter("undo");
        undo.show();
    }
}

function checkAllUndos() {
    $('#undoMenu form input[name=undoItems]').prop('checked', true);
    return false;
}

function undoSubmit(/*ev*/) {
    let undo = $('#undoMenu');
    $('#undoMenu form input[name=undoItems]:checked').each(
        (index, ele) => {
            let item = $(ele).val();
            let link, order;
            [link, order] = item.split(":");
            let imgWrap = deletedImages[link][parseInt(order)];
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
                "tab": "Tools"
            };
            // puts "archived" back in "files"
            dbImagesRestore(query, filedata).then(
                success => { },
                error => alert("dbImagesRestore " + error)
            );

            // restore imgWrap
            imgWrap.show();
            // indicate restored images with orange border
            imgWrap.find('img').css("border-color", "orange");
            setTimeout(
                () => {
                    // remove orange border
                    imgWrap.find('img').css("border-color", "transparent");
                }, 1000);
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
    enableActionsNow();

    undo.hide();
    ignoreEnter();
    $('#checkAll').off(); // no need to keep function around
    return false;
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
                    debugLogReport(query, result, filedata.filename);

                    console.log("dbImagesRestore done " + JSON.stringify(result));
                    console.log(JSON.stringify(query));
                    console.log(filedata.filename);
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