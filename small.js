const Jimp = require('jimp');
const fs = require('fs');
['small', 'large'].forEach( 
    size => {
        ["NL", "ZL", "LC"].forEach(
            dir => {
                var path = "./public/images/Tools/" + dir;
                var target = "./public/images/Tools_" + size + "/" + dir;
                
                fs.readdir(path, (err, items) => {
                    console.log(dir + " " + size + " " + items.length);
                    let c = 1;
                    items.forEach(item => {
                        if (!fs.existsSync(target + '/' + item)) {
                            
                            Jimp.read(path + '/' + item).then(
                                img => {
                                    console.log(c++ + " " + target + '/' + item);
                                    img.resize(Jimp.AUTO, 100)            // resize 
                                        //.quality(60)                 // set JPEG quality 
                                        //.greyscale()                 // set greyscale 
                                        .write(target + '/' + item); // save 
                                }).catch(function (err) {
                                    console.error(err);
                                })
                        }
                    });               
                });
            }
        );
    }
)


