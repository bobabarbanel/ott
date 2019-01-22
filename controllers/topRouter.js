"use strict";
// File: controllers/topRouter.js
// const assert = require('assert');

// let data;
const COOKIENAME = "chosenCookie"; // IMPORTANT: also defined in commonClass.js
const KEY4_ORDER = ["dept", "partId", "op", "machine"];
module.exports = function(dir, app, db) {
	require("./uploadRouter")(dir, app, db);

	// main page
	app.get("/", (req, res) => {
		// get parts data to start
		//var count = 0;
		var promise = db
			.collection("main")
			.find(
				{},
				{
					_id: 0,
					dept: 1,
					op: 1,
					partId: 1,
					machine: 1,
					pName: 1
				}
			)
			.sort({
				partId: -1
			})
			.toArray();

		promise.then(results => {
			// console.log(JSON.stringify(results, null, 4));
			res.render("index.html", {});
		});
		// TODO: catch errors??
	});

	app.get("/insert", (req, res) => {
		// get parts data to start
		// data = [];
		// var promise = db
		// 	.collection("main")
		// 	.find(
		// 		{},
		// 		{
		// 			_id: 0,
		// 			dept: 1,
		// 			op: 1,
		// 			partId: 1,
		// 			machine: 1,
		// 			pName: 1
		// 		}
		// 	)
		// 	.sort({
		// 		partId: 1
		// 	})
		// 	.toArray();
		// promise.then(results => {
		// 	data = results;
		// });
		// TODO: catch errors??

		res.render("insert.html", {});
	});

	app.get("/machine/:mnum", (req, res) => {
		var query = {
			"machines.mid": req.params.mnum
		};
		db.collection("machineSpecs")
			.findOne(query, {
				_id: 0
			})
			.then(
				doc => {
					res.json(doc);
				},
				err => {
					console.log(err);
					res.json({});
				}
			);
	});

	app.post("/tool_images", (req, res) => {
		var key4 = KEY4_ORDER.map(item => req.body[item]).join("|");
		let archived = req.body.archived !== "false";
		let query = {
			key4: key4,
			tab: req.body.tab,
			"files.archived": archived // req.body.attr is a string
			// usually only want non-archived images, i.e query has archived === false
		};
		let col = db.collection("images");
		// want ONLY those docs which have active images
		var myPromise = col
			.aggregate([
				{
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
								input: "$files",
								as: "item",
								cond: {
									$eq: ["$$item.archived", archived]
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
			])
			.toArray();
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

	app.post("/addkey", (req, res) => {
		req.body.lastUpdated = new Date(); // timestamp for jobs
		db.collection("main")
			.insertOne(req.body)
			.then(result => {
				res.send(result);
			})
			.catch(reason => {
				res.send({
					error: reason
				});
			});
	});

	app.post("/sheetTags", (req, res) => {
		let key4 = [
			req.body.key.dept,
			req.body.key.partId,
			req.body.key.op,
			req.body.key.machine
		].join("|");
		let includeFiles = req.body.files;

		let col = db.collection("images");
		let query = {
			key4: key4,
			tab: req.body.tab
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
					input: "$files",
					as: "item",
					cond: {
						$eq: ["$$item.archived", false]
					}
				}
			}
		};
		if (includeFiles !== "true") {
			delete project.files;
		}

		let myPromise = col
			.aggregate([
				{
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
			])
			.toArray();

		myPromise.then(
			r => {
				res.json(r);
			},
			() => res.json([])
		);
		return;
	});

	app.get("/get_jobs", (req, res) => {
		// project out the ids
		var promise = db
			.collection("main")
			.find(
				{ archived: { $exists: false } },
				{
					_id: 0,
					dept: 1,
					op: 1,
					partId: 1,
					machine: 1,
					pName: 1
				}
			)
			.toArray();
		promise.then(results => {
			// console.log(results.length); //JSON.stringify(results[results.length-1],null,4)
			res.json(results);
		});
		// TODO: catch errors??
		//res.render('/noget');
		// res.render('index.html', {});
	});

	app.post("/pname", (req, res) => {
		var query = {
			dept: req.body.dept,
			machine: req.body.machine,
			op: req.body.op,
			partId: req.body.partId
		};
		var project = {
			pName: 1
		};
		var myPromise = db.collection("main").findOne(query, project);

		myPromise.then(
			r => {
				res.json(r);
			},
			() => res.json("none")
		);
		return;
	});

	app.get("/reset", (req, res) => {
		res.clearCookie(COOKIENAME);
		res.send("variables reset");
	});

	app.post("/has_tabs", (req, res) => {
		let query = req.body;
		const tabsCollection = db.collection("tabs");
		//let myPromise = tabsCollection.find(query, {"_id": 1});
		let myPromise = tabsCollection
			.aggregate(
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
					}
				]
			)
			.toArray();

		myPromise.then(
			r => {
				if (r.length === 0) {
					res.json(0);
				} else {
					res.json(r[0].count);
				}
			},
			err => {
				console.log("has_tabs error: " + err);
				res.json({
					error: err
				});
			}
		);
		return;
	});

	app.post("/get_tabs", (req, res) => {
		let query = {
			_id: req.body._id
		};
		const tabsCollection = db.collection("tabs");
		let myPromise = tabsCollection.find(query).toArray();

		myPromise.then(
			r => {
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
			err => {
				console.log("tabs error: " + err);
				res.json({
					error: err
				});
			}
		);
		return;
	});

	app.get("/showtab/:tabnum/:tabname", (req, res) => {
		res.render("showtab.html", {
			tabnum: req.params.tabnum,
			tabname: req.params.tabname
		});
	});

	app.post("/tab_images", (req, res) => {
		let col = db.collection("tab_images");
		// want ONLY those docs which have active images
		var myPromise = col
			.aggregate([
				{
					$match: /** * query - The query in MQL. */ {
						_id: req.body.key4id
					}
				},
				{
					$project: /** * specifications - The fields to *   include or exclude. */ {
						nextStepNum: 0,
						_id: 0
					}
				},
				{
					$project: /** * specifications - The fields to *   include or exclude. */ {
						stepFiles: {
							$filter: {
								input: "$stepFiles",
								as: "item",
								cond: {
									$eq: ["$$item.archived", false]
								}
							}
						}
					}
				},
				{
					$unwind: /** * path - Path to the array field. * includeArrayIndex - Optional name for index. * preserveNullAndEmptyArrays - Optional *   toggle to unwind null and empty values. */ {
						path: "$stepFiles"
					}
				},
				{
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
				}
			])
			.toArray();
		myPromise.then(
			r => {
				res.json(r);
			},
			() => res.json([])
		);
		return;
	});

	app.post("/jobStats", (req, res) => {
		const jobId = req.body.key4id;

		Promise.all([
			toolCount(jobId),
			handCount(jobId),
			inspectionCount(jobId),
			tabCount(jobId)
		]).then(values => {
			// console.log("tool count " + JSON.stringify(values));

			res.json({
				Tool: countValue(values, 0),
				"Hand Tool": countValue(values, 1),
				"Inspection Tool": countValue(values, 2),
				Tab: countValue(values, 3)
			});
		});
	});

	function countValue(values, index) {
		return values[index].length === 1 && "count" in values[index][0]
			? values[index][0].count
			: 0;
	}

	function toolCount(jobId) {
		let query = {
			key4: jobId,
			tab: "Tools"
		};
		let col = db.collection("images");
		// want ONLY those docs which have active images
		// console.log(JSON.stringify(query));
		return col
			.aggregate([
				{
					$match: query
				},
				{
					$project: {
						_id: 0,
						files: {
							$filter: {
								input: "$files",
								as: "item",
								cond: {
									$eq: ["$$item.archived", false]
								}
							}
						}
					}
				},
				{
					$project: {
						_id: 1,
						num: { $size: "$files" }
					}
				},
				{
					$group: { _id: 1, count: { $sum: "$num" } }
				}
			])
			.toArray();
	}
	function tabCount(jobId) {
		let query = {
			_id: jobId
		};
		let col = db.collection("tab_images");
		// want ONLY those docs which have active images
		// console.log(JSON.stringify(query));
		return col
			.aggregate([
				{
					$match: query
				},
				{
					$project: {
						_id: 0,
						files: {
							$filter: {
								input: "$stepFiles",
								as: "item",
								cond: {
									$eq: ["$$item.archived", false]
								}
							}
						}
					}
				},
				{
					$project: {
						_id: 1,
						num: { $size: "$files" }
					}
				},
				{
					$group: { _id: 1, count: { $sum: "$num" } }
				}
			])
			.toArray();
	}

	function handCount(jobId) {
		// TODO:  when hand_tools implemented
		return new Promise((resolve, reject) => {
			resolve([{ _id: 1, count: 0 }]);
		});
	}
	function inspectionCount(jobId) {
		// TODO:  when inspection_tools implemented
		return new Promise((resolve, reject) => {
			resolve([{ _id: 1, count: 0 }]);
		});
	}
};
