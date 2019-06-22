/**
 * This file is used specifically and only for development. It installs
 * `electron-debug` & `vue-devtools`. There shouldn't be any need to
 *  modify this file, but it can be used to extend your development
 *  environment.
 */

/* eslint-disable */
import { app } from "electron"

// Install `electron-debug`
require("@soleng-fuze/electron-debug")({ showDevTools: true })

// Install `vue-devtools`
app.on("ready", () => {
  let installExtension = require("electron-devtools-installer")
  installExtension.default(installExtension.VUEJS_DEVTOOLS)
    .then(() => {})
    .catch((err:any) => {
      console.warn("Unable to install `vue-devtools`: \n", err)
    })
})

// Require `main` process to boot app
require("./index.ts")
