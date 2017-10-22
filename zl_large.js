const Jimp = require('jimp');
const fs = require('fs');

var path = "./public/images/Tools/ZL";
var target = "./public/images/Tools_large/ZL";

fs.readdir(path, (err, items) => {
    console.log("ZL Large " + items.length);
    items.forEach( item => {
        
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
