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
    }
});

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
            break;
    }

});

