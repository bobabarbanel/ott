// File: controllers/topRouter.js
const assert       = require('assert');
const path         = require('path');
const express      = require('express');
const bodyParser   = require('body-parser');
const cookieParser = require('cookie-parser');



const COOKIE      = 'chosenCookie';
module.exports = function(dir, app, db) {
	const upload = require('./uploadRouter')(dir,app,db);
	var data;
	

	app.use(express.static(path.join(dir, '/public')));
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({extended: true}));
	app.use(cookieParser());

	
	// main page 
	app.get('/', (req, res) => {
		// get parts data to start
		//var count = 0;
		data = [];
		var cursor = db.collection('main')
			.find( {}, { '_id': 0, dept: 1,  op: 1, partId: 1, machine: 1, pName: 1} ).sort({ partId: 1 });
		cursor.each(function(err, doc) {
		  assert.equal(err, null);
		  if (doc != null) {
			 //console.log(++count);
			 data.push(doc);
		  } 
		});
		// then show main search front end index.html file
		
		// console.log("controllers/topRouter.js");
		res.sendFile(dir + '/index.html');
	});

	app.get('/insert', (req, res) => {
		// get parts data to start
		//var count = 0;
		data = [];
		var cursor = db.collection('main')
			.find( {}, { '_id': 0, dept: 1,  op: 1, partId: 1, machine: 1, pName: 1} ).sort({ partId: 1 });
		cursor.each(function(err, doc) {
		  assert.equal(err, null);
		  if (doc != null) {
			 //console.log(++count);
			 data.push(doc);
		  } 
		});
		// then show main search front end index.html file
		
		// console.log("controllers/topRouter.js");
		res.sendFile(dir + '/insert.html');
	});

	app.get('/machine/:mnum', (req, res) => {
		//console.log(req.params.mnum);
		var query = {"machines": req.params.mnum};
		//console.log('/machine/:mnum ' + req.params.mnum);
		db.collection('machineSpecs').findOne( query, {"_id":0, "machines":0} ).then(
								doc => 
									{
										//console.log(doc);
										res.json(doc);
									},
								err => {
									console.log(err);
									res.json({});
								}
		);

	});
	
	app.post('/images', (req, res) => {	
		//console.log("/images post " + JSON.stringify(req.body));

		//console.log("/images parameters " + req.body.key + " : : " + req.body.tab);
		
		var key4 = [req.body.key.dept,req.body.key.partId,req.body.key.op,req.body.key.machine].join("|");
		
		//console.log("/images key4 " + key4);
		var myPromise = db.collection('images').find({"key4": key4, "tab": req.body.tab},
		{"_id":0,"key4":0,"tab":0})
			.sort({  position: 1, offset: 1})
			.toArray();

		myPromise.then(
			r => res.json(r),
			e => res.json([])
		);
		return;
	});
	/*
	app.post('/imageComment', (req, res) => {	
		//console.log("/imageComment " + req.body.dir);
		//console.log("/imageComment " + req.body.filename);
		db.collection('imageComments')
			.findOne( {dir: req.body.dir, filename: req.body.filename}, 
			{ _id: 0, dir: 0,  filename: 0} ).then((result) => {
			//console.log("/imageComment " + result.comment);
			res.send(result.comment);
		});
	});
	*/
	app.post('/addkey', (req, res) => {	
		
		db.collection('main').insertOne(req.body).then(
			result => {
				res.send(result);
			})
			.catch(
       			reason => {
            		res.send({"error": reason});
        		});
		
    });
	app.post('/sheetTags', (req, res) => {	
		//console.log("/sheetTags post " + JSON.stringify(req.body));

		//console.log("/sheetTags parameters " + req.body.key + " : : " + req.body.tab + " : : " + req.body.files);
		
		var key4 = [req.body.key.dept,req.body.key.partId,req.body.key.op,req.body.key.machine].join("|");
		var includeFiles = req.body.files;
		//console.log("/images key4 " + key4);
		var query = {"key4": key4, "tab": req.body.tab};
		var project = {"_id":0,"key4":0,"tab":0,"files":0};
		if(includeFiles == 1) delete project.files;
		var myPromise = db.collection('images')
			.find(query,project)
			.sort({ position: 1, offset: 1})
			.toArray();

		myPromise.then(
			r => res.json(r),
			e => res.json([])
		);
		return;
	});
			

	app.get('/noget', (req, res) => {
		console.log("/noget-index.html");
		res.sendFile(dir + '/index.html');
	});


	// send json data
	app.get('/data', (req, res) => res.json(data));
	// send json tabImages data
	//app.get('/tabdata', (req, res) => res.json(tabImages));

	// do Mongo query
	app.get('/parts', (req, res) => {
		//console.log("/parts");

		data = [];
		// project out the ids
		var cursor = db.collection('main').find( {}, 
			{ '_id': 0, dept: 1,  op: 1, partId: 1, machine: 1, pName: 1} );
		cursor.each(function(err, doc) {
		  assert.equal(err, null);
		  if (doc != null) {
			 data.push(doc);
		  } 
		}); 
		res.redirect('/noget');
	});


	app.post('/go_parts', (req, res) => {
		//console.log("/go_parts post " + JSON.stringify(req.body));
		var cookie_value = JSON.stringify(req.body)
		res.cookie(COOKIE, cookie_value);
		//console.log("cookie set");
		res.send("chosen set to " + cookie_value);
		//console.log("res.send");
	});
	/*function vals(q) {
	  return [q.partId, q.dept, q.pName, q.op, q.machine].join(",");
    }*/
	
	
	app.get('/reset', (req, res) => {
		//console.log("start app/reset");
	
		data = null;
		res.clearCookie(COOKIE);
		res.send("variables reset");
	});
};
