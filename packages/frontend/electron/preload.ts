/**
 * Electron Preload Script
 *
 * Exposes a secure API to the renderer process via contextBridge.
 * This is the only way to communicate between renderer and main process
 * when contextIsolation is enabled.
 */

import { contextBridge, ipcRenderer } from 'electron';

// Types for the exposed API
interface SaveDialogOptions {
  title: string;
  defaultPath: string;
  filters: Array<{ name: string; extensions: string[] }>;
}

interface SaveDialogResult {
  canceled: boolean;
  filePath?: string;
}

interface SelectDirectoryOptions {
  title?: string;
  defaultPath?: string;
}

interface SelectDirectoryResult {
  canceled: boolean;
  filePath?: string;
}

interface PDFGenerateResult {
  success: boolean;
  error?: string;
}

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate?: string;
}

type UpdaterEventCallback = (data?: unknown) => void;

// Expose the API to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Opens a save file dialog
   */
  saveFileDialog: (options: SaveDialogOptions): Promise<SaveDialogResult> => {
    return ipcRenderer.invoke('dialog:saveFile', options);
  },

  /**
   * Opens a directory selection dialog
   */
  selectDirectory: (options?: SelectDirectoryOptions): Promise<SelectDirectoryResult> => {
    return ipcRenderer.invoke('dialog:selectDirectory', options);
  },

  /**
   * Generates a PDF from HTML content and saves it to a file
   */
  generatePDF: (html: string, filePath: string): Promise<PDFGenerateResult> => {
    return ipcRenderer.invoke('pdf:generate', html, filePath);
  },

  /**
   * Get app version from main process
   */
  getVersion: (): Promise<string> => {
    return ipcRenderer.invoke('app:version');
  },

  /**
   * Platform info
   */
  platform: process.platform,

  /**
   * Get the backend server port
   */
  getBackendPort: (): Promise<number> => {
    return ipcRenderer.invoke('backend:port');
  },

  /**
   * Get the storage path
   */
  getStoragePath: (): Promise<string> => {
    return ipcRenderer.invoke('storage:path');
  },

  // ============================================================
  // Auto-Updater API
  // ============================================================

  /**
   * Check for updates
   */
  checkForUpdates: (): Promise<{ success: boolean; updateInfo?: UpdateInfo; error?: string }> => {
    return ipcRenderer.invoke('updater:check');
  },

  /**
   * Download the available update
   */
  downloadUpdate: (): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('updater:download');
  },

  /**
   * Install the downloaded update and restart
   */
  installUpdate: (): void => {
    ipcRenderer.invoke('updater:install');
  },

  /**
   * Listen for updater events
   */
  onUpdaterEvent: (event: string, callback: UpdaterEventCallback): void => {
    ipcRenderer.on(event, (_event, data) => callback(data));
  },

  /**
   * Remove updater event listener
   */
  removeUpdaterListener: (event: string, callback: UpdaterEventCallback): void => {
    ipcRenderer.removeListener(event, callback);
  },
});

// Log that preload script loaded successfully
console.log('Electron preload script loaded');
