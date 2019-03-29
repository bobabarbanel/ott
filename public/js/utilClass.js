"use strict";
/*exported Util */
// utilClass.js

class Util {
	// Utilities

	static isString(value) {
		return typeof value === "string" || value instanceof String;
	}

	static numsOf(str) {
		return str.replace(/[^\d]/g, "");
	}

	static getMachineSpec(machine) {
		return new Promise((resolve, reject) => {
			$.ajax({
				url: "/machine/" + machine,
				type: "get",
				dataType: "json"
			})
				.done(result => resolve(result))

				.fail((request, status, error) => reject(error));
		});
	}

	static getSheetTags(keyObj, tab) {
		return new Promise((resolve, reject) => {
			$.ajax({
				url: "/sheetTags",
				type: "post",
				data: {
					key: keyObj,
					tab: tab,
					files: false // do not retrieve files/images list
				},
				dataType: "json"
			})
				.done(result => resolve(result))
				.fail((request, status, error) => reject(error));
		});
	}

	static goHome() {
		// window.close();
		// alert('goHome ' + JSON.stringify(COMMON.getParsedCookie()));
		window.location.href = "/";
	}
	static setUpShortNav(key4id, here) {
		here = here.trim();

		let topnav = $(".topnav");
		let home_button = $(
			'<a class="home" id="home_button"><i class="fas fa-home fa-lg"></i></a>'
		);
		home_button.on("click", Util.goHome);
		topnav.append(home_button);
	}
	static completeNavMenu(key4id, here, include) {
		const showTabs = "tab" in include && include.tab;
		const showSpec = "spec" in include && include.spec;
		const showMain = "main" in include && include.main;
		const showMachine = "machine" in include && include.main;
		const showTabMenus = "tabmenus" in include && include.tabmenus;
		let topnav = $(".topnav");
		let navDropDown = $("navDropDown");
		return new Promise((resolve, reject) => {
			Util.getTabsData(key4id).then(
				data => {
					this.homeButton();

					let nextTab;
					if (showMain) {
						// Main
						nextTab = $('<a tabndex="-1" href="/tabs/main.html">Main</a>');
						if (here === "Main") {
							nextTab.addClass("active");
							navDropDown.append($(`<span class="tabaccess_here">Main</span>`));
						} else {
							navDropDown.append(
								$('<a class="tabaccess" href="/tabs/main.html">Main</a>')
							);
						}
						topnav.append(nextTab);
					}

					// Tools
					if(showMachine) {
						nextTab = $(
							'<a tabndex="-1" class="elevate" href="/tabs/tools.html">Machine</br>Tools</a>'
						);
						if (here === "Tools") {
							nextTab.addClass("active");
							navDropDown.append(
								$(`<span class="tabaccess_here">Machine Tools</span>`)
							);
						} else {
							navDropDown.append(
								$(
									'<a class="tabaccess" href="/tabs/tools.html">Machine Tools</a>'
								)
							);
						}
						topnav.append(nextTab);
					}
					

					if (showSpec) {
						// TODO:
						// which specs does this this job have 'hand_tools' and/or 'inspection_tools'?
						["Hand", "Inspection"].forEach(tooltype => {
							nextTab = $(
								`<a tabndex="-1" class="elevate" href="/tabs/spec_tools.html?spec_type=${tooltype}">${tooltype}</br>Tools</a>`
							);
							if (here === `${tooltype}`) {
								nextTab.addClass("active");
								navDropDown.append(
									$(`<span class="tabaccess_here">${tooltype} Tools</span>`)
								);
							} else {
								navDropDown.append(
									$(
										`<a class="tabaccess" href="/tabs/spec_tools.html?spec_type=${tooltype}">${tooltype} Tools</a>`
									)
								);
							}
							topnav.append(nextTab);
						});
					}

					let width = 150;
					if (showTabs && "tabs" in data) {
						data.tabs.forEach((tab, index) => {
							let navItem = $(Util.definePageTab(index, tab, true));
							let possible = tab.tabName.length * 14;

							width = width < possible + 10 ? possible + 10 : width;
							if (here === tab.tabName) {
								navItem.addClass("active");
								navDropDown.append($(Util.definePageTab(index, tab, false)));
							} else {
								navDropDown.append($(Util.definePageTab(index, tab, true)));
							}
							topnav.append(navItem);
						});
					}

					navDropDown.css("width", width + "px");
					if (showTabMenus) {
						let buttons = $('<buttons class="navButtons"></buttons>');
						buttons.append(
							$(
								'<button class="deleteButton"><i class="far fa-trash-alt" style="font-size:20px"></i></button>'
							),
							$(
								'<button class="floatButton"><i class="fa fa-bars"></i></button>'
							)
						);

						$("body").append($('<div id="navButtonDiv"/>').append(buttons));
					}

					resolve(data.tabs);
				},
				error => {
					console.log("setUpTabs error: " + error);
					reject([]);
				}
			);
		});
	}
	static setUpTabs(key4id, here, include) {
		here = here.trim();
		if (key4id) {
			return this.completeNavMenu(key4id, here, include);
		}
		return new Promise((resolve, reject) => {
			// need only home nav item
			this.homeButton();
			resolve(null);
		});
	}
	static homeButton() {
		$(".navDropDownButton").html(
			'<i class="fas fa-bars" style="margin-top:10px; border:1px solid white; padding: 10%">'
		);
		let navDropDown = $("navDropDown");

		let topnav = $(".topnav");
		let home_button = $(
			'<a class="home" tabndex="-1" id="home_button"><i class="fas fa-home fa-lg"></i></a>'
		);
		home_button.on("click", Util.goHome);
		topnav.append(home_button);
		let home_link = $(
			'<a href="/" class="home_link"><i class="fas fa-home"></a>'
		);
		home_link.on("click", Util.goHome);
		navDropDown.append(home_link);
	}
	static getTabsData(key4id) {
		return new Promise((resolve, reject) => {
			$.post({
				url: "/get_tabs",
				data: {
					_id: key4id
				},
				dataType: "json"
			})
				.done(result => {
					// console.log(result);
					resolve(result);
				})

				.fail((request, status, error) => {
					console.log(status);
					reject(error);
				});
		});
	}

	static getOneTabsData(key4id, index) {
		return new Promise((resolve, reject) => {
			$.post({
				url: "/get_tabs",
				data: {
					_id: key4id,
					index: index
				},
				dataType: "json"
			})
				.done(result => {
					console.log(result);
					resolve(result);
				})

				.fail((request, status, error) => {
					console.log(status);
					reject(error);
				});
		});
	}

	static definePageTab(num, tab, useTarget) {
		if (useTarget) {
			return $(
				`<a class="tabaccess" tabndex="-1" href="/showtab/${num}/${
					tab.tabName
				}"><span>${tab.tabName}</span></a>`
			);
		} else {
			return $(`<span class="tabaccess_here">${tab.tabName}</span>`);
		}
	}

	/* Toggle between adding and removing the "responsive" class to topnav when the user clicks on the icon */
	static navResponsive() {
		var x = $("#myTopnav");
		if (x.hasClass("topnav")) {
			x.addClass("responsive");
		} else {
			x.addClass("topnav");
		}
	}

	static openInSameTab(url) {
		let existingWindow = window.open(url, "_self");
		existingWindow.focus();
	}
}
