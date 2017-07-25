//fileinput3.js
$(function () {


    $("#fileInput").on('change', function() {
        //alert(document.getElementById("fileInput").files);
        placeFiles().then(
            result => console.log(result),
            error => console.err(error)
        );
    });


}