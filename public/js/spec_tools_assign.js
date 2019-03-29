"use strict";

/* globals Common, Util */
// spec_tools_assign.js :: Assing terms to one Job

const COMMON = new Common();
const key4id = COMMON.getKey4id();
const key5 = COMMON.getParsedCookie();

let SPEC_TYPE;
let spec_type;

// Read a page's GET URL variables and return them as an associative array.
function getUrlVars() {
	var vars = [],
		hash;
	var hashes = window.location.href
		.slice(window.location.href.indexOf("?") + 1)
		.split("&");
	for (var i = 0; i < hashes.length; i++) {
		hash = hashes[i].split("=");
		vars.push(hash[0]);
		vars[hash[0]] = hash[1];
	}
	return vars;
}
$(function() {
	SPEC_TYPE = getUrlVars()["spec_type"]; // 'Hand' or 'Inspection'
	if (SPEC_TYPE === undefined) {
		SPEC_TYPE = $("spec_type").text();
	}
	const STYPE = SPEC_TYPE + " " + "Tools";
	spec_type = SPEC_TYPE.toLowerCase() + "_tools"; // hand_tools or inspection_tools
	$("title").html(`${STYPE} Assign`);
	const jobTitle = [
		key5.partId,
		key5.pName,
		key5.dept,
		key5.op,
		key5.machine
	].join(" : ");
	$("pageheader").append(
		$(
			`<h1 class="pageTitle">Assign <u>${STYPE}</u> Terms</h1>
            <h3 class="jobTitle">Job: ${jobTitle}</h3>`
		)
	);

	Util.setUpTabs(key4id, "", {
		tab: true,
		spec: true,
		main: true,
		machine: true,
		tabmenus: false
	}).then(() => {
		setup();

		$("#submit").on("click", () => {
			const terms = [];
			$("#undo_redo_to > option").each((index, ele) =>
				terms.push($(ele).text())
			);
			updateJobToolTerms(terms).then(() => {
				// confirm;
			});
		});
		$("#reset").on("click", e => {
			setup();
			$("#reset").blur();
		});
		$("#cancel").on("click", () => {
			$("#home_button").trigger("click");
		});
	});
});

function setup() {
	const left = $("#undo_redo").empty();
	const right = $("#undo_redo_to").empty();
	getAllToolNames().then(async name_counts => {
		let index = 0;
		let jobTerms = await getJobToolTerms();
		let haveData = false;
		if (jobTerms) {
			if (jobTerms[spec_type] !== undefined) {
				jobTerms[spec_type].forEach(rightTerm => {
					const option = $(`<option value="${index++}">${rightTerm}</option>`);
					right.append(option);
				});
				haveData = true;// this spec_type has assigned terms for this Job
			}
		}
		if (!haveData) { // treat right side as empty
			jobTerms = {};
			jobTerms[spec_type] = [];
		}
		name_counts.forEach(item => {
			if (!jobTerms[spec_type].includes(item.term)) { // pout "other" terms on left
				const option = $(`<option value="${index++}">${item.term}</option>`);
				left.append(option);
			}
		});
		$("#undo_redo").multiselect({
			keepRenderingSort: true
		});
	});
}

function getAllToolNames() {
	return new Promise((resolve, reject) => {
		$.get({
			url: `/getAllToolNames/${spec_type}`,
			datatype: "json"
		}).done(success => {
			resolve(success); // [{"term":"ALLEN KEY","count":2},{"term":"AX","count":0},...]
		});
	});
}

function getJobToolTerms() {
	return new Promise((resolve, reject) => {
		$.post({
			url: "/getJobToolTerms",
			datatype: "json",
			data: {
				jobId: key4id,
				spec_type: spec_type
			}
		}).done(success => {
			resolve(success); // [{"term":"ALLEN KEY","count":2},{"term":"AX","count":0},...]
		});
	});
}

function updateJobToolTerms(terms) {
	return new Promise((resolve, reject) => {
		$.post({
			url: "/updateJobToolTerms",
			datatype: "json",
			data: {
				jobId: key4id,
				spec_type: spec_type,
				terms: terms
			}
		}).done(success => {
			console.log("updateJobToolTerms", success);
			resolve(success);
		});
	});
}
