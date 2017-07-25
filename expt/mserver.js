#! /usr/bin/env node


var User = require('./models/user');
var promise = require('promise');

var mongoose = require('mongoose');
mongoose.Promise = promise;

var userArgs = process.argv.slice(2);
if (!userArgs[0].startsWith('mongodb://')) {
    console.log('ERROR: You need to specify a valid mongodb URL as the first argument');
    return
}


var mongoDB = userArgs[0];


mongoose.connection.on('error', console.error.bind(console, 'MongoDB connection error:'));

var options = {
  "useMongoClient" : false
};
mongoose.connect(mongoDB, options);
var db = mongoose.connection;
console.log(db);

doit();
function doit() {
  // grab the user model

console.log("create user");
// create a new user
var newUser = User({
  name: 'Peter Quill',
  username: 'starlord55',
  password: 'password',
  admin: true
});
console.log(newUser.name);
// save the user
newUser.save(function(err) {
  if (err) throw err;

  console.log('User created!');
});
db.close();
}


