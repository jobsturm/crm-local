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
   * Get app version from main process
   */
  getVersion: () => {
    return electron.ipcRenderer.invoke("app:version");
  },
  /**
   * Platform info
   */
  platform: process.platform,
  // ============================================================
  // Auto-Updater API
  // ============================================================
  /**
   * Check for updates
   */
  checkForUpdates: () => {
    return electron.ipcRenderer.invoke("updater:check");
  },
  /**
   * Download the available update
   */
  downloadUpdate: () => {
    return electron.ipcRenderer.invoke("updater:download");
  },
  /**
   * Install the downloaded update and restart
   */
  installUpdate: () => {
    electron.ipcRenderer.invoke("updater:install");
  },
  /**
   * Listen for updater events
   */
  onUpdaterEvent: (event, callback) => {
    electron.ipcRenderer.on(event, (_event, data) => callback(data));
  },
  /**
   * Remove updater event listener
   */
  removeUpdaterListener: (event, callback) => {
    electron.ipcRenderer.removeListener(event, callback);
  }
});
console.log("Electron preload script loaded");
