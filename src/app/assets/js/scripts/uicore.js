const $ = require('jquery')
const ipcRenderer = require('electron').ipcRenderer;

document.addEventListener('readystatechange', function () {
    if (document.readyState === 'interactive') {
        // Bind minimize button.
        Array.from(document.getElementsByClassName('fMb')).map((val) => {
            val.addEventListener('click', e => {
                ipcRenderer.send('minimize-app')
            })
        })

        Array.from(document.getElementsByClassName('fCb')).map((val) => {
            val.addEventListener('click', e => {
                ipcRenderer.send('close-app')
            })
        })

        // Bind maximize button.
        Array.from(document.getElementsByClassName('fRb')).map((val) => {
            val.addEventListener('click', e => {
                ipcRenderer.send('maximize-app')
            })
        })

        $("#loginSubmit").on('click', function (e) {
            e.preventDefault();
            ipcRenderer.send('login', {
                email: $('#signin_login').val(),
                password: $('#signin_password').val(),
            });
        });
        $("#loginSubmitWithTfa").on('click', function (e) {
            e.preventDefault();
            var tfaCode = $('#signin_code_1').val() + $('#signin_code_2').val() + $('#signin_code_3').val() + $('#signin_code_4').val() + $('#signin_code_5').val() + $('#signin_code_6').val();
            ipcRenderer.send('login', {
                email: $('#signin_login').val(),
                password: $('#signin_password').val(),
                tfa: tfaCode
            });
        });
        $("#newloginSubmit").on('click', function (e) {
            e.preventDefault();
            ipcRenderer.send('new-account', {
                email: $('#new_signin_login').val(),
                password: $('#new_signin_password').val(),
            });
        });
        $("#newloginSubmitWithTfa").on('click', function (e) {
            e.preventDefault();
            var tfaCode = $('#new_signin_code_1').val() + $('#new_signin_code_2').val() + $('#new_signin_code_3').val() + $('#new_signin_code_4').val() + $('#new_signin_code_5').val() + $('#new_signin_code_6').val();
            ipcRenderer.send('new-account', {
                email: $('#new_signin_login').val(),
                password: $('#new_signin_password').val(),
                tfa: tfaCode
            });
        });

        getGames().then(games => {
            console.log('Games loaded:', games);
            renderGames(games);
            constructSwiper(games);
        }).catch(err => {
            console.error('Error loading games:', err);
        });
    }
});

function askForLogin(event, email, password, tfaCode = null) {
    // send the login request to the main process
    ipcRenderer.send('login', {
        email: email,
        password: password,
        tfa: tfaCode
    });
}

function askForNewAccount(event, email, password, tfaCode = null) {
    // send the new account request to the main process
    ipcRenderer.send('new-account', {
        email: email,
        password: password,
        tfa: tfaCode
    });
}

function switchAccount(event, accountId) {
    // send the switch account request to the main process
    ipcRenderer.send('switch-account', {
        accountId: accountId
    });
}

// when the "check-for-accounts" message is received

ipcRenderer.on('check-for-accounts', (event, arg) => {
    switch (arg) {
        case true:
            $('#loginOverlay').hide();
            break;
        case false:
            $('#loginOverlay').show();
            break;
        default:
            $('#loginOverlay').show();
            break;
    }
});

ipcRenderer.on('login-failed', (event, arg) => {

    console.log('Received login failed event with arg: ' + arg);

    switch (arg) {
        case 'tfa-required':
            $('#tfaCard').show();
            $('#loginCard').hide();
            $('#newAccountCard').hide();
            $('#newtfaCard').show();
            break;
    }

});

ipcRenderer.on('hide-overlay', (event, arg) => {
    // Hide the overlay
    setTimeout(() => {
        $('#loaderOverlay').hide();
    }, 1000);
});

function getGames() {
    return new Promise((resolve, reject) => {
        ipcRenderer.invoke('get-games')
            .then(games => {
                console.log('Games received:', games);
                resolve(games);
            })
            .catch(err => {
                console.error('Error getting games:', err);
                reject(err);
            });
    });
}



ipcRenderer.on('download-game-start', (event, arg) => {
    console.log('Download started for game ID:', arg);
    // get current game ID from the gameLibOverview data "gameInfo"
    let libraryOverview = $('#gameLibOverview')[0];
    let gameInfo = $(libraryOverview).data('gameInfo');
    
    let gameId = parseInt(gameInfo, 10);

    if (!isNaN(gameId) && gameId == arg.gameId) {
        $("#gameButtons").hide();
        $('#downloadProgress').show();
        $('#downloadBar').css('width', '0%');
        $('#downloadSpeed').text('0 KB/s');
        $('#downloadSize').text('0 MB / 0 MB');
        $("#downloadPercent").text('0%');
    }
    
    console.log('Current game ID:', gameId, 'Arg game ID:', arg.gameId);
    
});
ipcRenderer.on('download-game-progress', (event, arg) => {
    console.log('Download progress for game ID:', arg.gameId, 'File:', arg.file, 'Downloaded:', arg.downloadedSize, 'Total:', arg.totalSize);
    let libraryOverview = $('#gameLibOverview')[0];
    let gameInfo = $(libraryOverview).data('gameInfo');
    let gameId = parseInt(gameInfo, 10);

    console.log('Current game ID:', gameId, 'Arg game ID:', arg.gameId);

    if (!isNaN(gameId) && gameId == arg.gameId) {
        let percentage = (arg.downloadedSize / arg.totalSize) * 100;
        $("#gameButtons").hide();
        $('#downloadProgress').show();
        $('#downloadBar').css('width', percentage + '%');
        $('#downloadSpeed').text(arg.downloadSpeed);
        $("#downloadPercent").text(`${percentage.toFixed(2)}%`);
        $('#downloadSize').text(`${(arg.downloadedSize / 1024 / 1024).toFixed(2)} MB / ${(arg.totalSize / 1024 / 1024).toFixed(2)} MB`);
    }

});
ipcRenderer.on('download-game-complete', (event, arg) => {
    console.log('Download complete for game ID:', arg);
    $("#gameButtons").show();
    $('#downloadProgress').hide();
});