"use strict";
// uploadRouter.js
// const path = require("path");
// const Mongo = require("mongodb");
// const ObjectId = Mongo.ObjectID;

// const fs = require("fs-extra");
// const formidable = require("formidable");
// const Jimp = require("jimp");

const debug = true;

function debugLog(text, extra) {
	if (debug && extra !== undefined) {
		console.log("\n" + text + ": " + extra);
	}
}

function fileRef(aDir, aFname) {
	let obj = {
		dir: aDir,
		filename: aFname,
		comment: "empty", // default comment
		created: new Date(),
		archived: false
	};
	// debugLog("fileRef " + JSON.stringify(obj));
	return obj;
}

const colNames = [
	"Name/Model_/EDP",
	"Diameter",
	"Insert_Width",
	"Insert_Name",
	"Grade",
	"Radius",
	"Angle",
	"Holder_Type",
	"Holder_Model",
	"Stick Out",
	"Mori Seiki_TNRC",
	"CRC",
	"Mori Seiki_Command Point",
	"Okuma_TNRC X",
	"Okuma_TNRC Z",
	"Misc Info",
	"Restart_N#",
	"Turret_Model Holder",
	"Collet_Size/Model",
	"Shank_Dia/Width"
];

module.exports = function (dir, app, db) {
	app.use(logger);

	function logger(req, res, next) {
		console.log(new Date(), req.method, req.url);
		next();
	}
	const MAIN_TABLE = db.collection("main_table");
	const MAIN = db.collection("main");
	const TERM_IMAGES = db.collection("term_images");
	const SPEC_TERMS = db.collection("spec_terms");

	function createMainTable({ main, machineSpecs }, res) {
		console.log({ main, machineSpecs });
		const main_table_doc = {
			_id: main._id,
			rows: []
		};

		["Turret1", "Turret2"].forEach(turretStr => {
			if (machineSpecs[turretStr] !== undefined) {
				doRows(main_table_doc.rows,
					machineSpecs,
					turretStr, "Spindle1"
				);
				if (machineSpecs[turretStr].Spindle2 !== undefined) {
					doRows(main_table_doc.rows,
						machineSpecs,
						turretStr, "Spindle2"
					);
				}
			}
		});
		MAIN_TABLE.insertOne(main_table_doc).then(
			(result) => res.json(result),
			(error) => res.status(500).json({ "error": error })
		)

	}

	function numsOf(str) {
		return parseInt(str.replace(/[^\d]/g, ""));
	}

	function doRows(main_table_rows, specs, turretStr, spindleStr) {
		let lowT = parseInt(specs[turretStr].range[0]);
		let highT = parseInt(specs[turretStr].range[1]);
		let lowS = parseInt(specs[turretStr][spindleStr][0]);
		let numT = numsOf(turretStr);
		let numS = numsOf(spindleStr);

		for (
			let position = lowT, offset = lowS;
			position <= highT;
			position++ , offset++
		) {
			const colArray = new Array(colNames.length);
			colArray.fill(""); // all terms initially empty
			main_table_rows.push({
				turret: numT,
				spindle: numS,
				position: position,
				offset: offset,
				function: "", // initially empty
				type: "", // initially empty
				cols: colArray
			});
		}
	}

	app.post("/addkey", (req, res) => {
		req.body.lastUpdated = new Date(); // timestamp for jobs
		MAIN
			.insertOne(req.body.main)
			.then(
				() => {
					createMainTable(req.body, res);
				}
			)
			.catch(error => {
				res.status(500).json({
					error: error
				});
			});
	});

	app.post("/terms/getMainTable", (req, res) => {
		const key4id = req.body.key4id;
		// console.log(key4id);
		MAIN_TABLE.findOne(
			{
				_id: key4id
			},

			(err, result) => {
				if (err) {
					return res.json({ error: err });
				}
				// console.log(result);
				return res.json(result.rows);
			}
		);
	});

	app.get("/terms/getAllMainTable", (req, res) => {
		// const key4id = req.body.key4id;
		// console.log(key4id);
		const cursor = MAIN_TABLE.find({});

		const results = [];
		cursor.forEach(
			(item, index) => { if (index < 10) results.push(item); }
		)

		res.json(results);
	});



	app.get("/terms/getSuggestions", (req, res) => {
		try {
			TERM_IMAGES.aggregate(
				[
					// Stage 0 - exclude archived terms
					{
						$match: {
							"archived": { $exists: false }
						}
					},
					// Stage 1 - only include type and term fields
					{
						$project: {
							// specifications
							_id: 0,
							files: 0,
							nextNum: 0
						}
					},

					// Stage 2 - put in alpha order
					{
						$sort: {
							type: 1,
							term: 1

						}
					},

					// Stage 3 - combine terms into sorted list under type
					{
						$group: {
							_id: "$type",
							terms: { $push: "$term" }
						}
					},

				]
			).toArray().then(results => {
				console.log(results);
				res.json(results);
			});
		}
		catch (error) {
			res.status(500).json({ error: error });
		}
	});

	app.post("/terms/replace_singles/:which", (req, res) => {
		const setItem = {};
		setItem[`rows.$[elem].${req.params.which}`] = req.body.value;
		const af = {};
		af[`elem.${req.params.which}`] = req.body.previous;
		console.log('replace_singles', { setItem, af });
		MAIN_TABLE.updateMany(
			{}, // query (all)
			{ $set: setItem },
			{ arrayFilters: [af], multi: true }
		).then(
			success => {
				console.log('replace_singles', success.result);
				return res.json({
					success: success.result
				});
			},
			error => {
				console.log('error replace_singles', error);
				return res.status(500).json({
					error: error
				});
			}
		);

	});



	app.post("/terms/replace_others", (req, res) => {
		let count = 0;
		try {
			MAIN_TABLE.find({
				"rows.cols": { $elemMatch: { $eq: req.body.previous } }
			}).toArray().then(
				(allDocs) => {
					const promises = [];

					allDocs.forEach((doc) => {
						// console.log("doc _id", doc._id);
						let changed = false;
						doc.rows.forEach((row) => {
							let cols = row.cols;
							for (let i = 0, max = cols.length; i < max; i++) {
								if (cols[i] === req.body.previous) {
									cols[i] = req.body.value;
									changed = true;
								}
							}
						});

						if (changed) {
							promises.push(MAIN_TABLE.updateOne(
								{ _id: doc._id },
								{ $set: { rows: doc.rows } }
							));
						}
					});
					try {
						// console.log(`running ${promises.length} updateOne promises`);;
						Promise.all(promises).then(
							(results) => {
								return { success: { changes: count } };
							}
						)
						// console.log("replace_others changes total", results.length);

					}
					catch (error) {
						console.error("replace_others updateOne", error);
						return { error: error };
					}
				}
			)
		}
		catch (error) {
			console.error("replace_others overall", error);
			return { error: error };
		}
	});

	app.post("/terms/change_main_table", (req, res) => {
		const setItem = {};
		setItem[`rows.$[elem].${req.body.type}`] = req.body.value;

		const update = { $set: setItem };
		// console.dir(update);
		const af = {
			arrayFilters: [
				{
					$and: [
						{ "elem.turret": parseInt(req.body.turret) },
						{ "elem.spindle": parseInt(req.body.spindle) },
						{ "elem.position": parseInt(req.body.position) },
						{ "elem.offset": parseInt(req.body.offset) }
					]
				}
			],
			multi: false
		};
		// console.warn(JSON.stringify(af,null,4));
		const query = {
			_id: req.body.key4id
		};
		// console.dir(query);
		MAIN_TABLE.updateOne(
			query, // one job id
			update, // single field set new value
			af
		).then(
			success => {
				// console.log("success change_singles", success.result);
				return res.json({
					success: success.result
				});
			},
			error => {
				console.error("error change_singles", error);
				return res.status(500).json({
					error: error
				});
			}
		);
	});


	app.post("/terms/get_term_image_filerefs", (req, res) => {
		const { type, term } = req.body;
		// console.log('get_term_image_filerefs',req.body);
		try {

			TERM_IMAGES.aggregate(
				[{
					$match:
					{
						type: type,
						term: term,
						archived: { $exists: false }
					}
				},
				{
					$project:
					{
						_id: 0,
						type: 0,
						term: 0,
						nextNum: 0
					}
				},
				{
					$project:
					{
						files: {
							$filter:
							{
								input: "$files",
								as: "fileref",
								cond: { $ne: ["$$fileref.archived", true] }
							}
						}
					}
				}]
			).toArray().then(
				(results) => { // should be an array of length 1
					return res.json(results[0].files);
				}
			);
		}
		catch (err) {
			return res.status(500).json(err);
		}
	});

	app.get("/terms/terms_display", (req, res) => {
		res.render("terms_display.html", { type: req.query.type, term: req.query.term });
	});

	app.post("/terms/set_term_primary", (req, res) => {
		const { type, term, filename, dir } = req.body;
		// console.log(req.body);
		TERM_IMAGES.findOne({
			type: type,
			term: term,
			archived: { $exists: false }
		}, (err, doc) => {
			if (err) {
				res.status(500).json(err);
			}
			// console.log("count",doc.files.length);
			doc.files.forEach(aRef => {
				if (aRef.dir !== dir || aRef.filename !== filename) {
					delete aRef.primary; // remove any previous
				} else {
					aRef.primary = true; // set one primary
					// console.log("change made");
				}
			});

			try {
				TERM_IMAGES.replaceOne(
					{ type: type, term: term },
					doc,
					{ upsert: true }
				).then(
					(success) => {
						// console.log("replacement made");
						res.json(success);
					}
				);

			} catch (err) {
				res.status(500).json(err);
			}
		});
	});

	app.post("/terms/set_spec_term_primary", (req, res) => {
		const { type, term, filename, dir } = req.body;

		try {
			SPEC_TERMS.aggregate([
				{
					$match:
					{
						_id: type.toLowerCase() + "_tools"
					}
				},
				{
					$project:
					{
						terms: {
							$filter: {
								input: "$terms",
								as: "item",
								cond:
									{ $eq: ["$$item.term", term] }
							}
						}
					}
				}]).toArray().then(

					(docs) => {
						// move primary marker to correct aRef
						docs[0].terms[0].files.forEach((aRef, index) => {
							if (aRef.dir !== dir || aRef.filename !== filename) {
								delete aRef.primary; // remove any previous
							} else {
								aRef.primary = true; // set one primary
							}
						});

						try {
							// replace term in spec_terms collection
							SPEC_TERMS.updateOne(
								{ _id: type.toLowerCase() + "_tools" },
								{
									$set: {
										"terms.$[item]": docs[0].terms[0]
									}
								},
								{
									arrayFilters: [{
										"item.term": term
									}
									]
								}

							).then(
								(success) => {
									return res.json(success);
								}
							);

						} catch (error) {
							return res.status(500).json(error);
						}

					}
				);
		} catch (error) {
			return res.status(500).json(error);
		}
	});

	app.get('/terms/getTermImageCounts', (req, res) => {
		try {
			TERM_IMAGES.aggregate(
				[
					{
						$match:
							{ archived: { $exists: false } }
					},
					{
						$project:
							{ count: { $size: "$files" }, term: 1, type: 1, _id: 0 }
					},
					{
						$sort: { type: 1, term: 1 }
					}
				]
			).toArray().then(
				(count_result) => {
					// console.log('getTermImageCounts result', count_result);
					res.json(count_result);
				}
			)
		}
		catch (e) {
			console.log('error getTermImageCounts', e);
			res.status(500).json({ "error": e });
		}
	});
	app.post('/terms/create_term_images', (req, res) => {
		const { type, term } = req.body;
		console.log('create_term_images', { type, term });
		try {
			TERM_IMAGES.insertOne(
				{
					type: type,
					term: term,
					files: [],
					nextNum: 1
				}).then(
					(insert_result) => {
						// NOTE: should never fail due to duplicate; checked before invocation
						console.log('create_term_images result', insert_result.result);
						res.json(insert_result.result);
					}
				)
		}
		catch (e) {
			console.log('error create_term_images', e);
			res.status(500).json({ "error": e });
		}
	});

	app.post('/terms/replace_term_images', (req, res) => {
		const { type, term, previous } = req.body;
		// console.clear();
		// console.log('replace_term_images', { type, term, previous });
		try {
			TERM_IMAGES.updateOne(
				{
					type: type,
					term: previous,
					archived: { $exists: false }
				},
				{
					$set: { term: term }
				}).then(
					(update_result) => {
						// console.log('replace_term_images update result', update_result);
						res.json(update_result);
					});
		}
		catch (e) {
			console.log('error replace_term_images', e);
			res.status(500).json({ "error": e });
		}
	});

	app.post('/terms/remove_term_image', (req, res) => {
		// TOODO: remove terms from main_table also
		const { type, term } = req.body;
		try {
			TERM_IMAGES.updateOne(
				{
					type: type,
					term: term
				},
				{
					$set: { archived: true }
				}).then(
					(update_result) => {
						// console.log('remove_term_image update result', update_result);
						remove_term_main_table(type, term).then(
							() => res.json(update_result),
							(error) => res.json({ error: error })
						);

					});
		}
		catch (e) {
			console.log('error remove_term_image', e);
			res.status(500).json({ "error": e });
		}
	});

	function remove_term_main_table(fto, term) {
		// NEEDS TRANSACTION

		if (fto === 'function' || fto === 'type') {
			const af = {};
			af[`item.${fto}`] = term;

			const setter = {};
			setter[`rows.$[item].${fto}`] = "";

			MAIN_TABLE.updateMany(
				{}, // all docs
				{
					$set: setter
				},
				{
					arrayFilters: [af],
					multi: true
				}
			);
		} else {
			MAIN_TABLE.find(
				{ "rows.cols": { $elemMatch: { $in: [term] } } }
			).toArray().then(
				(docs) => {
					// console.log("docs count", docs.length);
					docs.forEach(
						(doc) => {
							let changed = false;
							doc.rows.forEach(
								row => {
									row.cols.forEach(
										(item, index) => {
											if (item === term) {
												// console.log(item, index);
												row.cols[index] = "";
												changed = true;
											}
										}
									)
								}
							);
							if (changed) {
								// console.log("update of", doc._id)
								MAIN_TABLE.updateOne(
									{ _id: doc._id },
									{ $set: { rows: doc.rows } }
								);
								// console.log("done update of", doc._id)	
							}
						}
					);
				}
			);
		}
	}


	app.get("/terms/terms_edit_upload", (req, res) => {
		res.render("terms_edit.html");
	});

	function cleanCounts(array) {
		return array.map(
			item => (
				{
					term: item._id.term,
					mt_count: item.mt_count
				}
			)
		)
	}
	app.post("/terms/status", (req, res) => {
		const { term, type } = req.body;
		// console.log("/terms/status", term, type);
		TERM_IMAGES.findOne(
			{ type: type, term: term },
			{ _id: 0, archived: 1 }).then(
				doc => {
					// console.log("/terms/status", doc);
					if (doc === null) {
						return res.json("unknown")
					}
					if (doc.archived === undefined) {
						return res.json("known");
					}
					else {
						return res.json("archived")
					}
				}
			);
	});
	app.get("/terms/get_term_image_counts", (req, res) => {
		try {
			// console.log("/terms/get_term_image_counts");
			TERM_IMAGES.aggregate(
				[{
					$match: { "archived": { $exists: false } }
				},
				{
					$project:
						{ _id: 0, image_count: { $size: "$files" }, term: 1, type: 1 }
				}]
			).toArray().then(
				results => {
					// console.log("/terms/get_term_image_counts", results);
					res.json(results);
				}
			);
		} catch (error) {
			console.log("error /terms/get_term_image_counts", error);
			res.status(500).json({ error: error });
		}
	});

	app.post("/terms/update_term_image_comment", (req, res) => {
		const { type, term, text, dir, filename } = req.body;
		// console.log(req.body);
		try {
			TERM_IMAGES.updateOne(
				{ type: type, term: term },
				{ $set: { "files.$[fref].comment": text } },
				{
					arrayFilters: [
						{ $and: [{ "fref.dir": dir }, { "fref.filename": filename }] }
					],
					multi: false
				}
			)
				.then(success => {
					// console.log(success);
					return res.json({ success: success.result });
				});
		} catch (error) {
			// console.log(error);
			return res.status(500).json({ error: error });
		}
	});

	app.get("/terms/get_main_term_counts/:which", (req, res) => {
		const which = req.params.which;
		if (which === 'function' || which === 'type') {
			try {
				const p = { _id: 0 };
				p[`rows.${which}`] = 1;
				const m = {};
				m[`rows.${which}`] = { $ne: "" };
				MAIN_TABLE.aggregate(
					[{ $project: p },
					{ $unwind: { path: "$rows", } },
					{ $match: m },
					{
						$group: {
							_id:
								{ term: `$rows.${which}` },
							mt_count: { $sum: 1 }
						}
					}]
				).toArray().then(
					results => {
						res.json(cleanCounts(results));
					}
				);
			} catch (error) {
				console.log("error /terms/get_main_term_counts", error);
				res.status(500).json({ error: error });
			}
		}
		else {
			try {
				MAIN_TABLE.aggregate(
					[{ $project: { _id: 0, "rows.cols": 1 } },
					{
						$unwind:
							{ path: "$rows", }
					},
					{
						$unwind:
							{ path: "$rows.cols", }
					},
					{
						$match:
							{ "rows.cols": { $ne: "" } }
					},
					{
						$group:
						{
							_id:
								{ term: '$rows.cols' },
							mt_count: { $sum: 1 }
						}
					}]
				).toArray().then(
					results => {
						res.json(cleanCounts(results));
					}
				);
			} catch (error) {
				console.log("error /terms/get_main_term_counts", error);
				res.status(500).json({ error: error });
			}
		}
	});

};
