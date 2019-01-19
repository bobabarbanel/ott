"use strict";


/* globals Util, LinkGroup, TabValues */
// showtab.js

let TV = TabValues;

const pageName = "Tabs";
const dirPathToImages = "../../";
const reverseURL = "/unArchiveTabImages";

$(function() {
	// onload

	function pageSetup() {
		TV = TabValues; // constants and variables
		TV.setDeleteButtons("init");

		// Captures click events of all <a> elements with href starting with #
		$(document).on("click", 'a[href^="#"]', function(/*event*/) {
			// Click events are captured before hashchanges. Timeout
			// causes offsetAnchor to be called after the page jump.
			window.setTimeout(function() {
				TV.offsetAnchor();
			}, 0);
		});
		let tabName = $("#tabname").text();
		let tabNum = parseInt($("#tabnum").text());

		$("#deleteMenu").hide();
		$("job").html(`Tab${TV.SPACE}${tabName}${">" + TV.SPACE}
        ${[
					TV.key5.partId,
					TV.key5.pName,
					TV.key5.dept,
					TV.key5.op,
					TV.key5.machine
				].join(" : ")}`);

		$(TV.FLOATNAME)
			.removeClass()
			.addClass("showfloat"); // start with menu not showing

		$("head title", window.parent.document).text(tabName);

		Util.setUpTabs(TV.key4id, tabName).then(tabs => {
			getTabImages().then(
				// gets only non-archived images
				stepFiles => {
					// an array of fileRefs, each with images_id attribute; may have no key/value for steps without images
					paintPage(tabs[tabNum], stepFiles);
					startUp();
				},
				err => {
					alert("getTabImages error: " + err);
				}
			);
		});
	}

	function callDeleteImages(ev) {
		TV.deleteImages(ev, setArchiveForTabImages, listDeleting);
	}

	// add scroll offset to fragment target (if there is one)
	// function delayedFragmentTargetOffset() {
	//     var url = $(":target").context.URL;

	//     var hashCharPosition = url.lastIndexOf("#");
	//     if (hashCharPosition !== -1) {
	//         var div = $(url.substring(hashCharPosition));

	//         var offset = div.offset();

	//         var scrollto = offset.top - 50; // minus fixed header height
	//         $('html, body').animate({
	//             scrollTop: scrollto
	//         }, 0);
	//         div.css("background-color", "yellow");
	//         setTimeout(function () {
	//             div.css("background-color", "");
	//         }, 3000);
	//     }
	// }

	function filesByImageId(stepFilesObj, images_id) {
		return stepFilesObj[images_id];
		// .filter(
		//     (item) => item.images_id === images_id
		// );
	}

	function getTabImages() {
		let data = {
			key4id: TV.key4id
		};

		return new Promise((resolve, reject) => {
			$.ajax({
				url: "/tab_images",
				type: "post",
				data: data,
				dataType: "json"
			})
				.done(result => resolve(result))

				.fail((request, status, error) => reject(error));
		});
	}

	function imgClick() {
		// when small image clicked to show larger image
		$("single textarea").off("click");
		let prev = TV.hideSingle(); // prev holds the title string from last single image shown
		$(".pic").removeClass("highlight"); // un-highlight any previous image

		if (TV.deleteMode) {
			TV.flipImgDelState($(this)); // allow to flip state of one image
		} else {
			TV.showSingleLargeImage(
				$(this),
				prev,
				dirPathToImages,
				setTitlesForSingle
			); // show image in <single> container
		}
	}

	function listDeleting(images) {
		let links = [];
		let org = {};
		let doc = {};
		let str = "<ul>";
		images.each((index, img) => {
			img = $(img);
			let link = img.attr("link");
			if (!links.includes(link)) {
				links.push(link);
				org[link] = [];
				doc[link] = [img.attr("section"), img.attr("step")];
			}
			org[link].push(img.attr("src"));
		});
		links.forEach(link => {
			let f = doc[link];
			let head = f[0] + " > " + f[1];
			str += '<li class"delItem">' + head + '<div class="delList">';
			org[link].forEach(src => {
				str += '<img src="' + src + '"/>';
			});
			str += "</div></li>";
		});
		str += "</ul>";
		return str;
	}

	function paintPage(tab, stepFiles) {
		// convert stepFiles to a single object with images_id as key
		let stepFilesObj = {};
		stepFiles.forEach(group => {
			stepFilesObj[group._id] = group.entry;
		});
		let pictures = $("pictures");
		let links = [];
		let LG;
		TV.maxImageShowing = 0;
		let curLG = null;
		tab.sections.forEach((section, sect_index) => {
			let group = [sect_index, section.sectionName].join("_");
			TV.DELETEDIMAGES[group] = []; // empty to start

			let section_target = ["section", sect_index].join("_");
			let sectDiv = $(
				`<div id="${section_target}" class="headtext"><span class="sectionlabel">&nbsp;Section:&nbsp;</span>${
					section.sectionName
				}</div>`
			);
			let sectLink = "#" + section_target;
			links.push([sectLink, section.sectionName]);

			let anchor = $('<a class="anchor head" id="' + sectLink + '"/>');
			pictures.append(anchor);
			pictures.append(sectDiv);

			if (section.steps.lemgth === 0) {
				sectDiv.text(sectDiv.text() + " - no Steps");
			} else {
				section.steps.forEach((step, step_index) => {
					let step_target = ["step", sect_index, step_index].join("_"); // like 'pic' anchor for tools
					let stepDiv = $(
						`<div class="step pic" id="pic${step_target}" images_id="${
							step.images_id
						}"></div>`
					);
					links.push(["#pic" + step_target, step.stepName]);

					if (curLG !== null) {
						// have a group?
						if (curLG.getStart() !== curLG.getStop()) {
							// ignore groups with no images
							curLG.setNext(
								new LinkGroup(
									curLG,
									null,
									TV.maxImageShowing,
									null,
									step_target
								)
							);
							curLG = curLG.getNext();
						} else {
							curLG.setLink("pic" + step_target);
						}
					} else {
						// initialize
						curLG = new LinkGroup(
							null,
							null,
							TV.maxImageShowing,
							null,
							step_target
						);
						LG = curLG;
					}

					let pItems = $("<pItems/>");
					let stepSpan = null;
					let fileRefs = filesByImageId(stepFilesObj, step.images_id);
					if (fileRefs !== undefined && fileRefs.length > 0) {
						let button = $(
							'<button class="checkAllDel" type="button">&#10004; All</button>'
						);
						stepSpan = $('<span class="stepSpan"/>').html(
							TV.SPACE + TV.SPACE2 + step.stepName
						);
						stepDiv.append(button, stepSpan);
						fileRefs.forEach((fileRef, index) => {
							let small = fileRef.dir.replace(
								"/" + pageName + "/",
								"/" + pageName + "_small/"
							);
							let large = fileRef.dir.replace(
								"/" + pageName + "/",
								"/" + pageName + "_large/"
							);

							let idiv = $('<div class="img-wrap"/>');
							idiv.addClass("transparent");
							let img = $("<img/>", {
								section: section.sectionName,
								step: step.stepName,
								height: "100px",
								link: step_target,
								alt: "image",
								src: small + "/" + fileRef.filename,
								comment: fileRef.comment,
								dir: fileRef.dir,
								dir_small: small,
								dir_large: large,
								filename: fileRef.filename,
								showingSingle: false,
								order: index,
								sequence: TV.maxImageShowing,
								job: TV.key4id
							});
							idiv.attr("sequence", TV.maxImageShowing + "");
							TV.LGP[TV.maxImageShowing] = curLG; // save LinkGroup for each image

							TV.ALL_IMGWARPS[TV.maxImageShowing] = {
								// initialized here
								wrap: idiv,
								deleted: false
							};
							TV.maxImageShowing++;

							//count = index + 1;
							idiv.append(img);
							// img.mouseover((e) =>
							//     console.log($(e.target).attr('sequence')));
							let span = $('<span class="close">&times;</span>');
							span.css("display", "none");
							idiv.append(span);
							pItems.append(idiv);
						});
						stepDiv.append(pItems);
					} else {
						stepSpan = $('<span class="stepSpan"/>').html(
							TV.SPACE + TV.SPACE2 + step.stepName + " - no images"
						);
						stepDiv.append(stepSpan);
					}
					curLG.setStop(TV.maxImageShowing);

					let groupButton = stepDiv.find("button").hide(); //initially invisible
					if (groupButton.length > 0) {
						groupButton.on(
							"click",
							null,
							{
								link: step_target
							},
							TV.delSelectAll
						);
					}

					pictures.append(stepDiv);
				});
			}
		});

		if (curLG.getStart() === curLG.getStop()) {
			// remove last LG as it is empty
			curLG.getPrev().setNext(null);
			curLG = curLG.getPrev();
		}
		// form circle so that UP and DOWN arrows move in continuous circle
		curLG.setNext(LG);
		LG.setPrev(curLG);

		$("pictures img").on("click", imgClick);
		// build floating menu
		let float = $(TV.FLOATNAME).empty();
		let dash = /^#section_/;
		let prev = "";
		let icon =
			'<span><i class="fas fa-tasks" style="color:yellow"></i>' +
			TV.SPACE2 +
			"</span>";

		// contruct flotmenu - links to sections/steps on page
		links.forEach(link => {
			if (dash.test(link[0])) {
				// start (possibly end) ul
				if (prev !== "") {
					let endUl = $("</ul>");
					float.append(endUl);
				}
				let a1 = $(
					'<a class="floathead scroller" href="' + link[0] + '">'
				).html(icon + link[1]);
				prev = $('<ul class="floatgroup"/>').append(a1);
				a1.on("click", TV.scrollerAction);
				float.append(prev);
			} else {
				let line =
					'<div class="floatlink"><div class="floattag">' + link[1] + "</div>";
				let a2 = $('<a class="scroller" href="' + link[0] + '">').html(line);
				a2.on("click", TV.scrollerAction);
				prev.append($("<li/>").append(a2));
			}
		});
		float.append($("</ul>")).addClass("showfloat"); // hide to start
	}

	function setArchiveForTabImages(list) {
		// list, a (jq)list of images to be marked as archived in db
		let data = []; // construct data object for deletion route
		list.each((index, img) => {
			let image = $(img);
			image.removeClass("dim");
			let allIW = TV.ALL_IMGWARPS[parseInt(image.attr("sequence"))];
			allIW.deleted = true; // mark as deleted
			allIW.wrap.css("display", "none");
			data.push(image.attr("filename"));
		});

		TV.setDeleteButtons("deleting");
		console.log(JSON.stringify(data));
		return new Promise((resolve, reject) => {
			$.ajax({
				url: "/archiveTabImages",
				type: "post",
				data: {
					job_id: TV.key4id,
					fileinfo: data
				},
				dataType: "json"
			})
				.done(result => {
					resolve(result);
				})
				.fail((request, status, error) => {
					alert(
						"setArchiveForTabImages failure: " +
							status +
							" " +
							JSON.stringify(error)
					);
					reject(error);
				});
		});
	}

	function setTitlesForSingle(img) {
		let txt = img.attr("section") + " > " + img.attr("step");
		$("#tsSection").text(txt);
		return txt;
	}

	function startUp() {
		$("body").on("click", () => $("navDropDown").hide());
		$(".checkAllDel").hide();

		$(".navDropDownButton").on("click", () => {
			$("navDropDown").css("display", "flex");
			return false;
		});

		TV.spaceForDeleteMenu(false);

		$("#doDelete").on("click", callDeleteImages);
		$("#doDone").on("click", callDeletionsComplete);
		$("#doClear").on("click", TV.clearDeleteSelections);
		$("#undoDelete").on("click", callUndeleteImages);

		$(".deleteButton").on("click", TV.toggleDeleteMode);
		$(".floatButton").on("click", TV.hideShowFloat);
	}

	function callUndeleteImages(ev) {
		TV.unDeleteImages(ev, reverseURL);
	}
	// function callDeleteImages(ev) {
	//     TV.deleteImages(ev, setArchiveForTabImages, listDeleting);
	// }

	function callDeletionsComplete() {
		TV.deletionsComplete();
		// add "no images" where needed

		// $("div.step.pic").each(
		//     (z, elem) => {
		//         let countShowing = 0;
		//         let eligible = false;

		//         $(elem).find('div.img-wrap.deleting').each((x, iw) => {
		//             // console.log('iw ' + x + " " + $(iw).css('display'));
		//             if ($(iw).is(':visible')) {
		//                 countShowing++;
		//             }
		//             eligible = true;
		//         });
		//         //console.log(eligible + " " + countShowing + " " + span.html());
		//         if(eligible && countShowing === 0) {
		//             let span = $(elem).find('span.stepSpan');
		//                 span.html(span.html() + " - no images");
		//         }

		//     }
		// );
    }
    
    // $.getScript("tabValueCalss.js")
	// 	.done(function(script, textStatus) {
	// 		pageSetUp();
	// 	})
	// 	.fail(function(jqxhr, settings, exception) {
	// 		alert("fail");
    // 	});
    pageSetup();
});
