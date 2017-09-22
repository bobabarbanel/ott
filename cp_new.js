
//copy the $file to $dir2
var copyFile = (file1, dir2, file2)=>{
  //include the fs, path modules
  var fs   = require('fs');
  var path = require('path');

  //gets file name and adds it to dir2
  var f      = path.basename(file2);
  var source = fs.createReadStream(file1);
  var dest   = fs.createWriteStream(path.resolve(dir2, f));

  source.pipe(dest);
  source.on('end', function() { console.log('Succesfully copied'); });
  source.on('error', function(err) { console.log(err); });
};

//example, copy file1.htm from 'test/dir_1/' to 'test/'
copyFile('./cfile1.txt', './test/', 'newfile.txt');