"use strict";
/* globals Util */
// app_insert.js

jQuery.fn.visible = function () {
	return this.css("visibility", "visible");
};

jQuery.fn.invisible = function () {
	return this.css("visibility", "hidden");
};
$(function () {
	const key4_idOrderedKeys = ["dept", "partId", "op", "machine"];
	let JSONDATA;
	const SUBMIT = $("#submit");
	const NOTICE = $("#insertNotice");
	const FIELDS = ["partId", "pName", "dept", "op", "machine"];
	const FIELDSORTER = {
		partId: alphaCompare,
		pName: alphaCompare,
		dept: alphaCompare,
		op: (a, b) => a - b, // numeric
		machine: alphaCompare
	};
	const FWIDTH = "180px";
	let STATUS = {};
	let KEY5 = {};
	// Util.setUpShortNav(); // Home button only
	if (!doGetData()) return;
	Util.setUpTabs("", "", {
		main: true	
	}).then(
		() => {
			SUBMIT.invisible();
			$("select").attr("tabindex", -1);

			$("#reset").on("click", function () {
				location.reload();
			});

			SUBMIT.on("click", function () {
				NOTICE.invisible();
				isMachineSpecKnown(KEY5.machine).then(
					result => {
						if (!result) {
							$.confirm({
								boxWidth: "500px",
								useBootstrap: false,
								type: "red",
								animation: "left",
								icon: "fas fa-exclamation-triangle",
								title: '"' + KEY5.machine + '" Warning: Machine Specs Are Unknown.',
								content: "Do you want to submit this new Identifier?",
								buttons: {
									Yes: {
										btnClass: "btn-blue",
										action: function () {
											performPut();
										}
									},
									No: {
										btnClass: "btn-red"
									}
								}
							});
						} else {
							performPut();
						}
					},
					error => {
						console.log('error', { KEY5, STATUS });
						alert(error);
					}
				);
			});
			$(".chooser", "content").on("change", handleChooseOne);
			$("input").on("change keyup paste", handleInputOne);
		}
	);


	function isPartIdPnameConsistent() {
		// Check whether main collection has another value for pName for the partId
		// Look in JSONDATA
		const found = JSONDATA.find((d) => d.partId === KEY5.partId);
		return (found === undefined || found.pName === KEY5.pName) ? null : found.pName;
	}
	function performPut() {
		// may fail if Part Name not consistent with with existing anme for this Id,
		// or duplicate Job Id found.
		let existing_pName = isPartIdPnameConsistent();
		if (existing_pName !== null) {
			// Part Name not consistent with with existing anme for this partId
			SUBMIT.invisible();
			NOTICE.css("background-color", "hotpink");
			NOTICE
				.text(`Error: Part Name for this Id does not match existing "${existing_pName}"`)
				.visible();
			setTimeout(function () {
				NOTICE.invisible();
			}, 4000);
		}
		else {

			putMain().then(
				() => {
					const item = {};
					FIELDS.forEach(
						(f) => item[f] = KEY5[f]
					)
					JSONDATA.push(
						item
					);
					FIELDS.forEach((field) => {
						initField(field);
						$(".chosen-" + field, "content").trigger("chosen:updated");
					});

					// adjust chosen list // TODO:
					NOTICE.css("background-color", "green");
					NOTICE
						.text("1 New Job Identifier Added.")
						.visible();
					setTimeout(function () {
						location.reload();
					}, 2000);
				},
				error => {
					alert('unable to insert new job in function performPut');
				});

		}
	}
	function duplicateJob() {
		return JSONDATA.find(
			(job) =>
				job.partId === KEY5.partId
				&&
				job.pName === KEY5.pName
				&&
				job.dept === KEY5.dept
				&&
				job.machine === KEY5.machine
				&&
				job.op === KEY5.op

		) !== undefined;
	}
	function doGetData() {
		getData("Parts Startup").then(
			(data) => {
				JSONDATA = data; // now global

				// Choosers
				FIELDS.forEach(initField); // KEY5 empty to start

			},
			(error) => {
				throw new Error("getData failure " + error);
			});
		return true;
	}
	function handleInputOne(who) {
		const input = $(who.currentTarget);

		const field = input.attr("id").replace("_new", "");

		input.val(input.val().toUpperCase());
		const newval = input.val();
		if (newval === '') SUBMIT.invisible();
		completeChoice(field, newval);
	}
	// handle changes in choosers - that is, selection of a particular item
	function handleChooseOne(who) {
		let chooser = $(who.currentTarget);

		//For each <a> that is class chosen-single tha is NOT also chosen-default... reset values
		const field = chooser.attr("id").replace("_select", "");
		const newval = chooser.val();
		// put chosen value in input field
		let insertSelector = "#" + field + "_new";
		$(insertSelector, "#new_key_input ").val(newval);
		completeChoice(field, newval);
	}

	function completeChoice(field, newval) {
		KEY5[field] = newval;
		STATUS[field] = (newval === '') ? 0 : 1;

		if (field === 'partId') pNameFromPartId();

		if (isFullySelected()) {
			doneChoosing();
		}
	}

	function pNameFromPartId() {
		const found = JSONDATA.find((d) => d.partId === KEY5.partId);
		if (found) { // there is a known pName for this partId
			const insertSelector = "#pName_new";
			let pName = found.pName;
			// Empty pName ??-- fill it in, or wrong pName -- also fill it in
			KEY5['pName'] = pName;
			console.log(189, "=1");
			STATUS['pName'] = 1;
			// Indicate change using visual cue
			$(insertSelector, "#new_key_input ").val(pName).toggleClass("pnamealert");

			setTimeout(function () {
				// Remove cue
				$(insertSelector, "#new_key_input ").toggleClass("pnamealert");
			}, 2000);
		}
	}

	function doneChoosing() {

		if (FIELDS.every(f => STATUS[f] === 1 && KEY5[f] !== "")) {
			if (duplicateJob()) {

				SUBMIT.invisible();

				NOTICE
					.text("Error: Duplicate Identifier.")
					.visible().css("background-color", "red");
				setTimeout(function () {
					NOTICE.invisible();
				}, 2000);

			} else {
				NOTICE
					.removeClass()
					.invisible();
				SUBMIT.visible(); // exposes go button
			}
		} else {
			SUBMIT.invisible();
		}
	}

	function isMachineSpecKnown(mname) {
		return new Promise((resolve, reject) => {
			$.ajax({
				url: "/machine/" + mname,
				type: "get"
			})
				.done(result => {
					//alert("isMachineSpecKnown: " + result);
					resolve(result !== null);
				})

				.fail((request, status, error) => {
					//alert("isMachineSpecKnown error: " + error);
					reject(error);
				});
		});
	}

	function alphaCompare(a, b) {
		return a < b ? -1 : a === b ? 0 : 1;
	}

	function getData(message) {
		return new Promise((resolve, reject) => {
			$.ajax({
				url: "/get_jobs",
				type: "get",
				dataType: "json"
			})
				.done(result => {
					// console.log(JSON.stringify(result.length, null, 4));
					resolve(result);
				})

				.fail((request, status, error) => {
					// console.log(JSON.stringify(error, null, 4));
					reject(error);
				});

			//.always(() => console.log("getdata complete: " + message));
		});
	}

	async function putMain() {
		const machineSpecs = await Util.getMachineSpec(KEY5.machine);
		KEY5._id = key4_idOrderedKeys.map(key => KEY5[key]).join("|"); 
		return new Promise((resolve, reject) => {
			$.ajax({
				url: "/addkey",
				type: "post",
				data: { main: KEY5, machineSpecs: machineSpecs }
			})
				.done(result => resolve(result))
				.fail((request, status, error) => {
					reject(error);
				});
		});
	}

	function isFullySelected() {
		return FIELDS.every(f => STATUS[f] === 1);
	}

	function findUnique(fName) {
		var oneColVals = JSONDATA
			.filter(row => keyMatch(row))
			.map(row => row[fName]);
		return [...new Set(oneColVals)]; // return distinct values only
	}

	function keyMatch(row) {
		if (Object.keys(KEY5).length === 0) {
			return true;
		}
		return Object.keys(KEY5).every(key => row[key] === KEY5[key]);
	}

	function getMachineIds() {
		return new Promise((resolve, reject) => {
			$.ajax({
				url: "/machine_ids/",
				type: "get"
			})
				.done(results => {
					//alert("isMachineSpecKnown: " + result);
					resolve(results.map(o => o.mid));
				})

				.fail((request, status, error) => {
					
					reject(error);
				});
		});
	}

	async function getUniqueIds(fName) {
		let oneColVals;
		if (fName === 'machine') {
			oneColVals = await getMachineIds();
		} else {
			// returns field fName as array of unique values, passing filters from KEY5
			oneColVals = findUnique(fName);
		}
		oneColVals = [...new Set(oneColVals)]; // return distinct values only
		oneColVals.sort(FIELDSORTER[fName]);
		return oneColVals;
	}

	function initField(fName) {
		// set up options for one field fName . and initiate chosen

		const selector = "#" + fName + "_select";
		// KEY5 will be empty to start with
		///////////////////////////////////
		try{
			getUniqueIds(fName).then(
				(oneColVals) => {
					
	
					$(selector, "content").empty();
					var howMany = oneColVals.length;
					$("#" + fName + "_num", "content").text(howMany);
	
					if (howMany > 1) {
						oneColVals.unshift(""); // add empty option at top of list
					} else {
						KEY5[fName] = oneColVals[0];
					}
	
					oneColVals.forEach(datum => {
						$(selector, "content").append(
							$("<option>")
								.val(datum)
								.text(datum)
						);
					});
	
					// setup format for this chooser
					$(".chosen-" + fName, "content").chosen({
						width: FWIDTH,
						search_contains: false
					});
	
					if (howMany === 1) {
						// always disable if there is but one value
						$(".chosen-" + fName, "content")
							.prop("disabled", true)
							.trigger("chosen:updated");
						// have the containing td act as a button to select the one value
						$("#" + fName + "_select", "content")
							.parent()
							.on("click", () => {
	
								STATUS[fName] = 1;
	
								// put chosen value in input field
								var insertSelector = "#" + fName + "_new";
								$(insertSelector, "#new_key_input ").val(oneColVals[0]);
	
								if (isFullySelected()) {
									NOTICE
										.removeClass()
										.invisible();
									SUBMIT.visible(); // exposes go button
								}
							});
						$("#" + fName + "_select", "content")
							.parent().trigger('click');
					}
				}
			)
		} catch(error) {
			alert("initField error: " + error);
		}
	}
});
