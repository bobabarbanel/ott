const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const express = require('express');
const app = express();

var url = 'mongodb://localhost:27017/parts';
MongoClient.connect(url, function (err, db) {
  assert.equal(null, err);
  console.log("Connected correctly to server.");
  db.close();
});




