"use strict";

// Character ASCII Codes
const ENTER = 13;
const TAB = 9;
window.name = "HOME";
const COMMON = new Common();
jQuery.fn.visible = function() {
	return this.css("visibility", "visible");
};

jQuery.fn.invisible = function() {
	return this.css("visibility", "hidden");
};
let TABLE;
// (function($) {
// 	var prop = "VisibilityState";
// 	var evt = "visibilitychange";

// 	var vendors = ["webkit", "ms"];
// 	var vendor;

// 	function set_state(state) {
// 		$(window).trigger("visibilitychange", state);
// 		$.visibilityState = state;
// 	}

// 	// detect property, if available
// 	for (var i = 0; i < vendors.length; i++) {
// 		vendor = vendors[i];
// 		if (vendors[i] + prop in document) {
// 			vendor = vendors[i];
// 			prop = vendor + prop;
// 			break;
// 		}
// 	}

// 	// setup event handlers
// 	if (vendor) {
// 		$(document).on(vendor + evt, function() {
// 			set_state(document[prop]);
// 		});
// 	} else {
// 		// not as cool failback -- this is functionally different than the visibilitychange event
// 		// it's recommended you understand what makes the two different before using this code
// 		$(window)
// 			.on("focus", function() {
// 				set_state("visible");
// 			})
// 			.on("blur", function() {
// 				set_state("hidden");
// 			});

// 		// TODO handle mobile browsers where we dont have either visibility API or focusin. setup
// 		// interval to check document.hasFocus()
// 	}

// 	// set initial state
// 	$.visibilityState = document[prop] || "visible";
// })(jQuery);

$(function() {
	window.name = "HOME";
	// $(window).on("visibilitychange", () => {
	// 	alert("vischange", COMMON.getParsedCookie());
	// });
	TABLE = setUpTable();

	$("#this_job").invisible();
	$("#delete_job_action").hide();

	$("#this_job_menu").menu({});

	$("#this_job_menu > li").addClass("ui-state-disabled");

	$("#reset").on("click", resetPage);
	$("#insert_action").on("click", () => {
		window.location.href = window.location + "insert";
	});
	const existing_cookie = COMMON.getParsedCookie();
	// alert("existing_cookie " + JSON.stringify(existing_cookie)); // TODO:
	if (existing_cookie !== null) {
		refreshFromDB().then(() => {
			let r = TABLE.getRows();
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
		refreshFromDB();
	}
	$("#main_action").on("click", (e) => useSameTab(e, "main.html"));

	$("#tools_action").on("click", (e) => useSameTab(e, "tools.html"));

	$("#tools_action_display").on("click", (e) => useSameTab(e, "tools.html"));

	$("#tools_action_edit").on('click', (e) => useSameTab(e, "ftedits.html"));

	$("#tools_action_upload").on('click', (e) => useSameTab(e, "upload.html"));

	$("#tab_action_edit").on("click", (e) => useSameTab(e, "tabsedit.html"));

	$("#tab_action_upload").on("click", (e) => useSameTab(e, "tab_upload.html"));

	// $(window).on('visibilitychange',
	//     () => {
	//         if (document.visibilityState === 'visible') {
	//             //("reset");
	//             $('#reset').trigger('click');
	//         }
	//     });
	// $("body").on("keydown", e => {
	// 	switch (e.which) {
	// 		/////////// Removed 12/13/18 -- CR in data entry fields is getting here. Too early for page submit.
	// 		// case ENTER: // Enter
	// 		//     $("#buttons button.active").trigger('click');
	// 		//     break;
	// 		///////////

	// 		case TAB: // use TAB to select next active button
	// 			if (multiButtons) {
	// 				$("#" + button_ids[buttonActiveNum]).toggleClass("active");
	// 				if (e.shiftKey === false) {
	// 					++buttonActiveNum;
	// 					e.preventDefault();
	// 					if (buttonActiveNum === maxTabIndex) {
	// 						buttonActiveNum = 0;
	// 					}
	// 				} else if (e.shiftKey === true) {
	// 					--buttonActiveNum;
	// 					e.preventDefault();
	// 					if (buttonActiveNum < 0) {
	// 						buttonActiveNum = maxTabIndex - 1;
	// 					}
	// 				}
	// 				$("#" + button_ids[buttonActiveNum])
	// 					.toggleClass("active")
	// 					.focus();
	// 				break;
	// 			}
	// 			break;
	// 		default:
	// 			break;
	// 	}
	// });

	// $("#tabs_upload").on("click", function() {
	// 	useSameTab("tab_upload.html");
	// });

	// $("#upload_action").on("click", function() {
	// 	useSameTab("upload.html");
	// });

	// $("#tabs_action").on("click", function() {
	// 	useSameTab("tabsedit.html");
	// });

	function useSameTab(event, destination) {
		// if (existingWindow !== undefined && existingWindow !== null) {
		// 	existingWindow.close();
		// 	existingWindow = null;
		// }
		event.preventDefault();
		cookieSetter();
		// alert("useSameTab " + COMMON.getParsedCookie());
		openInSameTab("/tabs/" + destination);
	}

	// $("#delete_action").on("click", function() {
	// 	alert("Not Implemented");
	// 	return;
	// 	// let key4 = [QUERY.dept, QUERY.partId, QUERY.op, QUERY.machine].join("|");
	// 	// countImages(key4).then(
	// 	//     r => {
	// 	//         //debugger;
	// 	//         let fileCount = r.fileCount;
	// 	//         $.confirm({
	// 	//             closeIcon: true,
	// 	//             icon: 'fa fa-exclamation fa-3x',
	// 	//             boxWidth: '700px',
	// 	//             useBootstrap: false,
	// 	//             /*type: 'red',*/
	// 	//             animation: 'right',
	// 	//             title: showVals(fileCount),
	// 	//             content: '<span class="qmsg"><b>Please choose a button.</b></span>',
	// 	//             buttons: {
	// 	//                 "YES, Delete This Job!": {
	// 	//                     btnClass: 'btn-red',
	// 	//                     action: () => {
	// 	//                         let key5 = [QUERY.dept, QUERY.machine,
	// 	//                             QUERY.op, QUERY.pName, QUERY.partId
	// 	//                         ].join("|");
	// 	//                         jobArchive(key4, key5);
	// 	//                         location.reload();
	// 	//                     }
	// 	//                 },
	// 	//                 "No, Do Not Delete": {
	// 	//                     btnClass: 'btn-blue cancelButtonClass'
	// 	//                 }
	// 	//             }

	// 	//         });
	// 	//     },
	// 	//     err => console.log("err " + err)
	// 	// );
	// });

	// handle changes in choosers - that is, selection of a particular item
	$(".chooser", "#container").on("change", function() {
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

		// Table
		refreshFilterTable();
		// count how many columns have set values now

		if (isFullySelected()) {
			pageComplete();
		}
	});
});

async function refreshFromDB() {
	await getData().then(
		data => {
			jsonData = data; // now global
			// Choosers
			FIELDS.forEach(initField); // QUERY empty to start
			// Table
			refreshFilterTable();
		},
		error => console.log("getData error " + error)
	);
}
// let existingWindow;

function cookieSetter() {
	QUERY.page = TABLE.getPage();
	$.cookie(COMMON.getCookieName(), JSON.stringify(QUERY), { expires: 1 });
}

function resetPage() {
	resetVars().then(
		() => {
			location.reload();
			//console.log("resetVars " + signal)
		},
		error => console.log("resetVars Error: " + error)
	);
}
function resetVars() {
	//console.log("resetVars existingWindow = " + existingWindow);
	// if (existingWindow !== undefined && existingWindow !== null) {
	// 	//console.log("closing existing resetVars");
	// 	existingWindow.close();
	// 	existingWindow = null;
	// }
	$.removeCookie(COMMON.getCookieName(), { path: "/" });
	return new Promise((resolve, reject) => {
		$.ajax({
			url: "/reset",
			type: "get"
		})
			.done(result => resolve(result))

			.fail((request, status, error) => reject(error));

		// .always(() => console.log("resetVars complete"));
	});
}

function openInSameTab(url) {
	window.open(url, "_self");
}
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

function updateTable(rows) {
	TABLE.setData(rows);
	if (rows.length === 1) formatTableCells();
	annotateTableCount(rows.length);
}

function refreshFilterTable() {
	// set new (reduced) jsonData in table, uses QUERY
	// let data = (fresh) ? jsonData : );
	updateTable(jsonData.filter(row => rowMatchesQuery(row)));
	// return (data.length === 1) ? data[0] : null;
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
				cellClick: cellSingleClick,
				headerSort: false,
				sortable: false,
				formatter: function(/*value, data, cell, row, options, formatterParams*/) {
					return '<div><input name="firstcol_radio" type="radio"></div>';
				}
			},
			{
				title: "Part Number",
				//width: "150px",
				field: "partId",
				sorter: "string",
				cssClass: "partIdCol",
				onClick: cellSingleClick
			},
			{
				title: "Part Name",
				//width: "200px",
				field: "pName",
				sorter: "string",
				align: "center",
				cssClass: "pNameCol",
				onClick: cellSingleClick
			},
			{
				title: "Department",
				//width: "150px",
				field: "dept",
				sorter: "string",
				align: "center",
				cssClass: "deptCol",
				onClick: cellSingleClick
			},
			{
				title: "Operation",
				//width: "120px",
				field: "op",
				sorter: "number",
				align: "center",
				cssClass: "opCol",
				onClick: cellSingleClick
			},
			{
				title: "Machine",
				//width: "120px",
				field: "machine",
				sorter: "string",
				cssClass: "machineCol",
				onClick: cellSingleClick
			}
		]
	});
}

function getData(/*message*/) {
	return new Promise((resolve, reject) => {
		$.ajax({
			url: "/data",
			type: "get",
			dataType: "json"
		})
			.done(result => resolve(result))

			.fail((request, status, error) => reject(error));

		// .always(() => console.log("getdata complete: " + message));
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
	return Object.keys(QUERY).every(key => row[key] === QUERY[key]);
}

function isFullySelected() {
	return FIELDS.every(f => STATUS[f] === 1);
}

function rowSelected(e, rowData) {
	let fullySelected = isFullySelected();
	Object.keys(STATUS)
		.filter(key => (!fullySelected ? STATUS[key] !== 1 : true)) // if fully selected, replace all values
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
			//console.log("rowSelected " + fName);
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
	}, 500);
	pageComplete();
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
		"tab",
		"delete_job"
	);
	$("#this_job").visible();
	$("#delete_job_action").show();
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
						tabList.forEach((tabName, index) => {
							const id = `tab_display_${tabName}`;
							ul.append(
								$(`<li ><div class="truncate" id="${id}">
								<div class="showtab" index="${index}" tabName="${tabName}">${tabName}</div>
								</div></li>`)
							);
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

	// // setup tools_menu

	// // setup tab menu

	// setup hand_tools menu
	// setup inspection_tools menu
}
function openTab() {
	const index = $(this).attr("index");
	const tabName = $(this).attr("tabName");
	cookieSetter();
	openInSameTab(`/showtab/${index}/${tabName}`);
}

function getJobTabs() {
	//const common = new Common();
	return new Promise((resolve, reject) => {
		const _id = COMMON.getKey4_ORDER()
			.map(key => QUERY[key])
			.join("|"); // create key4 string
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
	//value - the value of the cell
	//data - the data for the row the cell is in

	if (cell.getValue() === undefined) {
		// radio button, first cell
		rowSelected(e, cell.getData()); // select all the values from this row
	} else {
		// other cells; use only the cell's value as new selection
		var fName = $(this)[0].field;
		QUERY[fName] = data[fName];
		STATUS[fName] = 1;
		setNum(fName, 1);

		updateField(fName);
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
				.val(value)
				.text(value)
		);
		// update
		$(selector, "#container")
			.prop("disabled", true)
			.trigger("chosen:updated");

		// Table
		refreshFilterTable();
		// count how many columns have set values now

		if (isFullySelected()) {
			pageComplete();
		}
	}
}

/*
function genQuery(field, obj) {
    var query = {};
    var val = obj[field];
    // replacing &nbsp;'s that were added for support indenting in some columns for strings
    query[field] = (typeof val === 'string') ? val.replace(/(&nbsp;)+/, "") : val;
    return query;
}
*/
function findUnique(fName) {
	var oneColVals = jsonData.filter(row => keyMatch(row)).map(row => row[fName]);
	return [...new Set(oneColVals)]; // return distinct values only
}

function keyMatch(row) {
	if (Object.keys(QUERY).length === 0) {
		return true;
	}
	return Object.keys(FIELDS).every(key => row[key] === QUERY[key]);
}

function initField(fName) {
	// set up options for one field fName .chosen and initiate chosen

	const selector = "#" + fName + "_select";
	// QUERY will be empty to start with
	///////////////////////////////////
	var oneColVals = findUnique(fName); // returns field fName as array of unique values, passing filters from QUERY
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

	if (howMany === 1) {
		// always disable if there is but one value
		$(".chosen-" + fName, "#container")
			.prop("disabled", true)
			.trigger("chosen:updated");
	}

	//formatTableCells();
	//annotateTableCount(jsonData.length);

	//return howMany;
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

	//console.log(STATUS);
	return howMany;
}
