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

            $("title").text("Part " + getParsedCookie().partId);

            $("#cookie").text(getCookie());
            setThisTab(2);

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

});

function paintPage(toolSpecs, toolData) {
    let links = []; // for float menu
    let pictures = $('pictures');
    let currentTurret = 0;
    let currentSpindle = 0;
    toolData.forEach((item) => {
        let link = [item.turret, item.position, item.spindle, item.offset].join('_');
        let text = item.position + '-' + item.offset + ") "
            + item.function + ":  " + item.type;



        if (currentTurret !== item.turret || currentSpindle !== item.spindle) {
            let headText = "Turret" + item.turret + " " + "Spindle" + item.spindle;
            let headLink = [item.turret, item.spindle].join('-');

            let anchor = $('<a class="anchor" id="' + headLink + '"/>');
            pictures.append(anchor);
            pictures.append(
                $('<h4/>').text(headText).css('background', 'lightgreen')
            );
            currentTurret = item.turret;
            currentSpindle = item.spindle;

            links.push(['#' + headLink, headText]);
        }

        links.push(['#' + link, text]);
        let anchor = $('<a class="anchor" id="' + link + '"/>');
        pictures.append(anchor);
        let pic = $('<div class="pic">');


        let div = $("<div/>");
        let paragraph = $('<p/>').text(text);

        div.html(paragraph);
        pic.append(div);
        item.files.forEach(
            (path) => {
                let img = $('<img/>', {
                    height: "100px",
                    alt: item.function + ": " + item.type,
                    link: link,
                    src: path.dir + '/' + path.filename,
                    comment: path.comment
                });
                pic.append(img);
            });

        pictures.append(pic);
    });

    $("pictures img").on("click", function () {
        $(".pic").css("background-color", "white");
        $(this).parent().css("background-color", "yellow");
        var single = $("single");
        single.empty();
        single.append($('<h2/>')
            .text("Tool " + $(this).attr("link") + ") " + $(this).attr("alt")));
        $("pictures img").css("border-color", "transparent");
        $(this).css("border-color", "blue");
        var img = $('<img/>', {
            src: $(this).attr("src"),
            alt: "large image"
        });
        single.append(img);
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