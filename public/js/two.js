"use strict";
// two.js
const COOKIE = 'chosenCookie';
var cookieValue = "not set";
var floatName = "#floatMenu";
var menuYloc = null;
// temporary
function showFn() {
    console.log($(this).attr('filename'));
}
function hideFn() {

}
$(function () {

    menuYloc = parseInt($(floatName).css("top"));
    $(window).scroll(function () {
        var offset = menuYloc + $(document).scrollTop() + "px";
        $(floatName).animate({ top: offset }, { duration: 300, queue: false });
        $('content').attr('top', "60px");
    });

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

});
function hideShowFloat() {
    $(floatName).toggleClass('hidden');
}

function byDigits(a, b) {
    return fnNum(a.filename) - fnNum(b.filename);
}

function fnNum(filename) {
    return parseInt(
        filename.slice(filename.lastIndexOf('_') + 1,
            filename.lastIndexOf('.')).replace("0", ""));
}

function paintPage(toolSpecs, toolData) {
    let links = []; // for float menu
    let pictures = $('pictures');
    let currentTurret = 0;
    let currentSpindle = 0;
    toolData.forEach(
        item => {
            let link = [item.turret, item.position, item.spindle, item.offset].join('_');
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
                currentSpindle = item.spindle
            }

            links.push(['#' + link, linkText]); // -- Jeff request to drop type
            let anchor = $('<a class="anchor" id="' + link + '"/>');
            pictures.append(anchor);
            let pic = $('<div class="pic" id="pic' + link + '">');
            let div = $('<div/>');
            div.html($('<p/>').text(text));
            let pItems = $('<pItems/>');

            item.files.sort(byDigits).forEach(
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
                        order: index
                    });
                    img.hover(showFn, hideFn);
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

function imgClick() { // when small image clicked to show larger image
    $(".pic").css("background", "white");
    $(this).closest('.pic').css("background", "yellow");
    let single = $("single").empty();
    $("pictures img[showingsingle='true']")
        .attr('showingsingle', false)
        .css("border-color", "transparent");

    single.append($('<h4/>')
        .text("Turret" + $(this).attr("turret") +
        " Spindle" + $(this).attr("spindle")));
    single.append($('<h2/>')
        .text("Tool " + $(this).attr("tag") + ") " +
        $(this).attr("alt")));
    $(this).css("border-color", "blue");
    $(this).attr("showingSingle", true);

    var img = $('<img class="pannable-image"/>');
    let fileName = $(this).attr('filename');
    img.attr('src', $(this).attr("dir_large") + '/' + fileName);
    img.attr('data-high-res-src', $(this).attr("dir") + '/' + fileName);
    img.attr('alt', $(this).attr('filename'));

    let in_single = $('<div id="image-gallery" class="in_single cf"/>');
    in_single.append(img);

    single.append(in_single);
    $('.pannable-image').ImageViewer();
    single.append($("<p>" + $(this).attr("comment") + "</p>"));
}

function closeDelete() { // when X is clicked in small image, invokes deletion
    let imgWrap = $(this).closest('.img-wrap');
    let img = imgWrap.find('img');
    let link = img.attr('link');
    let fileName = img.attr('filename');
    let comment = img.attr('comment');
    let dirs = [img.attr('dir'), img.attr('dir_small'), img.attr('dir_large')];

    //alert('remove picture: ' + [link, dirs[0], dirs[1], dirs[2], fileName].join('\n'));
    $.confirm({
        boxWidth: '500px',
        useBootstrap: false,
        type: 'dark',
        draggable: true,
        animation: 'left',
        title: "Image Deletion",
        content: '<img src="' + dirs[1] + '/' + fileName + '"/>' +
            '&nbsp;&nbsp;Do you want to delete this image?',
        buttons: {
            Yes: {
                text: "Yes - Delete it!",
                btnClass: 'btn-blue',
                action: function () {
                    // remove from 2.html (small and large)
                    deleteImages(imgWrap, img, dirs, fileName, comment);
                }
            },
            No: {
                btnClass: 'btn-red'
            },
        }
    });

    return false;
}

function deleteImages(wrapper, img, dirs, fileName, comment) {
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
        success => {
            // adjust UI (remove image), remove single if showing this image
            if (img.attr("showingSingle") === "true") $("single").empty();
            let undo = '<i class="icon-undo icon-1 redUndo"></i>';
            let pic = $('#pic' + link);
            pic.find("div > p > i").off().remove();
            pic.find("div > p").append('<i class="fa fa-undo redUndo"></i>');
            pic.find("div > p > i")
                .on("click", null, {
                    "query": query,
                    "filedata": filedata,
                    "pic": pic,
                    "order": parseInt(order),
                    "link": link,
                    "alt": img.attr('alt'),
                    "comment": img.attr('comment')
                }, doUndo);
            wrapper.remove();


            // rename (move) file to /images/Archive/MachineDir/Tools[_small|_large]
            // archiveImages(dirs, fileName).then(
            //     success => { }, // silent
            //     failure => alert("Unable to Archive images.")
            // );
        },
        failure => alert("Unable to perform database delete from images collection.\n"
            + JSON.stringify(failure))
    )
}

function doUndo(ev) {
    let data = ev.data;
    let pic = data.pic;

    dbImagesRestore(data.query, data.filedata); // puts "archived" back in "files"
    // Insert new img-wrap for restored image into the images list in proper order
    let imgWraps = $(pic).find('pItems').children();
    let imgWrapsPlus = [];
    let once = true;
    let small = data.filedata.dir.replace('/Tools/', '/Tools_small/');
    let large = data.filedata.dir.replace('/Tools/', '/Tools_large/');
    let idiv = $('<div class="img-wrap"><span class="close">' +
        '&times;</span></div>');

    let img = $('<img/>', {
        height: "100px",
        alt: data.alt,
        link: data.link,
        tag: data.query.position + '-' + data.query.offset,
        src: small + '/' + data.filedata.filename,
        comment: data.comment,
        dir: data.filedata.dir,
        dir_small: small,
        dir_large: large,
        filename: data.filedata.filename,
        showingSingle: false,
        order: data.order
    });
    img.hover(showFn, hideFn);
    idiv.find('.close').on('click', closeDelete);
    img.on("click", imgClick);
    idiv.append(img);
    let currentLength = imgWraps.length;
    // loop thru img-waps, insert new one for restored image
    imgWraps.detach().each((index, element) => {
        let pos = parseInt($(element).find('img').attr('order'));
        // only do this one time
        if (once && (pos > data.order)) {
            once = false;
            imgWrapsPlus.push(idiv);
        }
        imgWrapsPlus.push(element);
    });
    if (once) { // was not inserted before, so insert at end of list
        imgWrapsPlus.push(idiv);
    }

    $(pic).find('pItems').append(imgWrapsPlus);
    pic.find("div > p > i").off().remove();
}
function archiveImages(dirs, fileName) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/archiveImages",
            type: 'post',
            data: {
                "dirs": dirs,
                "fileName": fileName
            },
            dataType: 'json'
        })
            .done((result) => resolve(result))
            .fail((request, status, error) => reject(error));
    });
}

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
                else reject(result);

            })
            .fail((request, status, error) => {
                //debugger;
                console.log("dbImagesDelete fail " + JSON.stringify(error));
                reject(error);
            })
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
            .success((result) => {

                //console.log("dbImagesDelete done " + JSON.stringify(result));
                if (result.nModified === 1) {
                    resolve(result);
                }
                else reject(result);

            })
            .fail((request, status, error) => {
                //debugger;
                console.log("dbImagesRestore fail " + JSON.stringify(error));
                reject(error);
            })
    });
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