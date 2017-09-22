//mktest.js
const fs = require('fs');
const path = require('path');
const mypath = "C:/Users/RAbarbanel/Documents/jeffproject-master/public/images/Tools/XYZ";

const test = path.normalize(mypath);

fs.mkdirSync(test)
if(fs.existsSync(test)) {
    console.log("got it !!!!!!!!!!!!!!!!!!");
}
else {
    console.log("failure to mkdir !!!!!!!!!!!!!!!!");
}