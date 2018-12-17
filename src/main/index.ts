"use strict"

import { app, BrowserWindow } from "electron"
import "@/../renderer/store/index.ts"

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== "development") {
  (global as any).__static = require("path").join(__dirname, "/static").replace(/\\/g, "\\\\")
}

let mainWindow: BrowserWindow | null = null
const winURL = process.env.NODE_ENV === "development"
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

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
      webSecurity: false // TODO: disable
    }
    // Remove the window frame
    // frame: false, // TODO: uncomment when custom titlebar is enabled, waiting on https://github.com/electron/electron/issues/14787
  })

  //remove the default menu
  mainWindow.setMenu(null)

  // mainWindow.setWindowButtonVisibility(false)

  mainWindow.loadURL(winURL)

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

app.on("ready", createWindow)

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow()
  }
})

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
