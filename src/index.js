const {
    app,
    BrowserWindow,
    ipcMain,
    Menu,
    shell
} = require('electron')
const {
    pathToFileURL
} = require('url');
const path = require('path');
const fs = require('fs');
const ejse = require('ejs-electron')
const accounts = require('./libs/accountManager');
const axios = require('axios').default;

// App will create a new window, display the waiting overlay, and hide overlay when the window is ready
// app is in app.ejs

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) app.quit();
const {
    updateElectronApp,
    UpdateSourceType
} = require('update-electron-app')
// Check for updates except for macOS
if (process.platform !== 'darwin') {
    updateElectronApp()
}

var launcherVersion = app.getVersion();
let win;


app.on('uncaughtException', (err) => {
    //Write error to file
    fs.writeFileSync(path.join(__dirname, 'error.log'), err);
});

app.on('unhandledRejection', (err) => {
    //Write error to file
    fs.writeFileSync(path.join(__dirname, 'error.log'), err);
});

async function createWindow() {

    // no resizable, no bar
    win = new BrowserWindow({
        width: 1600,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'app', 'assets', 'js', 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, 'app', 'assets', 'favicon.ico'),
        resizable: false,
        frame: false,

    });

    var data = {}

    if (accounts.getSelectedAccount() !== null) {
        var lastToken = await accounts.getSelectedAccountToken();
        var accInfo = await accounts.getAccountInfo(lastToken);
        data = {
            launcherVersion: launcherVersion,
            account: {
                id: accInfo.id,
                username: accInfo.username,
                email: accInfo.email,
                pfp: accInfo.pfp,
                banner: accInfo.banner,
                token: accounts.getSelectedAccount(),
                displayname: accInfo.displayname,
                displaynameRaw: accInfo.displaynameRaw,
            },
            accountManager: {
                accounts: accounts.getAccounts(),
                selectedAccount: accounts.getSelectedAccount()
            }
        }
    } else {
        data = {
            launcherVersion: launcherVersion,
            account: {
                id: 0,
                username: 0,
                email: 0,
                pfp: 0,
                banner: 0,
                token: 0,
                displayname: 0,
                displaynameRaw: 0,
            },
            accountManager: {
                accounts: {},
                selectedAccount: null,
            }
        }
    }


    Object.entries(data).forEach(([key, val]) => ejse.data(key, val))

    win.loadURL(pathToFileURL(path.join(__dirname, 'app', 'app.ejs')).toString())

    win.webContents.on('did-finish-load', () => {
        win.webContents.send('hide-overlay');
    });

    // Send the checkForAccounts() result to the renderer

    win.webContents.on('did-finish-load', () => {
        win.webContents.send('check-for-accounts', accounts.checkForAccounts());
    });

    win.openDevTools();
}

function ErrorWindow(title, message) {
    const errorWin = new BrowserWindow({
        width: 600,
        height: 400,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        resizable: false,
        frame: false,
    });

    ejse.data('title', title);
    ejse.data('message', message);

    errorWin.loadURL(pathToFileURL(path.join(__dirname, 'app', 'errors', 'launchError.ejs')).toString());

    win = errorWin;
}



ipcMain.on('minimize-app', () => {
    win.minimize();
});

ipcMain.on('close-app', () => {
    win.close();
});

ipcMain.on('relaunch-app', () => {
    // relaunch the app
    app.relaunch();
    app.exit(0);
});

ipcMain.on('maximize-app', () => {
    if (win.isMaximized()) {
        win.unmaximize();
    } else {
        win.maximize();
    }
});
// app.on('ready', createWindow);
async function getApiPing() {
    return new Promise((resolve, reject) => {
        axios.get('https://api.frostworld.studio/v1/ping')
            .then(response => {
                console.log('API response:', response.data);
                if (response.status === 200 && response.data.message === 'pong!') {
                    console.log('API is reachable');
                    resolve(true);
                } else {
                    console.error('API is not reachable, status:', response.status, 'message:', response.data.message);
                    reject(false);
                }
            })
            .catch(error => {
                console.error('Error reaching API:', error.message);
                reject(false);
            });
    });
}


async function launchMain() {
    if (!app.requestSingleInstanceLock()) return app.quit();

    app.on('second-instance', () => {
        if (win) {
            if (win.isMinimized()) win.restore();
            win.focus();
        }
    });

    app.setAsDefaultProtocolClient('fwlauncher');

    try {
        console.log('Pinging API before launching app...');
        await getApiPing(); // Attente du pong
        console.log('API pong received. Launching app...');
    } catch (error) {
        console.error('API did not respond. Showing simple error window...');
        ErrorWindow('API Error', 'The Frost World Studio API is not reachable. Please check your internet connection or try again later.');
        return;
    }

    app.whenReady().then(() => {
        createWindow();
        app.on("activate", () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    accounts.checkForAccountsFile();
}

launchMain();