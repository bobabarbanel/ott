const Jimp = require('jimp');
const fs = require('fs');

var path = "./public/images/Tools/LC";
var target = "./public/images/Tools_large/LC";

fs.readdir(path, (err, items) => {
    items.forEach( item => {
        console.log("LC Large " + items.length);
        Jimp.read(path + '/' + item).then(
            img => {
                console.log(item);
                img.resize(500, Jimp.AUTO)            // resize 
                     //.quality(60)                 // set JPEG quality 
                     //.greyscale()                 // set greyscale 
                     .write(target + '/' + item); // save 
            }).catch(function (err) {
                console.error(err);
            })
    }
        
    );
   
});
