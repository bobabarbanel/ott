"use strict";
// two.js
const COOKIE = 'chosenCookie';
var cookieValue = "not set";
var floatName = "#floatMenu";
var menuYloc = null;

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
    $("#floatMenu").toggleClass('hidden');
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
            }

            links.push(['#' + link, linkText]); // -- Jeff request to drop type
            let anchor = $('<a class="anchor" id="' + link + '"/>');
            pictures.append(anchor);
            let pic = $('<div class="pic" id="pic' + link + '">');
            let div = $("<div/>");
            let paragraph = $('<p/>').text(text);

            div.html(paragraph);
            pic.append(div);
            //console.log(item.files.length);
            item.files.forEach(
                path => {
                    let small = path.dir.replace('/Tools/', '/Tools_small/');
                    let large = path.dir.replace('/Tools/', '/Tools_large/');
                    let div = $('<div class="img-wrap"><span class="close">' +
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
                        showingSingle: false
                    });

                    div.append(img);
                    pic.append(div);

                });
            pictures.append(pic);
        });
    // testing update
    $('.img-wrap .close').on('click', function () {
        let imgWrap = $(this).closest('.img-wrap');
        let img = imgWrap.find('img');
        let link = img.attr('link');
        let fileName = img.attr('filename');
        let dirs = [img.attr('dir'), img.attr('dir_small'), img.attr('dir_large')];
        // if currently displayed single - kill that

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
                        deleteImages(imgWrap, img, dirs, fileName);
                    }
                },
                No: {
                    btnClass: 'btn-red'
                },
            }
        });

        return false;
    });


    $("pictures img").on("click", function () {
        $(".pic").css("background-color", "white");
        $(this).parent().parent().css("background-color", "yellow");
        let single = $("single").empty();
        $("pictures img[showingsingle='true']").attr('showingsingle', false).css("border-color", "transparent");

        single.append($('<h4/>')
            .text("Turret" + $(this).attr("turret") +
            " Spindle" + $(this).attr("spindle")));
        single.append($('<h2/>')
            .text("Tool " + $(this).attr("tag") + ") " +
            $(this).attr("alt")));
        //$("pictures img").css("border-color", "transparent");
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
    });
    // build static menu
    //let ul = $(floatName + "> ul");
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

function deleteImages(wrapper, img, dirs, fileName) {
    // remove from db
    var turret, position, spindle, offset;
    [turret, position, spindle, offset] =
        img.attr('link').split('_');

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
        "filename": fileName
    };
    dbImagesDelete(query, filedata).then(
        success => {
            // adjust UI (remove image), remove single if showing this image
            if (img.attr("showingSingle")) $("single").empty();
            wrapper.remove();
            // rename (move) file to /images/Archive/MachineDir/Tools[_small|_large]
            archiveImages(dirs, fileName).then(
                success => { }, // silent
                failure => alert("Unable to Archive images.")
            );
        },
        failure => alert("Unable to perform database delete from images collection.\n"
            + JSON.stringify(failure))
    )


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
                debugger;
                //console.log("dbImagesDelete done " + JSON.stringify(result));
                if (result.nModified === 1) {
                    resolve(result);
                }
                else reject(result);

            })
            .fail((request, status, error) => {
                debugger;
                console.log("dbImagesDelete fail " + JSON.stringify(error));
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