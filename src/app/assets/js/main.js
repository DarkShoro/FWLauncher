
// When page is fully loaded, run clock function

document.addEventListener('DOMContentLoaded', fn, false);
bodyUid = document.body.getAttribute('uid');

function fn() {

	InitClock();
	InitSwiper();
	InitNavigation();

	$profileBar = $("#profiles");

	// Set the user icon to the user's UID
	$("#userProfilePicture").attr("src", "./assets/images/stock/profiles/" + bodyUid + ".png");
	$profileBar.find(".pfp").each(function () {
		if ($(this).attr("uid") == bodyUid) {
			$("#userProfileName").text($(this).attr("alt"));
		}
	});

}

function InitClock() {
	$("#clock").each(function () {

		$this = $(this);

		$this.text(new Date().toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit'
		}));

		setInterval(function () {
			$this.text(new Date().toLocaleTimeString([], {
				hour: '2-digit',
				minute: '2-digit'
			}));
		}, 1000);

	});
}



function InitSwiper() {

	swiperEl = document.querySelector('swiper-container');

	const swiperParams = {
		on: {
			init: function () {
				var slide = this.slides[this.activeIndex];
				var backdrop = "./assets/images/stock/backdrop/" + slide.getAttribute('data-backdrop') + ".png";
				changeInfo(slide.getAttribute('data-name'), backdrop);
				IdToSlide = localStorage.getItem('gameSwiperIndex');
			},
			slideChange: function () {
				var slide = this.slides[this.activeIndex];
				var backdrop = "./assets/images/stock/backdrop/" + slide.getAttribute('data-backdrop') + ".png";
				changeInfo(slide.getAttribute('data-name'), backdrop);
			}
		}
	}

	Object.assign(swiperEl, swiperParams);

	swiperEl.initialize();

}

function changeInfo(text, backdrop) {

	// if the text is more than 25 characters, replace the rest with "..."

	var text = text;
	var infoText = text;

	if (text.length > 50) {
		text = text.substring(0, 50) + "...";
		$("#gameTitle").addClass("text-nowrap");
	} else {
		$("#gameTitle").removeClass("text-nowrap");
	}

	$("#gameTitle").text(text);
	// display full text on hover in a tooltip
	$("#gameTitle").attr("title", infoText);
	$(".gameOverview-background").css("background-image", "url(" + backdrop + ")");
}

function InitNavigation() {
	$navBar = $("#navBar");
	$profileBar = $("#profiles");

	$navBar.find(".navTop").each(function () {

		$(this).on("click", function () {

			if ($(this).hasClass("active")) {
				return;
			}

			if ($(this).hasClass("disabled")) {
				return;
			}
			
			if ($(this).attr("data-flow") != "gameOverview") {
				$("#footer").fadeOut(300);
			} else {
				$("#footer").fadeIn(300);
			}

			// get active element's "data-flow" attribute
			toFadeOut = $navBar.find(".navTop.active").attr("data-flow");
			toFadeIn = $(this).attr("data-flow");
			bgtoFadeIn = "." + $(this).attr("data-flow") + "-background";
			bgtoFadeOut = "." + $navBar.find(".navTop.active").attr("data-flow") + "-background";

			$navBar.find(".navTop").removeClass("active");
			$(this).addClass("active");

			// fade out the active element
			$("#" + toFadeOut).fadeOut(300);
			$(bgtoFadeOut).fadeOut(300);
			$("#" + toFadeIn).fadeIn(300);
			$(bgtoFadeIn).fadeIn(300);

			localStorage.setItem('lastActive', $(this).attr("data-flow"));
		});
	});

	if (localStorage.getItem('lastActive') != null) {
		$navBar.find(".navTop").each(function () {
			if ($(this).attr("data-flow") == localStorage.getItem('lastActive')) {
				$(this).click();
			}
		});
	}

	$profileBar.find(".profile").each(function () {
		// find the ".pfp" class in the profile and get it's parent
		
		$(this).on("click", function () {
			imageParent = $(this).find(".pfp").parent();
			spanText = $(this).find(".uname").text();

			if (imageParent.parent().length == 0) {
				return;
			}
			
			// remove the active class from all profiles
			$profileBar.find(".pfp").parent().removeClass("border-4 border-white");

			// add the active class to the clicked profile
			imageParent.addClass("border-4 border-white");

			// set body's uid to the clicked profile's uid
			bodyUid = $(this).find(".pfp").attr("uid");

			// set the user icon to the clicked profile's uid
			$("#userProfilePicture").attr("src", "./assets/images/stock/profiles/" + bodyUid + ".png");
			$("#userProfileName").text(spanText);

		});
		
		$profileBar.find(".pfp").parent().removeClass("border-4 border-white");
		// get image with uid = bodyUid
		$profileBar.find(".pfp").each(function () {
			if ($(this).attr("uid") == bodyUid) {
				$(this).parent().addClass("border-4 border-white");
			}
		});

	});
}