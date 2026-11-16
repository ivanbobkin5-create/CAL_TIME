const { app, BrowserWindow, Tray, Menu, nativeImage, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");

// Prevent multiple instances grabbing port 3000 simultaneously
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let tray = null;
let isQuitting = false;
const SERVER_PORT = 3000;

function resolveUnpackedPath(...segments) {
  if (process.resourcesPath) {
    const candidateResources = path.join(process.resourcesPath, ...segments);
    if (fs.existsSync(candidateResources)) return candidateResources;
  }
  const appPath = app.getAppPath();
  const unpackedBase = appPath.endsWith(".asar")
    ? appPath.replace(/\.asar$/, ".asar.unpacked")
    : appPath;
  const candidateUnpacked = path.join(unpackedBase, ...segments);
  if (fs.existsSync(candidateUnpacked)) return candidateUnpacked;
  const candidateApp = path.join(appPath, ...segments);
  if (fs.existsSync(candidateApp)) return candidateApp;
  return path.join(process.cwd(), ...segments);
}

function getTrayIcon() {
  const candidates = [
    resolveUnpackedPath("public", "logo-64.png"),
    resolveUnpackedPath("public", "icon-1024.png"),
    path.join(process.resourcesPath || "", "public", "logo-64.png"),
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) {
      const img = nativeImage.createFromPath(p);
      if (!img.isEmpty()) return img.resize({ width: 16, height: 16 });
    }
  }
  return nativeImage.createEmpty();
}

function startEmbeddedEdgeServer() {
  const dataDir = path.join(app.getPath("userData"), "erp-data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const distDir = resolveUnpackedPath("dist");
  const serverBundlePath = resolveUnpackedPath("dist-electron", "edge-server.cjs");

  process.env.NODE_ENV = "production";
  process.env.ERP_EDGE_MODE = "1";
  process.env.PORT = String(SERVER_PORT);
  process.env.ERP_DATA_DIR = dataDir;
  process.env.ERP_DIST_DIR = distDir;
  process.env.ERP_RESOURCES_DIR = process.resourcesPath || app.getAppPath();

  if (!fs.existsSync(path.join(distDir, "index.html"))) {
    throw new Error(`Не найдена клиентская сборка (dist/index.html) по пути: ${distDir}`);
  }
  if (!fs.existsSync(serverBundlePath)) {
    throw new Error(`Не найден серверный модуль: ${serverBundlePath}`);
  }

  require(serverBundlePath);
}

function waitForServerReady(timeoutMs = 15000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(`http://127.0.0.1:${SERVER_PORT}/api/edge/status`, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve(true);
        } else {
          retry();
        }
      });
      req.on("error", retry);
      req.setTimeout(1000, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error("Таймаут запуска локального сервера цеха"));
      } else {
        setTimeout(check, 250);
      }
    };

    check();
  });
}

function readDesktopRoleConfig() {
  try {
    const roleFile = path.join(app.getPath("userData"), "erp-data", "desktop_role.json");
    if (fs.existsSync(roleFile)) {
      return JSON.parse(fs.readFileSync(roleFile, "utf-8"));
    }
  } catch (_) {}
  return { role: "unconfigured", targetServerUrl: "", stationName: "Участок цеха", autoOpenStation: true };
}

function checkRemoteServerAlive(baseUrl, timeoutMs = 1500) {
  return new Promise((resolve) => {
    try {
      const cleanUrl = String(baseUrl || "").replace(/\/+$/, "");
      if (!cleanUrl.startsWith("http")) return resolve(null);
      const req = http.get(`${cleanUrl}/api/edge/ping`, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(body);
            if (parsed && parsed.service === "mebel-plan-edge") {
              resolve(parsed);
              return;
            }
          } catch (_) {}
          resolve(null);
        });
      });
      req.on("error", () => resolve(null));
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        resolve(null);
      });
    } catch (_) {
      resolve(null);
    }
  });
}

async function resolveStartupUrl() {
  const roleCfg = readDesktopRoleConfig();
  if (!roleCfg || roleCfg.role === "unconfigured") {
    return `http://127.0.0.1:${SERVER_PORT}/edge-console?select_role=1`;
  }
  if (roleCfg.role === "workstation" && roleCfg.targetServerUrl && roleCfg.autoOpenStation !== false) {
    const cleanBase = String(roleCfg.targetServerUrl).replace(/\/+$/, "");
    const pingData = await checkRemoteServerAlive(cleanBase, 1600);
    if (pingData) {
      const erpPath = pingData.erpPath || (pingData.companyId ? `/c/${pingData.companyId}/erp` : "/erp");
      return `${cleanBase}${erpPath}`;
    }
    return `http://127.0.0.1:${SERVER_PORT}/edge-console?mode=workstation`;
  }
  return `http://127.0.0.1:${SERVER_PORT}/edge-console`;
}

async function createWindow() {
  const iconPath = resolveUnpackedPath("public", "icon-1024.png");
  const roleCfg = readDesktopRoleConfig();
  const windowTitle =
    roleCfg.role === "workstation"
      ? `Мебель План — Терминал участка (${roleCfg.stationName || "Цех"})`
      : "Мебель План — Цех-Сервер";

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: windowTitle,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  const startUrl = await resolveStartupUrl();
  mainWindow.loadURL(startUrl);

  // Allow navigation to local server and any LAN workshop server on port 3000
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (
      url.startsWith(`http://127.0.0.1:${SERVER_PORT}`) ||
      url.startsWith(`http://localhost:${SERVER_PORT}`) ||
      /^http:\/\/(192\.168\.|10\.|172\.)/.test(url)
    ) {
      return { action: "allow" };
    }
    shell.openExternal(url).catch(() => {});
    return { action: "deny" };
  });

  mainWindow.on("close", (e) => {
    const latestRole = readDesktopRoleConfig();
    if (!isQuitting && latestRole.role !== "workstation") {
      e.preventDefault();
      mainWindow.hide();
      if (tray && process.platform === "win32") {
        tray.displayBalloon({
          title: "Мебель План — Цех-Сервер работает в фоне",
          content: "Компьютеры участков и сканеры цеха продолжают работать по локальной сети.",
        });
      }
    }
  });
}

function createTray() {
  tray = new Tray(getTrayIcon());
  tray.setToolTip("Мебель План — Цех (Сервер / Участок)");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Открыть консоль / Выбор сервера в сети",
      click: () => {
        if (mainWindow) {
          mainWindow.loadURL(`http://127.0.0.1:${SERVER_PORT}/edge-console`);
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: "Сменить роль ПК (Сервер ПК / Терминал участка)",
      click: () => {
        if (mainWindow) {
          mainWindow.loadURL(`http://127.0.0.1:${SERVER_PORT}/edge-console?select_role=1`);
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: "Открыть рабочее место участка (ERP)",
      click: async () => {
        if (mainWindow) {
          const url = await resolveStartupUrl();
          mainWindow.loadURL(url.includes("/edge-console") ? `http://127.0.0.1:${SERVER_PORT}/erp` : url);
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: "Открыть в браузере (Chrome/Edge)",
      click: () => {
        shell.openExternal(`http://127.0.0.1:${SERVER_PORT}/edge-console`).catch(() => {});
      },
    },
    { type: "separator" },
    {
      label: "Остановить и выйти",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  try {
    startEmbeddedEdgeServer();
    await waitForServerReady();
    createTray();
    await createWindow();
  } catch (err) {
    dialog.showErrorBox(
      "Ошибка запуска Мебель План Цех",
      `Не удалось запустить приложение цеха:\n${err && err.message ? err.message : String(err)}`
    );
    app.quit();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  if (isQuitting) {
    app.quit();
  }
});
