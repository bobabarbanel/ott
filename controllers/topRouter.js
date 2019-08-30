"use strict";
// File: controllers/topRouter.js

module.exports = function (dir, app, db) {
	require("./uploadRouter")(dir, app, db);
	require("./termRouter")(dir, app, db);
	app.use(logger);

	const SPEC_TERMS = db.collection("spec_terms");
	const MACHINESPECS = db.collection("machineSpecs");
	const MAIN = db.collection("main");
	const TOOL_TERMS = db.collection("tool_terms");
	const IMAGES = db.collection("images");
	const MAIN_TABLE = db.collection("main_table");
	const TABS = db.collection("tabs");
	const TAB_IMAGES = db.collection("tab_images");


	function logger(req, res, next) {
		console.log(new Date(), req.method, req.url);
		next();
	}
	// main page
	app.get("/", (req, res) => {
		res.render("index.html", {});
	});


	app.get("/insert", (req, res) => {
		res.render("insert.html", {});
	});

	app.get("/machine/:mnum", (req, res) => {
		const query = {
			"machines.mid": req.params.mnum
		};
		MACHINESPECS
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
	// app.get("/spec_tools_upload/:spec_type", (req, res) => {
	// 	res.render("spec_tools_upload.html", { spec_type: req.params.spec_type });
	// });
	app.get("/spec_tools_assign/:spec_type", (req, res) => {
		res.render("spec_tools_assign.html", { spec_type: req.params.spec_type });
	});

	app.post("/update_spec_image_comment", (req, res) => {
		const spec_type = req.body.spec_type;
		const filename = req.body.filename;
		const dir = req.body.dir;
		const term = req.body.term;
		const modified_text = req.body.text;

		// console.log({ spec_type, term, filename, dir, modified_text });
		try {
			SPEC_TERMS
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
					return res.json({ success: success });
				});
		} catch (error) {
			return res.status(500).json({ error: error });
		}
	});



	app.post("/get_spec_image_filerefs", async (req, res) => {
		const spec_type = req.body.spec_type;
		const jobId = req.body.jobId;
		const type = spec_type.toLowerCase() + "_tools";
		// console.log('/get_spec_image_filerefs jobId', jobId);
		// console.log('/get_spec_image_filerefs type', type);
		let job_terms;

		try {
			job_terms = await TOOL_TERMS.findOne({ _id: jobId });
console.log({job_terms});
			if (job_terms === null || job_terms[type] === undefined || job_terms[type] === null) {
				res.json(null);
			} else {
				let myPromise = SPEC_TERMS
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
						console.log({result})
						return res.json(result);
					},
					error => {
						console.log("/get_spec_image_filerefs", error);
						return res.status(500).json(error);
					}
				);
			}
		} catch (err) {
			// console.log("/get_spec_image_filerefs", error);
			return res.status(500).json("error: finding tool_terms for job");
		}
	});

	app.post("/set_spec_images_primary", (req, res) => {
		const type = req.body.spec_type;

		const filename = req.body.filename;
		const dir = req.body.dir;
		const thisTerm = req.body.term; // only change primary for this term
		// TODO: consider transaction

		// one type (hand or inspection)
		// console.log("/set_spec_images_primary term", thisTerm);
		SPEC_TERMS.findOne({ _id: type }, (err, doc) => {
			if (err) {
				return res.status(500).json(err);
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
				SPEC_TERMS.replaceOne({ _id: type }, doc, { upsert: true });
				return res.json("ok");
			} catch (err) {
				return res.status(500).json(err);
			}
		});
	});

	app.post("/updateJobToolTerms", (req, res) => {
		const spec_type = req.body.spec_type;
		const jobId = req.body.jobId;
		const terms = req.body.terms;

		// console.log("******* updateJobToolTerms", spec_type, jobId, terms);
		const update = {};
		update[spec_type] = terms;
		try {
			TOOL_TERMS
				.updateOne({ _id: jobId }, { $set: update }, { upsert: true })
				.then(success => {
					return res.json({ success: success });
				});
		} catch (error) {
			return res.status(500).json({ error: error });
		}
	});

	app.post("/getJobToolTerms", (req, res) => {
		const spec_type = req.body.spec_type;
		const jobId = req.body.jobId;
		// console.log("******* getJobToolTerms", spec_type, jobId);
		const project = {
			_id: 0
		};
		project[spec_type] = 1;
		try {
			TOOL_TERMS.findOne({ _id: jobId }, project).then(success => {
				return res.json(success);
			});
		} catch (error) {
			return res.status(500).json({ error: error });
		}
	});

	app.get("/getAllToolNames/:spec_type", (req, res) => {
		const spec_type = req.params.spec_type;
		SPEC_TERMS
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
				res.json(array);
			});
	});
	app.get("/machine_ids", (req, res) => {
		MACHINESPECS.aggregate(
			[
				{ $unwind: { path: "$machines", } },
				{ $project: { _id: 0, mid: "$machines.mid" } }]
		).toArray().then(
			(results) => res.json(results)
		);
	});
	app.get("/initialize_spec_terms", (req, res) => {
		SPEC_TERMS.countDocuments({}).then(
			(result) => {
				if (result === 2) {
					res.json({ success: result });
				}
				else {
					try {
						SPEC_TERMS.insertMany(
							[
								{
									"_id": "hand_tools",
									"terms": [],
									"nextNum": 0
								},
								{
									"_id": "inspection_tools",
									"terms": [],
									"nextNum": 0
								}
							]
						).then(
							(result) => res.json({ "initialized": 2 })
						);
					}
					catch (error) {
						res.status(500).json({ "failure": error });
					}
				}
			}
		);
	});
	app.post("/addTerm", (req, res) => {
		SPEC_TERMS
			.updateOne(
				{ _id: req.body.type },
				{ $push: { terms: { term: req.body.term, files: [] } } }
			)
			.then(
				success => {
					// console.log("/addterm success", success.result);
					return res.status(201).json(success.result);
				},
				error => {
					console.log("/addterm error", error);
					return res.status(500).res.json(error);
				}
			);
	});
	app.post("/removeTerm", (req, res) => {
		// console.log("/removeTerm", JSON.stringify(req.body));
		SPEC_TERMS
			.updateOne(
				{ _id: req.body.type },
				{ $pull: { terms: { term: req.body.term } } }
			)
			.then(
				successA => {
					// console.log("/removeTerm successA", successA.result);
					const query = {}; // all jobs
					query[req.body.type] = req.body.term; // having term value
					const update = {}
					update[req.body.type] = req.body.term;
					// console.log({query,update});
					TOOL_TERMS.updateMany(
						query,
						{ $pull: update }
					).then(
						successB => {
							// console.log('removeTerm success', successB.result);
							return res.status(200).json(successB.result);
						},
						error => {
							console.log('removeTerm error TOOL_TERMS', error);
							return res.status(500).json(error);
						}
					)
					// return res.status(200).json(success.result);
				},
				error => {
					console.log("/removeTerm SPEC_TERMS error", error);
					return res.status(500).json(error);
				}
			);
	});
	app.post("/modifyTerm", (req, res) => {
		// console.log("/modifyTerm", JSON.stringify(req.body));
		// TODO: transaction (two updates)
		SPEC_TERMS
			.updateOne(
				{ _id: req.body.type, "terms.term": req.body.oldTerm },
				{ $set: { "terms.$.term": req.body.newTerm } }
			)
			.then(
				successA => {
					// console.log("/modifyTerm successA", successA.result);
					const query = {}; // all jobs
					query[req.body.type] = req.body.oldTerm;
					const update = {}
					update[`${req.body.type}.$`] = req.body.newTerm;

					TOOL_TERMS.updateMany(
						query,
						{ $set: update }
					).then(
						successB => {
							// console.log('modifyTerm successB', successB.result);
							return res.status(200).json(successB.result);
						},
						error => {
							console.log('modifyTerm error TOOL_TERMS', error);
							return res.status(500).json(error);
						}
					)

				},
				error => {
					console.log('modifyTerm error SPEC_TERMS', error);
					return res.status(500).json(error);
				}
			);
	});

	app.post("/tool_images", (req, res) => {
		var key4 = req.body.key4id;
		let archived = req.body.archived !== "false";
		let query = {
			key4: key4,
			tab: req.body.tab, //RMA
			"files.archived": archived // req.body.attr is a string
			// usually only want non-archived images, i.e query with archived === false
		};

		//TODO: remove collection
		// want ONLY those docs which have active images
		var myPromise = IMAGES
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
				return res.json(r);
			},
			() => {
				return res.status(500).json([]);
			}
		);

	});
	app.post("/tool_images_new", (req, res) => {
		var key4 = req.body.key4id;
		let archived = req.body.archived !== "false";
		let query = {
			key4: key4,
			"files.archived": archived // req.body.attr is a string
			// usually only want non-archived images, i.e query with archived === false
		};

		// want ONLY those docs which have active images
		var myPromise = IMAGES
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
				return res.json(r);
			},
			() => {
				return res.status(500).json([]);
			}
		);

	});

	app.post("/sheetTags", (req, res) => {
		const key4 = [
			req.body.key.dept,
			req.body.key.partId,
			req.body.key.op,
			req.body.key.machine
		].join("|");
		const includeFiles = req.body.files;

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

	app.post("/sheetTags_new", (req, res) => {
		const key4id = req.body.key4id;
		const includeFiles = req.body.files === "true";

		const include_images_id = (req.body.images_id === "true") ? 1 : 0;

		const agg = [
			{
				$match:
					{ _id: key4id }
			},
			{
				$unwind:

					{ path: "$rows" }
			}, {
				$project:
				{
					turret: "$rows.turret",
					spindle: "$rows.spindle",
					position: "$rows.position",
					offset: "$rows.offset",
					function: "$rows.function",
					type: "$rows.type"
				}
			},
			{
				$sort: { // IMPORTANT, must be sorted this way
					turret: 1,
					spindle: 1,
					position: 1,
					offset: 1
				}
			}
		];
		if (includeFiles) agg.push(
			{
				$lookup: {
					from: "images",
					let: { mid: "$_id", mt: "$turret", ms: "$spindle", mp: "$position", mo: "$offset" },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ["$key4", "$$mid"]
										},
										{
											$eq: ["$turret", "$$mt"]
										},
										{
											$eq: ["$spindle", "$$ms"]
										},
										{
											$eq: ["$position", "$$mp"]
										},
										{
											$eq: ["$offset", "$$mo"]
										}]
								}
							}
						},
						{
							$project:
							{
								_id: include_images_id,
								files: {
									$filter: {
										input: "$files",
										as: "item",
										cond: { $eq: ["$$item.archived", false] }
									}
								}
							}
						}
					],
					as: "files"
				}
			}
		);
		let myPromise = MAIN_TABLE.aggregate(agg).toArray();

		myPromise.then(
			(docs) => {
				return res.json(docs);
			},
			(error) => {
				return res.status(500).json({ "error": error });
			}
		);

	});


	app.get("/get_jobs", (req, res) => {
		// project out the ids

		var promise = MAIN
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



	app.post("/has_tabs", (req, res) => {
		let query = req.body;
		//let myPromise = tabsCollection.find(query, {"_id": 1});
		let myPromise = TABS
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
	app.post("/get_tab_images_counts", (req, res) => {
		// get number for each images_id in one job's TAB_IMAGES collection document
		// console.log(req.body);

		try {
			TAB_IMAGES.aggregate(
				[{
					$match: req.body
				},
				{
					$project:
						{ nextStepNum: 0, _id: 0 }
				},
				{
					$unwind:
						{ path: "$stepFiles" }
				},
				{
					$group:
						{ _id: "$stepFiles.images_id", count: { $sum: 1 } }
				}
				]
			).toArray().then(
				(results) => {
					// console.log("/get_tab_images_counts", results);
					res.json(results);
				}

			)
		} catch (error) {
			res.status(500).json(error);
		}
	});
	app.post("/get_tabs", (req, res) => {
		let query = {
			_id: req.body._id
		};
		let myPromise = TABS.find(query).toArray();

		myPromise.then(
			r => {
				if (r.length > 0) {
					// console.log(r[0]);
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
			tabname: req.params.tabname,
			sectnum: -1,
			stepnum: -1
		});
	});

	app.get("/showtab/:tabnum/:tabname/:sectnum/:stepnum", (req, res) => {
		// console.log(req.params);
		res.render("showtab.html", req.params);
	});

	app.post("/tab_images", (req, res) => {

		// want ONLY those docs which have active images
		var myPromise = TAB_IMAGES
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
		// want ONLY those docs which have active images
		// console.log(JSON.stringify(query));
		return IMAGES
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
		const query = {
			_id: jobId
		};
		// want ONLY those docs which have active images
		// console.log(JSON.stringify(query));
		return TAB_IMAGES
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

	app.post("/archiveJob", (req, res) => {
		// TODO: should also archive all images for tools and tabs
		const jobId = req.body.key4id;
		const action = req.body.action; // true -> archive, false, unArchive
console.log("/archiveJob", {jobId,action});
		if (action) {
			MAIN
				.updateOne(
					{ _id: jobId },
					{ $set: { archived: new Date() } },
					{ upsert: false }
				)
				.then(
					success => {
						res.json(success);
					},
					error => res.json({ error: true, msg: error })
				);
		} else {
			// remove archive attribute
			// TODO: possibly  also UNarchive all images for tools and tabs
			col.updateOne({ _id: jobId }, { $unset: { archived: 1 } }); // $unset
		}
	});
};
