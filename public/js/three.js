"use strict";
// three.js
const COOKIE = 'chosenCookie';
var cookieValue = "not set";
var floatName = "#floatMenu";
var menuYloc = null;

$(function () {
    //console.log("3.html cookieValue = " + getCookie());
    menuYloc = parseInt($(floatName).css("top"));
    $(window).scroll(function () {
        var offset = menuYloc + $(document).scrollTop() + "px";
        $(floatName).animate({ top: offset }, { duration: 300, queue: false });
        $('content').attr('top',"60px");
    });
    $.getScript("/js/common.js")
        .done(function (/*script, textStatus*/) {
            //console.log("getScript " + textStatus);

            ////////////////////////////////////////////////////////////
            cookieValue = unescape(readCookie(COOKIE));


            var title = "Tooling " + getParsedCookie().partId;

            $("title").text(title);

            $("#cookie").text(getCookie());
            setThisTab(3);
            //var toolSpecs = null;
            getSpec(getParsedCookie().machine)
                .then(machineSpecs => {

                    getImages("Tooling").then(toolingData => {
                        //console.log("toolData: " + toolData);
                        paintPage(machineSpecs, toolingData);
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

    var pictures = $('pictures');
    var links = [];
    toolData.forEach((item, index) => {
        var link = item.title.replace(" ", "");
        links.push(['#'+link,item.title]);
        var pic = $('<div class="pic" id="' + link + '"/>');
        if (index === 0) { // first pic
            pic.removeClass('pic').addClass('pic0');
        }

        pic.html($('<p/>').text(item.title)).append($("<hr/>"));

        item.files.forEach((path) => {
            var img = $('<img/>', {
                height: "100px",
                alt: item.function,
                src: path.dir + '/' + path.filename,
                comment: path.comment
            });
            pic.append(img);
        });
        pictures.append(pic);
    });

    // build static menu
    let ul = $(floatName + "> ul");
    links.forEach(link => {
        let a = $('<a href="' + link[0] +'">').text(link[1]);
        ul.append($('<li>').append(a));
    });
    


    $("pictures img").on("click", function () {
        $(".pic,.pic0").css("background-color", "white");
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