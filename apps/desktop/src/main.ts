import { app, BrowserWindow, ipcMain, protocol, net, session } from "electron";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createFileStorage } from "./file-storage.js";
import { createSteamAdapter } from "./steam.js";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "administration",
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
]);

const here = path.dirname(fileURLToPath(import.meta.url));
const steam = createSteamAdapter();

function storage() {
  return createFileStorage(app.getPath("userData"));
}

function webRoot(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "dist")
    : path.join(here, "../../web/dist");
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(here, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  const root = webRoot();
  protocol.handle("administration", (request) => {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/" || !path.extname(pathname)) pathname = "/index.html";
    const file = path.join(root, pathname.replace(/^\/+/, ""));
    if (!file.startsWith(root)) {
      return new Response("Forbidden", { status: 403 });
    }
    return net.fetch(pathToFileURL(file).toString());
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self' administration:; script-src 'self' administration:; style-src 'self' 'unsafe-inline' administration:; img-src 'self' data: administration:; font-src 'self' administration:; connect-src 'self' administration:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
        ],
      },
    });
  });

  void win.loadURL("administration://game/");
}

ipcMain.handle("desktop:capabilities", () => steam.capabilities);
ipcMain.handle("desktop:steamUser", () => steam.user);
ipcMain.handle("desktop:setRichPresence", (_event, key: string, value: string) => {
  steam.setRichPresence(key, value);
});
ipcMain.handle("desktop:clearRichPresence", () => steam.clearRichPresence());
ipcMain.handle("desktop:unlockAchievement", (_event, id: string) => steam.unlockAchievement(id));
ipcMain.handle("desktop:savesDirectory", () => path.join(app.getPath("userData"), "saves"));
ipcMain.handle("desktop:getItem", (_event, key: string) => storage().getItem(key));
ipcMain.handle("desktop:setItem", (_event, key: string, value: string) => storage().setItem(key, value));
ipcMain.handle("desktop:removeItem", (_event, key: string) => storage().removeItem(key));

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
