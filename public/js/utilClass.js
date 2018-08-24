"use strict";
/*exported Util */
// utilClass.js
class Util {
    // Utilities

    static setThisTab(which) {
        //console.log("setThisTab(" + which + ")");
        $(".w3-bar a").addClass("w3-bar-item w3-button w3-hover-blue w3-padding-8 w3-border");
        $("#t" + which).removeClass("w3-hover-blue").addClass("w3-green");
    }
    // Returns if a value is a string
    static isString(value) {
        return typeof value === 'string' || value instanceof String;
    }

    static numsOf(str) {
        return str.replace(/[^\d]/g, '');
    }

    static getMachineSpec(machine) {

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

    static getSheetTags(keyObj, tab) {
   
        return new Promise((resolve, reject) => {
            $.ajax({
                    url: "/sheetTags",
                    type: 'post',
                    data: {
                        "key": keyObj,
                        "tab": tab,
                        "files": false // do not retrieve files/images list
                    },
                    dataType: 'json'
                })
                .done((result) => resolve(result))
                .fail((request, status, error) => reject(error));
        });
    }
}