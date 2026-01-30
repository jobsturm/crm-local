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
   * Get app version
   */
  getVersion: (): string => {
    return process.env.npm_package_version ?? '1.0.0';
  },

  /**
   * Platform info
   */
  platform: process.platform,
});

// Log that preload script loaded successfully
console.log('Electron preload script loaded');
