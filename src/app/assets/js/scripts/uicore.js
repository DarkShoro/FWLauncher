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
    }
});