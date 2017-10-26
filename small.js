const Jimp = require('jimp');
/*
Jimp.read("./public/images/Tools/LC/138Z0030-504_35_LC40-2A_1_1_001.jpg",
    function (err, img) {

        img.resize(Jimp.AUTO, 100, Jimp.RESIZE_BEZIER)
            .write("./public/images/Tools_small/LC/138Z0030-504_35_LC40-2A_1_1_001.jpg"); // save

    });
    */
const fs = require('fs');
const cntl = {
    "small": [Jimp.AUTO, 100],
    "large": [500, Jimp.AUTO]
};
let cnt = {};
['small', 'large'].forEach(
    size => {
        [/*"LC",*/ "ZL"/*, "NL"*/].forEach(
            dir => {
                var path = "./public/images/Tools/" + dir;
                var target = "./public/images/Tools_" + size + "/" + dir;
                var items = fs.readdirSync(path);
                cnt[dir + size] = 0;

                console.log("\n\n" + dir + " " + size + " " + items.length);

                items.forEach(item => {


                    if (!fs.existsSync(target + '/' + item) && cnt[dir + size] < 3) {

                        Jimp.read(path + '/' + item).then(
                            img => {
                                cnt[dir + size]++;
                                var p = new Promise((resolve, reject) => {
                                    img.resize(cntl[size][0],
                                        cntl[size][1],
                                        Jimp.RESIZE_BEZIER)            // resize 
                                        //.quality(60)                 // set JPEG quality 
                                        //.greyscale()                 // set greyscale 
                                        .write(target + '/' + item);
                                        resolve(true);
                                })

                                    .then(() => { // save 
                                        console.log(cnt[dir + size] +
                                            " " + target + '/' + item);
                                        
                                    }
                                    ).catch(function (err) {
                                        console.error(err);
                                    });
                            }
                        );
                    }
                });
            });
    }
);



