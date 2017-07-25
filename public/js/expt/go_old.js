 // go.js
 $( function() {
    $( "#tabs" ).tabs();

	
    $("#tabs-2 pictures img").on("click", function() {
		$(".pic").css("background-color","white");
		$(this).parent().css("background-color","yellow");
		$("single h2").text("Tool " + $(this).attr("num") + ": " + $(this).attr("alt"));
		$("single img").attr("src",$(this).attr("src"));
	});


  
  
  
  } );