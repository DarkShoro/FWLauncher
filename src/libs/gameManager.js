/*
███████╗██████╗  ██████╗ ███████╗████████╗██╗    ██╗ ██████╗ ██████╗ ██╗     ██████╗ 
██╔════╝██╔══██╗██╔═══██╗██╔════╝╚══██╔══╝██║    ██║██╔═══██╗██╔══██╗██║     ██╔══██╗
█████╗  ██████╔╝██║   ██║███████╗   ██║   ██║ █╗ ██║██║   ██║██████╔╝██║     ██║  ██║
██╔══╝  ██╔══██╗██║   ██║╚════██║   ██║   ██║███╗██║██║   ██║██╔══██╗██║     ██║  ██║
██║     ██║  ██║╚██████╔╝███████║   ██║   ╚███╔███╔╝╚██████╔╝██║  ██║███████╗██████╔╝
╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝    ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═════╝ 
                                                                                     
Game Manager Module
This file is responsible for managing the games of a user.
It handles the game library, including adding, removing, and displaying games.

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
const accountManager = require('./accountManager.js');
const {
    exec,
    spawn
} = require('child_process');

var usertoken = "";
var init = false;
var gameArray = [];

var CANCELBOOL = false; // This variable is used to cancel the download process

async function InitManager(token = null) {

    if (token == "skip") {
        console.warn("Skipping... Game Manager initialization");
        return new Promise((resolve) => {
            resolve(true);
        });
    }

    return new Promise(async (resolve, reject) => {
        if (token === null) {
            console.warn("No token provided, trying to get selected account token");
            token = await accountManager.getSelectedAccountToken();
        }
        if (token === null) {
            console.error("No token provided, rejecting promise");
            reject("No token provided");
            return;
        }
        console.info("Initializing Game Manager");
        usertoken = token;
        init = true;
        resolve(true);
    });
}

function isInitialized() {
    return init;
}

function getToken() {
    return usertoken;
}

async function getGames() {
    if (!isInitialized()) {
        console.error("Game Manager is not initialized");
        throw new Error("Game Manager is not initialized");
    }

    console.info("Getting games for user with token: " + getToken());

    return new Promise(async (resolve, reject) => {

        token = getToken();

        try {
            const response = await axios.get(APIURL + '/games/getOwnedGames', {
                headers: {
                    'X-FW-Token': `Bearer ${token}`
                }
            });

            console.log(response.data);
            if (response.status === 200) {
                console.info("Games retrieved successfully");
                var assetsPaths = await cacheGameAssets(response.data.data);
                var games = response.data.data

                // for each game, map the game id with the assets path that have the conresponding game id
                games = games.map(game => {
                    const asset = assetsPaths.find(asset => asset.id === game.id);
                    if (asset) {
                        return {
                            ...game,
                            assetsPaths: {
                                icon: asset.iconPath || null // Use the cached icon path or null if not available
                                    ,
                                hero: asset.heroPath || null, // Use the cached hero path or null if not available
                                banner: asset.bannerPath || null, // Use the cached banner path or null if not
                                littlebanner: asset.littleBannerPath || null, // Use the cached little banner path or null if not available
                                title: asset.titlePath || null, // Use the cached title path or null if not available
                                card: asset.cardPath || null, // Use the cached card path or null if not available
                                backdrop: asset.backdropPath || null // Use the cached backdrop path or null if not available
                            }
                        };
                    }
                    return game;
                });
                gameArray = games; // Store the games in the gameArray
                saveGamesToFile(); // Save the games to file
                resolve(games);
            } else {
                console.error("Error getting games: " + response.statusText);
                reject(false);
            }
        } catch (error) {
            console.error("Error getting games: " + error.message);
            reject(error);
        }
    });
}

async function cacheGameAssets(games) {
    const cacheDir = path.join(app.getPath('userData'), 'gameCache');
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, {
            recursive: true
        });
    }

    const gameAssets = [];

    for (const game of games) {
        const gameDir = path.join(cacheDir, game.shortname);

        if (!fs.existsSync(gameDir)) {
            fs.mkdirSync(gameDir, {
                recursive: true
            });
        }

        const paths = {
            iconPath: null,
            heroPath: null,
            bannerPath: null,
            littleBannerPath: null,
            titlePath: null,
            cardPath: null,
            backdropPath: null
        };

        const assets = [
            { condition: game.assets.icon, url: game.gameicon, file: 'icon.png', key: 'iconPath', name: 'icon' },
            { condition: game.assets.hero, url: game.assets.hero, file: 'hero.png', key: 'heroPath', name: 'hero' },
            { condition: game.assets.banner, url: game.assets.banner, file: 'banner.png', key: 'bannerPath', name: 'banner' },
            { condition: game.assets.littlebanner, url: game.assets.littlebanner, file: 'littleBanner.png', key: 'littleBannerPath', name: 'little banner' },
            { condition: game.assets.title, url: game.assets.title, file: 'title.png', key: 'titlePath', name: 'title' },
            { condition: game.assets.card, url: game.assets.card, file: 'card.png', key: 'cardPath', name: 'card' },
            { condition: game.assets.backdrop, url: game.assets.backdrop, file: 'backdrop.png', key: 'backdropPath', name: 'backdrop' }
        ];

        for (const asset of assets) {
            const url = asset.url;
            if (asset.condition && asset.condition !== '' && asset.condition.startsWith('http')) {
                const filePath = path.join(gameDir, asset.file);
                if (!fs.existsSync(filePath)) {
                    try {
                        const response = await axios.get(url, {
                            responseType: 'arraybuffer'
                        });
                        fs.writeFileSync(filePath, response.data);
                        console.info(`Cached ${asset.name} for game ${game.name}`);
                    } catch (error) {
                        console.warn(`Failed to cache ${asset.name} for game ${game.name}: ${error.message}`);
                        paths[asset.key] = null;
                        continue;
                    }
                }
                paths[asset.key] = filePath;
            }
        }

        gameAssets.push({
            id: game.id,
            ...paths
        });
    }

    return gameAssets;
}

function saveGamesToFile() {
    if (!isInitialized()) {
        console.error("Game Manager is not initialized, cannot save games");
        return;
    }

    const userId = accountManager.getSelectedAccount();
    const userDataDir = path.join(app.getPath('userData'), 'userData');
    const userGamesFile = path.join(userDataDir, `${userId}_games.json`);

    if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, {
            recursive: true
        });
    }

    fs.writeFileSync(userGamesFile, JSON.stringify(gameArray, null, 2));
    console.info(`Games saved to ${userGamesFile}`);
}

function getInformation(gameId) {
    if (!isInitialized()) {
        console.error("Game Manager is not initialized, cannot get game information");
        return null;
    }

    gameId = parseInt(gameId, 10);

    const game = gameArray.find(g => g.id === gameId);
    if (!game) {
        console.error(`Game with ID ${gameId} not found`);
        return null;
    }

    // check in the config file if we have a "mainExecutable" set for this game
    const userId = accountManager.getSelectedAccount();
    const userDataDir = path.join(app.getPath('userData'), 'userData');
    const gameConfigFile = path.join(userDataDir, `${userId}_${gameId}_config.json`);
    let mainExecutable = null;

    if (fs.existsSync(gameConfigFile)) {
        try {
            const config = JSON.parse(fs.readFileSync(gameConfigFile, 'utf8'));
            if (config.mainExecutable) {
                mainExecutable = config.mainExecutable;
            }
        } catch (error) {
            console.error(`Error reading config for game ${game.name} (ID: ${gameId}): ${error.message}`);
        }
    }

    // if we de have a mainExecutable, we know the game is installed and we can return the information

    // if the mainExecutable is set, but the actual file does not exist, we will set it to null and
    // mark the game as not installed locally
    // (WHY WOULD THE VALUE BE SET BUT THE FILE NOT EXIST? THIS SHOULD NOT HAPPEN, BUT WE WILL HANDLE IT JUST IN CASE)
    if (mainExecutable && !fs.existsSync(mainExecutable)) {
        console.warn(`Main executable for game ID ${gameId} is set but does not exist at ${mainExecutable}`);
        mainExecutable = null; // Mark as not installed locally
        write_config(gameId, 'mainExecutable', null); // Update config to reflect this
    }

    return {
        id: game.id,
        name: game.name,
        shortname: game.shortname,
        description: game.description,
        version: game.version,
        assetsPaths: game.assetsPaths || {},
        isInstalledLocally: mainExecutable !== null,
    };
}

async function getManifest(gameId) {
    if (!isInitialized()) {
        console.error("Game Manager is not initialized, cannot get game manifest");
        return null;
    }

    gameId = parseInt(gameId, 10);
    token = getToken();

    console.log(token);

    return new Promise(async (resolve, reject) => {

        try {
            // games/getManifest
            const response = axios.get(`${APIURL}/games/getManifest`, {
                params: {
                    gameId: gameId
                },
                headers: {
                    'X-FW-Token': `FWS ${token}`
                }
            }).then(response => {

                if (response.status === 200) {
                    console.info(`Manifest for game ${gameId} retrieved successfully`);
                    resolve(response.data);
                } else {
                    console.error(`Error getting manifest for game ${gameId}: ${response}`);
                    reject(new Error(`Error getting manifest for game ${gameId}: ${response.statusText}`));
                }
            });
        } catch (error) {
            console.error(`Error getting manifest for game ${gameId}: ${error.message}`);
            reject(new Error(`Error getting manifest for game ${gameId}: ${error.message}`));
        }
    });
}

async function deletePath(downloadPath) {
    if (!isInitialized()) {
        console.error("Game Manager is not initialized, cannot delete path");
        return;
    }
    console.info(`Deleting path ${downloadPath}`);
    try {
        if (fs.existsSync(downloadPath)) {
            fs.rm(downloadPath, {
                recursive: true,
                force: true
            }, (err) => {
                if (err) {
                    console.error(`Error deleting path ${downloadPath}: ${err.message}`);
                } else {
                    console.info(`Path ${downloadPath} deleted successfully`);
                }
            });
        } else {
            console.warn(`Path ${downloadPath} does not exist, nothing to delete`);
        }
    } catch (error) {
        console.error(`Error deleting path ${downloadPath}: ${error.message}`);
    }
}

async function downloadGame(event, gameId, downloadPath) {
    if (!isInitialized()) {
        console.error("Game Manager is not initialized, cannot download game");
        return;
    }

    let manifest = await getManifest(gameId);
    if (!manifest) {
        console.error(`Manifest for game ${gameId} not found`);
        return;
    }

    event.sender.send('download-game-start', {
        gameId: gameId,
    });


    token = getToken();
    var baseurl = manifest.base_url;

    var totalSize = manifest.files.reduce((acc, file) => acc + file.size, 0);
    var downloadedSize = 0;


    for (const file of manifest.files) {

        if (CANCELBOOL) {
            console.info("Subject D9341 designated for termination");
            deletePath(downloadPath);
            CANCELBOOL = false; // Reset the cancel flag
            return; // Exit the download loop if cancellation is requested
        }

        const filePath = path.join(downloadPath, file.path);
        const dir = path.dirname(filePath);

        var url = baseurl + file.path;

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {
                recursive: true
            });
        }

        if (fs.existsSync(filePath)) {
            console.info(`File ${filePath} already exists, skipping download`);
            continue;
        }

        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'X-FW-Token': `FWS ${token}`
                }
            });

            if (response.status === 200) {
                fs.writeFileSync(filePath, response.data);
                console.info(`Downloaded file ${filePath} from ${url}`);
                downloadedSize += file.size;
                event.sender.send('download-game-progress', {
                    gameId: gameId,
                    downloadedSize: downloadedSize,
                    totalSize: totalSize
                });
            } else {
                console.error(`Error downloading file ${filePath} from ${url}: ${response.statusText}`);
            }
        } catch (error) {
            console.error(`Error downloading file ${filePath} from ${url}: ${error.message}`);
        }
    }

    console.info(`Download completed for game ID ${gameId} to ${downloadPath}`);

    executableName = manifest.executable;
    executablePath = path.join(downloadPath, executableName);
    write_config(gameId, 'mainExecutable', executablePath);
    console.info(`Main executable for game ID ${gameId} set to ${executablePath}`);
    event.sender.send('download-game-complete', {
        gameId: gameId,
        gameExecutable: executablePath
    });
}


function write_config(gameId, key, value) {
    if (!isInitialized()) {
        console.error("Game Manager is not initialized, cannot write config");
        return;
    }

    gameId = parseInt(gameId, 10);
    const game = gameArray.find(g => g.id === gameId);
    if (!game) {
        console.error(`Game with ID ${gameId} not found`);
        return;
    }

    // just like the games json, create a "local" save file for the game
    const userId = accountManager.getSelectedAccount();
    const userDataDir = path.join(app.getPath('userData'), 'userData');
    const gameConfigFile = path.join(userDataDir, `${userId}_${gameId}_config.json`);

    if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, {
            recursive: true
        });
    }

    let config = {};
    if (fs.existsSync(gameConfigFile)) {
        config = JSON.parse(fs.readFileSync(gameConfigFile, 'utf8'));
    }

    config[key] = value;

    fs.writeFileSync(gameConfigFile, JSON.stringify(config, null, 2));
    console.info(`Config for game ${game.name} (ID: ${gameId}) updated: ${key} = ${value}`);
}

function read_config(gameId, key) {
    if (!isInitialized()) {
        console.error("Game Manager is not initialized, cannot read config");
        return null;
    }
    gameId = parseInt(gameId, 10);
    const game = gameArray.find(g => g.id === gameId);
    if (!game) {
        console.error(`Game with ID ${gameId} not found`);
        return null;
    }
    // just like the games json, create a "local" save file for the game
    const userId = accountManager.getSelectedAccount();
    const userDataDir = path.join(app.getPath('userData'), 'userData');
    const gameConfigFile = path.join(userDataDir, `${userId}_${gameId}_config.json`);
    if (!fs.existsSync(gameConfigFile)) {
        console.warn(`Config file for game ${game.name} (ID: ${gameId}) not found`);
        return null;
    }
    let config = {};
    try {
        config = JSON.parse(fs.readFileSync(gameConfigFile, 'utf8'));
    } catch (error) {
        console.error(`Error reading config for game ${game.name} (ID: ${gameId}): ${error.message}`);
        return null;
    }
    if (key in config) {
        return config[key];
    }
    console.warn(`Key ${key} not found in config for game ${game.name} (ID: ${gameId})`);
    return null;
}


// Register IPC handlers

ipcMain.handle('get-games', async (event) => {
    try {
        const games = await getGames();
        return games;
    } catch (error) {
        console.error("Error in IPC handler get-games: " + error.message);
        throw error;
    }
});

ipcMain.handle('get-game-info', (event, gameId) => {
    const gameInfo = getInformation(gameId);
    if (!gameInfo) {
        throw new Error(`Game with ID ${gameId} not found`);
    }
    return gameInfo;
});

ipcMain.handle('set-game-path', async (event, gameId, path) => {
    if (!isInitialized()) {
        console.error("Game Manager is not initialized, cannot set game path");
        throw new Error("Game Manager is not initialized");
    }

    gameId = parseInt(gameId, 10);

    write_config(gameId, 'path', path);
    console.info(`Game path for game ID ${gameId} set to ${path}`);
    return true;
});

ipcMain.handle('get-game-path', (event, gameId) => {
    if (!isInitialized()) {
        console.error("Game Manager is not initialized, cannot get game path");
        throw new Error("Game Manager is not initialized");
    }
    gameId = parseInt(gameId, 10);
    const game = gameArray.find(g => g.id === gameId);
    if (!game) {
        console.error(`Game with ID ${gameId} not found`);
        throw new Error(`Game with ID ${gameId} not found`);
    }
    const path = read_config(gameId, 'path');
    if (!path) {
        console.warn(`No path set for game ID ${gameId}, returning default path`);
        return `C:/FrostWorldLibrary/${game.shortname}`;
    }
    console.info(`Game path for game ID ${gameId} is ${path}`);
    return path;
});

ipcMain.on('download-game', async (event, gameId) => {
    if (!isInitialized()) {
        console.error("Game Manager is not initialized, cannot download game");
        event.reply('download-game-response', {
            success: false,
            message: "Game Manager is not initialized"
        });
        return;
    }
    try {
        const game = getInformation(gameId);
        const formattedGameName = game.name.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, ' ').replace(/ /g, '_').toLowerCase();
        const downloadPath = read_config(gameId, 'path') || `C:/FrostWorldLibrary/${formattedGameName}`;
        await downloadGame(event, gameId, downloadPath);
    } catch (error) {
        console.error(`Error downloading game with ID ${gameId}: ${error.message}`);
    }
});

ipcMain.handle('launch-game', (event, gameId) => {
    if (!isInitialized()) {
        console.error("Game Manager is not initialized, cannot launch game");
        throw new Error("Game Manager is not initialized");
    }
    gameId = parseInt(gameId, 10);
    const game = gameArray.find(g => g.id === gameId);
    if (!game) {
        console.error(`Game with ID ${gameId} not found`);
        throw new Error(`Game with ID ${gameId} not found`);
    }
    const mainExecutable = read_config(gameId, 'mainExecutable');
    if (!mainExecutable) {
        console.error(`Main executable for game ID ${gameId} not found`);
        throw new Error(`Main executable for game ID ${gameId} not found`);
    }
    console.info(`Launching game ID ${gameId} with executable ${mainExecutable}`);

    // check if the executable exists
    if (!fs.existsSync(mainExecutable)) {
        console.error(`Main executable for game ID ${gameId} does not exist at ${mainExecutable}`);
        throw new Error(`Main executable for game ID ${gameId} does not exist at ${mainExecutable}`);
    }

    try {
        const child = spawn(mainExecutable, [], {
            detached: true,
            stdio: 'ignore', // Don't link stdio to parent
            cwd: path.dirname(mainExecutable), // Optional: ensure it launches from the correct folder
            shell: true // If needed to interpret full path or .bat/.exe
        });

        child.unref(); // Let the parent process exit independently

        ipcMain.emit('je-me-barre');

        console.info(`Game ID ${gameId} launched successfully`);
        event.sender.send('launch-game-response', {
            success: true,
            message: `Game ID ${gameId} launched successfully`
        });
    } catch (error) {
        console.error(`Error launching game ID ${gameId}: ${error.message}`);
        event.sender.send('launch-game-response', {
            success: false,
            message: `Error launching game: ${error.message}`
        });
    }

});


// Handle cancel download request
ipcMain.on('cancel-download', (event) => {
    console.info("Download cancelled by user");
    event.sender.send('download-cancelled', {
        success: true,
        message: "Download cancelled"
    });
    // Here you can implement any additional logic to stop the download process if needed
    CANCELBOOL = true; // Set the cancel flag to true
});



module.exports = {
    InitManager: InitManager,
    isInitialized: isInitialized,
    getToken: getToken,
    getGames: getGames
}