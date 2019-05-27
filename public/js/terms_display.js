"use strict";
/* globals Common, Util */
// terms_display.js :: view term images

const COMMON = new Common();
const key4id = COMMON.getKey4id();
// const key5 = COMMON.getParsedCookie();
let TYPE, TERM;

// Read a page's GET URL variables and return them as an associative array.
// function getUrlVars() {
// 	var vars = [],
// 		hash;
// 	var hashes = window.location.href
// 		.slice(window.location.href.indexOf("?") + 1)
// 		.split("&");
// 	for (var i = 0; i < hashes.length; i++) {
// 		hash = hashes[i].split("=");
// 		vars.push(hash[0]);
// 		vars[hash[0]] = hash[1];
// 	}
// 	return vars;
// }
let defaultIndex = 0; // will use first image found if no primary found
let thePrimary = 0;
let fotorama;
let ALLFREFS;

$(function () {
	// const URLVARS = getUrlVars(); // 'Hand' or 'Inspection'
	TYPE = $("type").text();
	TERM = $("term").text();

	let cType = TYPE.charAt(0).toUpperCase() + TYPE.slice(1);

	let STYPE; // establish title for page
	if (!["function", "type"].includes(TYPE)) {
		cType = 'Other'
	}
	STYPE = `<u>${cType}</u> Images: "${TERM}"`;

	$("title").html(STYPE);

	const getImages = () => {
		return new Promise((resolve, reject) => {
			$.post({
				url: "/terms/get_term_image_filerefs",
				dataType: "json",
				data: {
					type: TYPE,
					term: TERM
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

	const ta = $("textarea.comment");
	$("#topOfPage button").on("click", e => {
		// make an image the Primary
		e.preventDefault();
		const af = fotorama.activeFrame;
		thePrimary = fotorama.activeIndex;
		$.post({
			// reset primary image in database
			url: "/terms/set_term_primary",
			dataType: "json",
			data: {
				type: TYPE,
				term: TERM,
				filename: af.filename,
				dir: af.dir
			}
		})
			.done(result => {
				ALLFREFS.forEach(
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

	// // ta.on('change', () => {
	// //     $(this).height(0).height(this.scrollHeight);
	// // });
	Util.setUpTabs(key4id, "", {
		tab: true,
		spec: true,
		main: true,
		machine: true,
		tabmenus: false
	}).then(tabs => {
		$("#pageheader").append($(`<h1 class="pageTitle">${STYPE}</h1>`));
		ta.hide();

		getImages().then(async termsArray => {
			// [{term, [fileRefs]}]

			if (termsArray.length === 0) {
				$("body").append(
					$(
						`<h1 class="no_image_message">
						There are no ${(cType === 'Other') ? "" : cType} images for "${TERM}".
						</h1>`
					)
				);

				return;
			}
			ALLFREFS = termsArray.slice(0); // top level copy of array
			// process all the terms with fileRefs
			await loadStuff();
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

// const spec_type_id = () => SPEC_TYPE.toLowerCase() + "_tools";

const commentToDb = text => {
	const fa = fotorama.activeFrame;
	const selectedTerm = $("#section option:selected").text();
	const dir = fa.dir;
	const filename = fa.filename;

	return new Promise((resolve, reject) => {
		$.post({
			url: "/update_term_image_comment",
			dataType: "json",
			data: {
				type: TYPE,
				term: TERM,
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
	commentToDb($("#ta").val()).then(() => {
		afterCommentEdit();
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

async function loadStuff() {
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
				
	const ta = $("#ta").on("input", taInput); // comment textarea
	// buttons for comment edits
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
	const toShow = ALLFREFS.map((afRef, index) => {
		// array of filerefs
		if (afRef.primary) {
			thePrimary = index;
			ta.val(afRef.comment);
		}
		return {
			img: relFileRef(afRef),
			thumb: relFileRef(afRef, "_small"),
			comment: afRef.comment,
			term: TERM, // needed?
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
			term: TERM,
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
	const path = afRef.dir + (tag ? tag : '') + '/' + afRef.filename;
	console.log({path});
	return path;
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
