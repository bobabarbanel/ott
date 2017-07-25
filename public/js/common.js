"use strict";
/*exported cookieValue,getSpec,getParsedCookie,readCookie,setThisTab */
// common.js
var cookieValue;
function getSpec(machine) {
    // '/machine/:mnum'
    //console.log("getSpec " + machine);
    return new Promise((resolve, reject) => {

        $.ajax({
            url: "/machine/" + machine,
            type: 'get',
            dataType: 'json'
        })
            .done((result) => resolve(result))

            .fail((request, status, error) => reject(error));
    });
}
function getCookie() {
    return cookieValue;
}
function getParsedCookie() {
    return JSON.parse(getCookie());
}

function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) === ' ') { c = c.substring(1, c.length); }
        if (c.indexOf(nameEQ) === 0) { return c.substring(nameEQ.length, c.length); }
    }
    return null;
}

function setThisTab(which) {
    //console.log("setThisTab(" + which + ")");
    $(".w3-bar a").addClass("w3-bar-item w3-button w3-hover-blue w3-padding-8 w3-border");
    $("#t" + which).removeClass("w3-hover-blue").addClass("w3-green");
}