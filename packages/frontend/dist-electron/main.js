import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = dirname(__filename$1);
app.disableHardwareAcceleration();
let mainWindow = null;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: join(__dirname$1, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false
    // Show when ready to prevent flash
  });
  mainWindow.once("ready-to-show", () => {
    mainWindow == null ? void 0 : mainWindow.show();
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    void mainWindow.loadFile(join(__dirname$1, "../dist/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
ipcMain.handle(
  "dialog:saveFile",
  async (_event, options) => {
    const result = await dialog.showSaveDialog({
      title: options.title,
      defaultPath: options.defaultPath,
      filters: options.filters
    });
    return {
      canceled: result.canceled,
      filePath: result.filePath
    };
  }
);
ipcMain.handle(
  "dialog:selectDirectory",
  async (_event, options) => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
      title: (options == null ? void 0 : options.title) ?? "Select Directory",
      defaultPath: options == null ? void 0 : options.defaultPath
    });
    return {
      canceled: result.canceled,
      filePath: result.filePaths[0]
    };
  }
);
ipcMain.handle(
  "pdf:generate",
  async (_event, html, filePath) => {
    try {
      const pdfWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });
      await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      await new Promise((resolve) => setTimeout(resolve, 500));
      const pdfData = await pdfWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: "A4",
        margins: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        }
      });
      const fs = await import("fs/promises");
      await fs.writeFile(filePath, pdfData);
      pdfWindow.close();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error generating PDF"
      };
    }
  }
);
