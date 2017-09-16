"use strict";
// one.js
const COOKIE = 'chosenCookie';
var cookieValue = "not set";

$(function () {
    //console.log("running one");
    $.getScript("/js/common.js")
        .done(function (/*script, textStatus*/) {
            //console.log("getScript " + textStatus);

            ////////////////////////////////////////////////////////////
            cookieValue = unescape(readCookie(COOKIE));

            //console.log("one Cookie: " + getCookie());
            var title = "Offsets " + getParsedCookie().partId;
            //console.log("title " + title);
            $("title").text(title);

            $("#cookie").text(getCookie()); 
            setThisTab(4);

            
            ////////////////////////////////////////////////////////////
        })
        .fail(function (/*jqxhr, settings, exception*/) {
            console.log("getScript " + "Triggered ajaxError handler.");
        });

});



