"use strict";

/* globals Common, Util */
// spec_tools_edit.js :: MAIN Page

const COMMON = new Common();
const key4id = COMMON.getKey4id();
const key5 = COMMON.getParsedCookie();
const ENTER = 13;
const TAB = 9;
let TABLE;
const DATA = [];

$(function() {
	window.name = $("spec_type").text();
	const STYPE = window.name.toUpperCase().replace("_", " ");
	$("title").html(`${STYPE} Edit`);
	const jobTitle = [
		key5.partId,
		key5.pName,
		key5.dept,
		key5.op,
		key5.machine
	].join(" : ");
	$("pageheader").append(
		$(
			`<h1 class="pageTitle">${STYPE}</h1><h3 class="jobTitle">${jobTitle}</h3>`
		)
	);
	$("#filter-value").keyup(() =>
		TABLE.setFilter("term", "like", $("#filter-value").val())
	);
	const startStringMatcher = function(strs) {
		return function findMatches(q, cb) {
			let matches = [],
				substrRegex = new RegExp("^" + q, "i");
			// regex used to determine if a string contains the substring `q`
			// iterate through the pool of strings and for any string that
			// contains the query substring `q`, add it to the `matches` array
			$.each(strs, function(i, str) {
				if (substrRegex.test(str)) {
					matches.push(str);
				}
			});
			cb(matches);
		};
	};
	const input = $("input.upper");
	const tl = $("#toollist");

	Util.setUpTabs(key4id, window.name, {
		tab: true,
		spec: true
	}).then(tabs => {
		getToolNames(window.name).then(name_counts => {
			DATA.length = 0;
			DATA.push(...name_counts);

			tableSetup();
			TABLE.setData(DATA).then(
				() => $(".fileUpload").on("change", fileUpload)  // needed to set onChange method for 1st page
			);

			// const tool_names = name_counts.map(obj => obj.term);
			input.on("keydown", ev => {
				if (ev.keyCode === ENTER || ev.keyCode === TAB) {
					ev.preventDefault();
					handleInput();
				}
			});
			// refreshList();
			input.focus();
		});
	});

	function handleInput() {
		const suggestion = input.val().toUpperCase();
		if (notKnown(DATA, suggestion)) {
			addTerm(suggestion).then(
				success => {
					DATA.push({ term: suggestion, count: 0 });
					input.addClass("action");
					tl.addClass("action");
					refreshList();
					input.val("");
				},
				error => {
					alert("unable to add term.");
				}
			);
		} else {
			input.addClass("dup");
			setTimeout(() => {
				input.removeClass("dup");
			}, 500);
		}
		input.focus();
	}

	function refreshList() {
		tl.empty();
		TABLE.setData(DATA);
		setTimeout(() => {
			tl.removeClass("action");
			input.removeClass("action");
		}, 500);
	}
});

function notKnown(objArray, value) {
	for (let obj of objArray) {
		if (obj.term === value) return false;
	}
	return true;
}

function getToolNames(spec_type) {
	return new Promise((resolve, reject) => {
		$.get({
			url: `/getToolNames/${spec_type}`,
			datatype: "json"
		}).done(success => {
			resolve(success); // [{"term":"ALLEN KEY","count":2},{"term":"AX","count":0},...]
		});
	});
}

async function addTerm(term) {
	return new Promise((resolve, reject) => {
		$.post({
			url: "/addTerm",
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
		pageLoaded: function(/*pageno*/) {
			// make sure after files uploaded to server, that we process them
			$(".fileUpload").on("change", fileUpload);
		},

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
				align: "center"
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
					// if (data.userId === '') data.userId = 'undefined';
					// if (data.product === '') data.product = 'undefined';
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
					const term = cell.getData().term;
					let fup = `<input class="fileUpload" type="file" data="${term}" name="uploads[]" accept="image/jpg" multiple/>`;

					return fup;
				}
				// cellClick: fileUpload
			}
		]
	});
	
	$(".fileUpload").on("change", fileUpload);
}
function fileUpload(e) {
	const term = $(this).attr('data');
	const files = $(this).get(0).files;
	// TODO: complete file processing.
	debugger;
}
