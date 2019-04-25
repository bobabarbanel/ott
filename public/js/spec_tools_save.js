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
const catPrimary = {};
let fotorama;
let allInfo;
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
		e.preventDefault();
		const af = fotorama.activeFrame;
		catPrimary[af.term] = fotorama.activeIndex;
		$.post({
			url: "/set_spec_images_primary",
			dataType: "json",
			data: {
				spec_type: SPEC_TYPE.toLowerCase() + "_tools",
				filename: af.filename,
				dir: af.dir,
				term: af.term
			}
		})
			.done(result => {
				// defaultIndex = fotorama.activeIndex;
				setActive();
			})
			.fail(error => {
				alert("mongo update error for primary change");
			});
	});
	function havePrimary(index) {
		return (
			Object.keys(catPrimary).find(term => catPrimary[term] === index) !==
			undefined
		);
	}
	function setActive(isPrimary) {
		if(isPrimary === null) {
			$("#topOfPage button").css("display", "none");
			$("#defaultIndicator").css("display", "none");
		} else {
			if($("#defaultIndicator").css("display") === 'block' && isPrimary) {
				$("#defaultIndicator").css("background", "yellow");
			} 
			$("#topOfPage button").css("display", !isPrimary ? "block" : "none");
			$("#defaultIndicator").css("display", isPrimary ? "block" : "none");
			setTimeout(()=> $("#defaultIndicator").css("background", "white"), 500);
		}
	}
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
		let index = 0;
		const known = {}; // keys will be the terms for this Job

		let startSection;
		$('#section').css('visibility','hidden');
		getImages(key4id).then(async (termsArray) => { // [{term, [fileRefs]}]
			allInfo = termsArray;
			if (termsArray === null) {
				$("body").append(
					$(
						`<h1 class="no_image_message">There are no ${STYPE} images<br/>for this Job.</h1>`
					)
				);
				
				return;
			}
			$('#section').css('visibility','visible'); // the selector
			// process all the terms with fileRefs
			let showSection = null;
			let images = {};
			termsArray.forEach(item => {
				// already sorted
				let { term, files } = item;
				images[term] = files; // an array of fileRefs
				// console.log(files);
				if(showSection === null) showSection = term;
				if (known[term] === undefined) {
					$("#section").append($(`<option>${term}</option>`));
					known[term] = true;
				}
			});
			$("#section")
				.val(showSection)
				.on("change", async () => {
					const selectedTerm = $("#section option:selected").text();
					// TODO:	
					await loadStuff(images,selectedTerm,fotorama,ta);
					ta.show();
				});
			// 	files.forEach(afRef => {
			// 		if (afRef.primary) {
			// 			if (Object.keys(catPrimary).length === 0) {
			// 				defaultIndex = index; // for first category's item to show when page opens
			// 			}
			// 			startSection = term;
						
			// 			catPrimary[term] = index; // holds all the current term's default positions for images
			// 		}
			// 		// images.push({
			// 		// 	img: relFileRef(afRef),
			// 		// 	thumb: relFileRef(afRef, "_small"),
			// 		// 	comment: afRef.comment,
			// 		// 	term: term,
			// 		// 	dir: afRef.dir,
			// 		// 	filename: afRef.filename,
			// 		// 	primary: afRef.primary ? true : false
			// 		// });
			// 		index++;
			// 	});
			// });
			// // display default (or first if none) for one section
			
			
				// put together 
			$("content").append(`<div id="fotorama" 
								class="fotorama" 
								data-auto="false"
								data-nav="thumbs" 
								data-width="100%" 
								data-transition="crossfade" 
								data-max-height="83%" 
								data-max-width="100%">
							</div>`);
			const $fotoramaDiv = $("#fotorama")
				// Listen to the events
				.on(
					"fotorama:load fotorama:showend", // Stage image of some frame is loaded

					(e, fotorama, extra) => {
						let fa = fotorama.activeFrame;
						if(fa.comment === null) {
							ta.hide();
						}
						else {
							ta.text(fa.comment).show();
						}
						setTimeout(() => {
							// delay may be needed to allow width and text to adjust
							ta.height(0).height(ta[0].scrollHeight);
						}, 1);
						const stageFrame = $(fa.$stageFrame[0]);
						const img = $(stageFrame).find("img");
						const imageWidth = parseInt(img.css("width"));
						const windowWidth = $(window).width();
						const commentWidth = Math.floor((windowWidth - imageWidth) * 0.4);
						ta.css("width", commentWidth + "px");
						// $("#section").val(fa.term);
						setActive(fa.primary);
					}
				)

				.fotorama({
					spinner: {
						lines: 13,
						color: "rgba(0, 0, 255, .75)"
					}
				});
			fotorama = $fotoramaDiv.data("fotorama");
			// start with first section only
			await loadStuff(images, showSection, fotorama, ta);
				// markTransitions();
				// setHover();
			ta.show();
			
		});
	});
});

async function loadStuff(images, section, fotorama, ta) {
	let primary = 0; // default image to show if primary is not identified
	const toShow = images[section] // array of filerefs
	.map(
		(afRef, index) => {
			if(afRef.primary) {
				primary = index;
				ta.text(afRef.comment);
			}
			return {
				img: relFileRef(afRef),
				thumb: relFileRef(afRef, "_small"),
				comment: afRef.comment,
				term: section,
				dir: afRef.dir,
				filename: afRef.filename,
				primary: afRef.primary ? true : false
			}
		});
		if(toShow.length === 1) {
			toShow.push({
				img: '/img/placeholder.png',
				thumb: '/img/empty.png',
				comment: null, 
				term: section,
				// dir: afRef.dir,
				// filename: afRef.filename,
				primary: null
			});
		} else {
			
		}
	await fotorama.load(toShow);
		// TODO: find primary, default to first
	await fotorama.show(primary);
}

function relFileRef(afRef, tag) {
	return afRef.dir + (tag ? tag : "") + "/" + afRef.filename;
}
