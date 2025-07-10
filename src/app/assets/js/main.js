// When page is fully loaded, run clock function

document.addEventListener('DOMContentLoaded', fn, false);
bodyUid = document.body.getAttribute('uid');

function fn() {

	InitClock();
	//InitSwiper(); -- DEPRECATED, now handled by the gameManager!
	InitNavigation();
	InitNewAccountCtner();

	$profileBar = $("#profiles");

	// the tfa form is from #signin_code_1 to #signin_code_6
	// when user write a number in the last input, we send the login request
	// else, we focus the next input

	$("[id^=signin_code_]").each(function () {
		$(this).on('input', function () {
			console.log($(this).val());

			if ($(this).val().length == 1) {
				if ($(this).attr("id") == "signin_code_6") {
					return;
				} else {
					nextId = parseInt($(this).attr("id").split("_")[2]) + 1;
					$("#signin_code_" + nextId).focus();
				}
			}
		});

		$(this).on('keydown', function (e) {

			if (e.key == "Backspace") {
				e.preventDefault();
				$(this).val("");
				prevId = parseInt($(this).attr("id").split("_")[2]) - 1;
				$("#signin_code_" + prevId).focus();
			}
		});
	});

	// if the user past a 6 digit code in the first input, we split it and fill the inputs
	$("#signin_code_1").on('paste', function (e) {
		e.preventDefault();
		const clipboardData = e.originalEvent.clipboardData;
		const pastedData = clipboardData.getData('text');

		if (pastedData.length === 6 && /^\d+$/.test(pastedData)) {
			for (let i = 0; i < 6; i++) {
				$("#signin_code_" + (i + 1)).val(pastedData[i]);
			}
			// focus the last input
			$("#signin_code_6").focus();
			var email = $("#signin_login").val();
			var password = $("#signin_password").val();
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
				var backdrop = $(slide).attr('data-backdrop') || "./assets/images/stock/backdrop/default.png";
				console.log("Swiper initialized with backdrop: " + backdrop);
				console.log("Swiper initialized with slide name: " + $(slide).attr('data-name'));
				changeInfo($(slide).attr('data-name'), backdrop, slide);
				IdToSlide = localStorage.getItem('gameSwiperIndex');
			},
			slideChange: function () {
				var slide = this.slides[this.activeIndex];
				var backdrop = $(slide).attr('data-backdrop') || "./assets/images/stock/backdrop/default.png";
				changeInfo($(slide).attr('data-name'), backdrop, slide);
			}
		}
	}

	Object.assign(swiperEl, swiperParams);

	swiperEl.initialize();

}

function changeInfo(text, backdrop, slide) {

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

	console.log("Changing game title to: " + text);
	console.log("Changing backdrop to: " + backdrop);

	//$(".gameOverview-background").css("background-image", "url(" + backdrop + ")");
	
	backdrop = backdrop.replace(/\\/g, '/'); // Ensure the path is in the correct format

	var gameId = $(slide).attr('data-game-id');
	$("#footerDownload").attr("data-currentgameId", gameId);

	document.getElementsByClassName("gameOverview-background")[0].style.backgroundImage = `url('${backdrop}')`;
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

			/*
			var banner = imageParent.parent().attr("data-banner");
			// change users-background background to data-banner attribute of the clicked profile with a fade-in effect
			if (banner) {
				// strip the "data:image/png;base64," part
				var base64Data = banner.replace(/^data:image\/png;base64,/, "");
				var byteCharacters = atob(base64Data);
				var byteNumbers = new Array(byteCharacters.length);
				for (var i = 0; i < byteCharacters.length; i++) {
					byteNumbers[i] = byteCharacters.charCodeAt(i);
				}
				var byteArray = new Uint8Array(byteNumbers);
				var blob = new Blob([byteArray], {
					type: 'image/png'
				});
				var url = URL.createObjectURL(blob);
				//$(".users-background").css("background-image", "url(" + url + ")");
			}
			*/

			// set the user icon to the clicked profile's uid
			// $("#userProfilePicture").attr("src", "./assets/images/stock/profiles/" + bodyUid + ".png");
			// $("#userProfileName").text(spanText);

		});

		$profileBar.find(".pfp").parent().removeClass("border-4 border-white");
		// get image with uid = bodyUid
		$profileBar.find(".pfp").each(function () {
			if ($(this).attr("uid") == bodyUid) {
				$(this).parent().addClass("border-4 border-white");
				// change users-background background to data-banner attribute of the clicked profile with a fade-in effect
				/*var banner = $(this).parent().parent().attr("data-banner");

				// make blob from the b64 banner (data-banner attribute)
				if (banner) {
					// strip the "data:image/png;base64," part
					var base64Data = banner.replace(/^data:image\/png;base64,/, "");
					var byteCharacters = atob(base64Data);
					var byteNumbers = new Array(byteCharacters.length);
					for (var i = 0; i < byteCharacters.length; i++) {
						byteNumbers[i] = byteCharacters.charCodeAt(i);
					}
					var byteArray = new Uint8Array(byteNumbers);
					var blob = new Blob([byteArray], {
						type: 'image/png'
					});
					var url = URL.createObjectURL(blob);
					//$(".users-background").css("background-image", "url(" + url + ")");
				}*/

			}
		});

	});

	$("#gameoptions").on("click", function () {
		// Open the game settings overlay
		$("#optionsOverlay").fadeIn(300);
	});

	$("#optionSubmit").on("click", function (e) {
		e.preventDefault();
		var path = $("#option_path").val();
		var gameId = $("#gameLibOverview").data("gameInfo");
		console.log("Game settings submitted for game ID: " + gameId + " with path: " + path);
		ipcRenderer.invoke('set-game-path', gameId, path)
			.then(response => {
				console.log("Game path set successfully:", response);
				$("#optionsOverlay").fadeOut(300);
			})
			.catch(err => {
				console.error("Error setting game path:", err);
			});
	});

	$("#optionCancel").on("click", function () {
		// Close the game settings overlay
		$("#optionsOverlay").fadeOut(300);
		$("#option_path").val($("#option_path").data("defaultPath")); // Reset to default path
	});

	$("#download").on("click", function () {
		// Trigger the download process for the selected game
		var gameId = $("#gameLibOverview").data("gameInfo");
		console.log("Download button clicked for game ID: " + gameId);
		console.log("Download requested for game ID: " + gameId);
		ipcRenderer.send('download-game', gameId);
	});

	$("#play").on("click", function () {
		// Trigger the game launch process for the selected game
		var gameId = $("#gameLibOverview").data("gameInfo");
		console.log("Play button clicked for game ID: " + gameId);
		ipcRenderer.invoke('launch-game', gameId)
			.then(response => {
				console.log("Game launched successfully:", response);
			})
			.catch(err => {
				console.error("Error launching game:", err);
			});
	});

	$("#cancelDownload").on("click", function () {
		// Cancel the download process for the selected game
		console.log("Cancel download button clicked");
		ipcRenderer.send('cancel-download');
		setTimeout(() => {
			$("#gameButtons").show();
			$('#downloadProgress').hide();
			$("#download").show();
			$("#play").hide();
			$("#gameoptions").show();

		}, 1000);
	});
}

function InitNewAccountCtner() {
	var newProfileBtn = $("#newprofile");
	var newAccountContainer = $("#newAccountContainer");

	var newAccountBtn = $("#newloginSubmit");

	var newBg = $(".newuser-background");

	newProfileBtn.on("click", function () {
		// toggle the new account container

		if (newAccountContainer.hasClass("slideDown")) {
			newAccountContainer.removeClass("slideDown");
			newBg.fadeOut(300);
			newAccountContainer.slideUp(300, function () {
				$("#newAccountCard").show();
				$("#newtfaCard").hide();
			});
		} else {
			newAccountContainer.addClass("slideDown");
			newAccountContainer.slideDown(300);
			newBg.fadeIn(300);

		}
	});

	newAccountBtn.on("click", function (e) {
		e.preventDefault();
		var email = $("#signin_login").val();
		var password = $("#signin_password").val();
		console.log("New account request with email: " + email + " and password: " + password);
		askForNewAccount(e, email, password);
	});


}


function renderGames(games) {
	console.log("We got a call to render games");
	console.log(games);

	$("#gameList").empty(); // Clear the game list before rendering
	games.forEach(game => {

		iconPath = game.assetsPaths.icon || "./assets/images/defaults/gameicon.png"; // Use the cached icon path or a default icon if not available
		gameName = game.name || "Unknown Game"; // Fallback to "Unknown Game" if name is not available

		html = `
		<div data-gameflow="${game.id}"
			class="flex items-center gap-2 bg-black/30 hover:bg-black/50 transition p-2 rounded cursor-pointer">
			<img src="${iconPath}" alt="Icone" class="w-10 h-10 object-cover rounded-full" />
			<span class="text-sm text-white">${gameName}</span>
		</div>
		`;

		$("#gameList").append(html);
	});

	// Bind click events to the game items
	$("#gameList").find("div[data-gameflow]").each(function () {
		$(this).on("click", function () {
			var gameFlow = $(this).attr("data-gameflow");
			console.log("Game clicked: " + gameFlow);
			// Here you can handle the game launch or navigation
			// For example, you might want to send an IPC message to launch the game
			ipcRenderer.invoke('get-game-info', gameFlow)
				.then(gameInfo => {
					console.log("Game info received:", gameInfo);
					// You can now use gameInfo to display more details or launch the game
					switchgameOverview(gameInfo);
				})
				.catch(err => {
					console.error("Error getting game info:", err);
				});
		});
	});

}

function switchgameOverview(gameInfo) {
	// Switch to the game overview section and display the game info
	$("#gameLibOverview").fadeOut(300, function () {

		if (!gameInfo.assetsPaths.icon) {
			gameInfo.assetsPaths.icon = './assets/images/defaults/gameicon.png'; // Default icon if not provided
		}
		if (!gameInfo.assetsPaths.hero) {
			gameInfo.assetsPaths.hero = './assets/images/defaults/gameicon.png'; // Default hero
		}
		if (!gameInfo.assetsPaths.title) {
			gameInfo.assetsPaths.title = './assets/images/defaults/gameicon.png'; // Default title
		}

		// Replace \\ with / in the paths for consistency
		gameInfo.assetsPaths.icon = gameInfo.assetsPaths.icon.replace(/\\/g, '/') || './assets/images/defaults/gameicon.png';
		gameInfo.assetsPaths.hero = gameInfo.assetsPaths.hero.replace(/\\/g, '/') || './assets/images/defaults/gameicon.png';

		document.getElementById("gameLibOverview-background").style.backgroundImage = `url('${gameInfo.assetsPaths.hero || './assets/images/defaults/gamebanner.png'}')`;
		$("#gameLibOverview-titleImg").attr("src", gameInfo.assetsPaths.title || './assets/images/defaults/gametitle.png');

		console.log("Switching to game overview for:", gameInfo.name);
		console.log("Background image set to:", gameInfo.assetsPaths.hero || './assets/images/defaults/gamebanner.png');
		console.log("Title image set to:", gameInfo.assetsPaths.title || './assets/images/defaults/gametitle.png');

		fullNameOnlyAlpha = gameInfo.name.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, ' ').replace(/ /g, '_').toLowerCase();

		$("#option_path").val(`C:/FrostWorldLibrary/${fullNameOnlyAlpha}`);
		$("#option_path").data("defaultPath", `C:/FrostWorldLibrary/${fullNameOnlyAlpha}`); // Store the default path for the game

		$("#gameLibOverview").data("gameInfo", gameInfo.id); // Store the game ID in the overview section

		isInstalledLocally = gameInfo.isInstalledLocally || false; // Check if the game is installed locally

		if (isInstalledLocally) {
			$("#gameButtons").show();
			$("#download").hide();
			$("#gameoptions").hide();
			$("#play").show();
		} else {
			$("#gameButtons").show();
			$("#download").show();
			$("#gameoptions").show();
			$("#play").hide();
		}

		// Show the game overview section
		$("#gameLibOverview").fadeIn(300);

	});
}

function constructSwiper(games) {
	const swiperContainer = $("#gameSwiper");
	$("swiperContainer").empty(); // Clear the swiper container before adding new slides

	games.forEach(game => {
		
		if (!game.assetsPaths || !game.assetsPaths.card) {
			console.warn(`No card asset found for game: ${game.name}`);
			game.assetsPaths.card = null;
		}

		let cardPath = game.assetsPaths.card || './assets/images/defaults/gamecard.png'; // Use the cached card path or a default card if not available
		let gameName = game.name || "Unknown Game"; // Fallback to "Unknown Game" if name is not available
		let backdrop = game.assetsPaths.backdrop;
		let gameShortName = game.shortname;

		var html = `
		<swiper-slide data-name="${gameName}" data-backdrop="${backdrop}" data-swiper-slide-id="${gameShortName}" data-game-id="${game.id}">
            <img src="${cardPath}" />
        </swiper-slide>`;

		$(swiperContainer).append(html);
		
	});

	// right before initializing the swiper, we sort the slides
	// put the one with default cardpath at the end
	$(swiperContainer).find("swiper-slide").sort(function (a, b) {
		let aCardPath = $(a).find("img").attr("src");
		let bCardPath = $(b).find("img").attr("src");

		if (aCardPath === './assets/images/defaults/gamecard.png') {
			return 1; // Move to the end
		} else if (bCardPath === './assets/images/defaults/gamecard.png') {
			return -1; // Move to the end
		}
		return 0; // Keep order
	}).appendTo(swiperContainer);
		

	console.log($(swiperContainer).html()); // Log the constructed HTML for debugging


	InitSwiper();
}