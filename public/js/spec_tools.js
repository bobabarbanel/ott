"use strict";
/* globals Common, Util */
// spec_tools.js :: view/?edit hand and inspection tools

const COMMON = new Common();
const key4id = COMMON.getKey4id();
const key5 = COMMON.getParsedCookie();
const ENTER = 13;
const TABCHAR = 9;
let TABLE;
const DATA = [];
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
	const jobTitle = [
		key5.partId,
		key5.pName,
		key5.dept,
		key5.op,
		key5.machine
	].join(" : ");
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
	function setActive() {
		const activeIsPrimary = havePrimary(fotorama.activeIndex);
		if($("#defaultIndicator").css("display") === 'block' && activeIsPrimary) {
			$("#defaultIndicator").css("background", "yellow");
			
		} 
		$("#topOfPage button").css("display", !activeIsPrimary ? "block" : "none");
		$("#defaultIndicator").css("display", activeIsPrimary ? "block" : "none");
		setTimeout(()=> $("#defaultIndicator").css("background", "white"), 500);
		
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
		$(".comment").hide();
		const images = [];
		let index = 0;
		const known = {};

		let startSection;
		$('#section').css('visibility','hidden');
		getImages(key4id).then(termsArray => {
			if (termsArray === null) {
				$("body").append(
					$(
						`<h1 class="no_image_message">There are no ${STYPE} images<br/>for this Job.</h1>`
					)
				);
				
				return;
			}
			$('#section').css('visibility','visible');
			termsArray.forEach(item => {
				// already sorted
				let { term, files } = item;
				// console.log(files);
				if (known[term] === undefined) {
					$("#section").append($(`<option>${term}</option>`));
					known[term] = true;
				}
				files.forEach(afRef => {
					if (afRef.primary) {
						if (Object.keys(catPrimary).length === 0) {
							defaultIndex = index; // for first category's item to show when page opens
						}
						startSection = term;
						catPrimary[term] = index; // holds all the current term's default positions for images
					}
					images.push({
						img: relFileRef(afRef),
						thumb: relFileRef(afRef, "_small"),
						comment: afRef.comment,
						term: term,
						dir: afRef.dir,
						filename: afRef.filename,
						primary: afRef.primary ? true : false
					});
					index++;
				});
			});
			$("#section")
				.val(startSection)
				.on("change", () => {
					const selectedTerm = $("#section option:selected").text();
					for (let i = 0; i < images.length; i++) {
						if (images[i].term === selectedTerm) {
							fotorama.show(i);
							break;
						}
					}
				});

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

					function(e, fotorama, extra) {
						let fa = fotorama.activeFrame;
						ta.text(fa.comment);
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
						$("#section").val(fa.term);
						setActive();
					}
				)

				.fotorama({
					spinner: {
						lines: 13,
						color: "rgba(0, 0, 255, .75)"
					}
				});
			fotorama = $fotoramaDiv.data("fotorama");
			loadStuff().then(() => {
				// markTransitions();
				// setHover();
				$(".comment").show();
			});
			
			async function loadStuff() {
				await fotorama.load(images);
				await fotorama.show(defaultIndex);
			}
			


			// setHover();
			// $(".fotorama__nav__frame > .fotorama__thumb > img").on(

			// () => {
			// 	console.log("out");
			// 	// $("showterm").hide();
			// }
		});
	});
});

function relFileRef(afRef, tag) {
	return afRef.dir + (tag ? tag : "") + "/" + afRef.filename;
}
// function setHover() {
// 	const dashes = new RegExp("--", "g");
// 	$(".fotorama__nav-wrap").on(
// 		"mouseenter",
// 		".fotorama__nav__frame.fotorama__nav__frame--thumb",
// 		e => {
// 			e.preventDefault();
// 			const jt = $(e.target);
// 			let src = "";
// 			if (jt.hasClass("fotorama__nav__frame fotorama__nav__frame--thumb")) {
// 				src = $(e.target).find(
// 					".fotorama__thumb.fotorama__loaded.fotorama__loaded--img > img"
// 				)[0];
// 			} else {
// 				src = $(e.target);
// 			}
// 			src = $(src).attr("src");
// 			const part = src.split("/")[3];
// 			if (part) {
// 				const term = part.split("_")[1].replace(dashes, " "); // restrore spaces in term name
// 				$("#showterm")
// 					.css({ left: e.pageX - 20, top: e.pageY - 20 })
// 					.text(term)
// 					.show();
// 			}
// 		}
// 	);
// 	$(".fotorama__nav-wrap").on(
// 		"mouseleave",
// 		".fotorama__nav__frame.fotorama__nav__frame--thumb",
// 		() => {
// 			// console.log("out");
// 			// alert($(this)[0].src);
// 			$("#showterm").hide();
// 		}
// 	);
