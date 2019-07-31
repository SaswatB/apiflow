import { app, BrowserWindow } from "electron"
import * as path from "path"
import { format as formatUrl } from "url"
import promiseIpc from 'electron-promise-ipc';
import "@/../renderer/store/index.ts"
import { sendCurl, SendCurlRequest, SendCurlResult } from "./sendCurl";

const isDevelopment = process.env.NODE_ENV !== "production"
let mainWindow: BrowserWindow | null = null

/**
 * Creates the main application window and updates `mainWindow`
 */
function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: 700,
    width: 1300,
    minHeight: 600,
    minWidth: 600,
    useContentSize: true,
    webPreferences: {
      experimentalFeatures: true,
      webSecurity: false, // TODO: disable
      nodeIntegration: true,
    },
    // Remove the window frame
    frame: false,
  })

  //remove the default menu
  mainWindow.setMenu(null)

  if (isDevelopment) {
    mainWindow.webContents.openDevTools()
  }

  if (isDevelopment) {
    mainWindow.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`)
  } else {
    mainWindow.loadURL(formatUrl({
      pathname: path.join(__dirname, "index.html"),
      protocol: "file",
      slashes: true
    }))
  }

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

// create the main window when electron is ready
app.on("ready", createWindow)

// quit the app if all windows are close (except for on macOS)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

// create the main window when the app is activated (usually for macOS), if it's not already open
app.on("activate", () => {
  if (mainWindow === null) {
    createWindow()
  }
})

// set up the ipc channels
declare module "electron-promise-ipc" {
  function send(route: 'sendCurl', request: SendCurlRequest): Promise<SendCurlResult>;
}

promiseIpc.on('sendCurl', (request: SendCurlRequest) => {
  return sendCurl(request);
});

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from "electron-updater"

autoUpdater.on("update-downloaded", () => {
  autoUpdater.quitAndInstall()
})

app.on("ready", () => {
  if (process.env.NODE_ENV === "production") autoUpdater.checkForUpdates()
})
 */
