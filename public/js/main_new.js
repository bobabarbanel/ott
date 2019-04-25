"use strict";

/* globals Common, Util */
// main.js :: MAIN Page

window.name = "MAIN";
const COMMON = new Common();
const key4id = COMMON.getKey4id();
const key5 = COMMON.getParsedCookie();

const openMark = '<i class="fas fa-caret-right"></i>';
const closeMark = '<i class="fas fa-caret-down"></i>';
const right_caret = `<span class="caretmarker">${openMark}</span>`;
const down_caret = `<span class="caretmarker">${closeMark}</span>`;
let TABLE;

$(function() {
	////////////////////////////////////////////////////////////
	$("title").html("Main"); // browser tab title
	const run = async () => {
		const tabs = await Util.setUpTabs(key4id, window.name, {
			main: true,
			machine: true,
			tab: true,
			spec: true
		});
		const machineSpecs = await Util.getMachineSpec(key5.machine);
		const toolInfo = await Util.getSheetTags(key5, "Tools");
		paintPage(machineSpecs, toolInfo, tabs);
		startUp();
	};
	run();
	////////////////////////////////////////////////////////////
});

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

function genLinkObj(tDoc) {
	return [tDoc.turret, tDoc.position, tDoc.spindle, tDoc.offset].join("_");
}

function genLinkList(aList) {
	return aList.join("_");
}

function paintPage(machineSpecs, toolInfo, tabs) {
	// page header
	let jobTitle = COMMON.jobTitle();

	$("pageheader").append(
		$(
			`<h1 class="pageTitle">${
				window.name
			}</h1><span class="jobTitle">${jobTitle}</span>`
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
	let aToolDiv = $(".tooldiv");

	// let aToolOuter = $(".toolouter");

	aToolDiv.find("h2").on("click", async ev => {
		// ev.preventDefault();
		// const data = await refreshTable();
		// await TABLE.setData(data);
		// afterBuilt();

		let caret = $(ev.target);

		if (caret.html() === "") {
			// clicked on svg or path inside of svg
			caret = caret.closest("h2");
		}
		const toolTable = $("#toolDataTable");
		if (toolTable.css("display") === "none") {
			refreshTable().then(async data => {
				caret.html(`${down_caret} Tools`);
				if (TABLE === undefined) {
					toolTable.show();
					TABLE = await defineTable(data);
					
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
			});

			// openGroups();
		} else {
			caret.html(`${right_caret} Tools`);
			toolTable.hide(
				"slide",
				{
					direction: "left"
				},
				"slow"
			);

			// toolTable.remove();
			// aToolDiv.append($('<div class="toolTable" id="toolDataTable"></div>'));
		}
	});

	function refreshTable() {
		return new Promise((resolve, reject) => {
			const tableData = [];
			$.post({
				url: "/getMainTable",
				data: { key4id: key4id },
				dataType: "json"
			})
				.done(results => {
					results.forEach((rowData, index) => {
						const oneRow = {};
						oneRow["c-2"] = rowData.position;
						oneRow["c-1"] = rowData.offset;
						oneRow.id = index;
						oneRow.ts = `Turret ${rowData.turret}, Spindle ${rowData.spindle}`;
						for (let c = 0; c < colTitles.length - 2; c++) {
							// terms from cols array: function, type, etc...
							oneRow["c" + c] = rowData.cols[c];
						}
						tableData.push(oneRow);
						// text += [row.turret,row.spindle,row.position,row.offset,row.cols[0],row.cols[1]].join(', ');
					});
					resolve(tableData);
				})
				.fail(error => {
					alert("/getMainTable Error " + JSON.stringify(error, null, 4));
					reject(tableData);
				});
		});
	}
}
// function afterBuilt() {
// 	$(".tabulator-col")
// 		.css("font-size", "14px")
// 		.css("background", "lightblue");
// 	$(".tabulator-frozen").css("background", "lightgreen");
// }
const colTitles = [
	"Position_#",
	"Offset_#",
	"Function",
	"Type",
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
	"Mori_Seiki_TNRC",
	"CRC",
	"Mori Seiki_Command Point",
	"Okuma_TNRC X",
	"Okuma_TNRC Z",
	"Misc Info****",
	"Restart_N#",
	"Turret_Model Holder",
	"Collet_Size/Model",
	"Shank_Dia/Width",
	"ts",
	"id"
];

function defineColumns() {
	const brg_regex = new RegExp("_", "g");
	return colTitles.map((title, index) => {
		switch (title) {
			case "ts": // grouping column
				return {
					title: title,
					field: "c" + index,
					visible: false
				};
				break;
			case "id": // row id
				return {
					field: title,
					visible: false
				};
				break;
			default:
				// other columns, frozen for 0,1,2,3
				const val = {
					// set width
					title: title.replace(brg_regex, "<br/>"),
					field: "c" + (index - 2),
                    frozen: index < 4,
                    headerSort: false,
                    width: 100
				};
                if (index < 4) { val.cssClass = "bottomborder"; }
                if(index === 2 || index === 3) { val.width = 150; }
                if(index <2 ) { val.width = 65; val.cssClass = "pos_off";}
				return val;
		}
	});
}

function defineTable(tableData) {
	const columns = defineColumns();
	return new Tabulator("#toolDataTable", {
		// layout: "fitColumns", //fit columns to width of table (optional)
		pagination: "local",
        paginationSize: 15,
        
		//Define Table Columns
		// first column is checkbox for choosing all the values in the row
		// ts columns for grouping by turret/spindle
		columns: columns,
		movableRows: true,
		groupBy: "ts",
        groupToggleElement: "header",
        height: "100%",
		//
		columnMinWidth: 50,
		data: tableData,
		tableBuilt: function() {
			$(".tabulator-col")
				.css("font-size", "14px")
				.css("background", "lightblue");
			$(".tabulator-frozen").css("background", "lightgreen");
		}
	});
}

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
	console.log("tabs_route " + ev.data);
	return false;
}

function drawMainTab(tab, tab_index) {
	let aTabOuter = $(
		`<div class="tabouter"><div class="tabdiv"><h2 class="tablink">${right_caret} Tab: ${
			tab.tabName
		}</h2></div></div>`
	);
	let aTabDiv = aTabOuter.find(".tabdiv");
	aTabDiv.attr("tab_index", tab_index);
	// aTabDiv.find(".tablink").on("click", [tab_index], tabs_route);
	aTabDiv
		.find(".tablink")
		.on("click", ev => {
			let caret = $(ev.target);

		if (caret.html() === "") { 
			// clicked on svg or path inside of svg
			caret = caret.closest("h2");
		}
			let tabul = caret
				.closest('.tabouter')
				.find(".tabUL");
			if (tabul.css("display") === "none") {
                caret.html(`${down_caret} Tab: ${
                    tab.tabName
                }`);
				tabul.show(
					"slide",
					{
						direction: "left"
					},
					"slow"
				);
			} else {
				caret.html(`${right_caret} Tab: ${
                    tab.tabName
                }`);
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
			`<li><span class="sectionRow sectionlink">${
				section.sectionName
			}</span></li>`
		);
		sectLI.attr("sect_index", sect_index);
		sectLI.on("click", [tab_index, sect_index], tabs_route);
		// let td = $('<td class="left"/>');
		tabUL.append(sectLI);
		// td = $(`<th class="stepcol" >${section.sectionName}</th>`);
		tabUL.append(sectLI);
		let sectUL = $(`<ul/>`);
		sectLI.append(sectUL);
		// tbody.append(tr);
		section.steps.forEach((step, step_index) => {
			let stepLI = $(
				`<li><span class="stepRow steplink">${step.stepName}</span></li>`
			);
			stepLI.attr("step_index", step_index);
			stepLI.on("click", [tab_index, sect_index, step_index], tabs_route);
			sectUL.append(stepLI);
		});
		// if(sect_index !== tab.sections.length-1){ // looks better with some space bellow last section
		sectUL.append($("<br/>")); // insert blank line between sections
		// }
	});

	tabUL.hide();
	$("tab_outlines").append(aTabOuter.append(aTabDiv, tabUL));
}
