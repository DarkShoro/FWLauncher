const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron')
const { pathToFileURL } = require('url');
const path = require('path');
const fs = require('fs');
const ejse = require('ejs-electron')

// App will create a new window, display the waiting overlay, and hide overlay when the window is ready
// app is in app.ejs

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) app.quit();
const { updateElectronApp, UpdateSourceType } = require('update-electron-app')
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

function createWindow() {
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

    const data = {
        uid: Math.floor((Math.random() * fs.readdirSync(path.join(__dirname, 'app', 'assets', 'images', 'stock', 'profiles')).length)),
    }
    Object.entries(data).forEach(([key, val]) => ejse.data(key, val))

    win.loadURL(pathToFileURL(path.join(__dirname, 'app', 'app.ejs')).toString())

    win.webContents.on('did-finish-load', () => {
        win.webContents.send('hide-overlay');
    });

    win.openDevTools();
}



ipcMain.on('minimize-app', () => {
    win.minimize();
});

ipcMain.on('close-app', () => {
    win.close();
});

ipcMain.on('maximize-app', () => {
    if (win.isMaximized()) {
        win.unmaximize();
    } else {
        win.maximize();
    }
});
// app.on('ready', createWindow);

function launchMain() {
    if (!app.requestSingleInstanceLock()) return app.quit();
    app.on('second-instance', () => {
        if (win) {
            if (win.isMinimized()) win.restore();
            win.focus();
        }
    });

    app.setAsDefaultProtocolClient('fwlauncher');

    app.whenReady().then(() => {
        createWindow();
        app.on("activate", () => {
            // On OS X it's common to re-create a window in the app when the
            // dock icon is clicked and there are no other windows open.
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    })

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
}

launchMain();
