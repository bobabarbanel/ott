"use strict";

// Character ASCII Codes
const ENTER = 13;
const TAB = 9;
let COMMON;
jQuery.fn.visible = function () {
	return this.css("visibility", "visible");
};

jQuery.fn.invisible = function () {
	return this.css("visibility", "hidden");
};
let TABLE;
var jsonData;
const FIELDS = ["partId", "pName", "dept", "op", "machine"];
const FIELDSORTER = {
	partId: alphaCompare,
	pName: alphaCompare,
	dept: alphaCompare,
	op: (a, b) => a - b,
	machine: alphaCompare
};

const FWIDTH = "180px";
const STATUS = {
	partId: 0,
	pName: 0,
	dept: 0,
	op: 0,
	machine: 0
};
const QUERY = {};

$(function () {
	setup();

	function setup() {
		TABLE = setUpTable();
		$("spin").invisible();
		$("#this_job").invisible();
		$("#delete_job_action").invisible();

		$("#this_job_menu").menu({});

		$("#this_job_menu > li").addClass("ui-state-disabled");

		$("#reset").on("click", resetPage);
		$("#insert_action").on("click", () => {
			window.location.href = window.location + "insert";
		});

		initPage();

		$("#main_action").on("click", e => useSameTab(e, "main.html"));

		$("#tools_action").on("click", e => useSameTab(e, "tools.html"));

		$("#tools_action_display").on("click", e => useSameTab(e, "tools.html"));

		$("#tools_action_edit").on("click", e => useSameTab(e, "ftedits.html"));

		$("#tools_action_upload").on("click", e => useSameTab(e, "upload.html"));

		$("#tab_action_edit").on("click", e => useSameTab(e, "tabsedit.html"));

		$("#tab_action_upload").on("click", e => useSameTab(e, "tab_upload.html"));

		$("#delete_job_action").on("click", deleteAJob);

		$("#terms_edit_action").on("click", e => {
			e.preventDefault();
			openInSameTab("/terms/terms_edit_upload");
		});

		$("#hand_tools_action_edit").on("click", e => {
			useSameDestination(e, "/spec_tools_edit/hand_tools");
		});
		$("#inspection_tools_action_edit").on("click", e => {
			useSameDestination(e, "/spec_tools_edit/inspection_tools");
		});

		$("#hand_tools_action_display").on("click", e => {
			useSameDestination(e, "/spec_tools_display/Hand");
		});
		$("#inspection_tools_action_display").on("click", e => {
			useSameDestination(e, "/spec_tools_display/Inspection");
		});

		$("#hand_tools_action_assign").on("click", e => {
			useSameDestination(e, "/spec_tools_assign/Hand");
		});
		$("#inspection_tools_action_assign").on("click", e => {
			useSameDestination(e, "/spec_tools_assign/Inspection");
		});


		function useSameDestination(event, destination) {
			event.preventDefault();
			cookieSetter();
			openInSameTab(destination);
		}

		function useSameTab(event, destination) {
			useSameDestination(event, "/tabs/" + destination);
		}

		// handle changes in choosers - that is, selection of a particular item
		$(".chooser", "#container").on("change", function () {
			var chooser = $(this);
			//For each <a> that is class chosen-single that is NOT also chosen-default... reset values
			var field = chooser.attr("id").replace("_select", "");
			var newval = chooser.val();
			QUERY[field] = newval;
			STATUS[field] = 1;
			setNum(field, 1);

			// find possible values for other fields
			FIELDS.forEach(f => {
				if (QUERY[f] === undefined) {
					updateField(f);
				}
			});

			var selector = "#" + $(this).attr("id");
			$(selector, "#container").empty();

			// single select for this field; add only one option to <select>
			$(selector, "#container").append(
				$("<option>")
					.val(newval)
					.text(newval)
			);
			// update
			$(selector, "#container")
				.prop("disabled", true)
				.trigger("chosen:updated");

			refreshFilterTable();

			if (isFullySelected()) {
				pageComplete();
				
				const cell = TABLE.getRowFromPosition(0, true).getCells()[0];
				$(cell.getElement()).find("input[type=radio]").prop("checked", true);

			}
			setJobInPlay();
		});
	}
});

function initPage() {
	COMMON = new Common(); // fresh read of cookie, if any
	const existing_cookie = COMMON.getParsedCookie();
	if (existing_cookie) {
		refreshFromDB().then(() => {
			// let r = TABLE.getRows();
			const searchParams = FIELDS.map(field => {
				return { field: field, type: "=", value: existing_cookie[field] };
			});
			let row = TABLE.searchRows(searchParams);
			if (row.length === 1) {
				
				TABLE.setPage(existing_cookie.page); // page must be visible to find radio input element
				const cell = row[0].getCell("row");

				$(cell.getElement())
					.find("input")
					.trigger("click");
			}
		});
	} else {
		$("#delete_job_action").invisible();
		$("#this_job").invisible();
		for (let member in QUERY) delete QUERY[member]; // clear values in QUERY
		for (let member in STATUS) STATUS[member] = 0; // reset values in STATUS

		refreshFromDB().then(
			() => { return null; }
		);
	}
}
async function refreshFromDB() {
	await getData().then(
		data => {
			jsonData = data; // now global in this file
			if (jsonData.length === 0) {
				$("#container").invisible();
				$("div.horiz_menu").invisible();
			} else {
				// Choosers
				FIELDS.forEach(initField); // QUERY empty to start
				// Table
				refreshFilterTable();
			}

		},
		error => console.log("getData error " + error)
	);
}

function cookieSetter() { // cookie contains all 5 fields: 
	// partId, dept, machine, op, and pName
	if (TABLE) QUERY.page = TABLE.getPage();
	Cookies.set(COMMON.getCookieName(), JSON.stringify(QUERY), { expires: 1 });
}

function resetPage() {
	Cookies.remove(COMMON.getCookieName());
	location.href = "/";
}

function openInSameTab(url) {
	window.open(url, "_self");
}

function updateTable(rows) {
	TABLE.setData(rows);
	if (rows.length === 1) formatTableCells();
	annotateTableCount(rows.length);
}

function refreshFilterTable() {
	const data = jsonData.filter(row => rowMatchesQuery(row));
	
	console.log(data);
	// debugger;
	updateTable(data);
}

function setUpTable() {
	return new Tabulator("#dataTable", {
		//height:"450px", // set height of table (optional)
		layout: "fitColumns", //fit columns to width of table (optional)
		pagination: "local",
		paginationSize: 15,
		initialSort: [{ column: "partId", dir: "asc" }],
		
		columns: [
			//Define Table Columns
			// first column is checkbox for choosing all the values in the row
			{
				title: "&#x2714;",
				field: "row",
				align: "center",
				width: 20,
				cellClick: (e, cell) => rowSelected(e, cell.getData()),
				headerSort: false,
				sortable: false,
				formatter: function (/*value, data, cell, row, options, formatterParams*/) {
					return '<div><input name="firstcol_radio" type="radio"></div>';
				}
			},
			{
				title: "Part Number",
				//width: "150px",
				field: "partId",
				sorter: "string",
				cssClass: "partIdCol",
				cellClick: cellSingleClick
			},
			{
				title: "Part Name",
				//width: "200px",
				field: "pName",
				sorter: "string",
				align: "center",
				cssClass: "pNameCol",
				cellClick: cellSingleClick
			},
			{
				title: "Department",
				//width: "150px",
				field: "dept",
				sorter: "string",
				align: "center",
				cssClass: "deptCol",
				cellClick: cellSingleClick
			},
			{
				title: "Operation",
				//width: "120px",
				field: "op",
				sorter: "number",
				align: "center",
				cssClass: "opCol",
				cellClick: cellSingleClick
			},
			{
				title: "Machine",
				//width: "120px",
				field: "machine",
				sorter: "string",
				cssClass: "machineCol",
				cellClick: cellSingleClick
			}
		]
	});
}

function getData() {
	$("spin").visible();
	return new Promise((resolve, reject) => {
		$.get({
			url: "/get_jobs",
			dataType: "json"
		})
			.done(result => {
				resolve(result);
			})

			.fail((request, status, error) => {
				reject(error);
			})
			.always(() => {
				$("spin").invisible();
			});
	});
}

function formatTableCells() {
	// marks column in table when field is determined
	FIELDS.forEach(f => {
		if (STATUS[f] === 1) {
			$("." + f + "Col")
				.css("font-weight", "bold")
				.css("border", "1px solid blue")
				.css("background", "pink");
		}
	});
}

function annotateTableCount(count) {
	$("#tabCounter").remove(); // remove old one if present
	$(".tabulator-footer").prepend(
		$("<span>")
			.attr("id", "tabCounter")
			.addClass("counter")
			.text(count)
	);
}

function rowMatchesQuery(row) {
	// does a table row match current selectors
	
	if (Object.keys(QUERY).length === 0) {
		return true;
	}
	return Object.keys(QUERY).every(key => {
		console.log('rowMatchesQuery', key, row[key], QUERY[key]);
		return row[key] === QUERY[key];
	});
}

function isFullySelected() {
	return FIELDS.every(f => STATUS[f] === 1);
}

function rowSelected(e, rowData) {
	let fullySelected = isFullySelected();
	setJobInPlay();

	Object.keys(STATUS)
		.filter(key => (!fullySelected ? STATUS[key] !== 1 : true)) // if fully selected, replace all values in Query
		.forEach(fName => {
			var val = rowData[fName];
			QUERY[fName] = val;
			var selector = "#" + fName + "_select";
			$(selector, "#container").empty();
			setNum(fName, 1);

			var option = $("<option>")
				.val(val)
				.text(val);
			$(selector, "#container").append(option);
			STATUS[fName] = 1;
			$(selector, "#container")
				.prop("disabled", true)
				.trigger("chosen:updated");
		});
	// show change in selected values using background class flash = orange (12/18/18)
	$(".chosen-single")
		.closest(".chosen-container")
		.addClass("flash");
	$(".tabulator-row").removeClass("rowChosen");
	// remove radio button set if any
	$(e.target)
		.closest(".tabulator-row")
		.addClass("rowChosen");
	setTimeout(() => {
		// show change in selected values using background back to normal
		$(".chosen-single")
			.closest(".chosen-container")
			.removeClass("flash");
	}, 800);
	
	pageComplete();
	
}

async function deleteAJob(/*event*/) {
	// gather stats on job
	cookieSetter();


	const stats = await getJobStats();

	const rows = ["Tool", "Tab"]
		.map(tag => {
			return stats[tag] === 0
				? ""
				: `<tr><th>${tag}s</th><td>${stats[tag]}</td></tr>`;
		})
		.join("");
	let report;
	if (rows === "") {
		report = "<b>No images defined for this job.</b>";
	} else {
		report = $(
			`<table id="delTable"><thead><tr><th>Images For</th><th>Count</th></tr><tbody>${rows}</tbody></table>`
		);
	}

	// if(statsText.length === 0) {
	// 	statsText.push('No defined images for: Tools, Hand Tools, Inspection Tools, or Tabs')
	// }

	$.confirm({
		title: `Confirm Job Deletion:<p class="deletejob">${COMMON.jobTitle()}</p>`,
		icon: "fas fa-trash-alt trash",
		type: "orange",
		content: report,
		columnClass: "col-md-8 col-md-offset-2",
		buttons: {
			ok: {
				text: "&nbsp;&nbsp;&nbsp;&nbsp;Delete&nbsp;&nbsp;&nbsp;",
				btnClass: "btn-primary",
				action: async function () {
					const deleteResult = await performJobDeletion(COMMON.getKey4id());

					if (deleteResult.nModified === 1) {
						Cookies.remove(COMMON.getCookieName());
						$('#jobinplay').text('').hide();
						initPage();
					}
				}
			},
			cancel: {
				btnClass: "btn-danger",
				action: function () {
					// TODO: move focus somehow
				}
			}
		}
	});
}

function performJobDeletion(jobId) {

	return new Promise((resolve, reject) => {
		$.ajax({
			url: "/archiveJob",
			type: "post",
			dataType: "json",
			data: {
				key4id: jobId,
				action: true // archive this job
			}
		})
			.done(result => {

				resolve(result);
			})

			.fail((request, status, error) => {
				reject(error);
			});
	});
}

async function getJobStats() {
	$("spin").visible();

	return new Promise((resolve, reject) => {
		$.ajax({
			url: "/jobStats",
			type: "post",
			dataType: "json",
			data: {
				key4id: getJobId()
			}
		})
			.done(result => {
				resolve(result);
			})

			.fail((request, status, error) => {
				reject(error);
			})
			.always(() => {
				$("spin").invisible();
			});
	});
}

function setNum(fName, number) {
	$("#" + fName + "_num", "#container").text(number === 1 ? "" : number);
}

function pageComplete() {
	enable_menu(
		"delete_job",
		"main",
		"tools",
		"hand_tools",
		"inspection_tools",
		"tab"
	);
	$("#this_job").visible();
	$("#delete_job_action").visible();
	cookieSetter();
	setJobInPlay();
}
function enable(tag) {
	$(tag)
		.closest("li")
		.removeClass("ui-state-disabled");
}
function disable(tag) {
	$(tag)
		.closest("li")
		.addClass("ui-state-disabled");
}
function enable_menu(...theArgs) {
	theArgs.forEach(action => {
		switch (action) {
			case "delete_job":
			case "main":
				enable(`#${action}_action`);
				break;

			case "tools":
			case "hand_tools":
			case "inspection_tools":
				enable(`#${action}_action`);
				["display", "edit", "upload"].forEach(label =>
					enable(`#${action}_action_${label}`)
				);
				break;
			case "tab":
				enable(`#${action}_action`);
				["display", "edit", "upload"].forEach(label =>
					enable(`#${action}_action_${label}`)
				);

				getJobTabs().then(tabList => {
					const ul = $("#tabNames").empty();
					const li = $("#tab_action_display_li");
					if (tabList.length > 0) {
						// .siblings() // just a single <UL> element
						// .empty();
						let $truncate_width = 0;
						tabList.forEach((tabName, index) => {
							const id = `tab_display_${tabName}`;
							const li = (
								$(`<li ><div class="truncate" id="${id}">
								<div class="showtab" index="${index}" tabName="${tabName}">
								<span item=${index}>${tabName}</span></div>
								</div></li>`)
							);
							ul.append(li);
							if (index === 0) $truncate_width = li.find('.truncate').width();
							const $element = li.find('span')
							const $c = $element
								.clone()
								.css({ display: 'inline', width: 'auto', visibility: 'hidden' })
								.appendTo('body');

							if ($c.width() > $truncate_width) {
								$element.hover(
									(e) => showName(tabName, e.pageX, e.pageY),
									() => hideName()
								);
							}

							$c.remove();

						});

						li.removeClass("ui-state-disabled");
					} else {
						li.addClass("ui-state-disabled");
					}

					$(".showtab").on("click", openTab);
				});

				break;
		}
	});
	//

	// setup hand_tools menu
	// setup inspection_tools menu
}
function showName(text, mleft, mtop) {
	// const {top} = $element.position();
	// console.log(parseInt($element.attr('item'))*21, mtop);
	$('#showname').css('left', mleft + 5).css('top', mtop).text(text).show();
}
function hideName() {
	$('#showname').hide();
}
function openTab() {
	const index = $(this).attr("index");
	const tabName = $(this).attr("tabName");
	cookieSetter();
	openInSameTab(`/showtab/${index}/${tabName}`);
}
function getJobId() {
	return COMMON.getKey4_ORDER()
		.map(key => QUERY[key])
		.join("|"); // create key4 string
}

function getJobTabs() {
	//const common = new Common();
	return new Promise((resolve, reject) => {
		const _id = getJobId();
		$.post({
			url: "/get_tabs",
			data: {
				_id: _id
			}
		})
			.done(result => {
				if ("tabs" in result) {
					result = result.tabs.map(tab => tab.tabName);
				} else {
					result = []; // no tabs found
				}

				resolve(result);
			})
			.fail((request, status, error) => reject(error));
	});
}

function cellSingleClick(e, cell) {
	//e - the click event object
	//cell - the DOM element of the cell
	if(isFullySelected()) return;
	var fName = cell.getColumn().getField();
	QUERY[fName] = cell.getValue();
	STATUS[fName] = 1;
	setNum(fName, 1);

	// find possible values for other fields
	FIELDS.forEach(f => {
		if (QUERY[f] === undefined) {
			updateField(f);
		}
	});

	var selector = "#" + fName + "_select";
	$(selector, "#container").empty();

	// single select for this field; add only one option to <select>
	$(selector, "#container").append(
		$("<option>")
			.val(QUERY[fName])
			.text(QUERY[fName])
	);
	// update
	$(selector, "#container")
		.prop("disabled", true)
		.trigger("chosen:updated");

	refreshFilterTable();

	if (isFullySelected()) {
		
		pageComplete();
		try {
			const cell = TABLE.getRowFromPosition(0, true).getCells()[0];
			$(cell.getElement()).find("input[type=radio]").prop("checked", true);
		} catch(e) {
			// ignore this issue 
		}
		
		setJobInPlay();
	}
}
function setJobInPlay() {
	let spaces = "&nbsp;&nbsp;&nbsp;&nbsp;";
	if (isFullySelected()) {
		cookieSetter();
		$("#jobinplay").html(
			spaces +
			COMMON.jobTitle() +
			spaces
		).show();

	} else {
		$("#jobinplay").hide();
	}
}

// TODO: Combine these 4 functions...
function findUniqueStart(fName) {
	var oneColVals = jsonData
		.filter(row => keyMatchStart(row))
		.map(row => row[fName]);
	return [...new Set(oneColVals)]; // return distinct values only
}
function keyMatchStart(row) {
	if (Object.keys(QUERY).length === 0) {
		return true;
	}
	return Object.keys(FIELDS).every(key => row[key] === QUERY[key]);
}

function findUnique(fName) {
	var oneColVals = TABLE.getRows()
		.filter(row => keyMatch(row))
		.map(row => row.getData()[fName]);
	return [...new Set(oneColVals)]; // return distinct values only
}
function keyMatch(row) {
	if (Object.keys(QUERY).length === 0) {
		return true;
	}
	return Object.keys(QUERY).every(key => row.getData()[key] === QUERY[key]);
}
///////////////////////////

function initField(fName) {
	// set up options for one field fName .chosen and initiate chosen

	const selector = "#" + fName + "_select";
	// QUERY will be empty to start with
	///////////////////////////////////
	var oneColVals = findUniqueStart(fName); // returns field fName as array of unique values, passing filters from QUERY
	///////////////////////////////////
	oneColVals = oneColVals.sort(FIELDSORTER[fName]);

	$(selector, "#container").empty();
	var howMany = oneColVals.length;
	setNum(fName, howMany);
	STATUS[fName] = howMany;
	//console.log("init   "+ fName + ": " + oneColVals.length);
	//FOUND[fName] = oneColVals.slice(0); // a copy
	if (howMany > 1) {
		oneColVals.unshift(""); // add empty option at top of list
	} else {
		//console.log("initField QUERY field " + fName + " = " + oneColVals[0]);
		QUERY[fName] = oneColVals[0];
	}

	oneColVals.forEach(datum => {
		$(selector, "#container").append(
			$("<option>")
				.val(datum)
				.text(datum)
		);
	});

	// setup format for this chooser
	$(".chosen-" + fName, "#container").chosen({
		width: FWIDTH,
		search_contains: false
	});

	// always disable if there is but one value
	$(".chosen-" + fName, "#container")
		.prop("disabled", howMany === 1)
		.trigger("chosen:updated");
}

function alphaCompare(a, b) {
	// useed by sort for alpha fields
	return a.localeCompare(b);
}

function updateField(fName) {
	// set up options for one field fName .chosen and initiate chosen
	//console.log("updateField "+ fName);
	const selector = "#" + fName + "_select";

	///////////////////////////////////
	// get sorted field value for field=fName as array of unique values, passing filters from pats
	///////////////////////////////////
	var oneColVals = findUnique(fName).sort(FIELDSORTER[fName]);

	$(selector, "#container").empty();
	var howMany = oneColVals.length;
	STATUS[fName] = howMany;
	//console.log("init   "+ fName + ": " + oneColVals.length);

	if (howMany > 1) {
		oneColVals.unshift(""); // add empty option at top of list
	} else {
		QUERY[fName] = oneColVals[0]; // QUERY now adjusted for this new found single value
	}

	oneColVals.forEach(datum => {
		$(selector, "#container").append(
			$("<option>")
				.val(datum)
				.text(datum)
		);
	});
	setNum(fName, howMany);
	if (howMany === 1) {
		// always disable if there is but one value
		$(".chosen-" + fName, "#container").prop("disabled", true);
	}
	$(".chosen-" + fName, "#container").trigger("chosen:updated");

	// update Table too
	refreshFilterTable();
}
