const Jimp = require('jimp');
const fs = require('fs');

var path = "./public/images/Tools/NL";
var target = "./public/images/Tools_small/NL";

fs.readdir(path, (err, items) => {
    items.forEach( item => {
        console.log(item);
        Jimp.read(path + '/' + item).then(
            img => {
                img.resize(Jimp.AUTO, 100)            // resize 
                     //.quality(60)                 // set JPEG quality 
                     //.greyscale()                 // set greyscale 
                     .write(target + '/' + item); // save 
            }).catch(function (err) {
                console.error(err);
            })
    }
        
    );
   
});
