"use strict";
/* globals Common, Util */
// ftedits.js

const COMMON = new Common();
const key4id = COMMON.getKey4id();
const SECTION = "Tools";
let existingValues = {};

// jQuery.fn.visible = function() {
// 	return this.css("visibility", "visible");
// };

// jQuery.fn.invisible = function() {
// 	return this.css("visibility", "hidden");
// };
// var debug = false;

// function debugLog(text) {
//     if (debug) {
//         console.log(text);
//     }
// }

$(function() {
	function disableSubmitButton(disabled) {
		if (disabled) {
			// disable button
			$(".ftSubmit")
				.prop("disabled", "disabled")
				.removeClass("submitOn");
		} else {
			// enable button
			$(".ftSubmit")
				.prop("disabled", false)
				.addClass("submitOn");
		}
	}

	function updateFieldsAndTypes(ev) {
		ev.preventDefault();
		// validate values !! no nulls
		let old = [];
		let nowNew = [];
		var evMod = jQuery.extend(true, {}, existingValues); // a deep copy
		Object.keys(evMod).forEach(link => {
			let ret = evMod[link].f_change || evMod[link].t_change;
			if (ret) {
				if (evMod[link].function === "") {
					nowNew.push(link);
					// now, modify the existing values
					evMod[link].function = $("#" + idStr(link, "function")).val();
					evMod[link].type = $("#" + idStr(link, "type")).val();
				} else {
					// now, modify the existing values
					evMod[link].function = $("#" + idStr(link, "function")).val();
					evMod[link].type = $("#" + idStr(link, "type")).val();
					old.push(link);
				}
			}
			// evMod[link] now has all the editing/changed values for link
			//return true;
		});
		let old_some_empty = old.some(link => hasEmptyString(evMod, link));
		let new_some_empty = nowNew.some(link => hasEmptyString(evMod, link));
		if (old_some_empty || new_some_empty) {
			alert("Must have both a non-empty Function and Type Name.");
		} else {
			let newPromises = nowNew.map(link => updateFT(evMod[link], true));
			let oldPromises = old.map(link => updateFT(evMod[link], false));
			// alert("new " + newPromises.length);
			// alert("old " + oldPromises.length);
			Promise.all(newPromises.concat(oldPromises)).then(
				complete => {
					if (!complete[0].status) {
						alert("Unable to complete updates.");
					}
					//alert("complete status " + complete[0].status);
					window.location = window.location.href + "?eraseCache=true";
					//window.location.reload(true);
				},
				() => {
					// error
					//alert("error " + JSON.stringify(error));
					//window.location.reload(true);
					window.location = window.location.href + "?eraseCache=true";
				}
			);
		}
	}

	function hasEmptyString(evMod, link) {
		// check evMod for empty values
		return evMod[link].function === "" || evMod[link].type === "";
	}

	function updateFT(fields, addFiles) {
		fields.key4 = key4id;
		fields.addFiles = addFiles;
		fields.tab = SECTION;
		// alert("updateFT " + fields.key4 + " " + fields.function);
		return new Promise((resolve, reject) => {
			$.ajax({
				url: "/updateFT",
				type: "post",
				data: fields,
				datatype: "json",
				"Content-Type": "application/json"
			})
				.done(result => {
					resolve(result);
				})
				.fail((request, status, error) => reject(error));
		});
	}

	////////////////////////////////////////////////////////////
	Util.setUpTabs(key4id, "", {}).then(() => {
		disableSubmitButton(true);
		$("#job").html(COMMON.jobTitle());
		let parsedCookie = COMMON.getParsedCookie();
		Util.getMachineSpec(parsedCookie.machine).then(machineSpecs => {
			Util.getSheetTags(parsedCookie, SECTION).then(toolData => {
				paintPage(machineSpecs, toolData);
				$(".ftSubmit").on("click", updateFieldsAndTypes);
			});
		});
	});

	////////////////////////////////////////////////////////////

	function paintPage(machineSpecs, toolData) {
		let table = $('<table class="inputTable" id="setup"/>');
		let thead = $("<thead></thead>");
		let tr =
			'<tr id="#eftrow">' +
			'<td colspan="2"><a class="backbutton" href="/tabs/upload.html">&#8592;&nbsp;Back to Tool Uploads&nbsp;</a></td>' +
			'<td id="submitTd" colspan="2"><button class="ftSubmit">Submit</button></td></tr>';
		thead.append($(tr));
		tr = $('<tr class="colnames"/>');
		let columns = [
			// title and class
			["Position<br/>#", "pCol"],
			["Offset<br/>#", "oCol"],
			["Function", "fCol"],
			["Type", "tCol"]
		];
		columns.forEach(head => {
			tr.append($("<th " + 'class="' + head[1] + '"/>"').html(head[0]));
		});

		thead.append(tr);
		table.append(thead);
		let tbody = $("<tbody></tbody>");
		toolData.forEach(tDoc => {
			existingValues[
				[tDoc.turret, tDoc.position, tDoc.spindle, tDoc.offset].join("_")
			] = tDoc;
		});

		["Turret1", "Turret2"].forEach(turretStr => {
			if (machineSpecs[turretStr] !== undefined) {
				doRows(machineSpecs, turretStr, "Spindle1", tbody);
				if (machineSpecs[turretStr].Spindle2 !== undefined) {
					doRows(machineSpecs, turretStr, "Spindle2", tbody);
				}
			}
		});
		table.append(tbody);
		$("content").append(table);
		$("tr#eftrow").css("background", "green");
	}

	function groupSeparator(table) {
		let tr = $('<tr class="sep"/>');
		tr.append(
			$(
				'<td class="digit"/></td><td class="digit"/></td><td class="sep"></td><td class="sep"></td>'
			)
		);
		table.append(tr);
	}

	function doRows(specs, turretStr, spindleStr, tbody) {
		groupSeparator(tbody);
		let tr = $('<tr class="greyrow"/>');
		tr.append(
			$('<th class="digit "/>' + turretStr + "</th>"),
			$('<th class="digit "/>' + spindleStr + "</th>")
		);

		tbody.append(tr);

		let lowT = specs[turretStr].range[0];
		let highT = specs[turretStr].range[1];
		let lowS = specs[turretStr][spindleStr][0];
		let numT = Util.numsOf(turretStr);
		let numS = Util.numsOf(spindleStr);
		for (var t = lowT, s = lowS; t <= highT; t++, s++) {
			let link = [numT, t, numS, s].join("_");
			if (existingValues[link] === undefined) {
				existingValues[link] = {
					function: "",
					type: "",
					turret: parseInt(Util.numsOf(turretStr)),
					position: t,
					spindle: parseInt(Util.numsOf(spindleStr)),
					offset: s,
					f_change: false,
					t_change: false
				};
			} else {
				existingValues[link].f_change = false;
				existingValues[link].t_change = false;
			}
			// a row
			let tr = $('<tr class="spaces"/>');
			tr.attr("id", [[turretStr, t, spindleStr, s].join("_")]);

			// Turret column
			let td = $('<td class="digit"/>');
			td.text(t);
			tr.append(td);

			// Spindle column
			td = $('<td class="digit"/>');
			td.text(s);
			tr.append(td);

			// Function Name column
			td = $("<td/>");
			let f_input = $('<input class="finput" name="function" type="text"/>');
			f_input
				.attr("id", idStr(link, "function"))
				.val(existingValues[link].function)
				.on("input", null, "f_change", inputChanges);

			td.append(f_input);
			tr.append(td);

			// Type Name column
			td = $("<td/>");
			let t_input = $('<input class="tinput" name="type" type="text"/>');
			t_input
				.attr("id", idStr(link, "type"))
				.val(existingValues[link].type)
				.on("input", null, "t_change", inputChanges);

			td.append(t_input);
			tr.append(td);

			tbody.append(tr);
		}
	}

	function inputChanges(ev) {
		// called from type and function input text elements
		let now = $(this).val();
		ev.preventDefault();

		let ids = $(this)
			.attr("id")
			.split("_");
		let inputId = ids.shift();
		let link = ids.join("_");
		if (existingValues[link][inputId] !== now) {
			//disableSubmitButton('false'); // enables button
			$(this)
				.parent()
				.addClass("changed");
			existingValues[link][ev.data] = true;
		} else {
			$(this)
				.parent()
				.removeClass("changed");
			existingValues[link][ev.data] = false;
		}
		checkForChanges();
	}

	function checkForChanges() {
		let change = Object.keys(existingValues).some(
			link => existingValues[link].f_change || existingValues[link].t_change
		);

		disableSubmitButton(!change);
	}

	function idStr(idFields, tag) {
		// returns input element id for a given turret, spindle, tnum, snum, and type(tag)
		let arr;
		if (Util.isString(idFields)) {
			arr = idFields.split("_");
		} else {
			arr = idFields.slice(); // copies array at top level
		}

		if (arr.length === 5) {
			arr.shift();
		}

		arr[0] = arr[0].replace(/^Turret|^Spindle/, "");
		arr[2] = arr[2].replace(/^Turret|^Spindle/, "");
		return tag + "_" + arr.join("_");
	}
});
