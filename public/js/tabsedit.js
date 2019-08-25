"use strict";
/* globals Common, Job, Tab, Section, Step, Util */
// tabsedit.js

// "decorations" for display
const openMark = "&#9658;";
const closeMark = "&#9660;";
const right_caret = '<span class="caret">' + closeMark + "</span>";

const TAB_KEY = 9;
const ENTER_KEY = 13;

const key4id = new Common().getKey4id();

// TODO: Implement? UNDO for Sorts and for Save (both quite hard to do) 9/12/18

jQuery.fn.visible = function () {
	return this.css("visibility", "visible");
};

jQuery.fn.invisible = function () {
	return this.css("visibility", "hidden");
};

function showSave() {
	$("#save_button").visible();
}

function hideSave() {
	$("#save_button").invisible();
}

$(function () {

	const sortableOptions = {
		axis: "y",
		cursor: "move",
		opacity: 0.5,
		cancel: ".empty",
		scroll: true,
		update: showSave
	};


	function deleteItem(e) {
		let li = $(e.target).closest("li");
		li.css("background", "orange");
		li.fadeOut();
		showSave();
		setTimeout(function () {
			li.addClass("deleted");
		}, 800);
	}
	////////////////////////////////////////////////////////////
	function startUp(base) {
		$("title").text("Edit Tabs");
		if (base) {
			// clean up page
			$('top').empty();
			$('job').empty();
			paintPage(base);
			setup(base);
			showSave();
		}
		else {
			Util.getTabsData(key4id).then(data => {
				paintPage(data); // also shows counts from tab_images document for the key4id
				setup(data);
			});
		}
	}
	Util.setUpTabs(key4id, "", {
		tab: false,
		spec: false,
		main: true,
		machine: false,
		tabmenus: false
	}).then(
		() => {
			startUp(null);
		}
	);

	function setup(data) {
		hideSave();
		$(".caret").on("click", e => {
			// open/close display below
			let that = $(e.target);
			let openStr = that.text();
			let ul = that.closest("li").find("ul");

			if (ul.css("display") === "none") { // closed to start
				open_ul(that, openStr, ul);
			} else { // open to start
				close_ul(that, ul);
			}
		});

		$(".trash").on("click", deleteItem); // Delete element
		function close_ul(that, ul) {
			ul.slideUp("fast");
			that.html(openMark);
		}
		function open_ul(that, openStr, ul) {
			ul.slideDown("fast");
			ul.find(".caret").each((index, element) => {
				let str = $(element).text();
				if (str === openStr) {
					$(element)
						.closest("li")
						.find("ul")
						.slideUp(1);
				}
			});

			that.html(closeMark);
		}


		function formatSaveErrors(status) {
			let message = "";
			let tlen = status.tabs.length;
			let slen = status.sections.length;
			if (tlen === 0 && slen === 0) {
				return "No Tabs Have Been Defined!";
			}
			if (tlen > 0) {
				message +=
					tlen +
					" <b>Tab</b>" +
					(tlen !== 1 ? "s</b> have" : "</b> has") +
					" no defined Section(s).";
				message +=
					'<br/><span class="indent">' + status.tabs.join(", ") + "</span>";
				if (slen > 0) {
					message += "<br/><br/>";
				}
			}
			if (slen > 0) {
				message +=
					slen +
					" <b>Section" +
					(slen !== 1 ? "s</b> have" : "</b> has") +
					" no defined Step(s).";
				message +=
					'<br/><span class="indent">' + status.sections.join(", ") + "</span>";
			}
			return message;
		}
		$("#save_button").on(
			"click", // Save button
			e => {
				let doc = {
					_id: key4id,
					user: "unknown", // some day
					tabs: []
				};

				// let createTab = $(e.target).hasClass('createTab');
				$(".jobul > li:not(.deleted)").each((index, tabli) => {
					let tabName = $(tabli)
						.find("div.dflex input")
						.val();
					if (tabName !== undefined && tabName !== "") {
						let tabToSave = {
							tabName: tabName,
							sections: []
						};

						$(tabli)
							.find(".tabul > li.sectionname:not(.deleted)")
							.each((index, sectionli) => {
								let nextSection = $(sectionli).find("div.dflex input");
								if (nextSection.length !== 0) {
									let sectionName = $(sectionli)
										.find("div.dflex input")
										.val();
									// console.log("\tSection val = " + sectionName);
									if (sectionName !== undefined && sectionName !== "") {
										let aSection = {
											sectionName: sectionName,
											steps: []
										};
										$(sectionli)
											.find(".sectionul > li.stepname:not(.deleted)")
											.each((index, stepsli) => {
												let stepName = $(stepsli)
													.find("div.dflex input")
													.val();
												if (stepName !== undefined && stepName !== "") {
													// console.log("\t\tStep NOT EMPTY" + stepName);
													let images_id = $(stepsli).attr("images_id");
													if (images_id === undefined) {
														images_id = null;
													}
													// console.log(images_id);
													aSection.steps.push({
														stepName: stepName,
														images_id: images_id // will be set to null for NEW steps
													});
												}
											});
										tabToSave.sections.push(aSection);
									}
								}
							});
						doc.tabs.push(tabToSave);
					}
				});

				let status = verifyInputs(doc);
				if (status.flag) {
					$.confirm({
						title: "Verification Error on Saving Tabs",
						icon: "fas fa-exclamation-triangle",
						type: "red",
						content: formatSaveErrors(status),
						useBootstrap: false,
						boxWidth: "25%",

						typeAnimated: true,
						buttons: {
							Continue: function () {
								hideSave();
							}
						}
					});
				} else {
					putTabsData(doc).then(
						r => {
							// let finish = true;
							if (r.error !== undefined) {
								// caught error
								$.confirm({
									title: "Error on Saving Tabs",
									icon: "fas fa-exclamation-triangle fa-lg",
									type: "red",
									content: "Contact Supervisor",
									useBootstrap: false,
									boxWidth: "25%",

									typeAnimated: true,
									buttons: {
										Cancel: function () {
											// finish = false;
										}
									}
								});
							} else {
								// success
								hideSave();
								$.confirm({
									title: "Tab(s) Saved",
									icon: "fas fa-thumbs-up fa-lg",
									type: "green",
									content: "",
									autoClose: "OK|3000",
									useBootstrap: false,
									boxWidth: "25%",
									buttons: {
										OK: function () {
											// finish = true;

											// $(e.target)
											// 	.text("Edit Tab(s)")
											// 	.removeClass("createTab");
											// $("#tabupload_button").show();
										}
									}
								});
							}

						},
						e => {
							$.confirm({
								title: "Error on Saving Tabs",
								icon: "fas fa-exclamation-triangle fa-lg",
								type: "red",
								content: e.error,
								useBootstrap: false,
								boxWidth: "25%",

								typeAnimated: true,
								buttons: {
									Cancel: function () { }
								}
							});
						}
					);
				}
			}
		);
		$(".sectionul, .tabul, .jobul").sortable(sortableOptions); // makes elements sortable (moveable at same level)
	}

	function insertNewLi2(e) {
		// click on plus circle icon
		let input = $(e.target)
			.parent()
			.parent()
			.parent()
			.find("input");

		if (input.val() !== "") {
			insertNewLiHelper(input, true);
		}
	}

	function insertNewLiHelper(that, scroll) {

		try {
			// $(".sectionul, .tabul, .jobul").sortable("destroy");
		}
		catch (issue) {
			// ignore errors
		}
		// TODO: sort out scrolling for TABEDIT

		that.val(that.val().toUpperCase()); // force to uppercase
		///////////////////////////////////////////////////////////////////////////
		let myli = that.closest("li"); // can it be null?
		if (that.val() !== "") {
			if (myli.hasClass("stepname")) {
				// a stepname
				myli.before(
					li(that.val(), "f", unique++, "stepname", false, "The Step Name")
				); // inside of containing section
			} else if (myli.hasClass("sectionname")) {
				// a sectionname
				let sectionli = li(
					that.val(),
					"s",
					unique++,
					"sectionname",
					true,
					"The Section Name"
				);
				let sectionul = $('<ul class="sectionul"></ul>');
				sectionli.append(sectionul);

				sectionul.append(
					li("", "f", unique++, "stepname empty", false, "The Step Name")
				); // add single empty step

				myli.before(sectionli); // inside of containing tab
			} else {
				// a tabName
				let tabli = li(
					that.val(),
					"t",
					unique++,
					"tabname",
					true,
					"The Tab Name"
				);
				let tabul = $('<ul class="tabul"></ul>');
				tabul.append(
					li("", "s", unique++, "sectionname empty", false, "The Section Name")
				);
				tabli.append(tabul);
				// tabul.sortable(sortableOptions);
				myli.before(tabli);
				// add a section
			}

			that.val("");
			///////////////////////////////////////////////////////////////////////////

			$(".sectionul, .tabul, .jobul").sortable(sortableOptions);

			showSave();
		}

	}

	function putTabsData(doc) {
		// console.log("putTabsData " + JSON.stringify(doc, null, 4));
		return new Promise((resolve, reject) => {
			$.post({
				url: "/set_tabs",
				data: {
					_id: doc._id, // same as key4id
					doc: JSON.stringify(doc)
				},
				dataType: "json"
			})
				.done(result => resolve(result))

				.fail((request, status, error) => reject(error));
		});
	}

	function createJobObj(aJob, tabs) {
		let jobObj = new Job(aJob, "User");
		tabs.forEach(tab => {
			let aTab = new Tab(tab.tabName);
			if (tab.sections !== undefined) {
				tab.sections.forEach(section => {
					let aSection = new Section(section.sectionName);
					if (section.steps !== undefined) {
						section.steps.forEach(stepObj => {
							aSection.pushStep(new Step(stepObj));
						});
					}
					aTab.pushSection(aSection);
				});
			}
			jobObj.pushTab(aTab);
		});
		return jobObj;
	}

	let unique = 0; // numbering for li items // may not be needed
	function paintPage(jobDoc) {
		// tabs is a single document for one job
		let brandNew = false;
		if (jobDoc.tabs === undefined) {
			// no tabs defined yet in database
			jobDoc = {
				_id: key4id, // a key4id string
				user: "unknown",
				tabs: [] // no tabs to start
			};
			brandNew = true; // $("#setDefaults").visible();
		}

		// Initialize objects from data
		const jobObj = createJobObj(key4id, jobDoc.tabs);

		// create HTML
		const jobdiv = $('job');
		const jobul = $('<ul class="jobul"></ul>');
		let tabs = jobObj.getTabs();
		buildPage(tabs, jobul);

		let topinfo = $(`<span class="pagetitle">Tab Editor</span>
					<span class="jobtitle">Job: ${jobObj.getName()}</span>`);

		let buttons = $(`<div class="controls">
			<button id="save_button" class="mybtn btn-save">Save Changes</button>
			<button id="collapse" class="mybtn control">Collapse</button>
			<button id="openall" class="mybtn control">Open</button>
			<button id="setDefaults" class="mybtn setDefaults">Set Defaults</button>
		</div>`);

		$('top').append(topinfo, buttons);
		if (brandNew) $("#setDefaults").visible().on('click',
		() => {
			startUp(myDefaultData(key4id));
		});

		$('#openall').on('click',
			() => {
				$(".tabul,.sectionul").show().closest('li').find('.caret').html(closeMark);
			});
		$('#collapse').on('click',
			() => {
				$(".tabul,.sectionul").hide().closest('li').find('.caret').html(openMark);
			});
		$('#setDeafults').on('click',
			() => {

				$('#setDeafults').invisible();
			});
		let emptyTab = li(
			"",
			"t",
			unique++,
			"tabname empty",
			false,
			"The Tab Name"
		);
		// why is this needed?
		// jobul.css("margin-top", "-40px");
		jobdiv.append(jobul.append(emptyTab));

	}
	function buildPage(tabs, jobul) {
		// console.log(JSON.stringify(tabs,null,2));
		tabs.forEach(tab => {
			let tabli = li(
				tab.getTabName(),
				"t",
				unique++,
				"tabname",
				true,
				"The TAB Name"
			);
			let tabul = $('<ul class="tabul"></ul>');
			tabli.append(tabul);
			tab.getSections().forEach(section => {
				let sectionli = li(
					section.getSectionName(),
					"s",
					unique++,
					"sectionname",
					true,
					"The Section Name"
				);
				let sectionul = $('<ul class="sectionul"></ul>');
				sectionli.append(sectionul);
				section.getSteps().forEach(step => {
					if (step.getStepName() !== "null") {
						let stepli = li(
							step.getStepName(),
							"f",
							unique++,
							"stepname",
							false,
							"The Step Name"
						);
						stepli.attr("images_id", step.getImagesId());
						sectionul.append(stepli);
					}
				});
				sectionul.append(
					li("", "f", unique++, "stepname empty", false, "The Step Name")
				);
				tabul.append(sectionli);
			});
			tabul.append(
				li("", "s", unique++, "sectionname empty", false, "The Section Name")
			);
			jobul.append(tabli);
		});
	}
	function blurring(e) {
		e.preventDefault();
		console.log("blur", e.target);
		// debugger;
		let target = $(e.target);
		console.log("\ttab\t", target.hasClass('tabstyle'));
		console.log("\tsection\t", target.hasClass('sectionstyle'));
		console.log("\tstep\t", target.hasClass('stepstyle'));
		if (target.hasClass('tabstyle') ||
			target.hasClass('sectionstyle') ||
			target.hasClass('stepstyle')) return;
		if (e.target.tagName === 'INPUT') insertNewLiHelper(target, false);
	}

	function verifyInputs(doc) {
		let errors = {
			flag: null,
			tabs: [],
			sections: []
		};
		if (doc.tabs.length === 0) {
			errors.flag = true; // tabs empty
		}

		return errors;
	}

	function li(name, tag, num, aClass, addCaret, title) {
		if (name === null) {
			// as yet unsaved/undefined Tab, Section or Step

			let fclass = "dflexempty";

			let result =
				'<li id="' +
				tag +
				"_" +
				num +
				'" class="ui-state-default ' +
				aClass +
				'"><div class="' +
				fclass +
				'">';
			if (addCaret) {
				result += right_caret;
			}
			let place = aClass.substr(0, aClass.indexOf("name"));
			place =
				"&rarr;&nbsp;Complete this " +
				place.charAt(0).toUpperCase() +
				place.substr(1);
			let input =
				'<input class="emptyinput truncate" style="text-transform: uppercase;" placeholder="' +
				place +
				'" type="text" title="' +
				title +
				'"/>';
			result += input;
			result +=
				'<span align-self="flex-end" class="arrow"><i  class="fas fa-arrows-alt-v"></i></span>';

			result += "</div>";
			result = $(result); // a jQuery object
			// result.on('keydown', insertNewLi);
			if (result.find(".addcircle")) {
				// if(aClass.indexOf('step') !== -1) {
				//     result.find('input').on('keydown', insertNewLi);
				// }
				// console.log(result.find('input')[0]);
				result.find("input")
					.on("keydown", handleTabOrEnter)
					.on("blur", blurring);

				result.find(".addcircle").on("click", insertNewLi2);
			}
			return result;
		} else {
			let inputClass = "stepstyle";
			if (aClass.indexOf("section") !== -1) {
				inputClass = "sectionstyle";
			} else if (aClass.indexOf("tab") !== -1) {
				inputClass = "tabstyle";
			}
			let fclass = "dflex";
			if (name === "") {
				fclass = "dflexempty";
			}
			let result =
				'<li id="' +
				tag +
				"_" +
				num +
				'" class="ui-state-default ' +
				aClass +
				'"><div class="' +
				fclass +
				'">';
			if (addCaret) {
				result += right_caret;
			}
			let input;
			if (name === "") {
				let place = aClass.substr(0, aClass.indexOf("name"));
				place =
					"&rarr;&nbsp;Add a " +
					place.charAt(0).toUpperCase() +
					place.substr(1);

				input =
					'<input class="emptyinput truncate" style="text-transform: uppercase;" placeholder="' +
					place +
					'" type="text" title="' +
					title +
					'"/>';
			} else {
				input =
					'<input style="text-transform: uppercase;" class="truncate ' +
					inputClass +
					'" type="text" title="' +
					title +
					'" value="' +
					name +
					'"/>';
			}
			result += input;

			if (name !== "") {
				result += '<span class="trash">X</span>';
				result +=
					'<span align-self="flex-end" class="arrow"><i  class="fas fa-arrows-alt-v"></i></span>';
			} else {
				result +=
					'<span align-self="center" class="addcircle adddiv"><i class="fas fa-plus-circle"></i></i></span>';
			}

			result += "</div>";
			result = $(result);
			result.find('.trash').on('click', deleteItem);

			if (result.find(".addcircle")) {
				if (name === "") {
					result.find("input").on("keydown", handleTabOrEnter);
				} else {

					result
						.find("input")
						.on("click", inputClick)
						.on("dblclick", inputDoubleClick)
						.on("change", showSave);

				}
				result.find(".addcircle").on("click", insertNewLi2);
			}
			result.find("input")
				.on("blur", blurring);
			return result;
		}
	}

	function handleTabOrEnter(ev) {
		switch (ev.which) {
			case TAB_KEY:
			case ENTER_KEY:
				if ($(this).val().length > 0) {
					ev.preventDefault();
					insertNewLiHelper($(this), true);
				}
				break;
			default:
				// any other key is NOT Ignored
				break;
		}
	}

	$.fn.setCursorPosition = function (pos) {
		this.each(function (index, elem) {
			if (elem.setSelectionRange) {
				elem.setSelectionRange(pos, pos);
			} else if (elem.createTextRange) {
				var range = elem.createTextRange();
				range.collapse(true);
				range.moveEnd("character", pos);
				range.moveStart("character", pos);
				range.select();
			}
		});
		return this;
	};
	$.fn.selectRange = function (start, end) {
		var e = $(this);
		if (!e) {
			return;
		} else if (e.setSelectionRange) {
			e.focus();
			e.setSelectionRange(start, end);
		} /* WebKit */ else if (e.createTextRange) {
			var range = e.createTextRange();
			range.collapse(true);
			range.moveEnd("character", end);
			range.moveStart("character", start);
			range.select();
		} /* IE */ else if (e.selectionStart) {
			e.selectionStart = start;
			e.selectionEnd = end;
		}
	};

	function inputClick(ev) {
		ev.stopPropagation();
		let that = $(this);
		that.focus();
		that.setCursorPosition(that.val().length);
	}

	function inputDoubleClick(ev) {
		ev.stopPropagation();
		$(this).focus();
		this.setSelectionRange(0, $(this).val().length);
	}
	function myDefaultData(_id) {
		const data = {
			"_id": "JOBID",
			"user": "unknown",
			"tabs": [
				{
					"tabName": "COMMENTS",
					"sections": [
						{
							"sectionName": "COMMENTS",
							"steps": []
						}
					]
				},
				{
					"tabName": "DEBURR AND PART STORAGE",
					"sections": [
						{
							"sectionName": "DEBURR",
							"steps": []
						},
						{
							"sectionName": "PART STORAGE",
							"steps": []
						}
					]
				},
				{
					"tabName": "INSPECTION",
					"sections": [
						{
							"sectionName": "INSPECTION",
							"steps": [
								{
									"stepName": 'PART PICTURE',
									"images_id": null
								}
							]
						},
						{
							"sectionName": "CHECK DEMIONSIONS",
							"steps": []
						}
					]
				},
				{
					"tabName": "KNOWN ISSUES",
					"sections": [
						{
							"sectionName": "KNOWN ISSUES",
							"steps": []
						}
					]
				},
				{
					"tabName": "OFFSETS",
					"sections": [
						{
							"sectionName": "OFFSETS",
							"steps": [	
								{
									"stepName": 'GEOMETRY',
									"images_id": null
								},
								{
									"stepName": 'WEAR',
									"images_id": null
								},
								{
									"stepName": 'WORK',
									"images_id": null
								}
							]
						}
					]
				},
				{
					"tabName": "SET UP SHEET COMMENTS",
					"sections": [
						{
							"sectionName": "M0'S",
							"steps": []
						},
						{
							"sectionName": "CYCLE TIME",
							"steps": []
						},
						{
							"sectionName": "MATERIAL",
							"steps": []
						}
					]
				},
				{
					"tabName": "TOOLING AND FIXTURES",
					"sections": [
						{
							"sectionName": "CLAMPING TYPES",
							"steps": []
						},
						{
							"sectionName": "JOB BOX",
							"steps": []
						},
						{
							"sectionName": "PART STICK OUT",
							"steps": []
						}
					]
				}
			]
		};
		data._id = _id;
		return data;
	}
});
