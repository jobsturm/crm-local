"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  /**
   * Opens a save file dialog
   */
  saveFileDialog: (options) => {
    return electron.ipcRenderer.invoke("dialog:saveFile", options);
  },
  /**
   * Opens a directory selection dialog
   */
  selectDirectory: (options) => {
    return electron.ipcRenderer.invoke("dialog:selectDirectory", options);
  },
  /**
   * Generates a PDF from HTML content and saves it to a file
   */
  generatePDF: (html, filePath) => {
    return electron.ipcRenderer.invoke("pdf:generate", html, filePath);
  },
  /**
   * Get app version
   */
  getVersion: () => {
    return process.env.npm_package_version ?? "1.0.0";
  },
  /**
   * Platform info
   */
  platform: process.platform
});
console.log("Electron preload script loaded");
