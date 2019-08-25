"use strict";
/* globals Common, Util */
// spec_tools.js :: view/?edit hand and inspection tools

const COMMON = new Common();
const key4id = COMMON.getKey4id();



$(function () {
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
	// let defaultIndex = 0; // will use first image found if no primary found
	let THE_PRIMARY = null;
	let fotorama;
	let src_small, src_large, src_width;
	const IMAGES = {};
	let SPEC_TYPE = getUrlVars()["spec_type"]; // 'Hand' or 'Inspection'
	if (SPEC_TYPE === undefined) {
		SPEC_TYPE = $("spec_type").text();
	}
	const STYPE = SPEC_TYPE + " " + "Tools";
	$("title").html(`${STYPE}`);
	const VIEWER = new ImageViewer('#magdiv', { maxZoom: 800 });

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

	$('.jobtitle').html(STYPE + "&nbsp;&nbsp;&nbsp;Job:&nbsp;" + COMMON.jobTitle());

	const ta = $("textarea.comment");
	/* <button id="magnify" class="btn btn-secondary btn-sm">
				Zoom
			</button> */

	Util.setUpTabs(key4id, SPEC_TYPE, {
		tab: true,
		spec: true,
		main: true,
		machine: true,
		tabmenus: false
	}).then(tabs => {
		

		
		$('#magdiv').on('contextmenu', startMagImg);
		ta.hide();

		getImages(key4id).then(async termsArray => {
			// [{term, [fileRefs]}]

			if (termsArray === null) {
				$("body").append(
					$(
						`<h1 class="no_image_message">There are no ${STYPE} images<br/>for this Job.</h1>`
					)
				);

				return;
			}
			$("#pageheader").append($(`
					<select id="section"></select>
					<div id="defaultIndicator">Default Image</div>
					<button id="makeDefault" class="btn btn-secondary btn-sm">
						Set as Default
					</button>`));
			// process all the terms with fileRefs
			$("#makeDefault").on('click', e => {
				// make an image the Primary
	
				e.preventDefault();
				const af = fotorama.activeFrame;
				const old_primary = THE_PRIMARY;
				THE_PRIMARY = fotorama.activeIndex;
	
				$.post({
					// reset primary image in database
					url: "/terms/set_spec_term_primary",
					dataType: "json",
					data: {
						type: SPEC_TYPE,
						term: af.term,
						filename: af.filename,
						dir: af.dir
					}
				})
					.done(result => {
						// debugger;
						// modify local cache to mark primary
						IMAGES[af.term].forEach(
							// reset primary image in IMAGES object, and in the fileRefs array
							(aRef, index) => {
								aRef.primary = index === THE_PRIMARY;
							}
						);
	
						fotorama.data[old_primary].primary = false;
						fotorama.data[THE_PRIMARY].primary = true;
	
						setActive(true);
					})
					.fail(error => {
						alert("mongo update error for primary change");
					});
			});
			let showSection = null;
			const known = {}; // keys will be the terms for this Job
			termsArray.forEach(item => {
				// already sorted
				let { term, files } = item;
				IMAGES[term] = files; // an array of fileRefs
				// console.log(files);

				if (known[term] === undefined) {
					const option = $(`<option value="${term}">${term}</option>`);
					if (showSection === null) {
						option.prop('selected', true);
					}
					$("#section").append(option);
					known[term] = true;
				}

				if (showSection === null) showSection = term;
			});
			$("#section").on("change", async () => {
				await loadStuff($("#section option:selected").text());
			});

			$("#section")
				.val(showSection)
				.trigger("change");
		});
	});
	function taInput(e) {
		if ($(this).hasClass("initial")) {
			// console.log("ta change initial");
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
		const comment = $('#ta').val();
		const fa = fotorama.activeFrame;

		commentToDb(comment).then(() => {
			fa.comment = comment;
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
						data-max-height="79%" 
						data-max-width="100%">
					</div>`);
		const ta = $("#ta").on("input", taInput);
		$("#taSave").on('click', saveComment);
		$("#taCancel").on('click', restoreComment);
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

		const FIELDS = IMAGES[section] // array of filerefs
			.map((afRef, index) => {
				if (afRef.primary) {
					// primary = index;
					THE_PRIMARY = index;
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
		// let hideThumbs = false;
		// if (FIELDS.length === 1) {
		// 	// fix crash in fotorama when only one image, add "fake" last image
		// 	// and then hide thumbnails after rendering
		// 	FIELDS.push({
		// 		img: "/img/placeholder.png",
		// 		thumb: "/img/empty.png",
		// 		comment: null,
		// 		term: section,
		// 		primary: null
		// 	});
		// 	hideThumbs = true;
		// }
		await fotorama.load(FIELDS);
		await fotorama.show(THE_PRIMARY);
		// if (hideThumbs) {
		// 	$(".fotorama__nav-wrap").addClass("ignore"); // hides thumbnails
		// }
	}
	const startMagImg = (e) => {
		e.preventDefault();
		// console.log('startMagImg');
		if ($("#magdiv").css('display') === 'none') {
			$("#magimg").css({
				width: src_width + 20
			});
			console.log('small', src_small);
			console.log('large', src_large);

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
			// replace "spec" with Spec_large
			const srcPath = img.attr('src').split("/");
			let section_large = srcPath[2] + "_large";
			srcPath[2] = section_large;
			src_large = srcPath.join('/');

			src_small = img.attr('src');
			let htmlHeight = $('html').height()
			src_width = imageWidth * htmlHeight / imageHeight;
		}
		setActive(fa.primary);
	};

	function relFileRef(afRef, tag) {
		return afRef.dir + (tag ? tag : "") + "/" + afRef.filename;
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

});
