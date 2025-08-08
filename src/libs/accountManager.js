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
const {
    app
} = require('electron');
const {
    ipcMain
} = require('electron');
const {
    param
} = require('jquery');
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

function doesAccountExist(id) {
    // read the "accounts.json" file
    const accounts = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'fwaccounts.json')));

    // validate accounts array
    if (!accounts.accounts || accounts.accounts.length === 0) {
        return false;
    }

    // Use Array.prototype.some for early exit
    return accounts.accounts.some(account => {
        console.log('Checking account:', account.id, 'against id:', id);
        return account.id == id;
    });
}

function getSelectedAccount() {
    // read the "selectedId" from the "accounts.json" file
    const accounts = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'fwaccounts.json')));

    console.log('Checking selected account ID:', accounts.selectedId);

    try {
        // if the selectedId is null, return null
        if (accounts.selectedId == null) {
            return null;
        }
    } catch (e) {
        return null;
    }

    selectedId = accounts.selectedId;

    // if the accounts.selectedId doesn't have a corresponding account, return the first account's id and set it as the selectedId
    if (!doesAccountExist(selectedId)) {
        console.warn('Selected account ID does not exist, returning first account ID if available.');
        if (accounts.accounts.length > 0) {
            selectedId = accounts.accounts[0].id;
            accounts.selectedId = selectedId; // Update the selectedId in the accounts file
            fs.writeFileSync(path.join(app.getPath('userData'), 'fwaccounts.json'), JSON.stringify(accounts, null, 4));
        } else {
            return null; // No accounts available
        }
    }

    return selectedId; // return the selectedId
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

async function getTokenFromId(id) {
    console.log('Getting token for account with id:', id);
    // read the "accounts.json" file
    const accounts = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'fwaccounts.json')));

    if (!accounts.accounts || accounts.accounts.length === 0) {
        console.warn('No accounts found in the accounts file.');
        return null;
    }

    const account = accounts.accounts.find(account => account.id == id);
    if (account) {
        console.log('Found account with id:', id, 'and token:', account.token);
        return account.token;
    }

    console.warn('Account with id:', id, 'not found in accounts file.');
    return null; // if no account with the given id is found, return null
}

async function getSelectedAccountToken() {
    const accounts = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'fwaccounts.json')));
    const accountsSelected = accounts.selectedId;

    // if the selected id is null, return null
    if (accountsSelected === null) {
        return null;
    }

    // if accounts.accounts is empty, or non existent, or undefined, return null
    if (!accounts.accounts || accounts.accounts.length === 0) {
        console.warn('No accounts found in the accounts file.');
        return null;
    }

    const account = accounts.accounts.find(account => account.id == accountsSelected);
    if (!account) {
        console.warn('No token found for selected account with id:', accountsSelected);
        throw 'No token found for selected account';
    }

    console.log('Found account with id:', accountsSelected, 'and token:', account.token);
    console.log('Returning token:', account.token);
    return account.token; // resolve the promise with the token
}

async function getAccountInfo(token = null) {
    // if the token is null, get the selected account token
    if (token === null) {
        console.log('No token provided, getting selected account token...');
        token = await getSelectedAccountToken().then((token) => {
            console.log('Selected account token:', token);
            return token;
        }).catch((error) => {
            console.error('Error getting selected account token:', error);
            return null; // Return null if there's an error
        });
        // if the token is still null, return null
        if (token === null) {
            console.warn('ABORTING: No token available to fetch account info.');
            return null;
        }
    }
    try {
        const response = await axios.get(APIURL + '/user/info/me', {
            headers: {
                'X-FW-Token': `Bearer ${token}`
            }
        });

        responseData = response.data;

        // Check if we have this token in the accounts file, if we do, update profileCache of said user's data
        // profileCache will be used to store multiple profile pictures, banners, etc.
        const accountsPath = path.join(app.getPath('userData'), 'fwaccounts.json');
        let accounts;
        try {
            accounts = JSON.parse(fs.readFileSync(accountsPath));
            // Ensure structure
            if (!accounts.accounts) {
                accounts = {
                    selectedId: null,
                    lastLogin: null,
                    accounts: []
                };
            }
        } catch (e) {
            // If file is empty or invalid, initialize structure
            accounts = {
                selectedId: null,
                lastLogin: null,
                accounts: []
            };
        }

        let userCached = [
            "uid",
            "isPasswordSet",
            "username",
            "displayname",
            "displaynameRaw",
            "email",
            "aboutme",
            "pfp",

        ]

        // pfp and banner are special cases, we need to fetch them and encode them in base64
        // for offline usage

        const accountIndex = accounts.accounts.findIndex(acc => acc.token === token);
        if (accountIndex !== -1) {
            responseData = responseData.data; // Access the data property directly
            // First, we update all information in the account with the new data corresponding to userCached
            console.log('Account found in accounts file, updating profileCache...');

            // if the profileCache does not exist, create it
            if (!accounts.accounts[accountIndex].data.profileCache) {
                accounts.accounts[accountIndex].data.profileCache = {};
            }

            userCached.forEach(key => {
                if (responseData[key]) {
                    accounts.accounts[accountIndex].data.profileCache[key] = responseData[key];
                }
            });


            // Then, we update the pfp and banner if they exist
            if (responseData.pfp) {
                try {
                    const pfpResponse = await axios.get(responseData.pfp, {
                        responseType: 'arraybuffer'
                    });
                    const mime = pfpResponse.headers['content-type']; // e.g. 'image/png'
                    const base64Pfp = `data:${mime};base64,` + Buffer.from(pfpResponse.data).toString('base64');
                    accounts.accounts[accountIndex].data.profileCache.pfp = base64Pfp;
                } catch (error) {
                    console.error('Error fetching profile picture:', error);
                }
            }
            if (responseData.banner) {
                try {
                    const bannerResponse = await axios.get(responseData.banner, {
                        responseType: 'arraybuffer'
                    });
                    const mime = bannerResponse.headers['content-type']; // e.g. 'image/png'
                    const base64Banner = `data:${mime};base64,` + Buffer.from(bannerResponse.data).toString('base64');
                    accounts.accounts[accountIndex].data.profileCache.banner = base64Banner;
                } catch (error) {
                    console.error('Error fetching banner:', error);
                }
            }
            

        }
        fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 4));
        return response.data.data;
    } catch (error) {
        throw error;
    }
}

async function askForLogin(event, email, password, tfa = null) {
    console.log('asking for login');
    console.log(email, password, tfa);

    const params = new URLSearchParams();
    params.append('email', email);
    params.append('password', password);
    if (tfa !== null) {
        params.append('tfa', tfa);
    }

    try {
        const response = await axios({
            method: 'post',
            url: APIURL + '/user/askForSession',
            data: params,
        });

        const realData = response.data.data;

        if (realData.success) {
            console.log('Login successful');
            event.sender.send('login-success', realData.token);
            console.log('Token:', realData.token);
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
    } catch (error) {
        console.error('Login request failed:', error);
        event.sender.send('login-failed', 'network-error');
        return null;
    }
}

async function registerAccount(token, dontselect = false, relaunch = false) {

    console.log('Registering account with token:', token);

    try {
        // Fetch user data using the token
        const response = await axios.get(APIURL + '/user/info/me', {
            headers: {
                'X-FW-Token': `Bearer ${token}`
            }
        });
        const userData = response.data.data;

        // Read the accounts file
        const accountsPath = path.join(app.getPath('userData'), 'fwaccounts.json');
        let accounts;
        try {
            accounts = JSON.parse(fs.readFileSync(accountsPath));
            // Ensure structure
            if (!accounts.accounts) {
                accounts = {
                    selectedId: null,
                    lastLogin: null,
                    accounts: []
                };
            }
        } catch (e) {
            // If file is empty or invalid, initialize structure
            accounts = {
                selectedId: null,
                lastLogin: null,
                accounts: []
            };
        }

        // Create new account object
        const newAccount = {
            id: userData.userid,
            token: token,
            data: {
                profileCache: {
                    uid: userData.uid,
                    isPasswordSet: userData.isPasswordSet,
                    username: userData.username,
                    displayname: userData.displayname,
                    displaynameRaw: userData.displaynameRaw,
                    email: userData.email,
                    aboutme: userData.aboutme || '',
                    pfp: null, // Will be fetched later
                    banner: null // Will be fetched later
                }
            }
        };

        try {
            // Fetch profile picture and banner if they exist
            if (userData.pfp) {
                const pfpResponse = await axios.get(userData.pfp, {
                    responseType: 'arraybuffer'
                });
                const mime = pfpResponse.headers['content-type']; // e.g. 'image/png'
                newAccount.data.profileCache.pfp = `data:${mime};base64,` + Buffer.from(pfpResponse.data).toString('base64');
            }
            if (userData.banner) {
                const bannerResponse = await axios.get(userData.banner, {
                    responseType: 'arraybuffer'
                });
                const mime = bannerResponse.headers['content-type']; // e.g. 'image/png'
                newAccount.data.profileCache.banner = `data:${mime};base64,` + Buffer.from(bannerResponse.data).toString('base64');
            }
        } catch (error) {
            console.error('Error fetching profile picture or banner:', error);
            // If fetching fails, we can leave pfp and banner as null
        }

        // Remove any existing account with the same id
        accounts.accounts = accounts.accounts.filter(acc => acc.id !== userData.userid);

        // Add new account
        accounts.accounts.push(newAccount);


        if (!dontselect) {
            // Update selectedId and lastLogin
            accounts.selectedId = userData.userid;
            accounts.lastLogin = Date.now();
        }

        // Save back to file
        fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 4));
        console.log('Account registered successfully:', newAccount);
        console.log('Updated accounts file:', accounts);
        console.log('Selected account ID:', accounts.selectedId);
        console.log('Last login timestamp:', accounts.lastLogin);
        console.log('Written to:', accountsPath);

        if (relaunch) {
            console.log('Relaunching app...');
            app.relaunch();
            app.exit(0);
        }

    } catch (err) {
        console.error('Failed to register account:', err);
    }
}

/* IPC EVENTS */

ipcMain.on('login', async (event, arg) => {
    // get the email and password from the event
    const email = arg.email;
    const password = arg.password;
    const tfaCode = arg.tfa || null;

    // send the email and password to the askForLogin function
    const token = await askForLogin(event, email, password, tfaCode);

    // if the token is null, send the "login-failed" event
    if (token == null) {
        console.log('Login failed, token is null');
        return;
    }

    // send the token to the registerAccount function

    console.log('Token received:', token);
    console.log('Registering account with token:', token);
    registerAccount(token, false, true);
    // send the "login-success" event
    event.sender.send('login-success');

});

ipcMain.on('new-account', async (event, arg) => {
    // get the email and password from the event
    const email = arg.email;
    const password = arg.password;
    const tfaCode = arg.tfa || null;

    // send the email and password to the askForLogin function
    const token = await askForLogin(event, email, password, tfaCode);

    // if the token is null, send the "login-failed" event
    if (token == null) {
        console.log('New account creation failed, token is null');
        return;
    }

    // send the token to the registerAccount function
    console.log('Token received for new account:', token);
    registerAccount(token, true, true);
    // send the "new-account-success" event
    event.sender.send('new-account-success');
});

ipcMain.on('switch-account', async (event, arg) => {
    // get the account id from the event
    const accountId = parseInt(arg.accountId);

    // check if the account exists
    if (!doesAccountExist(accountId)) {
        console.error('Account with ID', accountId, 'does not exist.');
        event.sender.send('switch-account-failed', 'account-not-found');
        return;
    }


    let accounts = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'fwaccounts.json')));
    // set the selectedId to the account id
    accounts.selectedId = accountId;
    // set the lastLogin to the current timestamp
    accounts.lastLogin = Date.now();
    // write the accounts back to the file
    fs.writeFileSync(path.join(app.getPath('userData'), 'fwaccounts.json'), JSON.stringify(accounts, null, 4));
    // send the "switch-account-success" event
    console.log('Account with ID', accountId, 'exists. Switching to this account.');
    event.sender.send('switch-account-success', accountId);
    app.relaunch();
    app.exit(0);
});

function getAccounts() {
    const accountsPath = path.join(app.getPath('userData'), 'fwaccounts.json');

    try {
        const data = fs.readFileSync(accountsPath, 'utf-8');
        const parsed = JSON.parse(data);

        if (!parsed.accounts || !Array.isArray(parsed.accounts)) {
            return [];
        }

        return parsed.accounts;
    } catch (err) {
        console.error('Error reading accounts:', err);
        return [];
    }
}

function IsLoggedIn() {
    // Check if the accounts file exists and has a selectedId
    const accountsPath = path.join(app.getPath('userData'), 'fwaccounts.json');
    if (!fs.existsSync(accountsPath)) {
        return false;
    }

    const accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf-8'));
    return accounts.selectedId !== null && accounts.selectedId !== undefined && accounts.selectedId !== '' && accounts.selectedId !== 0;
}

function fastReg(token) {
    // This function is used to quickly register an account without going through the login process
    // It will fetch the user data using the token and register the account

    // ONLY WORKS if the user is not logged in
    if (IsLoggedIn()) {
        console.warn('Cannot fast register, user is already logged in.');
        return;
    }

    console.log('Fast registering account with token:', token);
    registerAccount(token, false, true);
}


// watch the fwlauncher protocol for logging in from the browser

module.exports = {
    checkForAccountsFile,
    getSelectedAccount,
    getSelectedAccountToken,
    checkForAccounts,
    getAccountInfo,
    getAccounts,
    fastReg
};