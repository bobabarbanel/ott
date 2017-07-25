// File: routes/index.js
const routes = require('express').Router();
var data;

module.exports = function(data){

	routes.get('/', (req, res) => {
		console.log("/ called   data has " + data.length);
		res.sendFile(__dirname + '/index.html');
    });
};
/*
const MongoClient = require('mongodb').MongoClient;
const express     = require('express');
const app         = express();
const routes      = require('express').Router();
var   data;
var   db;

const url = 'mongodb://localhost:27017/parts'; // Mongo Parts DB
console.log("Routes/index.js loaded.")


routes.get('/', (req, res) => {
	// get parts data to start
	data = [];
	var cursor = db.collection('main').find( {}, { '_id': 0, dept: 1,  op: 1, partId: 1, machine: 1, pName: 1} ).sort({ partId: 1 });
	cursor.each(function(err, doc) {
	  assert.equal(err, null);
	  if (doc != null) {
		 //console.dir(doc);
		 data.push(doc);
	  } 
	});
	// then show index.html file
	console.log(data.length + " records loaded.");
    res.sendFile(__dirname + '/index.html');
  });
  
module.exports = routes;

MongoClient.connect(url, (err, database) => {
  if (err) return console.log(err);
  db = database;
  console.log("Starting server");
  app.listen(3001, () => {
    console.log('listening on 3001, Mongo "parts" is connected');
  })
});
*/