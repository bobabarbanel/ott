"use strict";
// File: controllers/topRouter.js
const assert = require('assert');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');



const COOKIE = 'chosenCookie';
module.exports = function (dir, app, db) {
	/*const upload = */require('./uploadRouter')(dir, app, db);
	var data;


	app.use(express.static(path.join(dir, '/public')));
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(cookieParser());


	// main page 
	app.get('/', (req, res) => {
		// get parts data to start
		//var count = 0;
		data = [];
		var cursor = db.collection('main')
			.find({}, { '_id': 0, dept: 1, op: 1, partId: 1, machine: 1, pName: 1 }).sort({ partId: 1 });
		cursor.each(function (err, doc) {
			assert.equal(err, null);
			if (doc !== null) {
				data.push(doc);
			}
		});
		// then show main search front end index.html file

		res.sendFile(dir + '/index.html');
	});

	app.get('/insert', (req, res) => {
		// get parts data to start
		data = [];
		var cursor = db.collection('main')
			.find({}, { '_id': 0, dept: 1, op: 1, partId: 1, machine: 1, pName: 1 }).sort({ partId: 1 });
		cursor.each(function (err, doc) {
			assert.equal(err, null);
			if (doc !== null) {
				data.push(doc);
			}
		});

		res.sendFile(dir + '/insert.html');
	});

	app.get('/machine/:mnum', (req, res) => {

		var query = { "machines.mid": req.params.mnum };
		db.collection('machineSpecs').findOne(query, { "_id": 0 }).then(
			doc => {
				res.json(doc);
			},
			err => {
				console.log(err);
				res.json({});
			}
		);

	});

	app.post('/images', (req, res) => {
		var key4 = [req.body.key.dept, req.body.key.partId,
		req.body.key.op, req.body.key.machine].join("|");

		var myPromise = db.collection('images').find({
			"key4": key4,
			"tab": req.body.tab
		},
			{ "_id": 0, "key4": 0, "tab": 0 })
			.sort({ turret: 1, position: 1, spindle: 1, offset: 1 })
			.toArray();

		myPromise.then(
			r => res.json(r),
			() => res.json([])
		);
		return;
	});

	app.post('/addkey', (req, res) => {
		req.body.lastUpdated = new Date(); // timestamp for jobs
		db.collection('main').insertOne(req.body).then(
			result => {
				res.send(result);
			})
			.catch(
			reason => {
				res.send({ "error": reason });
			});

	});
	app.post('/sheetTags', (req, res) => {

		var key4 = [req.body.key.dept, req.body.key.partId,
		req.body.key.op, req.body.key.machine].join("|");
		var includeFiles = req.body.files;

		var query = { "key4": key4, "tab": req.body.tab };
		var project = { "_id": 0, "key4": 0, "tab": 0, "files": 0 };
		if (includeFiles !== 1) { delete project.files; }

		var myPromise = db.collection('images')
			.find(query, project)
			.sort({ turret: 1, position: 1, spindle: 1, offset: 1 })
			.toArray();

		myPromise.then(
			r => {
				res.json(r);
			},
			() => res.json([])
		);
		return;
	});


	app.get('/noget', (req, res) => {
		res.sendFile(dir + '/index.html');
	});


	// send json data
	app.get('/data',
		(req, res) =>
			res.json(data));


	// do Mongo query
	app.get('/parts', (req, res) => {

		data = [];
		// project out the ids
		var cursor = db.collection('main').find({},
			{ '_id': 0, dept: 1, op: 1, partId: 1, machine: 1, pName: 1 });
		cursor.each(function (err, doc) {
			assert.equal(err, null);
			if (doc !== null) {
				data.push(doc);
			}
		});
		res.redirect('/noget');
	});


	app.post('/go_parts', (req, res) => {
		var cookie_value = JSON.stringify(req.body);
		res.cookie(COOKIE, cookie_value);
		res.send("chosen set to " + cookie_value);
	});

	app.post('/pname', (req, res) => {

		var query = {
			"dept": req.body.dept,
			"machine": req.body.machine,
			"op": req.body.op,
			"partId": req.body.partId
		};
		var project = { "pName": 1 };
		var myPromise = db.collection('main')
			.findOne(query, project);

		myPromise.then(
			r => {
				res.json(r);
			},
			() => res.json("none")
		);
		return;
	});

	app.get('/reset', (req, res) => {

		data = null;
		res.clearCookie(COOKIE);
		res.send("variables reset");
	});
};
