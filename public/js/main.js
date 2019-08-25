"use strict";

/* globals Common, Util */
// main.js :: MAIN Page


const COMMON = new Common();
const key4id = COMMON.getKey4id();
const key5 = COMMON.getParsedCookie();

const openMark = '<i class="fas fa-caret-right"></i>';
const closeMark = '<i class="fas fa-caret-down"></i>';
const right_caret = `<span class="caretmarker">${openMark}</span>`;
const down_caret = `<span class="caretmarker">${closeMark}</span>`;
const TOOLTIP_SHOW_MIN = 17;
let _replace = false;
let TABLE;
let TOOLDATA;
const WORDLISTS = {};
const IMAGE_COUNTS = {};
let SHOWIMAGES = true;
const WORDTYPES = ['function', 'type', 'other'];

$(async function () {
	////////////////////////////////////////////////////////////
	if ($.cookie("showImagesMode") === "false") {
		SHOWIMAGES = false;
	}
	$("title").html("Main"); // browser tab title
	const run = async () => {
		const tabs = await Util.setUpTabs(key4id, "Main", {
			main: true,
			machine: true,
			tab: true,
			spec: true
		});
		await Util.getTabCounts(key4id, tabs);
		const machineSpecs = await Util.getMachineSpec(key5.machine);
		const toolInfo = await Util.getSheetTags(key5, "Tools");

		// await getSuggestions(); // Fills WORDLISTS (from all TERMS in term_images collection)

		await getTermImageCounts(); // runs only one time

		paintPage(machineSpecs, toolInfo, tabs);
		startUp();

	};
	await run();
	////////////////////////////////////////////////////////////
});

async function getTermImageCounts() {
	return new Promise((resolve, reject) => {
		$.get({
			url: `/terms/getTermImageCounts`,
			dataType: "json"
		})
			.done(results => { // an array

				WORDTYPES.forEach(
					(wt) => {
						WORDLISTS[wt] = [];
						IMAGE_COUNTS[wt] = {};
					}
				);

				results.forEach(
					result => {
						// types and terms sorted in Mongo aggregation
						WORDLISTS[result.type].push(result.term);
						IMAGE_COUNTS[result.type][result.term] = result.count;
					}
				);

				resolve(null);
			})

			.fail((request, status, error) => {
				// alert(error);
				reject(null);
			});
	});
}

function setReplace(val, text = "") {
	// console.log("set replace now:", text, '"', val + '"');
	_replace = val;
	if (val) {
		$("span.replaceIndicator").css("visibility", "visible");
		$("body")
			.removeClass()
			.addClass("replacing");
	} else {
		$("span.replaceIndicator").css("visibility", "hidden");
		$("body").removeClass();
	}
}
function getReplace() {
	// console.log("get replace now", replace);
	return _replace;
}
function toggleShowImages() {
	SHOWIMAGES = !SHOWIMAGES;
	$.cookie('showImagesMode', SHOWIMAGES);
	$(".show_edit").text(SHOWIMAGES ? "Showing Term Images" : "Editing Terms").toggleClass('yellow');
	setTimeout(
		() => $(".show_edit").toggleClass('yellow'), 1000
	)
	const columns = defineColumns();
	if (SHOWIMAGES) {
		$("body")
			.removeClass()
			.addClass("viewing");
		columns.forEach(col => {
			switch (col.field) {
				case "type":
				case "function":
					delete col.editor;
					col.cellClick = displayImages;
					break;
				default:
					if (col.field.match(/^c\d+$/)) {
						delete col.editor;
						col.cellClick = displayImages;
						break;
					}
			}
		});
	} else {
		$("body").removeClass();
	}
	TABLE.setColumns(columns);
	tableBuilt();
}

function hasImages(type, term) {
	return IMAGE_COUNTS[type][term] > 0
}
function displayImages(e, cell) {
	e.preventDefault();
	const value = cell.getValue();
	if (value === "") return;
	let field = cell.getColumn().getField();
	if (field.match(/^c\d+$/)) {
		field = "other";
	}

	displayImages_support(e, field, value);

}

function displayImages_support(e, field, value) {
	if (!hasImages(field, value)) {
		tinyToast.show('No Known Images', e.clientX, e.clientY).hide(1000);
	}
	else {
		useSameDestination(
			encodeURI(`/terms/terms_display?type=${field}&term=${value}`)
		);
	}

}
function useSameDestination(destination) {
	openInSameTab(destination);
}
function openInSameTab(url) {
	window.open(url, "_self");
}



function startUp() {
	$("#navButtonDiv").css("display", "none");
	$(".navDropDownButton").on("click", () => {
		$("navDropDown").css("display", "flex");
		return false;
	});

	$("body").on("click", () => {
		$("navDropDown").css("display", "none");
	});
}

// function genLinkObj(tDoc) {
// 	return [tDoc.turret, tDoc.position, tDoc.spindle, tDoc.offset].join("_");
// }

// function genLinkList(aList) {
// 	return aList.join("_");
// }

function paintPage(machineSpecs, toolInfo, tabs) {
	$("pageheader").append(
		$(
			`<h1 class="pageTitle">Main</h1>
			<span class="jobTitle">${COMMON.jobTitle()}</span>`
		)
	);
	$("#toolDataTable").hide();
	// tools
	toolsTable(machineSpecs, toolInfo);

	// tabs
	tabsOutline(tabs);
}

/// tools display and response

function toolsTable(machineSpecs, toolData) {
	$(".tooldiv > h2")
		.on("click", ev => {
			let caret = $(ev.target);
			if (caret.hasClass("show_edit")) {
				toggleShowImages();
				return;
			}

			if (!caret.is('h2')) {
				// clicked on svg or path inside of svg
				caret = caret.closest("h2");
			}
			// const replaceIndicator = $("span.replaceIndicator");
			const toolTable = $("#toolDataTable");
			if (toolTable.css("display") === "none") {
				dataForTable().then(async () => {
					// tableData = data;
					// TODO: possibly use cookie to remember this state
					// <span class="stitle">Machine<br/></span><span class="stitle moveright">Tools</span>
					caret.html(
						`${down_caret} 
						<span class="stitle">Machine Tools</span>
						<br/>
						<button class="show_edit">
						${SHOWIMAGES ? "Showing Term Images" : "Editing Terms"}</button>`
					);
					$(".show_edit").off("click");
					if (TABLE === undefined) { // initialize TABLE
						toolTable.show();

						TABLE = await defineTable();

						toolTable.show(
							"slide",
							{
								direction: "left"
							},
							"slow"
						);
					} else {
						toolTable.show(
							"slide",
							{
								direction: "left"
							},
							"slow"
						);
					}

					$(".show_edit").show();
				});


			} else {
				$(".show_edit").hide();
				caret.html(`${right_caret} <span class="stitle">Machine Tools</span>`);

				toolTable.hide(
					"slide",
					{
						direction: "left"
					},
					"slow"
				);
			}
		});

	function dataForTable() {
		return new Promise((resolve, reject) => {
			TOOLDATA = [];
			$.post({
				url: "/terms/getMainTable",
				data: { key4id: key4id },
				dataType: "json"
			})
				.done(results => {
					results.forEach((rowData, index) => {
						const oneRow = {
							turret: rowData.turret,
							spindle: rowData.spindle,
							position: rowData.position,
							offset: rowData.offset,
							function: rowData.function === "" ? "" : rowData.function,
							type: rowData.type === "" ? "" : rowData.type,
							id: index,
							ts: `Turret ${rowData.turret}, Spindle ${rowData.spindle}`
						};
						for (let c = 0; c < colTitles_terms.length; c++) {
							// terms from cols array
							oneRow["c" + c] = rowData.cols[c];
						}
						TOOLDATA.push(oneRow);
						// text += [row.turret,row.spindle,row.position,row.offset,row.cols[0],row.cols[1]].join(', ');
					});
					resolve(null);
				})
				.fail(error => {
					alert("/getMainTable Error " + JSON.stringify(error, null, 4));
					reject(null);
				});
		});
	}
}

const colTitles_special = ["turret", "spindle", "ts", "id"];
const colTitles_frozen = ["Position_#", "Offset_#", "Function", "Type"];
const colTitles_terms = [
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
	"Misc_Info****",
	"Restart_N#",
	"Turret_Model Holder",
	"Collet_Size/Model",
	"Shank_Dia/Width"
];
function isLong(text, field) {
	return text.length > ((field === 'other') ? 10 : 15);
}
function defineColumns() {
	const upperMutator = function (value, data, type, params, component) {
		return value.toUpperCase();
	};
	const termFormatter = function (cell) {
		const term = cell.getValue().toUpperCase();
		if (term === "") {
			return '<span class="na">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;n/a</span>';
		}
		let field = cell.getField();
		if (field.match(/^c\d+$/)) {
			field = "other";
		}
		if (isLong(term, field)) {
			return hasImages(field, term) ?
				`<span class="long">${term}</span>` : `<span class="long noimages">${term}</span>`;
		} else {
			return hasImages(field, term) ? term : `<span class="noimages">${term}</span>`;
		}
	};
	const termEditorParams = function (which) {
		return {
			showListOnEmpty: true, //show all values when the list is empty,
			freetext: true, //allow the user to set the value of the cell to a free text entry
			allowEmpty: true, //allow empty string values
			values: WORDLISTS[which], //create list of values from all values contained in this column
			searchFunc: function (term, values) {

				//search for matches, a) at start of term, and then b) anywhere in term
				const matches = {
					a: [],
					b: []
				};

				const up_term = term.toUpperCase();
				// create matches with start of string having precedence
				WORDLISTS[which].forEach(item => {
					if (typeof item === "string") {
						const up_item = item.toUpperCase();
						const found = up_item.indexOf(up_term);

						switch (found) {
							case -1:
								break;
							case 0: // these will come first
								matches.a.push(item);
								break;
							default:
								// then these
								matches.b.push(item);
						}
					}
				});
				// console.info(matches);
				return matches.a.concat(matches.b).map(item => ({
					title: item,
					value: item
				}));
				// return matches.a.concat(matches.b);
			}
		};
	};
	const cellContextMethod = (e, cell) => {
		e.preventDefault();
		if (SHOWIMAGES) return;
		setReplace(true, "cellContext");
	};
	const brg_regex = new RegExp("_", "g");
	const result_terms = colTitles_terms.map((title, index) => {
		return {
			title: title.replace(brg_regex, "<br/>"),
			field: "c" + index,
			headerSort: false,
			width: 100,
			editor: "autocomplete",
			editorParams: termEditorParams("other"),
			formatter: termFormatter,
			mutatorEdit: upperMutator,
			cellContext: cellContextMethod
		};
	});

	const result_frozen = [
		{
			title: colTitles_frozen[0].replace(brg_regex, "<br/>"),
			field: "position",
			frozen: true,
			headerSort: false,
			width: 65,
			cssClass: "pos_off bottomborder",
			cellContext: cellContextMethod
		},
		{
			title: colTitles_frozen[1].replace(brg_regex, "<br/>"),
			field: "offset",
			frozen: true,
			headerSort: false,
			width: 65,
			cssClass: "pos_off bottomborder",
			cellContext: cellContextMethod
		},
		{
			title: "Function",
			field: "function",
			frozen: true,
			headerSort: false,
			width: 150,
			cssClass: "bottomborder",
			editor: "autocomplete",
			editorParams: termEditorParams("function"),
			formatter: termFormatter,
			mutatorEdit: upperMutator,
			cellContext: cellContextMethod
		},
		{
			title: "Type",
			field: "type",
			frozen: true,
			headerSort: false,
			width: 150,
			cssClass: "bottomborder",
			editor: "autocomplete",
			editorParams: termEditorParams("type"),
			formatter: termFormatter,
			mutatorEdit: upperMutator,
			cellContext: cellContextMethod
		}
	];
	// function rowSelected(e, cell) {
	// 	//
	// }
	const display_trigger = {
		title: "&#x2714;",
		field: "imagelink",
		align: "center",
		width: 20,
		frozen: true,
		cssClass: "bottomborder",
		headerSort: false,
		sortable: false,
		formatter: function (cell /*, formatterParams, onRendered*/) {
			const d = cell.getData();
			return `<a target="_self"
			class="linkhover" 
			href="/tabs/tools.html#${d.turret}_${d.position}_${d.spindle}_${d.offset}"
			>&#9675;</a>`;
		}
	};
	const result_special = colTitles_special.map(field => {
		return {
			field: field,
			visible: false
		};
	});

	return [
		display_trigger,
		...result_frozen,
		...result_terms,
		...result_special
	];
}

function defineTable() {
	const columns = defineColumns();
	$("body").removeClass();
	if (SHOWIMAGES) {
		$("body").addClass("viewing");
		columns.forEach(col => {
			switch (col.field) {
				case "type":
				case "function":
					delete col.editor;
					col.cellClick = displayImages;
					break;
				default:
					if (col.field.match(/^c\d+$/)) {
						delete col.editor;
						col.cellClick = displayImages;
						break;
					}
			}
		});

	}
	let lastCellEditing = {};

	return new Tabulator("#toolDataTable", {
		pagination: "local",
		paginationSize: 18,

		// TODO:
		// first column is a button/trigger for diaply of the tools, starting at this
		// turret,spindle,position,offset
		// ts columns for grouping by turret/spindle
		columns: columns,
		resizableColumns: false,
		groupBy: "ts",
		groupToggleElement: "header",
		height: "100%",
		//
		// columnMinWidth: 50,
		reactiveData: true, //enable reactive data
		data: TOOLDATA,
		tooltips: function (cell) {
			// function should return a string for the tooltip of false to hide the tooltip
			// cell - cell component

			const value = cell.getValue();
			const field = cell.getField();
			if (typeof value !== "string") return;
			let returnValue = "";
			let len = value.length;
			if (len > ((field === 'function' || field === 'type') ? 15 : 10)) {
				returnValue = value;
			}
			return returnValue;
		},

		tooltipGenerationMode: "hover",
		tableBuilt: tableBuilt,
		cellEdited: cellEdited,
		cellEditCancelled: function (cell) {
			lastCellEditing = {};
			setReplace(false, "cencel");
		},
		cellEditing: function (cell) {
			lastCellEditing.value = cell.getValue();
			lastCellEditing.field = cell.getColumn().getField();
		}
	});

	async function cellEdited(cell) {
		// console.clear();
		const row = cell.getRow().getData();
		const new_value = cell.getValue();

		const field = cell.getColumn().getField();
		let list;

		let cols = [];
		switch (field) {
			case "type":
			case "function":
				list = WORDLISTS[field];
				break;
			default:
				list = WORDLISTS.other;
				let rowdata = cell.getData();
				for (let i = 0, max = colTitles_terms.length; i < max; i++) {
					cols[i] = rowdata["c" + i];
				}
		}
		const isNew = !list.includes(new_value);

		if (isNew) {
			// if isNew - update and then sort list
			list.push(new_value);
			// reference for choosing sort here:
			// https://stackoverflow.com/questions/1344500/efficient-way-to-insert-a-number-into-a-sorted-array-of-numbers
			list.sort();
		}
		// console.warn("wordlist updated new?", isNew);
		// HERE
		const data = {
			replaceAll: getReplace(), // right clicked first -- meaning replace all occurences of old value
			value: new_value, // selected value, '' or a new value entered
			isNew: isNew, // true if value not in current wordlist
			previous:
				(lastCellEditing.field === field) ? lastCellEditing.value : null,
			// info for updating main_table collection:
			turret: row.turret,
			spindle: row.spindle,
			position: row.position,
			offset: row.offset,
			type: field,
			list: list, // the correct wordlist for this field
			cols: cols
		};

		// console.dir(data);
		setReplace(false, "cellEdited");

		if (!data.replaceAll) { // not global replace
			if (data.isNew) { // if new term, create a term_images doc for image frefs
				create_term_images(data);
			}
			change_main_table(data);

		} else { // yes, global replace
			// right clicked, data being replaced
			if (data.previous === "") {
				if (data.isNew) { // if new term, create a term_images doc for image frefs
					create_term_images(data);
				}
				// no existing term to replace in tableData
				change_main_table(data);

			} else {
				replace_tableData(data); // change all tabulator values
				// conside Promise.all here; these do not have to be sequential
				try {
					await replace_main_table(data);
					try {
						await replace_term_images(data);
						// console.log("replacments complete");
					}
					catch (erti) {
						console.error("error replace_term_images", erti);
					}
				}
				catch (ermt) {
					console.error("error replace_main_table", ermt);
				}
			}
		}
	}

	async function replace_main_table(data) {
		// console.log("replace_main_table");

		if (data.type === "function" || data.type === "type") {
			// console.log("replace_singles");
			try {
				return await replace_singles(data);
			}
			catch (e) {
				console.error("error replace_singles", e);
			}

		} else {
			// console.log("replace_others");
			try {
				return await replace_others(data);
			}
			catch (e) {
				console.error("error replace_others", e);
			}
		}
	}

	// change one 'previous' value for field in main_table collection
	function change_main_table(data) {

		delete data.list;
		if (data.type !== "function" && data.type !== "type") {
			data.value = data.cols;
			data.type = "cols";
		}
		delete data.cols;
		data.key4id = key4id; // JOB ID for changes
		////////// debug
		// console.log("change_main_table", data.type, "previous:",
		// 	(data.previous === '') ? "empty" : data.previous,
		// 	"key4id:", key4id);
		// if (data.type !== 'cols') console.log("\tto:", data.value);
		////////// debug
		return new Promise((resolve, reject) => {
			$.post({
				url: "/terms/change_main_table",
				dataType: "json",
				data: data
			})
				.done(result => {
					resolve(result);
				})

				.fail((request, status, error) => {
					reject(error);
				});
		});
	}

	// replace a every 'previous' value for function or type field in main_table collection
	function replace_singles({ type, previous, value, isNew }) {
		// console.log('\treplace_singles', { type, previous, value, isNew });
		return new Promise((resolve, reject) => {
			$.post({
				url: "/terms/replace_singles/" + type,
				dataType: "json",
				data: { previous: previous, value: value, isNew: isNew }
			})
				.done(result => {
					// console.log('\treplace_singles', JSON.stringify(result, null, 2));
					resolve(result);
				})

				.fail((request, status, error) => {
					console.error('\terror replace_singles', error);
					reject(error);
				});
		});
	}

	// replace every 'previous' value for others field in main_table collection
	function replace_others({ previous, value, isNew }) {
		// console.log('replace_singles', { type, previous, value, isNew });
		return new Promise((resolve, reject) => {
			$.post({
				url: "/terms/replace_others",
				dataType: "json",
				data: { previous: previous, value: value, isNew: isNew }
			})
				.done(result => {
					// console.log("success replace_others", result);
					resolve(result);
				})

				.fail((request, status, error) => {
					console.error("error replace_others", error);
					reject(error);
				});
		});
	}

	function replace_tableData(data) {
		// replace all occurences of term in field category, and
		// remove old 'previous' value from WORDLISTS
		// console.log("replace_tableData")
		let field = (data.type === 'function' || data.type === 'type') ? data.type : 'other';
		let value = data.value;
		let previous = data.previous; // will NOT be ""
		IMAGE_COUNTS[field][value] =
			(previous in IMAGE_COUNTS[field]) ?
				0 : IMAGE_COUNTS[field][previous];
		delete IMAGE_COUNTS[field][previous];
		if (field === "type" || field === "function") {
			TOOLDATA.forEach(tdRow => {
				if (tdRow[field] === previous) tdRow[field] = value;
			});
		} else {
			let max = colTitles_terms.length;
			let i;
			TOOLDATA.forEach(tdRow => {
				for (i = 0; i < max; i++) {
					let field = "c" + i;
					if (tdRow[field] === previous) tdRow[field] = value;
				}
			});
		}
		let found = -1;
		data.list.forEach((item, index) => {
			if (found === -1 && item === previous) found = index;
		});
		// new value has already been inserted in WORDLISTS, and the list is sorted

		if (found > -1) {
			// delete old value
			data.list.splice(found, 1);
		}
	}

	function create_term_images({ isNew, value, type, previous }) {

		type = (type === 'function' || type === 'type') ? type : "other";
		// console.log('create_term_images', { isNew, value, type, previous });
		return new Promise((resolve, reject) => {
			if (value === '') {
				// console.log('STOPPED value = "" create_term_images');
				resolve(true);
			} else {
				// console.log('START *******create_term_images', '++new++');
				$.post({
					url: '/terms/create_term_images',
					dataType: 'json',
					data: {
						term: value,
						type: type
					}
				})
					.done(results => {
						// console.log('\tcreate_term_images', results);
						resolve(results);
					})
					.fail(error => {
						alert("/create_term_images Error " + JSON.stringify(error, null, 4));
						reject(error);
					});
			}
		});
	}

	function replace_term_images(data) {
		const { isNew, value, type, previous } = data;
		// console.log('replace_term_images', { isNew, value, type, previous });
		return new Promise((resolve, reject) => {
			if (value === '') {
				// console.log('\treplace_term_images', 'to empty');
				resolve(true);
			} else {
				$.post({
					url: '/terms/replace_term_images',
					dataType: 'json',
					data: {
						term: data.value,
						type: (data.type === 'cols') ? 'other' : data.type,
						previous: data.previous,
						isNew: data.isNew
					}
				})
					.done(results => {
						// console.log('\treplace_term_images', results);
						resolve(results);
					})
					.fail(error => {
						alert("/replace_term_images Error " + JSON.stringify(error, null, 4));
						reject(error);
					});
			};
		});
	}
}
/////////////////////////////////////////////////// TABS
/// tabs display and response

function tabsOutline(tabs) {
	// draw outline view of tab content
	if (tabs !== undefined) {
		tabs.forEach((tab, index) => {
			drawMainTab(tab, index);
		});
	}
}

function tabs_route(ev) {
	ev.preventDefault();
	console.log("tabs_route ", JSON.stringify(ev.data));
	openTab(ev.data)
	return false;
}
function openInSameTab(url) {
	window.open(url, "_self");
}
function openTab(args) {
	console.log(`/showtab/${args.tabnum}/${args.tabName}/${args.sectnum}/${args.stepnum}`)
	debugger;
	openInSameTab(`/showtab/${args.tabnum}/${args.tabName}/${args.sectnum}/${args.stepnum}`);
}

function tableBuilt() {
	$(".tabulator-col")
		.css("font-size", "14px")
		.css("background", "lightblue");
	$(".tabulator-frozen.tabulator-col").css("background", "lightgreen");
}

function drawMainTab(tab, tab_index) {
	let aTabOuter = $(
		`<div class="tabouter"><div class="tabdiv">
		<h2 class="tablink">${right_caret} <span class="stitle">Tab: ${tab.tabName}</span></h2></div></div>`
	);
	let aTabDiv = aTabOuter.find(".tabdiv");
	aTabDiv.attr("tab_index", tab_index);
	// if(tab.sections.length>0) aTabDiv.find(".tablink").on("click", [tab_index], tabs_route);
	aTabDiv.find(".tablink").on("click", ev => {
		let caret = $(ev.target);
		// console.log(caret[0]);

		caret = caret.closest("h2");

		let tabul = caret.closest(".tabouter").find(".tabUL");
		if (tabul.css("display") === "none") {
			caret.html(`${down_caret} <span class="stitle">Tab: ${tab.tabName}</span>`);
			tabul.show(
				"slide",
				{
					direction: "left"
				},
				"slow"
			);
		} else {
			caret.html(`${right_caret} <span class="stitle">Tab: ${tab.tabName}</span>`);
			tabul.hide(
				"slide",
				{
					direction: "left"
				},
				"slow"
			);
		}
	});
	let tabUL = $(`<ul class="tabUL"/>`); // id="tab_${tab_index+1}"
	// let tbody = $('<tbody/>');
	tab.sections.forEach((section, sect_index) => {
		let sectLI = $(
			`<li class="section_li"><span class="sectionRow sectionlink">${section.sectionName}</span></li>`
		);
		sectLI.css("text-decoration", "underline").attr("sect_index", sect_index);
		// if (section.steps.length > 0)
			sectLI.on("click",
				{
					tabName: tab.tabName,
					tabNum: tab_index,
					sectNum: sect_index,
					stepNum: -1
				},
				tabs_route);
		// let td = $('<td class="left"/>');
		tabUL.append(sectLI);
		// td = $(`<th class="stepcol" >${section.sectionName}</th>`);
		tabUL.append(sectLI);
		let sectUL = $(`<ul/>`);
		sectLI.append(sectUL);
		// tbody.append(tr);
		section.steps.forEach((step, step_index) => {
			let stepLI;
			if (step.count > 0) {
				stepLI = $(
					`<li><span class="stepRowW steplink">${step.stepName}&nbsp;&nbsp;<b>(${step.count})</b></span></li>`
				);
				
			}
			else {
				stepLI = $(
					`<li><span class="stepRowG steplink">${step.stepName}</span></li>`
				);
				
			}

			stepLI.css("text-decoration", "underline").attr("step_index", step_index);
			stepLI.on("click",
			{
				tabName: tab.tabName,
				tabnum: tab_index,
				sectnum: sect_index,
				stepnum: step_index
			},
			tabs_route);
			sectUL.append(stepLI);
		});
		sectUL.append($("<br/>")); // insert blank line between sections
	});

	
	tabUL.hide();
	$("tab_outlines").append(aTabOuter.append(aTabDiv, tabUL));
}
