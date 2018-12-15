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

$(function() {
	// example!! const key4id = 'LATHE|69-37869-2|30|ZL253-1';
	const sortableOptions = {
		axis: "y",
		cursor: "move",
		opacity: 0.5,
		cancel: ".empty",
		scroll: true,
		update: showSave
	};

	function showSave() {
		$("#save_button").css("visibility", "visible");
	}

	function hideSave() {
		$("#save_button").css("visibility", "hidden");
	}
	////////////////////////////////////////////////////////////

	$("title").text("Edit Tabs");

	Util.getTabsData(key4id).then(data => {
		paintPage(data); // also shows counts from tab_images document for the key4id
		setup(data);
	});

	function setup(data) {
		$("spin").css("visibility", "hidden");
		hideSave();
		$("#nav_1").append(
			$(
				'<button id="home_button" class="navButton"><img src="/img/Ott.jpg" alt="Home" class="imageButton"></button>'
			)
		);
		$("#nav_2").append(
			$(
				'<button id="tabupload_button" class="navButton"><i class="fas fa-upload fa-lg"></i>&nbsp;&nbsp;Upload Images</button>'
			)
		);
		$("#nav_3").html("");
		$("#nav_4").append(
			$(
				'<button id="run" class="navButton" type="button"><i class="fas fa-bolt fa-lg"></i>&nbsp;&nbsp;Main</button>'
			)
		);

		$("#nav_2 .navButton").on("click", () => {
			Util.openInSameTab("/tabs/tab_upload.html");
		});
		$("#nav_1 .navButton").on("click", () => {
			Util.openInSameTab("/");
		});
		$("#nav_4 .navButton").on("click", () => {
			Util.openInSameTab("/tabs/main.html");
		});
		if (data.tabs === undefined) {
			$("#tabupload_button").hide();
		}

		$(".caret").on("click", e => {
			// open/close display below
			let that = $(e.target);
			let openStr = that.text();
			let ul = that.closest("li").find("ul");

			if (ul.css("display") === "none") {
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
			} else {
				ul.slideUp("fast");
				that.html(openMark);
			}
		});

		$(".trash").on("click", deleteItem); // Delete element

		

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
													let images_id;
													if ($(stepsli).attr("images_id") === undefined) {
														images_id = null;
													} else {
														images_id = $(stepsli).attr("images_id");
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
						title: "Error on Saving Tabs",
						icon: "fas fa-exclamation-triangle",
						type: "red",
						content: formatSaveErrors(status),
						useBootstrap: false,
						boxWidth: "25%",

						typeAnimated: true,
						buttons: {
							Continue: function() {
								hideSave();
							}
						}
					});
				} else {
					putTabsData(doc).then(
						r => {
							let finish = true;
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
										Cancel: function() {
											finish = false;
										}
									}
								});
							} else {
								// success

								$.confirm({
									title: "Tab(s) Saved",
									icon: "fas fa-thumbs-up fa-lg",
									type: "green",
									content: "",
									autoClose: "OK|3000",
									useBootstrap: false,
									boxWidth: "25%",
									buttons: {
										OK: function() {
											finish = true;
											$(".newJob").hide();
											$(e.target)
												.text("Edit Tab(s)")
												.removeClass("createTab");
											$("#tabupload_button").show();
										}
									}
								});
							}
							if (finish) {
								hideSave();
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
									Cancel: function() {}
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
			insertNewLiHelper(input);
		}
	}

	function insertNewLiHelper(that) {
		$(".sectionul, .tabul, .jobul").sortable("destroy");
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
			// myli.closest('ul').sortable('refresh');
			that.val("");
			///////////////////////////////////////////////////////////////////////////
			$(".sectionul, .tabul, .jobul").sortable(sortableOptions);
			showSave();
		}
	}

	function putTabsData(doc) {
		console.log("putTabsData " + JSON.stringify(doc, null, 4));
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
			brandNew = true;
		}

		// Initialize objects from data
		let jobObj = createJobObj(key4id, jobDoc.tabs);

		// create HTML
		$("content").empty();

		let top = $('<div id="top"></div>');

		let jobdiv = $('<div id="job"></div>');
		let jobul = $('<ul class="jobul"></ul>');
		jobObj.getTabs().forEach(tab => {
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
		let pageTitle = $('<span class="pagetitle">Tab Editor</span>');
		let jobTitle = $("<span/>").html("Job: " + jobObj.getName());
		let button = $('<button id="save_button">Save Changes</button>');
		let bdiv = $("<div/>");
		if (brandNew) {
			let rarr = $('<span class="newJob">&nbsp;&rarr;</span>');
			button.text("Create Tabs");
			button.addClass("createTab");
			bdiv.append(rarr, button);
		} else {
			bdiv.append(button);
			button.removeClass("createTab");
		}
		top.append(pageTitle, jobTitle, bdiv);
		let emptyTab = li(
			"",
			"t",
			unique++,
			"tabname empty",
			false,
			"The Tab Name"
		);

		$("content").append(top, jobdiv.append(jobul.append(emptyTab)));
	}

	// function openInSameTab(url) {
	//     let existingWindow = window.open(url, '_self');
	//     existingWindow.focus();
	// }

	function verifyInputs(doc) {
		let errors = {
			flag: null,
			tabs: [],
			sections: []
		};
		if (doc.tabs.length === 0) {
			errors.flag = true; // tabs empty
		}

		// per Jeff, allow others to be empty -- may need other adjustments for DB
		// TODO: check that empties work ok
		// console.log('job has tabs');
		// if (!errors.flag) {
		//     doc.tabs.forEach(
		//         (tab /*, i*/ ) => {
		//             if (tab.sections.length === 0) {
		//                 errors.flag = true;
		//                 errors.tabs.push(tab.tabName); // tabs not empty
		//             }
		//             // console.log(i + ' has sections');
		//             tab.sections.forEach(
		//                 (section /*, j*/ ) => {
		//                     if (section.steps.length === 0) {
		//                         errors.flag = true;
		//                         errors.sections.push(section.sectionName); // sections not empty
		//                     }
		//                     // console.log(j + ' has steps');
		//                 }
		//             );
		//         }
		//     );
		// }
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
				'<input class="emptyinput" placeholder="' +
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
				result.find("input").on("keydown", handleTabOrEnter);
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
					'<input class="emptyinput" placeholder="' +
					place +
					'" type="text" title="' +
					title +
					'"/>';
			} else {
				input =
					'<input class="' +
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
			// result.on('keydown', insertNewLi);
			if (result.find(".addcircle")) {
				// if(aClass.indexOf('step') !== -1) {
				//     result.find('input').on('keydown', insertNewLi);
				// }
				// console.log(result.find('input')[0]);
				if (name === "") {
					result.find("input").on("keydown", handleTabOrEnter);
				} else {
					// $('body').on('keydown', foo);
					result
						.find("input")
						.on("click", inputClick)
						.on("dblclick", inputDoubleClick)
						.on("change", showSave);
					// result.find('input').on('keydown', foo);
				}
				result.find(".addcircle").on("click", insertNewLi2);
			}
			return result;
		}
	}

	function handleTabOrEnter(ev) {
		switch (ev.which) {
			case TAB_KEY:
			case ENTER_KEY:
				if ($(this).val().length > 0) {
					ev.preventDefault();
					insertNewLiHelper($(this));
				}

				break;

			default:
				// any other key is NOT Ignored
				break;
		}
	}

	$.fn.setCursorPosition = function(pos) {
		this.each(function(index, elem) {
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
	$.fn.selectRange = function(start, end) {
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
		// $(this).focus(); //.selectRange(0, $(this).val().length);
		that.focus();
		that.setCursorPosition(that.val().length);
		// that.selectionStart = that.selectionEnd = that.val().length - 1;
		// console.log('click ' + that.selectionStart + " " + that.selectionEnd);
		// alert("click");
	}

	function inputDoubleClick(ev) {
		ev.stopPropagation();
		// $(this).focus(); //.selectRange(0, $(this).val().length);
		$(this).focus();
		this.setSelectionRange(0, $(this).val().length);
		// console.log('dblclick ' + this.selectionStart + " " + this.selectionEnd);
	}

	// function foo(ev) {

	//     //alert("keydown");
	// }
});

function deleteItem(e) {
    let li = $(e.target).closest("li");
    li.css("background", "orange");
    li.fadeOut();
    showSave();
    setTimeout(function() {
        li.addClass("deleted");
    }, 800);
}
