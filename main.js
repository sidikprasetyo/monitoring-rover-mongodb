const { app, BrowserWindow } = require('electron/main')
const path = require('node:path');

let win;

function createWindow () {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'public/assets/icon', 'rover.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
    frame: true
  })

  win.loadFile('public/index.html')
}


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})


app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})