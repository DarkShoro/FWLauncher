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

        // Hide maximize button.
        Array.from(document.getElementsByClassName('fRb')).map((val) => {
            val.setAttribute('style', 'display: none;');
        })

        // find retryButton and exitButton and bind them to the ipcRenderer
        Array.from(document.getElementsByClassName('retryButton')).map((val) => {
            val.addEventListener('click', e => {
                ipcRenderer.send('relaunch-app')
            })
        })
        Array.from(document.getElementsByClassName('exitButton')).map((val) => {
            val.addEventListener('click', e => {
                ipcRenderer.send('close-app')
            })
        })
    }
});



