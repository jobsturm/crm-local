/**
 * Electron Main Process
 *
 * Creates the main application window and handles IPC communication.
 */

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility - get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Disable hardware acceleration for better compatibility
app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false, // Show when ready to prevent flash
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    // Development: load from Vite dev server
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load from built files
    void mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ============================================================
// IPC Handlers
// ============================================================

// Save file dialog (for PDF export)
ipcMain.handle(
  'dialog:saveFile',
  async (
    _event,
    options: {
      title: string;
      defaultPath: string;
      filters: Array<{ name: string; extensions: string[] }>;
    }
  ) => {
    const result = await dialog.showSaveDialog({
      title: options.title,
      defaultPath: options.defaultPath,
      filters: options.filters,
    });
    return {
      canceled: result.canceled,
      filePath: result.filePath,
    };
  }
);

// Select directory dialog (for storage path)
ipcMain.handle(
  'dialog:selectDirectory',
  async (
    _event,
    options?: {
      title?: string;
      defaultPath?: string;
    }
  ) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: options?.title ?? 'Select Directory',
      defaultPath: options?.defaultPath,
    });
    return {
      canceled: result.canceled,
      filePath: result.filePaths[0],
    };
  }
);

// Generate PDF using printToPDF
ipcMain.handle(
  'pdf:generate',
  async (_event, html: string, filePath: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Create a hidden window for PDF generation
      const pdfWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      // Load the HTML content
      await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

      // Wait a bit for content to render
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Generate PDF
      const pdfData = await pdfWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
      });

      // Write to file
      const fs = await import('fs/promises');
      await fs.writeFile(filePath, pdfData);

      // Close the PDF window
      pdfWindow.close();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating PDF',
      };
    }
  }
);
