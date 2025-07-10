const {
    app,
    BrowserWindow,
    ipcMain,
    Menu,
    shell,
    autoUpdater,
    dialog
} = require('electron')
const {
    pathToFileURL
} = require('url');
const path = require('path');
const fs = require('fs');
const ejse = require('ejs-electron')
const accounts = require('./libs/accountManager');
const gameManager = require('./libs/gameManager');
const axios = require('axios').default;

let deepLinkUrl = null;

// App will create a new window, display the waiting overlay, and hide overlay when the window is ready
// app is in app.ejs

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) app.quit();

/*const {
    updateElectronApp,
    UpdateSourceType
} = require('update-electron-app')
// Check for updates except for macOS
if (process.platform !== 'darwin') {
    updateElectronApp()
}*/

// New autoUpdater setup using Hazel
const server = 'https//update.frostworld.studio'
const url = `${server}/update/${process.platform}/${app.getVersion()}`

autoUpdater.setFeedURL({
    url
})

autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
    const dialogOpts = {
        type: 'info',
        buttons: ['Restart', 'Later'],
        title: 'Application Update',
        message: process.platform === 'win32' ? releaseNotes : releaseName,
        detail: 'A new version has been downloaded. Restart the application to apply the updates.'
    }

    dialog.showMessageBox(dialogOpts).then((returnValue) => {
        if (returnValue.response === 0) autoUpdater.quitAndInstall()
    })
})

autoUpdater.on('error', (message) => {
    console.error('There was a problem updating the application')
    console.error(message)
})

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

// write every log to stdout and app.log
const logStream = fs.createWriteStream(path.join(__dirname, 'app.log'), {
    flags: 'a'
});

console.logReal = console.log;
console.errorReal = console.error;
console.warnReal = console.warn;
console.infoReal = console.info;

console.log = function (...args) {
    logStream.write(args.join(' ') + '\n');
    process.stdout.write(args.join(' ') + '\n');
    console.logReal(...args);
};

console.error = function (...args) {
    logStream.write(args.join(' ') + '\n');
    process.stderr.write(args.join(' ') + '\n');
    console.errorReal(...args);
};

console.warn = function (...args) {
    logStream.write(args.join(' ') + '\n');
    process.stderr.write(args.join(' ') + '\n');
    console.warnReal(...args);
};

console.info = function (...args) {
    logStream.write(args.join(' ') + '\n');
    process.stdout.write(args.join(' ') + '\n');
    console.infoReal(...args);
};

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

    var selectedAccount = accounts.getSelectedAccount();
    var lastToken = await accounts.getSelectedAccountToken();
    var accInfo = await accounts.getAccountInfo(lastToken);

    if (accounts.getSelectedAccount() !== null) {
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

    if (lastToken !== null && lastToken !== undefined) {

        await gameManager.InitManager(lastToken).catch(err => {
            console.error('Error initializing game manager:', err); -
            ErrorWindow('Game Manager Error', 'An error occurred while initializing the game manager. Please try again later.');
            return;
        })

    } else {
        console.info('No token found, skipping game manager initialization');
        gameManager.InitManager("skip");
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

    // if the win is already created, close it
    if (win && !win.isDestroyed()) {
        win.close();
    }

    // Now, we initialize a new BrowserWindow for the error
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

    if (process.platform === 'win32') {
        // Correction : indiquer le bon chemin vers ton exécutable
        const argument = process.argv[1];
        if (argument) {
            app.setAsDefaultProtocolClient('fwlauncher', process.execPath, [path.resolve(argument)]);
        } else {
            app.setAsDefaultProtocolClient('fwlauncher', process.execPath);
        }
    } else {
        app.setAsDefaultProtocolClient('fwlauncher');
    }

    try {
        console.log('Pinging API before launching app...');
        await getApiPing(); // Attente du pong
        console.log('API pong received. Launching app...');
    } catch (error) {
        console.error('API did not respond. Showing simple error window...');
        ErrorWindow('API Error', 'The Frost World Studio API is not reachable. Please check your internet connection or try again later.');
        return;
    }

    setInterval(() => {
        autoUpdater.checkForUpdates()
    }, 60000)

    app.whenReady().then(() => {
        createWindow();
        app.on("activate", () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
        // When fully rendered, hide the overlay
        win.webContents.on('did-finish-load', () => {
            win.webContents.send('hide-overlay');
        });

        // Check for updates on app launch
        autoUpdater.checkForUpdates();
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    accounts.checkForAccountsFile();
}

if (process.platform !== 'darwin') {
    const gotTheLock = app.requestSingleInstanceLock();

    if (!gotTheLock) {
        app.quit();
    } else {
        app.on('second-instance', (event, argv) => {
            // argv contient l'URL
            const url = argv.find(arg => arg.startsWith('fwlauncher://'));
            if (url) {
                handleDeepLink(url);
            }
            if (win) {
                if (win.isMinimized()) win.restore();
                win.focus();
            }
        });
    }

    // Lors du premier lancement
    const url = process.argv.find(arg => arg.startsWith('fwlauncher://'));
    if (url) deepLinkUrl = url;
}

function handleDeepLink(url) {
    console.log('Received deep link:', url);

    // Extraire les informations du lien
    // fwlauncher://action/?params=X

    // split the URL to get the action and params
    // replace 'fwlauncher://' with an empty string
    const urlObj = url.replace('fwlauncher://', '');
    const action = urlObj.split('/')[0]; // 'action'
    const params = urlObj.split('/')[1].replace('?', ''); // 'params=X'
    console.log('Action:', action);
    console.log('Params:', params);


    switch (action) {
        case 'login': {
            // User is attempting to login via website!
            console.log('User is attempting to login via website!');

            // split at "&", if there is no "&", then the params is just the token
            const paramsArray = params.split('&');
            if (paramsArray.length > 1) {
                // If there are multiple params, we assume the first one is the token
                const token = paramsArray[0].split('=')[1]; // 'token=X'
                console.log('Token:', token);

                // Here you can handle the login action, e.g., open a login window or perform login logic
                accounts.fastReg(token);
            } else {
                // If there is only one param, we assume it is the token
                const token = paramsArray[0].split('=')[1]; // 'token=X'
                console.log('Token:', token);

                // Here you can handle the login action, e.g., open a login window or perform login logic
                accounts.fastReg(token);
            }
            break;
        }
    }


}


ipcMain.on('je-me-barre', (event) => {
    // simply minimize the window
    if (win) {
        win.minimize();
    }
});

launchMain();