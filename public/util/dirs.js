// dirs.js
const FileHound = require('filehound');

FileHound.create()
.paths('C:/Users/RAbarbanel/Documents/mnode/public')
.directory()
.find()
.then(files => files.forEach(file => console.log(file)));
