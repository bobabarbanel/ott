"use strict";
// File: controllers/topRouter.js

module.exports = function (dir, app, db) {
	require("./uploadRouter")(dir, app, db);
	require("./termRouter")(dir, app, db);
	app.use(logger);

	function logger(req, res, next) {
		console.log(new Date(), req.method, req.url);
		next();
	}
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
		res.render("insert.html", {});
	});

	app.get("/machine/:mnum", (req, res) => {
		const query = {
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
	app.get("/spec_tools_edit/:spec_type", (req, res) => {
		res.render("spec_tools_edit.html", { spec_type: req.params.spec_type });
	});
	app.get("/spec_tools_display/:spec_type", (req, res) => {
		res.render("spec_tools_display.html", { spec_type: req.params.spec_type });
	});
	app.get("/spec_tools_upload/:spec_type", (req, res) => {
		res.render("spec_tools_upload.html", { spec_type: req.params.spec_type });
	});
	app.get("/spec_tools_assign/:spec_type", (req, res) => {
		res.render("spec_tools_assign.html", { spec_type: req.params.spec_type });
	});

	app.post("/update_spec_image_comment", async (req, res) => {
		const spec_type = req.body.spec_type;
		const filename = req.body.filename;
		const dir = req.body.dir;
		const term = req.body.term;
		const modified_text = req.body.text;
		const col = db.collection("spec_terms");
		console.log({ spec_type, term, filename, dir, modified_text });
		try {
			col
				.updateOne(
					{ _id: spec_type },
					{ $set: { "terms.$[t].files.$[fref].comment": modified_text } },
					{
						arrayFilters: [
							{ "t.term": term },
							{ $and: [{ "fref.dir": dir }, { "fref.filename": filename }] }
						],
						multi: false
					}
				)
				.then(success => {
					res.json({ success: success });
				});
		} catch (error) {
			res.status = 500;
			res.json({ error: error });
		}
	});



	app.post("/get_spec_image_filerefs", async (req, res) => {
		const spec_type = req.body.spec_type;
		const jobId = req.body.jobId;
		const col = db.collection("spec_terms");
		const type = spec_type.toLowerCase() + "_tools";
		// console.log('/get_spec_image_filerefs jobId', jobId);
		// console.log('/get_spec_image_filerefs type', type);
		let job_terms;

		try {
			job_terms = await db.collection("tool_terms").findOne({ _id: jobId });

			if (job_terms === null || job_terms[type] === undefined) {
				res.json(null);
			} else {
				let myPromise = col
					.aggregate([
						{ $match: /** * query - The query in MQL. */ { _id: type } },
						{
							$project: /** * specifications - The fields to *   include or exclude. */ {
								_id: 0,
								nextNum: 0
							}
						},
						{
							$unwind: /** * path - Path to the array field. * includeArrayIndex - Optional name for index. * preserveNullAndEmptyArrays - Optional *   toggle to unwind null and empty values. */ {
								path: "$terms"
							}
						},
						{
							$match: {
								"terms.term": { $in: job_terms[type] }
							}
						},
						{
							$project: /** * specifications - The fields to *   include or exclude. */ {
								term: "$terms.term",
								size_of_files: { $size: "$terms.files" },
								files: "$terms.files"
							}
						},
						{
							$match: /** * query - The query in MQL. */ {
								size_of_files: { $gt: 0 }
							}
						},
						{
							$sort: /** * Provide any number of field/order pairs. */ {
								term: 1
							}
						}
					])
					.toArray();
				myPromise.then(
					result => {
						res.json(result);
					},
					error => {
						res.status = 500;
						// console.log("/get_spec_image_filerefs", error);
						res.json(error);
					}
				);
			}
		} catch (err) {
			res.status = 500;
			// console.log("/get_spec_image_filerefs", error);
			res.json("error: finding tool_terms for job");
		}
	});

	app.post("/set_spec_images_primary", (req, res) => {
		const col = db.collection("spec_terms");
		const type = req.body.spec_type;

		const filename = req.body.filename;
		const dir = req.body.dir;
		const thisTerm = req.body.term; // only change primary for this term
		// TODO: consider transaction

		// one type (hand or inspection)
		// console.log("/set_spec_images_primary term", thisTerm);
		col.findOne({ _id: type }, (err, doc) => {
			if (err) {
				res.status = 500;
				res.json(err);
			}
			const oneTerm = doc.terms.filter(term => term.term === thisTerm);
			// console.log("/set_spec_images_primary term", thisTerm);
			// console.log("/set_spec_images_primary term", oneTerm);
			// a single term
			oneTerm[0].files.forEach(aRef => {
				if (aRef.dir !== dir || aRef.filename !== filename) {
					delete aRef.primary; // remove any previous
				} else {
					aRef.primary = true; // set one primary
				}
			});

			try {
				col.replaceOne({ _id: type }, doc, { upsert: true });
				res.json("ok");
			} catch (err) {
				res.status = 500;
				res.json(err);
			}
		});
	});

	app.post("/updateJobToolTerms", (req, res) => {
		const spec_type = req.body.spec_type;
		const jobId = req.body.jobId;
		const terms = req.body.terms;
		const col = db.collection("tool_terms");
		// console.log("******* updateJobToolTerms", spec_type, jobId, terms);
		const update = {};
		update[spec_type] = terms;
		try {
			col
				.updateOne({ _id: jobId }, { $set: update }, { upsert: true })
				.then(success => {
					res.json({ success: success });
				});
		} catch (error) {
			res.status = 500;
			res.json({ error: error });
		}
	});

	app.post("/getJobToolTerms", (req, res) => {
		const spec_type = req.body.spec_type;
		const jobId = req.body.jobId;
		const col = db.collection("tool_terms");
		// console.log("******* getJobToolTerms", spec_type, jobId);
		const project = {
			_id: 0
		};
		project[spec_type] = 1;
		try {
			col.findOne({ _id: jobId }, project).then(success => {
				res.json(success);
			});
		} catch (error) {
			res.status = 500;
			res.json({ error: error });
		}
	});

	app.get("/getAllToolNames/:spec_type", (req, res) => {
		const spec_type = req.params.spec_type;
		const col = db.collection("spec_terms");
		col
			.aggregate(
				// Pipeline
				[
					// Stage 1
					{
						$match: {
							_id: spec_type
						}
					},

					// Stage 2
					{
						$project: {
							_id: 0,
							terms: 1
						}
					},

					// Stage 3
					{
						$unwind: {
							path: "$terms"
						}
					},

					// Stage 4
					{
						$project: {
							term: "$terms.term",
							count: { $size: "$terms.files" }
						}
					},
					{
						$sort: { term: 1 }
					}
				]
			)
			.toArray()
			.then(array => {
				// console.log(JSON.stringify(array));
				res.json(array);
			});
	});
	app.post("/addTerm", (req, res) => {
		db.collection("spec_terms")
			.updateOne(
				{ _id: req.body.type },
				{ $push: { terms: { term: req.body.term, files: [] } } }
			)
			.then(
				success => {
					// console.log("/addterm success", success.result);
					res.status = 201;
					res.json(success.result);
				},
				error => {
					console.log("/addterm error", error);
					res.status = 500;
					res.json(error);
				}
			);
	});
	app.post("/removeTerm", (req, res) => {
		console.log(JSON.stringify(req.body));
		db.collection("spec_terms")
			.updateOne(
				{ _id: req.body.type },
				{ $pull: { terms: { term: req.body.term } } }
			)
			.then(
				success => {
					res.status = 200;
					console.log("/removeTerm success", success.result);
					res.json(success.result);
				},
				error => {
					res.status = 500;
					console.log("/removeTerm error", error);
					res.json(error);
				}
			);
	});

	app.post("/tool_images", (req, res) => {
		var key4 = req.body.key4id;
		let archived = req.body.archived !== "false";
		let query = {
			key4: key4,
			tab: req.body.tab,
			"files.archived": archived // req.body.attr is a string
			// usually only want non-archived images, i.e query with archived === false
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


		myPromise.then(
			r => {
				res.json(r);
			},
			() => res.json([])
		);
		return;
	});

	app.post("/sheetTags", (req, res) => {
		const key4 = [
			req.body.key.dept,
			req.body.key.partId,
			req.body.key.op,
			req.body.key.machine
		].join("|");
		const includeFiles = req.body.files;

		const IMAGES = db.collection("images");
		let query = {
			key4: key4,
			tab: req.body.tab
		};
		const project = {
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

		let myPromise = IMAGES
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

	// app.post("/pname", (req, res) => {
	// 	var query = {
	// 		dept: req.body.dept,
	// 		machine: req.body.machine,
	// 		op: req.body.op,
	// 		partId: req.body.partId
	// 	};
	// 	var project = {
	// 		pName: 1
	// 	};
	// 	var myPromise = db.collection("main").findOne(query, project);

	// 	myPromise.then(
	// 		r => {
	// 			res.json(r);
	// 		},
	// 		() => res.json("none")
	// 	);
	// 	return;
	// });

	// app.get("/reset", (req, res) => {
	// 	res.clearCookie(COOKIENAME);
	// 	res.send("variables reset");
	// });

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

		Promise.all([toolCount(jobId), tabCount(jobId)]).then(values => {
			// console.log("tool count " + JSON.stringify(values));

			res.json({
				Tool: countValue(values, 0),
				Tab: countValue(values, 1)
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
	// function specCount(spec_type) {
	// 	// TODO:  when hand_tools implemented
	// 	return new Promise((resolve, reject) => {
	// 		db.collection(`${spec_type}_images`).aggregate([
	// 			{ $unwind: "$files"},
	// 			{ $count: "count" }
	// 		]).toArray().then(
	// 			(success) => {
	// 				resolve( success );
	// 			},
	// 			(error) => {
	// 				resolve( [{"count": 0}])
	// 			}
	// 		)

	// 		resolve([{ _id: 1, count: 0 }]);
	// 	});
	// }

	app.post("/archiveJob", (req, res) => {
		const jobId = req.body.key4id;
		const action = req.body.action;
		const col = db.collection("main");
		if (action) {
			// TODO:  finish this
			// set archive attribute to new Date()
			col
				.updateOne(
					{ _id: jobId },
					{ $set: { archived: new Date() } },
					{ upsert: false }
				)
				.then(
					success => {
						console.log("success", success);
						res.json(success);
					},
					error => res.json({ error: true, msg: error })
				); // $set
		} else {
			// remove archive attribute
			col.updateOne({ _id: jobId }, { $unset: { archived: 1 } }); // $unset
		}
	});
};
