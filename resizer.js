// resizer
var ImageResize = require('node-image-resize'),
    fs = require('fs');
 
var image = new ImageResize('./public/images/Tools/NL/251A1626-4_30_NL2500_4_4_002.jpg');
image.loaded().then(function(){
    image.smartResizeDown({
        /*width: 200,*/
        height: 100
    }).then(function () {
        image.stream(function (err, stdout, stderr) {
            var writeStream = fs.createWriteStream('./public/images/Tools_small/NL/251A1626-4_30_NL2500_4_4_002.jpg');
            stdout.pipe(writeStream);
        });
    });
});
console.log(image);