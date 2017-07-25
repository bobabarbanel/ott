// dirs2.js
const dirTree = require("directory-tree");
const path = require('path');
const tree = dirTree("C:/Users/RAbarbanel/Documents/mnode/public");/*, null,
	//(item, path) => console.log(item));*/
const util = require('util');
console.dir(tree, {depth: null, colors: true});