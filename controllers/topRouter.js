"use strict";
// File: controllers/topRouter.js
// const assert = require('assert');

let data;
const COOKIE = 'chosenCookie';

module.exports = function (dir, app, db) {
	require('./uploadRouter')(dir, app, db);


	// main page 
	app.get('/', (req, res) => {
		// get parts data to start
		//var count = 0;
		data = [];
		var promise = db.collection('main')
			.find({}, {
				'_id': 0,
				dept: 1,
				op: 1,
				partId: 1,
				machine: 1,
				pName: 1
			}).sort({
				partId: 1
			}).toArray();


		promise.then(
			(results) => {
				data = results;
			}
		);
		// TODO: catch errors??
		// then show main search front end index.html file
		res.render('index.html', {});
	});

	app.get('/insert', (req, res) => {
		// get parts data to start
		data = [];
		var promise = db.collection('main')
			.find({}, {
				'_id': 0,
				dept: 1,
				op: 1,
				partId: 1,
				machine: 1,
				pName: 1
			}).sort({
				partId: 1
			}).toArray();
		promise.then(
			(results) => {
				data = results;
			}

		);
		// TODO: catch errors??

		res.sendFile(dir + '/insert.html');
	});

	app.get('/machine/:mnum', (req, res) => {

		var query = {
			"machines.mid": req.params.mnum
		};
		db.collection('machineSpecs').findOne(query, {
			"_id": 0
		}).then(
			doc => {
				res.json(doc);
			},
			err => {
				console.log(err);
				res.json({});
			}
		);

	});

	app.post('/tool_images', (req, res) => {
		var key4 = [req.body.key.dept, req.body.key.partId,
			req.body.key.op, req.body.key.machine
		].join("|");
		let archived = (req.body.archived !== 'false');
		let query = {
			"key4": key4,
			"tab": req.body.tab,
			"files.archived": archived // req.body.attr is a string
			// usually only want non-archived images, i.e query has archived === false
		};
		let col = db.collection('images');
		// want ONLY those docs which have active images
		var myPromise = col.aggregate([{
				$match: query
			},
			{
				$project: {
					// key4: 1,
					turret: 1,
					spindle: 1,
					position: 1,
					offset: 1,
					type: 1,
					function: 1,
					files: {
						$filter: {
							input: '$files',
							as: 'item',
							cond: {
								$eq: ['$$item.archived', archived]
							}
						}
					}
				}
			},
			{
				$sort: {
					turret: 1,
					position: 1,
					spindle: 1,
					offset: 1
				}
			}
		]).toArray();
		// var myPromise = col('images').find(query,
		// 	{ "key4": 0, "tab": 0 })
		// 	.sort({ turret: 1, position: 1, spindle: 1, offset: 1 })
		// 	.toArray();

		myPromise.then(
			r => {
				res.json(r);
			},
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
					res.send({
						"error": reason
					});
				});

	});

	app.post('/sheetTags', (req, res) => {
		let key4 = [req.body.key.dept, req.body.key.partId,
			req.body.key.op, req.body.key.machine
		].join("|");
		let includeFiles = req.body.files;

		let col = db.collection('images');
		let query = {
			"key4": key4,
			"tab": req.body.tab
		};
		let project = {
			_id: 0,
			turret: 1,
			spindle: 1,
			position: 1,
			offset: 1,
			type: 1,
			function: 1,
			files: {
				$filter: {
					input: '$files',
					as: 'item',
					cond: {
						$eq: ['$$item.archived', false]
					}
				}
			}
		};
		if (includeFiles !== "true") {
			delete project.files;
		}


		let myPromise = col.aggregate([{
				$match: query
			},
			{
				$project: project
			},
			{
				$sort: {
					turret: 1,
					position: 1,
					spindle: 1,
					offset: 1
				}
			}
		]).toArray();


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
		var promise = db.collection('main').find({}, {
			'_id': 0,
			dept: 1,
			op: 1,
			partId: 1,
			machine: 1,
			pName: 1
		}).toArray();
		promise.then(
			(results) => {
				data = results;
			}

		);
		// TODO: catch errors??
		res.redirect('/noget');
	});


	app.post('/go_parts', (req, res) => {
		var cookie_value = JSON.stringify(req.body);
		res.cookie(COOKIE, cookie_value);
		res.send(cookie_value);
	});

	app.post('/pname', (req, res) => {

		var query = {
			"dept": req.body.dept,
			"machine": req.body.machine,
			"op": req.body.op,
			"partId": req.body.partId
		};
		var project = {
			"pName": 1
		};
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


	app.post('/has_tabs',
		(req, res) => {

			let query = req.body;
			const tabsCollection = db.collection('tabs');
			//let myPromise = tabsCollection.find(query, {"_id": 1});
			let myPromise = tabsCollection.aggregate(
				// Pipeline
				[
					// Stage 1
					{
						$match: query
					},

					// Stage 2
					{
						$unwind: {
							path: "$tabs"
						}
					},

					// Stage 3
					{
						$count: "count"
					},

				]
			).toArray();



			myPromise.then(
				(r) => {

					if (r.length === 0) {
						res.json(0);
					} else {
						res.json(r[0].count);
					}

				},
				(err) => {
					console.log("has_tabs error: " + err);
					res.json({
						"error": err
					});
				}
			);
			return;
		}
	);

	app.post('/get_tabs',
		(req, res) => {

			let query = {
				"_id": req.body._id
			};
			const tabsCollection = db.collection('tabs');
			let myPromise = tabsCollection.find(query).toArray();

			myPromise.then(
				(r) => {
					if (r.length > 0) {
						if (req.body.index !== undefined) {
							// limit to a single element
							r[0].tabs = r[0].tabs.slice(req.body.index, req.body.index + 1);
						}
						res.json(r[0]);


					} else {
						res.json({});
					}

				},
				(err) => {
					console.log("tabs error: " + err);
					res.json({
						"error": err
					});
				}
			);
			return;
		}
	);

	app.get('/showtab/:tabnum/:tabname', (req, res) => {

		res.render('showtab.html', {
			"tabnum": req.params.tabnum,
			"tabname": req.params.tabname
		});

	});

	app.post('/tab_images', (req, res) => {
		let col = db.collection('tab_images');
		// want ONLY those docs which have active images
		var myPromise = col.aggregate(

			[{
				$match: /** * query - The query in MQL. */ {
					_id: req.body.key4id,
				}
			}, {
				$project: /** * specifications - The fields to *   include or exclude. */ {
					nextStepNum: 0,
					_id: 0
				}
			}, {
				$project: /** * specifications - The fields to *   include or exclude. */ {
					stepFiles: {
						$filter: {
							input: '$stepFiles',
							as: 'item',
							cond: {
								$eq: ['$$item.archived', false]
							}
						}
					}
				}
			}, {
				$unwind: /** * path - Path to the array field. * includeArrayIndex - Optional name for index. * preserveNullAndEmptyArrays - Optional *   toggle to unwind null and empty values. */ {
					path: "$stepFiles",
				}
			}, {
				$group: /** * _id - The id of the group. * field1 - The first field name. */ {
					_id: "$stepFiles.images_id",
					entry: {
						$push: {
							filename: "$stepFiles.filename",
							dir: "$stepFiles.dir",
							comment: "$stepFiles.comment"
						}
					}
				}
			}]).toArray();
		myPromise.then(
			r => {
				res.json(r);
			},
			() => res.json([])
		);
		return;
	});
};