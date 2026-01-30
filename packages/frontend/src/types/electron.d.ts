/**
 * Electron API type definitions
 *
 * These types describe the API exposed by the preload script
 */

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

interface ElectronAPI {
  // File dialogs
  saveFileDialog: (options: SaveDialogOptions) => Promise<SaveDialogResult>;

  selectDirectory: (options?: SelectDirectoryOptions) => Promise<SelectDirectoryResult>;

  // PDF generation
  generatePDF: (html: string, filePath: string) => Promise<{ success: boolean; error?: string }>;

  // App info
  getVersion: () => Promise<string>;
  platform: NodeJS.Platform;

  // Auto-updater
  checkForUpdates: () => Promise<{
    success: boolean;
    updateInfo?: { version: string; releaseNotes?: string; releaseDate?: string };
    error?: string;
  }>;
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
  installUpdate: () => void;
  onUpdaterEvent: (event: string, callback: (data?: unknown) => void) => void;
  removeUpdaterListener: (event: string, callback: (data?: unknown) => void) => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}
