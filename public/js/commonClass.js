/*exported Common */
// common.js

class Common {
	constructor() {
		this.COOKIENAME = "chosenCookie"; // IMPORTANT: Also defined in topRouter.js
		this.KEY4_ORDER = ["dept", "partId", "op", "machine"]; // also defined in topRouter.js, _id in most collections
		this.KEY5_ORDER = ["dept", "machine" ,"op", "pName","partId",]; // also include pName value
		this.setCookie();
	}

	setCookie() {
		this.cookieValue = unescape(this.readCookie());
	}
	// Cookie handlers

	getKey4_ORDER() {
		return this.KEY4_ORDER;
	}
	getKey5_ORDER() {
		return this.KEY5_ORDER;
	}

	getParsedCookie() {
		this.setCookie();
		// alert("getParsedCookie " + this.cookieValue);
		return JSON.parse(this.cookieValue);
	}

	readCookie() {
		var nameEQ = this.COOKIENAME + "=";
		var ca = document.cookie.split(";");
		for (var i = 0; i < ca.length; i++) {
			var c = ca[i];
			while (c.charAt(0) === " ") {
				c = c.substring(1, c.length);
			}
			if (c.indexOf(nameEQ) === 0) {
				return c.substring(nameEQ.length, c.length);
			}
		}
		return null;
	}

	getKey4() {
		let c = this.getParsedCookie();
		delete c.pName;
		return c;
	}

	getKey4id() {
		let c = this.getKey4();
		return this.KEY4_ORDER.map(key => c[key]).join("|");
	}

	getKeys() {
		return this.KEY5_ORDER;
	}

	jobTitle() {
		let key5 = this.getParsedCookie();
		return this.getKeys()
			.map(key => key5[key])
			.join(" : ");
	}

	getCookieName() {
		return this.COOKIENAME; // TODO: 
	}
}
