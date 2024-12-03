/*
███████╗██████╗  ██████╗ ███████╗████████╗██╗    ██╗ ██████╗ ██████╗ ██╗     ██████╗ 
██╔════╝██╔══██╗██╔═══██╗██╔════╝╚══██╔══╝██║    ██║██╔═══██╗██╔══██╗██║     ██╔══██╗
█████╗  ██████╔╝██║   ██║███████╗   ██║   ██║ █╗ ██║██║   ██║██████╔╝██║     ██║  ██║
██╔══╝  ██╔══██╗██║   ██║╚════██║   ██║   ██║███╗██║██║   ██║██╔══██╗██║     ██║  ██║
██║     ██║  ██║╚██████╔╝███████║   ██║   ╚███╔███╔╝╚██████╔╝██║  ██║███████╗██████╔╝
╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝    ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═════╝ 
                                                                                     
Account Manager
This file is responsible for managing the user accounts. It will handle the creation, deletion, and updating of accounts.

*/

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { ipcMain } = require('electron');
const { param } = require('jquery');
const axios = require('axios').default;

const APIURL = 'https://api.frostworld.studio/v1';

/* OVERALL STRUCTURE OF ACCOUNTS.JSON

{
    "selectedId": "id",
    "lastLogin": "timestamp",
    "accounts": [
        {
            "id": "id",
            "token": "X",
            "data": {
                "username": "X",
                "email": "X",
                "profileCache": "X",
            }
        }
    ]
}


*/


// This function will create the accounts.json file if it does not exist

function checkForAccountsFile() {
    // if the file "accounts.json" does not exist in the roaming folder, create it
    if (!fs.existsSync(path.join(app.getPath('userData'), 'fwaccounts.json'))) {
        fs.writeFileSync(path.join(app.getPath('userData'), 'fwaccounts.json'), JSON.stringify([]));
    }
}

function getSelectedAccount() {
    // read the "selectedId" from the "accounts.json" file
    const accounts = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'fwaccounts.json')));
    

    try {
        // if the selectedId is null, return null
        if (accounts.selectedId == null) {
            return null;
        }
    } catch (e) {
        return null;
    }

    return accounts.selectedId;
}

function checkForAccounts() {
    // read the "accounts.json" file
    const accounts = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'fwaccounts.json')));
    
    // if the "accounts" array is empty, return false
    try {
        if (accounts.accounts.length === 0) {
            return false;
        }
    } catch (e) {
        return false;
    }

    return true;
}

function askForLogin(event, email, password, tfa=null) {
    console.log('asking for login');
    console.log(email, password);

    const params = new URLSearchParams();
    params.append('email', email);
    params.append('password', password);
    if (tfa != null) {
        params.append('tfa', tfa);
    }

    axios({
        method: 'post',
        url: APIURL + '/user/askForSession',
        data: params,
    }).then((response) => {
        realData = response.data.data;
        console.log(response.data);
        if (realData.success) {
            return realData.token;
        } else {
            console.log(realData.err);
            switch (realData.err) {
                case 'tfa-required':
                    event.sender.send('login-failed', 'tfa-required');
                    break;
                case 'invalid-tfa':
                    event.sender.send('login-failed', 'invalid-tfa');
                    break;
                case 'invalid-cred':
                    event.sender.send('login-failed', 'invalid-credentials');
                    break;
                default:
                    event.sender.send('login-failed', 'unknown-error');
                    break;
            }
            return null;
        }
    }).catch((error) => {
        console.error(error); // Log the error for debugging
        return null;
    });
}

function registerAccount(token) {
    
}

/* IPC EVENTS */

ipcMain.on('login', (event, arg) => {
    // get the email and password from the event
    const email = arg.email;
    const password = arg.password;

    // send the email and password to the askForLogin function
    const token = askForLogin(event, email, password);

    // if the token is null, send the "login-failed" event
    if (token == null) {
        return;
    }

    // send the token to the registerAccount function

    registerAccount(token);

    // send the "login-success" event

    event.sender.send('login-success');
});


module.exports = {
    checkForAccountsFile,
    getSelectedAccount,
    checkForAccounts
};