"use strict";
/* globals Common, Util */
// spec_tools.js :: view/?edit hand and inspection tools

const COMMON = new Common();
const key4id = COMMON.getKey4id();
const key5 = COMMON.getParsedCookie();
let SPEC_TYPE;

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
let defaultIndex = 0; // will use first image found if no primary found
let thePrimary = null;
let fotorama;
let allInfo;
const IMAGES = {};
$(function() {
	SPEC_TYPE = getUrlVars()["spec_type"]; // 'Hand' or 'Inspection'
	if (SPEC_TYPE === undefined) {
		SPEC_TYPE = $("spec_type").text();
	}
	const STYPE = SPEC_TYPE + " " + "Tools";
	$("title").html(`${STYPE}`);
	const getImages = () => {
		return new Promise((resolve, reject) => {
			$.post({
				url: "/get_spec_image_filerefs",
				dataType: "json",
				data: {
					spec_type: SPEC_TYPE,
					jobId: key4id
				}
			})
				.done(result => {
					resolve(result);
				})
				.fail(error => {
					reject(error);
				});
		});
	};

	const jobTitle = COMMON.jobTitle();
		
	const ta = $("textarea.comment");
	$("#topOfPage button").on("click", e => {
		// make an image the Primary
		e.preventDefault();
		const af = fotorama.activeFrame;
		thePrimary = fotorama.activeIndex;
		$.post({
			// reset primary image in database
			url: "/set_spec_images_primary",
			dataType: "json",
			data: {
				spec_type: spec_type_id(),
				filename: af.filename,
				dir: af.dir,
				term: af.term
			}
		})
			.done(result => {
				IMAGES[af.term].forEach(
					// reset primary image in IMAGES object, fileRefs array
					(aRef, index) => {
						aRef.primary = index === thePrimary;
					}
				);
				setActive(true);
			})
			.fail(error => {
				alert("mongo update error for primary change");
			});
	});
	// function havePrimary(index) {
	// 	return (
	// 		Object.keys(catPrimary).find(term => catPrimary[term] === index) !==
	// 		undefined
	// 	);
	// }

	// ta.on('change', () => {
	//     $(this).height(0).height(this.scrollHeight);
	// });
	Util.setUpTabs(key4id, SPEC_TYPE, {
		tab: true,
		spec: true,
		main: true,
		machine: true,
		tabmenus: false
	}).then(tabs => {
		$("#pageheader").append(
			$(
				`<h1 class="pageTitle">${STYPE}</h1>&nbsp;&nbsp;<select name="section" id="section"></select>
				<h3 class="jobTitle">${jobTitle}</h3>`
			)
		);
		ta.hide();
		// const images = []; // array of image objects
		// let index = 0;
		const known = {}; // keys will be the terms for this Job

		// let startSection;
		$("#section").css("visibility", "hidden");
		getImages(key4id).then(async termsArray => {
			// [{term, [fileRefs]}]
			allInfo = termsArray;
			if (termsArray === null) {
				$("body").append(
					$(
						`<h1 class="no_image_message">There are no ${STYPE} images<br/>for this Job.</h1>`
					)
				);

				return;
			}
			$("#section").css("visibility", "visible"); // the selector
			// process all the terms with fileRefs
			let showSection = null;

			termsArray.forEach(item => {
				// already sorted
				let { term, files } = item;
				IMAGES[term] = files; // an array of fileRefs
				// console.log(files);
				if (showSection === null) showSection = term;
				if (known[term] === undefined) {
					$("#section").append($(`<option>${term}</option>`));
					known[term] = true;
				}
			});
			$("#section").on("change", async () => {
				const selectedTerm = $("#section option:selected").text();
				await loadStuff(selectedTerm);
			});

			$("#section")
				.val(showSection)
				.trigger("change");
		});
	});
});
function taInput(e) {
	if ($(this).hasClass("initial")) {
		console.log("ta change initial");
		$(this).removeClass("initial");
		// show save button
		$(".commentsave, .commentcancel").css("visibility", "visible");
	}
	// else {
	// 	console.log("ta input");
	// }
}

const spec_type_id = () => SPEC_TYPE.toLowerCase() + "_tools";

const commentToDb = (text) => {
	const fa = fotorama.activeFrame;
	const selectedTerm = $("#section option:selected").text();
	const dir = fa.dir;
	const filename = fa.filename;
	
	return new Promise((resolve, reject) => {
		$.post({
			url: "/update_spec_image_comment",
			dataType: "json",
			data: {
				spec_type: spec_type_id(),
				term: selectedTerm,
				text: text,
				dir: dir,
				filename: filename
			}
		})
			.done(result => {
				resolve(result);
			})
			.fail(error => {
				reject(error);
			});
	});
};

function saveComment(e) {
	commentToDb($('#ta').val()).then(() => {
		afterCommentEdit()
	});
}

function afterCommentEdit() {
	$(".commentsave, .commentcancel").css("visibility", "hidden");
	$("#ta").addClass("initial");
}

function restoreComment(e) {
	const fa = fotorama.activeFrame;
	const ta = $("#ta");

	if (fa.comment === null) {
		ta.val("");
	} else if (fa.comment !== ta.val()) {
		ta.val(fa.comment);
	}
	afterCommentEdit();
}

async function loadStuff(section) {
	let primary = 0; // default image to show if primary is not identified
	$("content").empty().append(`
		
		<button id="taSave" class="commentsave btn-primary">Save Changed Comment</button>
		<button id="taCancel" class="commentcancel btn-secondary">Cancel</button>
		<textarea id="ta" class="comment"></textarea>
				<div id="fotorama" 
					class="fotorama" 
					data-auto="false"
					data-nav="thumbs" 
					data-width="100%" 
					data-transition="crossfade" 
					data-max-height="83%" 
					data-max-width="100%">
				</div>`);
	const ta = $("#ta").on("input", taInput);
	$("#taSave").on("click", saveComment);
	$("#taCancel").on("click", restoreComment);
	const $fotoramaDiv = $("#fotorama")
		// Listen to the events
		.on(
			"fotorama:load fotorama:showend", // Stage image of some frame is loaded
			fotofunc
		)
		.fotorama({
			spinner: {
				lines: 13,
				color: "rgba(0, 0, 255, .75)"
			}
		});
	fotorama = $fotoramaDiv.data("fotorama");
	const toShow = IMAGES[section] // array of filerefs
		.map((afRef, index) => {
			if (afRef.primary) {
				// primary = index;
				thePrimary = index;
				ta.val(afRef.comment);
			}
			return {
				img: relFileRef(afRef),
				thumb: relFileRef(afRef, "_small"),
				comment: afRef.comment,
				term: section,
				dir: afRef.dir,
				filename: afRef.filename,
				primary: afRef.primary ? true : false
			};
		});
	let hideThumbs = false;
	if (toShow.length === 1) {
		// fix crash in fotorama when only one image, add "fake" last image
		// and then hide thumbnails after rendering
		toShow.push({
			img: "/img/placeholder.png",
			thumb: "/img/empty.png",
			comment: null,
			term: section,
			primary: null
		});
		hideThumbs = true;
	}
	await fotorama.load(toShow);
	await fotorama.show(thePrimary);
	if (hideThumbs) {
		$(".fotorama__nav-wrap").addClass("ignore"); // hides thumbnails
	}
}

const fotofunc = (e, fotorama, extra) => {
	const fa = fotorama.activeFrame;
	const ta = $("#ta");
	$(".commentsave, .commentcancel").css("visibility", "hidden");
	ta.addClass("initial")
		.text("")
		.hide();
	if (fa.comment !== null) {
		if (fa.primary) {
			ta.addClass("primaryComment");
		} else {
			ta.removeClass("primaryComment");
		}

		setTimeout(() => {
			ta.val(fa.comment).show();
			// delay may be needed to allow width and text to adjust
			ta.height(0).height(ta[0].scrollHeight);
		}, 1);
	}

	const stageFrame = $(fa.$stageFrame[0]);
	const img = $(stageFrame).find("img");
	const imageWidth = parseInt(img.css("width"));
	const windowWidth = $(window).width();
	const commentWidth = Math.floor((windowWidth - imageWidth) * 0.4);
	ta.css("width", commentWidth + "px");
	// $("#section").val(fa.term);
	setActive(fa.primary);
};

function relFileRef(afRef, tag) {
	return afRef.dir + (tag ? tag : "") + "/" + afRef.filename;
}

function setActive(isPrimary) {
	if (isPrimary === null) {
		$("#topOfPage button").css("display", "none");
		$("#defaultIndicator").css("display", "none");
	} else {
		if ($("#defaultIndicator").css("display") === "block" && isPrimary) {
			$("#defaultIndicator").css("background", "yellow");
		}
		$("#topOfPage button").css("display", !isPrimary ? "block" : "none");
		$("#defaultIndicator").css("display", isPrimary ? "block" : "none");
		setTimeout(() => $("#defaultIndicator").css("background", "white"), 500);
	}
}
