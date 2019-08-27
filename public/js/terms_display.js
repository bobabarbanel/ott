"use strict";
/* globals Common, Util */
// terms_display.js :: view term images

const COMMON = new Common();
const key4id = COMMON.getKey4id();



$(function () {
	// let TYPE, TERM;

	// let defaultIndex = 0; // will use first image found if no primary found
	let THE_PRIMARY = 0;
	let fotorama;
	let ALLFREFS;
	let FRAMES;
	let src_small, src_large, src_width;
	const TYPE = $("type").text();
	const TERM = $("term").text();

	const VIEWER = new ImageViewer('#magdiv', { maxZoom: 800 });

	let cType = TYPE.charAt(0).toUpperCase() + TYPE.slice(1);

	if (!["function", "type"].includes(TYPE)) {
		cType = 'Other'
	}
	let STYPE = `${cType} Images: ${TERM}`;

	$("title").html(STYPE);

	const ta = $("textarea.comment");

	function getImages(cType, TERM) {
		return new Promise((resolve, reject) => {
			$.post({
				url: "/terms/get_term_image_filerefs",
				dataType: "json",
				data: {
					type: TYPE,
					term: TERM
				}
			})
				.done(results => {
					if (results.length === 0) {
						$("body").append(
							$(
								`<h1 class="no_image_message">
								There are no ${(cType === 'Other') ? "" : cType} images for "${TERM}".
								</h1>`
							)
						);
						return resolve(null);
					}

					ALLFREFS = results.slice(0); // top level copy of array
					// process all the terms with fileRefs
					loadStuff();
					return resolve(null);
				})
				.fail(error => {
					reject(error);
				});
		});
	};

	function taInput(e) {
		if ($(this).hasClass("initial")) {
			// console.log("ta change initial");
			$(this).removeClass("initial");
			// show save button
			$(".commentsave, .commentcancel").css("visibility", "visible");
		}
	}

	const commentToDb = (text) => {
		const fa = fotorama.activeFrame;
		// const selectedTerm = $("#section option:selected").text();
		const dir = fa.dir;
		const filename = fa.filename;
		fa.comment = text;

		return new Promise((resolve, reject) => {
			$.post({
				url: "/terms/update_term_image_comment",
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

	function saveComment(e) {
		// $('fotorama__arr fotorama__arr--prev').attr("disabled", true);

		commentToDb($("#ta").val()).then(() => {
			afterCommentEdit();

		});
		e.preventDefault();
		return false;
	}

	function afterCommentEdit() {
		$(".commentsave, .commentcancel").css("visibility", "hidden");
		$("#ta").addClass("initial");
	}

	function loadStuff() {
		// let primary = 0; // default image to show if primary is not identified

		const ta = $("#ta").on("input", taInput); // comment textarea
		// buttons for comment edits
		// console.log($("button#taSave")[0]);
		$(".commentsave").on("click", saveComment);
		$(".commentcancel").on("click", restoreComment);
		// console.log("END", $("button#taSave")[0]);

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
		FRAMES = ALLFREFS.map((afRef, index) => {
			// array of filerefs
			if (afRef.primary) {
				THE_PRIMARY = index;
				ta.val(afRef.comment);
			}
			return {
				img: relFileRef(afRef),
				thumb: relFileRef(afRef, "_small"),
				comment: afRef.comment,
				term: TERM, // needed?
				dir: afRef.dir,
				filename: afRef.filename,
				primary: afRef.primary ? true : false,
				index: index
			};
		});

		let hideThumbs = false;
		// if (FRAMES.length === 1) {
		// 	// fix crash in fotorama when only one image, add "fake" last image
		// 	// and then hide thumbnails after rendering
		// 	FRAMES.push({
		// 		img: "/img/placeholder.png",
		// 		thumb: "/img/empty.png",
		// 		comment: null,
		// 		term: TERM,
		// 		primary: null
		// 	});
		// 	hideThumbs = true;
		// }
		fotorama.load(FRAMES);
		fotorama.show(THE_PRIMARY);

		if (hideThumbs) {
			$(".fotorama__nav-wrap").addClass("ignore"); // hides thumbnails
		}

	}
	const startMagImg = (e) => {
		e.preventDefault();
		// console.log('startMagImg');
		if ($("#magdiv").css('display') === 'none') {
			$("#magimg").css({
				width: src_width + 20
			});
			VIEWER.load(src_small, src_large);
		}
		$("#magdiv").toggle();
	};

	const fotofunc = (e, fotorama, extra) => {
		const fa = fotorama.activeFrame;
		if ($("#magdiv").css('display') !== 'none') $("#magdiv").toggle();
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

		const stageFrame = fa.$stageFrame;
		const img = stageFrame.find("img");

		const imageWidth = parseInt(img.css("width"));
		const imageHeight = parseInt(img.css("height"));
		const windowWidth = $(window).width();
		const commentWidth = Math.floor((windowWidth - imageWidth) * 0.4);
		ta.css("width", commentWidth + "px");
		// $("#section").val(fa.term);
		if (img.attr('src')) {
			
			img.off('contextmenu', startMagImg);
			img.on('contextmenu', startMagImg);
			

			const srcPath = img.attr('src').split("/");
			let section_large = srcPath[3] + "_large";
			
			srcPath[3] = section_large;
			src_large = srcPath.join('/');

			src_small = img.attr('src');
			let htmlHeight = $('html').height()
			src_width = imageWidth * htmlHeight / imageHeight;
		}

		setActive(fa.primary);
	};

	function relFileRef(afRef, tag) {
		const path = afRef.dir + (tag ? tag : '') + '/' + afRef.filename;
		// console.log({path});
		return path;
	}

	function setActive(isPrimary) {
		if (isPrimary === null) {
			$("#makeDefault").css("visibility", "hidden");
			$("#defaultIndicator").css("visibility", "hidden");
		} else {
			if ($("#defaultIndicator").css("visibility") === "visible" && isPrimary) {
				$("#defaultIndicator").css("background", "yellow");
			}
			$("#makeDefault").css("visibility", !isPrimary ? "visible" : "hidden");
			$("#defaultIndicator").css("visibility", isPrimary ? "visible" : "hidden");
			setTimeout(() => $("#defaultIndicator").css("background", "white"), 500);
		}
	}

	Util.setUpTabs(key4id, "", {
		tab: true,
		spec: true,
		main: true,
		machine: true,
		tabmenus: false
	}).then(() => {
		// <button id="magnify" class="btn btn-secondary btn-sm">
			// 	Zoom
			// </button>
		$("#pageheader").append($(`
			<h1 class="pageTitle">${STYPE}</h1>
			<div id="defaultIndicator">Default Image</div>
			<button id="makeDefault" class="btn btn-secondary btn-sm">
				Set as Default
			</button>
		`));
		$("#makeDefault").on("click", e => {
			// make an image the Primary
			e.preventDefault();
			const af = fotorama.activeFrame;
			const old_primary = THE_PRIMARY;
			THE_PRIMARY = fotorama.activeIndex;
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
						// reset primary image in IMAGES object, and in the fileRefs array
						(aRef, index) => {
							aRef.primary = index === THE_PRIMARY;
						}
					);
					// fotorama.splice(index , howMany[, frame1, ..., frameN])
					fotorama.data[old_primary].primary = false;
					fotorama.data[THE_PRIMARY].primary = true;
					setActive(true);
				})
				.fail(error => {
					alert("mongo update error for primary change");
				});
		});
		
		$('#magdiv').on('contextmenu', startMagImg);
		
		ta.hide();

		getImages(cType, TERM);
	});


});
