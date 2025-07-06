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
    }
});

function askForLogin(event, email, password, tfaCode=null) {
    // send the login request to the main process
    ipcRenderer.send('login', {
        email: email,
        password: password,
        tfa: tfaCode
    });
}

function askForNewAccount(event, email, password, tfaCode=null) {
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

