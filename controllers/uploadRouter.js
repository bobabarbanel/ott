"use strict";
// uploadRouter.js
const path = require("path");
const Mongo = require("mongodb");
const ObjectId = Mongo.ObjectID;

const fs = require("fs-extra");
const formidable = require("formidable");
const Jimp = require("jimp");

// These define where on the server the image files will be stored
const TARGETHEADSTRING = "/images"; // to dir wil be public/images
const SECTION = "Tools"; // All Tools images under public/images/Tools/*
const TABSECTION = "Tabs"; // All Tabs images under public/images/Tabs/*

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

module.exports = function(dir, app, db) {
	// app.use(logger);

	function calcFullTargetDir(machine, section) {
		// Directory path determined using first+second letter of Machine name,
		// and fixed TARGETHEADSTRING. Has leading "public/".
		// debugLog("calcFullTargetDir key4 " + JSON.stringify(key4));
		/******************************/
		// let machine = key4.machine;
		// e.g., /images/Tools/LC
		return [TARGETHEADSTRING, section, machine.substring(0, 2)].join("/");
	}
	// key4id.replace(/\|/g, '_') + '_' + 'ti', // filename starting chars e.g. LATHE_69-37869-2_30_ZL253-1_ti

	function tab_calcFullTargetDir(machine, section) {
		// Directory path determined using first+second letter of Machine name,
		// and fixed TARGETHEADSTRING. Has leading "public/".
		// debugLog("calcFullTargetDir key4 " + JSON.stringify(key4));
		/******************************/
		// e.g., .../images/Tabs/LC
		return [TARGETHEADSTRING, section, machine.substring(0, 2)].join("/");
	}

	function getOidVHexString() {
		return new ObjectId().valueOf() + ""; // necessary to add "" to get just the string
	}

	function convertImageIds(doc) {
		doc.tabs.forEach(tab => {
			tab.sections.forEach(section => {
				section.steps.forEach(step => {
					if (step.images_id === null) {
						// not yet defined, so a new step
						step.images_id = getOidVHexString();
					}
				});
			});
		});
	}

	function addWebSitePublic(dir1, dir2, fname) {
		return [dir1, "public", dir2, fname].join("/");
	}

	function calcFullTargetBaseFileName(partId, op, machine, turret, position, spindle, offset) {
		return [
			partId,
			op,
			machine,
			turret,
			position,
			spindle,
			offset
		].join("_");
	}

	function pad4(num) {
		// pads for number tail of length 4
		let s = "000000000000" + num;
		return s.substr(s.length - 4);
	}
	function processSpecUploads(
		tab,
		term,
		numberOfSpecFiles,
		tailnum,
		myFiles,
		[ftdSmall, ftdMedium, ftdLarge],
		executionDir,
		setPrimary, // it's a string, unfortunately "true" or "false"
		res
	) {
		setPrimary = setPrimary === "true"; // convert to boolean
		const fileRefs = [];
		const termFragment = term.replace(new RegExp("\\W", "g"), "--"); // replace blanks in term with '--'
		const tabFragment = tab
			.split("_")
			.map(frag => frag.slice(0, 1))
			.join("");
		myFiles.forEach((aFile, index) => {
			const fileName = aFile.name;
			const tail = fileName.substring(fileName.lastIndexOf(".")); // just the file type
			const ffn =
				tabFragment + "_" + termFragment + "_" + pad4(tailnum + index) + tail; // _ + 0001 + ".jpg" file
			const aRef = fileRef(ftdMedium, ffn);
			if(setPrimary) {
				aRef.primary = true; // only do once
				setPrimary = false;
			}
			fileRefs.push(aRef);
			
			let toLarge = path.normalize(
				addWebSitePublic(executionDir, ftdLarge, ffn)
			);
			// now 'toLarge' is our _large target full path
			// save original large image in _large directory
			fs.renameSync(aFile.path, toLarge);
			Jimp.read(toLarge).then(image => {
				let img = image.clone();
				// create _small version of image in Spec_small
				let toSmall = path.normalize(
					addWebSitePublic(executionDir, ftdSmall, ffn)
				);
				img
					.resize(Jimp.AUTO, 100) // resize height 100
					.quality(99) // set JPEG quality
					.write(toSmall); // save small image
				let toMedium = path.normalize(
					addWebSitePublic(executionDir, ftdMedium, ffn)
				);
				// create medium sized image in /Spec
				image
					.resize(300, Jimp.AUTO) // resize width 300
					.quality(99) // set JPEG quality
					.write(toMedium); // save medium image
			});
		});
		db.collection("spec_terms")
			.updateOne(
				{ _id: tab, "terms.term": term },
				{ $push: { "terms.$.files": { $each: fileRefs } } }
			)
			.then(
				success => {
					res.json({
						count: numberOfSpecFiles
					});
				},
				err => {
					res.json({
						error: err
					});
				}
			);
	}

	let uploadCount = 0; // tie to key4
	function processUploads(
		key4id,
		_id,
		base,
		tailnum,
		numberOfFiles,
		myFiles,
		idirs,
		executionDir,
		res
	) {
		let ftdLarge, ftdMedium, ftdSmall;
		[ftdLarge, ftdMedium, ftdSmall] = idirs;
		// let key4id = ["dept", "partId", "op", "machine"]
		// 	.map(k => key4[k])
		// 	.join("|"); // can we use common somehow??
		uploadCount = 0;
		myFiles.forEach((aFile, index) => {
			let fileName = aFile.name;
			// console.log(index + "> " + fileName);
			let tail = fileName.substring(fileName.lastIndexOf(".")); // file type
			//  public/images/Tools_large/img/MLetter/Lathe_A251A4802-1_30_LC40-2A_10_10.jpg,
			let ffn = base + "_" + pad4(tailnum + index) + tail; // _ + 0001 + ".jpg" file
			let toLarge = path.normalize(
				addWebSitePublic(executionDir, ftdLarge, ffn)
			);
			// now 'toLarge' is our _large target full path
			// save original large image in _large directory
			fs.renameSync(aFile.path, toLarge);
			Jimp.read(toLarge).then(image => {
				let img = image.clone();
				// create _small version of image in Tools_small
				let toSmall = path.normalize(
					addWebSitePublic(executionDir, ftdSmall, ffn)
				);
				img
					.resize(Jimp.AUTO, 100) // resize height 100
					.quality(99) // set JPEG quality
					.write(toSmall); // save small image
				let toMedium = path.normalize(
					addWebSitePublic(executionDir, ftdMedium, ffn)
				);
				// create medium sized image in /Tools
				image
					.resize(300, Jimp.AUTO) // resize width 300
					.quality(99) // set JPEG quality
					.write(toMedium); // save medium image
				// update Mongo entry for this job
				let query = {
					// use id for finding document
					_id: _id
				};
				let updates = {
					// adding one file reference
					$push: {
						files: fileRef(ftdMedium, ffn)
					}
				};
				let key4query = {
					_id: key4id
				};
				// the actual updates of filerefs in the iamges collection
				let promise = db.collection("images").findOneAndUpdate(query, updates);
				promise.then(
					() => {
						// progress reporting
						if (++uploadCount === numberOfFiles) {
							// console.log("***uploadRouter " + uploadCount + " " + numberOfFiles + " : " + key4id);
							db.collection("progress")
								.findOneAndUpdate(
									key4query,
									{
										$set: {
											progress: uploadCount,
											total: numberOfFiles
										}
									},
									{
										upsert: true
									}
								)
								.then(() => {
									res.json({
										count: uploadCount
									});
									return;
								});
						} else {
							// can we not clear the counter here??
							db.collection("progress")
								.findOneAndUpdate(
									key4query,
									{
										$set: {
											progress: uploadCount,
											total: numberOfFiles
										}
									},
									{
										upsert: true
									}
								)
								.then(() => {});
						}
					},

					err => {
						res.json({
							error: err
						});
					}
				);
			});
		});
	}

	let tab_uploadCount = 0; // tie to key4
	function tab_processUploads( // needs work RMA  returns list of Promises
		// images_id, // the uploading images_id for this section
		// // knownImageId, // whether there is already an images_id
		key4id, // usual job id, 4 fields
		tab_numberOfFiles,
		base, // added nto every file name
		tailnum, // starting number for next file
		myFiles, // form files
		idirs, // target directoies
		executionDir // top dir
	) {
		// result from route
		// debugLog("tab_processUploads", "true");
		let key4query = {
			_id: key4id
		};
		let ftdLarge, ftdMedium, ftdSmall;
		[ftdLarge, ftdMedium, ftdSmall] = idirs;
		let promises = myFiles.map((aFile, index) => {
			let fileName = aFile.name;

			// debugLog("track: ", index + "> " + fileName);
			let tail = fileName.substring(fileName.lastIndexOf("."));
			// e.g. public/images/Tabs_large/LC/LATHE_69-37869-2_30_ZL253-1_ti_0024.jpg

			let ffn = base + "_" + pad4(tailnum + index) + tail; // _0001 file

			let toLarge = path.normalize(
				addWebSitePublic(executionDir, ftdLarge, ffn)
			);
			// now 'toLarge' is our _large target full path

			// save original large image in _large directory
			fs.renameSync(aFile.path, toLarge);
			// debugLog("converting", index + 1);
			return new Promise((resolve, reject) => {
				Jimp.read(toLarge)
					.then(function(image) {
						let img = image.clone();

						// create _small version of image in Tools_small
						let toSmall = path.normalize(
							addWebSitePublic(executionDir, ftdSmall, ffn)
						);
						img
							.resize(Jimp.AUTO, 100) // resize height 100
							.quality(99) // set JPEG quality
							.write(toSmall); // save small image

						let toMedium = path.normalize(
							addWebSitePublic(executionDir, ftdMedium, ffn)
						);
						// create medium sized image in /Tools
						image
							.resize(300, Jimp.AUTO) // resize width 300
							.quality(99) // set JPEG quality
							.write(toMedium); // save medium image
					})
					.then(
						() => {
							let pValue = {
								converted: index + 1,
								fileRef: {
									dir: ftdMedium,
									filename: ffn,
									comment: "empty",
									created: new Date(),
									archived: false
								}
							};
							// debugLog("pvalue", pValue);
							// progress reporting
							if (++tab_uploadCount === numberOfFiles) {
								// finished
								console.log(
									"***uploadRouter " +
										uploadCount +
										" " +
										numberOfFiles +
										" : " +
										key4id
								);
								db.collection("progress")
									.findOneAndUpdate(
										key4query,
										{
											$set: {
												progress: tab_uploadCount,
												total: tab_numberOfFiles
											}
										},
										{
											upsert: true
										}
									)
									.then(
										() => {
											// debugLog("resolve ", pValue);
											resolve(pValue);
										},
										() => {
											// debugLog("resolve error", error);
											reject(pValue);
										}
									);
							} else {
								// in progress

								db.collection("progress")
									.findOneAndUpdate(
										key4query,
										{
											$set: {
												progress: tab_uploadCount,
												total: tab_numberOfFiles
											}
										},
										{
											upsert: true
										}
									)
									.then(() => {
										resolve(pValue);
									});
							}
						},
						error => {
							debugLog("Jimp failure", "");
							reject(error);
						}
					);
			});
		});
		// debugLog("promises length", promises.length);
		// debugLog("promises", promises);
		return promises;
	}

	// update tab_images collectionwith all the changes

	function updateTabImages(key4id, fileRefs) {
		// returns a promise
		return db.collection("tab_images").updateOne(
			{
				_id: key4id
			},
			{
				$push: {
					stepFiles: {
						$each: fileRefs
					}
				}
			}
		);
	}

	app.get("/get_progress/:_id", (req, res) => {
		db.collection("progress")
			.findOne(req.params)
			.then(
				v => {
					res.json(v);
				},
				e => {
					res.json({
						error: e
					});
				}
			);
		return;
	});

	app.get("/clear_progress/:_id", (req, res) => {
		debugLog("clear ", true);
		db.collection("progress")
			.deleteOne(req.params)
			.then(
				v => {
					res.json(v);
				},
				e => {
					res.json({
						error: e
					});
				}
			);
		return;
	});

	app.post("/archiveToolImages", (req, res) => {
		let col = db.collection("images");
		let promises = Object.keys(req.body.fileinfo).map(identifier => {
			let p = new Promise((resolve, reject) => {
				let _id = new ObjectId(identifier);
				let filenames = req.body.fileinfo[identifier];

				let query = {
					_id: _id,
					"files.archived": false
				};
				let update = {
					$set: {
						"files.$[elem].archived": true
					}
				};
				let other = {
					arrayFilters: [
						{
							"elem.archived": false,
							"elem.filename": {
								$in: filenames
							}
						}
					]
				};
				col
					.updateMany(query, update, other)
					.then(result => resolve(result), error => reject(error));
			});
			return p;
		});
		Promise.all(promises).then(
			success => {
				return res.json({
					success: success
				});
			},
			error => {
				console.log("all promises failure: " + JSON.stringify(error));

				return res.json({
					error: error
				});
			}
		);
	});

	// function show(name, obj) { // for debugging
	//     console.log(name + ': ' + JSON.stringify(obj));
	// }
	app.post("/archiveTabImages", (req, res) => {
		db.collection("tab_images")
			.updateOne(
				{
					_id: req.body.job_id
				},
				{
					$set: {
						"stepFiles.$[element].archived": true
					}
				},
				{
					multi: true,
					arrayFilters: [
						{
							"element.filename": {
								$in: req.body.fileinfo
							}
						}
					]
				}
			)
			.then(
				result => {
					// result currently ignored, typically: success: {n: 1, nModified: 1, ok: 1}
					res.json({
						success: result
					});
				},
				error => {
					res.json({
						error: error
					});
				}
			);
	});

	app.post("/unArchiveTabImages", (req, res) => {
		db.collection("tab_images")
			.updateOne(
				{
					_id: req.body.job_id
				},
				{
					$set: {
						"stepFiles.$[element].archived": false
					}
				},
				{
					multi: true,
					arrayFilters: [
						{
							"element.filename": {
								$in: req.body.fileinfo // list of filenames
							}
						}
					]
				}
			)
			.then(
				result => {
					// result currently ignored, typically: success: {n: 1, nModified: 1, ok: 1}
					res.json({
						success: result
					});
				},
				error => {
					res.json({
						error: error
					});
				}
			);
	});

	app.post("/unArchiveToolImages", (req, res) => {
		let col = db.collection("images");
		let promises = Object.keys(req.body.fileinfo).map(identifier => {
			let p = new Promise((resolve, reject) => {
				let _id = new ObjectId(identifier);
				let filenames = req.body.fileinfo[identifier];

				let query = {
					_id: _id,
					"files.archived": true
				};
				let update = {
					$set: {
						"files.$[elem].archived": false
					}
				};
				let other = {
					arrayFilters: [
						{
							"elem.archived": true,
							"elem.filename": {
								$in: filenames
							}
						}
					]
				};
				col
					.updateMany(query, update, other)
					.then(result => resolve(result), error => reject(error));
			});
			return p;
		});
		Promise.all(promises).then(
			success => {
				return res.json({
					success: success
				});
			},
			error => {
				return res.json({
					error: error
				});
			}
		);
	});

	app.post("/updateImageComment", (req, res) => {
		db.collection("images")
			.updateOne(
				{
					_id: new ObjectId(req.body._id)
				},
				{
					$set: {
						"files.$[elem].comment": req.body.comment
					}
				},
				{
					arrayFilters: [
						{
							$and: [
								{
									"elem.filename": req.body.filename
								},
								{
									"elem.dir": req.body.dir
								},
								{
									"elem.archived": false
								}
							]
						}
					]
				}
			)
			.then(
				doc => {
					res.json(doc);
				},
				err => {
					console.log("updateImageComment error " + JSON.stringify(err));
					res.json(err);
				}
			);
	});

	app.post("/restoreDbImages", (req, res) => {
		let query = req.body.query;

		// convert the string attrs to integers
		["turret", "position", "spindle", "offset"].forEach(
			term => (query[term] = parseInt(query[term]))
		);
		// remove timestamp if present
		if (req.body.filedata.when !== undefined) {
			delete req.body.filedata.when;
		}

		let updates = {
			$pull: {
				archived: req.body.filedata
			},
			$push: {
				files: {
					filename: req.body.filedata.filename,
					dir: req.body.filedata.dir,
					comment: req.body.filedata.comment,
					date: new Date()
				}
			}
		};

		db.collection("images")
			.update(query, updates)
			.then(
				doc => {
					res.json(doc);
				},
				err => {
					console.log("restoreDbImages updates error " + JSON.stringify(err));
					res.json(err);
				}
			);
	});

	app.post("/countImages", (req, res) => {
		let myPromise = db
			.collection("images")
			.aggregate([
				{
					$match: {
						key4: req.body.key4,
						tab: req.body.tab
					}
				},
				{
					$project: {
						"files.filename": 1,
						_id: 0
					}
				},
				{
					$unwind: {
						path: "$files"
					}
				},
				{
					$count: "fileCount"
				}
			])
			.toArray();

		myPromise.then(
			r => {
				// result looks like { "fileCount" : 67 }
				res.json(r);
			},
			err => res.json(err)
		);
	});
	// rma test
	// let numberOfFiles;
	let tab_numberOfFiles;
	//
	let numberOfFiles;

	app.post("/upload", (req, res) => {
		// be sure we have /images directory
		ensureDirectories(SECTION);

		let form = new formidable.IncomingForm();
		form.multiples = true;
		let myFiles = [];

		form.parse(req, function(err, fields, files) {
			let key4id = fields["key4"];
			const pieces = key4id.split('|');
			// const dept = pieces[0];
			const partId = pieces[1];
			const op = pieces[2];
			const machine = pieces[3];

			let turret =
				typeof fields["turret"] === "string"
					? parseInt(fields["turret"])
					: fields["turret"];
			let spindle =
				typeof fields["spindle"] === "string"
					? parseInt(fields["spindle"])
					: fields["spindle"];
			let position =
				typeof fields["position"] === "string"
					? parseInt(fields["position"])
					: fields["position"];
			let offset =
				typeof fields["offset"] === "string"
					? parseInt(fields["offset"])
					: fields["offset"];
			let tab = fields["tab"];

			// let mongoKey4 = key4id; //[key4.dept, key4.partId, key4.op, key4.machine].join("|");
			
			let query = {
				key4: key4id,
				tab: tab,
				position: position,
				offset: offset,
				turret: turret,
				spindle: spindle
			};

			myFiles = files["uploads[]"];

			// if only a single file is selected, it does NOT come in array
			if (myFiles.length === undefined) {
				myFiles = [myFiles];
			}
			//let numberOfFiles = myFiles.length;
			numberOfFiles = myFiles.length;
			// add machine (2 chars) to directories
			let ftdMedium, ftdSmall, ftdLarge;
			ftdLarge = calcFullTargetDir(machine, SECTION + "_large");
			ftdMedium = calcFullTargetDir(machine, SECTION);
			ftdSmall = calcFullTargetDir(machine, SECTION + "_small");
			// public/images/Tools_large/img/MLetters (first 2 letters of machine name)

			[ftdLarge, ftdMedium, ftdSmall].forEach(mDir => {
				let fullPath = path.normalize(dir + "/public/" + mDir);
				if (!fs.existsSync(fullPath)) {
					fs.mkdirSync(fullPath);
				}
			});

			// transaction ??
			let promise = db.collection("images").findOneAndUpdate(query, {
				$inc: {
					nextNum: numberOfFiles
				}
			});
			// const key4 = {};
			// const pieces = key4id.split('|');
			// key["dept"] = pieces[0];
			// key["partId"] = pieces[1];
			// key["op"] = pieces[2];
			// key["machine"] = pieces[3];

			promise.then(
				doc => {
					processUploads(
						key4id,
						doc.value._id,
						calcFullTargetBaseFileName(partId, op, machine, turret, position, spindle, offset),
						doc.value.nextNum, // critical: the starting number for files to make unique
						numberOfFiles,
						myFiles,
						[ftdLarge, ftdMedium, ftdSmall],
						dir,
						res
					);
				},
				err => console.error(err)
			);
		});
	});

	let numberOfSpecFiles;
	app.post("/spec_upload", (req, res) => {
		// be sure we have /images directory
		const DIRNAME = "Spec";
		ensureDirectories(DIRNAME);
		

		let form = new formidable.IncomingForm();
		form.multiples = true;
		let myFiles = [];

		form.parse(req, function(err, fields, files) {
			let query = {
				_id: fields.tab
			};

			myFiles = files["uploads[]"];
			// console.log(JSON.stringify(myFiles));
			// if only a single file is selected, it does NOT come in array
			if (myFiles.length === undefined) {
				myFiles = [myFiles];
			}
			//let numberOfFiles = myFiles.length;
			numberOfSpecFiles = myFiles.length;
			// add machine (2 chars) to directories
			let ftdMedium, ftdSmall, ftdLarge;
			ftdMedium = `${TARGETHEADSTRING}/${DIRNAME}`;
			ftdLarge = `${ftdMedium}_large`;
			ftdSmall = `${ftdMedium}_small`;

			let promise = db.collection("spec_terms").findOneAndUpdate(query, {
				$inc: {
					nextNum: numberOfSpecFiles
				}
			});
			promise.then(
				doc => {
					// console.log(doc.value.nextNum);

					processSpecUploads(
						fields.tab,
						fields.term,
						numberOfSpecFiles,
						doc.value.nextNum, // start number for tails
						myFiles,
						[ftdSmall, ftdMedium, ftdLarge],
						dir,
						fields.setPrimary,
						res
					);
					// res.json({ count: numberOfSpecFiles });
				},
				err => console.error(err)
			);
		});
	});

	app.post("/imagefiles", (req, res) => {
		let rq = req.body;
		let myPromise = db
			.collection("images")
			.aggregate([
				{
					$match: {
						key4: rq.key4,
						turret: parseInt(rq.turret),
						position: parseInt(rq.position),
						spindle: parseInt(rq.spindle),
						offset: parseInt(rq.offset),
						tab: rq.tab
					}
				},
				{
					$project: {
						files: {
							$filter: {
								input: "$files",
								as: "fileref",
								cond: {
									$eq: ["$$fileref.archived", false]
								}
							}
						},
						_id: 0
					}
				},
				{
					$unwind: {
						path: "$files"
					}
				},
				{
					$project: {
						"files.filename": 1
					}
				}
			])
			.toArray();

		myPromise.then(
			r => {
				res.json(r.map(obj => obj.files.filename));
			},
			() => res.json([])
		);
	});

	app.post("/updateFT", (req, res) => {
		let rq = req.body;
		let doc;
		if (rq.addFiles === "true") {
			//do an insert
			doc = {
				key4: rq.key4,
				turret: parseInt(rq.turret),
				position: parseInt(rq.position),
				spindle: parseInt(rq.spindle),
				offset: parseInt(rq.offset),
				tab: rq.tab,
				function: rq.function,
				type: rq.type,
				files: [],
				nextNum: 1
			};
			db.collection("images")
				.insert(doc)
				.then(
					() =>
						res.json({
							status: true
						}),
					failure =>
						res.json({
							status: false,
							error: failure
						})
				);
		} else {
			// do an update on an existing document, changing function and type strings
			doc = {
				key4: rq.key4,
				turret: parseInt(rq.turret),
				position: parseInt(rq.position),
				spindle: parseInt(rq.spindle),
				offset: parseInt(rq.offset),
				tab: rq.tab
			};
			let update = {
				$set: {
					function: rq.function,
					type: rq.type
				}
			};

			db.collection("images")
				.findOneAndUpdate(doc, update, {
					upsert: false, // if cannot find, do not create a new document
					returnNewDocument: true // return new doc
				})
				.then(
					success => {
						res.json({
							status: true,
							result: success
						});
					},
					failure => {
						res.json({
							status: false,
							result: failure
						});
					}
				);
		}
	});

	app.post("/create_container", (req, res) => {
		let rq = req.body;
		let document = {
			key4: rq.key4,
			turret: parseInt(rq.turret),
			spindle: parseInt(rq.spindle),
			position: parseInt(rq.position),
			offset: parseInt(rq.offset),
			tab: rq.tab,
			function: rq.function,
			type: rq.type,
			files: []
		};

		db.collection("images")
			.insertOne(document)
			.then(
				result => {
					res.json({
						status: true,
						result: result
					});
				},
				err => {
					res.json({
						status: false,
						result: err
					});
				}
			);
	});

	app.post("/set_tabs", (req, res) => {
		let query = {
			_id: req.body._id // a key4id
		};
		let doc = JSON.parse(req.body.doc);

		convertImageIds(doc); // modify the doc inserting Object Ids for new images_id fields

		const tabsCollection = db.collection("tabs");
		const tab_imagesCollection = db.collection("tab_images");

		let myPromise = tabsCollection.replaceOne(query, doc, {
			upsert: true // will create new tabs document if not found by key4id
		});
		myPromise.then(
			r => {
				// TODO: enclose this update in a Xact and create a NumberInt() and use for $setOnInsert
				tab_imagesCollection
					.updateOne(
						{
							_id: doc._id
						},
						{
							// $addToSet: {
							//     stepFiles: {
							//         $each: newStepFiles
							// }
							// },
							$setOnInsert: {
								nextStepNum: 1,
								stepFiles: []
							} // really want new NumberInt(1)
						},
						{
							upsert: true
						}
					)
					.then(
						(/*success*/) => {
							res.json(r);
						},
						error => {
							console.log(
								"Unable to create tab_images document for id = " +
									doc._id +
									"\n" +
									error
							);
							res.json({
								error: error
							});
						}
					);
			},
			err => {
				res.json({
					error: err
				});
			}
		);
		return;
	});

	function ensureDirectories(section) {
		let imagesPath = path.normalize(dir + "/public" + TARGETHEADSTRING);
		if (!fs.existsSync(imagesPath)) {
			fs.mkdirSync(imagesPath);
		}

		// be sure we have /images/Tabs[_large,_small] directories
		[section + "_large", section, section + "_small"].forEach(toolDir => {
			let aDir = TARGETHEADSTRING + "/" + toolDir;
			let aPath = path.normalize(dir + "/public/" + aDir);

			if (!fs.existsSync(aPath)) {
				fs.mkdirSync(aPath);
			}
		});
	}
	app.post("/tabUploads", (req, res) => {
		// uploader
		// use current nextNum for a keyid to update nextnum AND add to a single document in tab_images the new filerefs
		ensureDirectories(TABSECTION);

		let form = new formidable.IncomingForm();
		form.multiples = true;
		let myFiles = [];

		form.parse(req, function(err, fields, files) {
			// debugLog('known', fields['knownImageId']);
			// let knownImageId = fields['knownImageId'] === "true";
			// TODO: handle err
			let images_id = fields["id"];
			// debugLog("form tab_id", images_id);

			let key4id = fields["key4id"];
			// debugLog("form key4id", key4id);

			let query = {
				_id: key4id
			};

			let machine = key4id.split("|")[3];
			// debugLog("form machine", machine);
			myFiles = files["uploads[]"];

			// if only a single file is selected, it does NOT come in array
			if (myFiles.length === undefined) {
				myFiles = [myFiles];
			}
			tab_numberOfFiles = myFiles.length;
			// debugLog("tab_numberOfFiles", tab_numberOfFiles);

			let ftdMedium, ftdSmall, ftdLarge;
			ftdLarge = tab_calcFullTargetDir(machine, TABSECTION + "_large");
			ftdMedium = tab_calcFullTargetDir(machine, TABSECTION);
			ftdSmall = tab_calcFullTargetDir(machine, TABSECTION + "_small");
			// public/images/Tools_large/img/MLetters (first 2 letters of machine name)

			[ftdLarge, ftdMedium, ftdSmall].forEach(mDir => {
				let fullPath = path.normalize(dir + "/public/" + mDir);
				if (!fs.existsSync(fullPath)) {
					fs.mkdirSync(fullPath);
				}
			});

			let inc_promise = db.collection("tab_images").findOneAndUpdate(
				query,
				{
					$inc: {
						nextStepNum: tab_numberOfFiles // TODO: what if there's an upsert??
					}
				},
				{
					projection: {
						stepFiles: false
					},
					upsert: true
				}
			);
			inc_promise.then(
				doc => {
					// debugLog("tab_numberOfFiles", tab_numberOfFiles);
					// debugLog("doc", JSON.stringify(doc, null, 4));
					Promise.all(
						tab_processUploads(
							// somehat different from processUploads for Tools, returns list of promises
							// images_id, // id for this section's file set
							// knownImageId, // boolean
							key4id, // the key4id
							tab_numberOfFiles,
							doc.value._id.split("|").join("_") + "_ti", // string included in file names

							doc.value.nextStepNum, // start number for tails
							// tab_numberOfFiles, // how amny files uploading
							myFiles, // the file objects
							[ftdLarge, ftdMedium, ftdSmall], // directories
							dir // execution directory
							// res
						)
					).then(promises => {
						debugLog("tab promises count: " + promises.length);
						// debugLog("results: ", JSON.stringify(promises, null, 4));
						Promise.all(promises).then(
							values => {
								debugLog(
									"tab processing results: ",
									JSON.stringify(values, null, 4)
								);
								let fileRefs = values.map(result => {
									result.fileRef.images_id = images_id;
									return result.fileRef;
								});
								debugLog("values: ", JSON.stringify(fileRefs, null, 4));
								updateTabImages(key4id, fileRefs).then(
									() => {
										debugLog("final converted", values.length);
										res.json({
											count: values.length
										});
									},
									error => {
										res.json({
											error: "Tab Images Not Updated - error " + error
										});
									}
								);
							},
							error => {
								res.json({
									error: "Tab Images Not Converted nor Updated - error " + error
								});
							}
						);
					}); // result for route
				},
				err => {
					console.error("Tab Images Upload increment error " + err);
					res.json({
						error: "Tab Images Upload increment error -  " + err
					});
				}
			);
		});
	});

	app.post("/countTabImages", (req, res) => {
		db.collection("tab_images")
			.aggregate([
				{
					$match: /** * query - The query in MQL. */ {
						_id: req.body.job_id
					}
				},
				{
					$project: /** * specifications - The fields to *   include or exclude. */ {
						_id: 0,
						stepFiles: {
							$filter: {
								input: "$stepFiles",
								as: "item",
								cond: {
									$and: [
										{
											$eq: ["$$item.archived", false]
										},
										{
											$in: ["$$item.images_id", req.body.images_id_array]
										}
									]
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
						count: {
							$sum: 1
						}
					}
				}
			])
			.toArray()
			.then(
				nonArchivedFileCountsByImageId => {
					//filter returned array using available_image_ids
					// console.log("non " + JSON.stringify(nonArchivedFileCountsByImageId, null, 4));
					// console.log("\navailable: " + JSON.stringify(available_image_ids, null, 4) + "\n");
					// let filtered = nonArchivedFileCountsByImageId.filter((doc) => available_image_ids[doc.image_id] !== undefined);
					// console.log(JSON.stringify(filtered,null,4) + " " + filtered.length);
					// console.log();
					res.json({
						nonArchivedFileCountsByImageId: nonArchivedFileCountsByImageId
						// .filter(
						//     (doc) => (available_image_ids[doc.image_id] !== undefined)
						// )
					});
				},
				() => {
					// TODO: check this error handling
					res.json({});
				}
			);
	});

	// function logger(req, res, next) {
	// 	console.log(new Date(), req.method, req.url);
	// 	next();
	// }
};
