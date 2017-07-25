 // general.js
var cookieValue = "not set";
 $( function() {
	 console.log("running general");
	var COOKIE = 'chosenCookie';
	cookieValue = unescape(readCookie(COOKIE));

	console.log("general Cookie: "+ getCookie());
	$("#cookie").text(getCookie());
  } );

function getCookie() { return cookieValue; }	
function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}
	
  
	function setThisTab(which) {
		console.log("setThisTab("+which+")");
      $(".w3-bar a").addClass("w3-bar-item w3-button w3-hover-blue w3-padding-8 w3-border");
      $("#t"+which).removeClass("w3-hover-blue").addClass("w3-green");
			var show = $("#t"+which).text();
			$("h1").text(show).css("margin-top","150px");
			$("title").text(show);
	}

	function getImages(item, tab) {
		console.log("getImages cookie " + getCookie());
		return new Promise((resolve, reject) => {
			console.log("getImages " + item + " :: " + tab);
			$.ajax({
							url: "/images",
							type: 'post',
							data: { key: getCookie(), tab: tab }
					})
					.done((result) => resolve(result))
			
					.fail((request, status, error) => reject(error))
					
					.always(() => console.log("getImages complete"));   
		});
	}

  


