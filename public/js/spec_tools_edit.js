"use strict";
/* globals Util */
// spec_tools_edit.js :: Term adds, delete, plus image uploads

const ENTER = 13;
const TABCHAR = 9;
let TABLE;
const DATA = [];
let SPEC_TYPE;

$(function() {
	SPEC_TYPE = $("spec_type").text();
	const STYPE = SPEC_TYPE.toUpperCase().replace("_", " ");
	$("title").html(`${STYPE} Edit`);
	
	$("pageheader").append(
		$(
			`<h1 class="pageTitle">${STYPE}</h1>` // <h3 class="jobTitle">${jobTitle}</h3>`
		)
	);
	$("#filter-value").keyup(() =>
		TABLE.setFilter("term", "like", $("#filter-value").val())
	);

	const startStringMatcher = function(strs) {
		return function findMatches(q, cb) {
			let matches = [],
				substrRegex = new RegExp("^" + q, "i");
			$.each(strs, function(i, str) {
				if (substrRegex.test(str)) {
					matches.push(str);
				}
			});
			cb(matches);
		};
	};
	const NEW_TERM_INPUT = $("input.upper");
	const TOOLLIST = $("#toollist");

	Util.setUpTabs(null /*key4id*/, SPEC_TYPE, {
		tab: false,
		spec: false,
		main: false,
		machine: false,
		tabmenus: false
	}).then(() => {
		getAllToolNames(SPEC_TYPE).then(async name_counts => {
			DATA.length = 0;
			DATA.push(...name_counts);

			tableSetup();
			await TABLE.setData(DATA);

			NEW_TERM_INPUT.on("keydown", ev => {
				if (ev.keyCode === ENTER || ev.keyCode === TABCHAR) {
					ev.preventDefault();
					handleInputNewTerm();
				}
			});
			NEW_TERM_INPUT.focus();
		});
	});

	function handleInputNewTerm() {
		const newTerm = NEW_TERM_INPUT.val().toUpperCase();
		if (notKnown(DATA, newTerm)) {
			addTerm(newTerm).then(
				success => {
					DATA.push({ term: newTerm, count: 0 });
					NEW_TERM_INPUT.addClass("action");
					
					TOOLLIST.empty();
					TABLE.setData(DATA);
					const matchedRows = TABLE.searchRows("term", "=", newTerm);
					const jqMatch = $(matchedRows[0].getElement()).addClass("action");
					setTimeout(() => {
						jqMatch.removeClass("action");
						NEW_TERM_INPUT.removeClass("action");
					}, 700);
					NEW_TERM_INPUT.val("");
				},
				error => {
					alert("unable to add term.");
				}
			);
		} else {
			NEW_TERM_INPUT.addClass("dup");
			setTimeout(() => {
				NEW_TERM_INPUT.removeClass("dup");
			}, 500);
		}
		NEW_TERM_INPUT.focus();
	}
});

function notKnown(objArray, value) {
	for (let obj of objArray) {
		if (obj.term === value) return false;
	}
	return true;
}

function getAllToolNames(spec_type) {
	return new Promise((resolve, reject) => {
		$.get({
			url: `/getAllToolNames/${spec_type}`,
			datatype: "json"
		}).done(success => {
			resolve(success); // names and counts [{"term":"ALLEN KEY","count":2},{"term":"AX","count":0},...]
		});
	});
}

async function addTerm(term) {
	return new Promise((resolve, reject) => {
		$.post({
			url: "/addTerm",
			data: {
				type: SPEC_TYPE,
				term: term
			},
			datatype: "json"
		})
			.done(success => {
				resolve(success);
			})
			.fail(error => reject(error));
	});
}

async function removeTerm(term) {
	return new Promise((resolve, reject) => {
		$.post({
			url: "/removeTerm",
			data: {
				type: window.name,
				term: term
			},
			datatype: "json"
		})
			.done(success => {
				resolve(success);
			})
			.fail(error => reject(error));
	});
}

function tableSetup() {
	$("#terms-table").css("width", "595px");
	let signal = false;
	TABLE = new Tabulator("#terms-table", {
		layout: "fitColumns",
		pagination: "local",
		paginationSize: 15,
		initialSort: [
			{
				column: "term",
				dir: "asc"
			}
		],

		columns: [
			{
				title: "Term",
				field: "term",
				width: 200,
				headerSort: true
			},
			{
				title: "Count",
				field: "count",
				width: 75,
				headerSort: false,
				align: "center",
				formatter: function(cell, formatterParams, onRendered) {
					//cell - the cell component
					//formatterParams - parameters set for the column
					//onRendered - function to call when the formatter has been rendered
					const COUNTID = "COUNT_" + cell.getData().term.replace(" ", "");
					return `<div id="${COUNTID}">${cell.getValue()}</div>`;
				}
			},
			{
				title: '&nbsp;<i class="far fa-trash-alt"></i>',
				formatter: "buttonCross",
				width: 50,
				align: "center",
				headerSort: false,
				cellClick: function(e, cell) {
					const row = cell.getRow();
					const jqRowCells = $(row.getElement())
						.find(".tabulator-cell")
						.addClass("del_highlight");
					// confirm deletion
					const data = row.getData();

					$.confirm({
						title: "<br/>Confirm Term Deletion!",
						columnClass: "col-md-4",
						type: "orange",
						content: `<div class="confirm">Term: <b>${
							data.term
						}</b>&nbsp;&nbsp;File Count: ${data.count}</div>`,
						buttons: {
							confirm: {
								btnClass: "btn-primary",
								action: function() {
									removeTerm(data.term).then(() => {
										setTimeout(() => {
											jqRowCells.removeClass("del_highlight");
											row.delete();
										}, 700);
									});
								},
								keys: ["enter"]
							},
							cancel: function() {
								jqRowCells.removeClass("del_highlight");
							}
						}
					});
				}
			},
			{
				title: "Upload Images",
				// width: 270,
				align: "center",
				headerSort: false,
				tooltip: "Select Images to Upload",
				formatter: function(cell, formatterParams, onRendered) {
					//cell - the cell component
					//formatterParams - parameters set for the column
					//onRendered - function to call when the formatter has been rendered
					const TERM = cell.getData().term;
					let fup = `<input class="fileUpload" onchange="specFileUpload(this)" type="file" data="${TERM}" 
					name="uploads[]" accept="image/jpg" multiple/>`;
					return fup;
				}
			}
		]
	});
}

function specFileUpload(obj) {
	const fup_input = $(obj);
	const jqRow = fup_input.parent().parent();
	const row = TABLE.getRow(jqRow[0]);
	const files = fup_input.get(0).files;
	if (files.length > 0) {
		jqRow.addClass("stripes");
		$(".fileUpload").hide();
		$("#spin").show();
		const current_count = row.getData().count;
		fupChange(files, fup_input.attr("data"), current_count)
			.then(success => {
				const cell = row.getCell("count");
				cell.setValue(cell.getValue() + success.count, false);
				// alert("success");
			})
			.catch(failure => {
				alert("error " + failure);
			})
			.finally(() => {
				jqRow.removeClass("stripes");
				$(".fileUpload").show();
				$("#spin").hide();
			});
	}
}

function fupChange(files, term, nowCount) {
	var formData = new FormData();
	formData.append("term", term);
	formData.append("tab", SPEC_TYPE);
	formData.append("setPrimary", nowCount === 0);

	// loop through all the selected files and add them to the formData object
	for (var i = 0; i < files.length; i++) {
		// add the files to formData object for the data payload
		formData.append("uploads[]", files[i], files[i].name);
	}
	
	return new Promise((resolve, reject) => {
		$.ajax({
			url: "/spec_upload",
			type: "post",
			data: formData,
			processData: false,
			contentType: false
		})
			.done(result => {
				resolve(result);
			})
			.fail((request, status, error) => {
				reject(error);
			});
	});
}
