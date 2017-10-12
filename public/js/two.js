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
        $('content').attr('top',"60px");
    });
    //console.log("2.html cookieValue = " + getCookie());
    $.getScript("/js/common.js")
        .done(function (/*script, textStatus*/) {
            //console.log("getScript " + textStatus);

            ////////////////////////////////////////////////////////////
            cookieValue = unescape(readCookie(COOKIE));


            var title = "Part " + getParsedCookie().partId;

            $("title").text(title);

            $("#cookie").text(getCookie());
            setThisTab(2);
            //var toolSpecs = null;
            getSpec(getParsedCookie().machine)
                .then(machineSpecs => {

                    getImages("Tools").then((toolData) => {
                        //console.log("toolData: " + toolData);
                        paintPage(machineSpecs, toolData);
                    });

                });
            // set timeout onDomReady

            setTimeout(delayedFragmentTargetOffset, 500);
            ////////////////////////////////////////////////////////////
        })
        .fail(function (/*jqxhr, settings, exception*/) {
            console.log("getScript " + "Triggered ajaxError handler.");
        });

});





function paintPage(toolSpecs, toolData) {
    var links = [];
    var pictures = $('pictures');
    //var num = 1;
    if (isT1S1(toolSpecs)) {
        pictures.append($("<p>" + "T1S1" + "</p>"));
    }
    else {
        pictures.append($("<p>" + "NOT T1S1" + "</p>"));
    }
    toolData.forEach((item) => {
        var link = item.position + "-" + item.offset;
        var text = link + ") " + item.type + ":  " + item.function;
        links.push(['#'+link,text]);
        var pic = $('<div class="pic">');
        var div = $("<div/>", { "id": link });

        var paragraph = $('<p/>').text(text);
        //paragraph.attr("id", "num" + num);
        div.html(paragraph);
        pic.append(div);
        //pic.append(paragraph);

        item.files.forEach((path) => {
            var img = $('<img/>', {
                height: "100px",
                alt: item.function,
                link: link,
                src: path.dir + '/' + path.filename,
                comment: path.comment
            });
            //console.log("dir " + path.dir + " com " + path.comment);
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
            .text("Tool " + $(this).attr("link") + ": " + $(this).attr("alt")));
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
    let ul = $(floatName + "> ul");
    links.forEach(link => {
        let a = $('<a href="' + link[0] + '">').text(link[1]);
        ul.append($('<li>').append(a));
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

        //.always(() => console.log("getImages complete"));
    });
}
/*
function getImageComment(path) {
    
    var dirs = path.split(/\//);

    path = {
        dir: dirs.slice(0, dirs.length - 1).join("/"),
        filename: dirs[dirs.length - 1]
    };
    //console.log("dirs: " + path.dir + "::" + path.filename);
    return new Promise((resolve, reject) => {

        $.ajax({
            url: "/imageComment",
            type: 'post',
            data: path,
            dataType: 'text'
        })
            .done((result) => resolve(result))

            .fail((request, status, error) => reject(error))

        //.always(() => console.log("getImages complete"));
    });
    
}
*/



// add scroll offset to fragment target (if there is one)
function delayedFragmentTargetOffset() {

    var url = $(":target").context.URL;

    var hashCharPosition = url.lastIndexOf("#");
    if (hashCharPosition !== -1) {
        var div = $(url.substring(hashCharPosition));

        var offset = div.offset();
        //console.log("delayedFragmentTargetOffset" + " :: " + offset.top);
        //var offset = $(':target').offset();


        var scrollto = offset.top - 50; // minus fixed header height
        $('html, body').animate({ scrollTop: scrollto }, 0);
        div.css("background-color", "yellow");
        setTimeout(function () {
            div.css("background-color", "");
        }, 3000);
    }


}

function isT1S1(spec) {
    return (spec.Turret2 === undefined || spec.Turret1.Sprindle2 === undefined);
}

