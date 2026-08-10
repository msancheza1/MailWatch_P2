import { join } from 'node:path';
import { BrowserWindow, app, ipcMain, shell } from 'electron';
import {
  analyzeBatch,
  auditFor,
  folderFor,
  type AnalysisResult,
  type AuditEntry,
  type DomainPolicy,
  type EmailMessage,
  type Thresholds,
} from '@mailwatch/core';
import { loadSimulatedEmails } from '@mailwatch/fixtures';

/**
 * El proceso principal hace hoy el papel que en la arquitectura del Sprint 0
 * corresponde a la API REST + motor de análisis. Mantener el límite aquí
 * (IPC en vez de llamadas directas desde la UI) hace que sustituirlo por
 * `fetch` contra el backend real no obligue a tocar el renderer.
 */
export interface InboxSnapshot {
  emails: EmailMessage[];
  results: AnalysisResult[];
  audit: AuditEntry[];
  stats: { total: number; safe: number; suspicious: number; malicious: number; elapsedMs: number };
}

function buildSnapshot(thresholds?: Thresholds, policy?: DomainPolicy): InboxSnapshot {
  const emails = loadSimulatedEmails();
  const start = performance.now();
  const results = analyzeBatch(emails, {
    ...(thresholds && { thresholds }),
    ...(policy && { policy }),
  });
  const elapsedMs = Math.round(performance.now() - start);

  return {
    emails,
    results,
    audit: results.flatMap((result) => auditFor(result)),
    stats: {
      total: results.length,
      safe: results.filter((r) => r.level === 'safe').length,
      suspicious: results.filter((r) => r.level === 'suspicious').length,
      malicious: results.filter((r) => folderFor(r.level) === 'quarantine').length,
      elapsedMs,
    },
  };
}

/**
 * Windows es la plataforma objetivo. Se usa ventana sin marco con los botones
 * nativos superpuestos (`titleBarOverlay`), para que la app se vea como los
 * mockups y no con la barra de título gris del sistema. En macOS el
 * equivalente es `hiddenInset` con los semáforos sobre la barra lateral.
 */
function windowChrome(): Electron.BrowserWindowConstructorOptions {
  if (process.platform === 'win32') {
    return {
      titleBarStyle: 'hidden',
      titleBarOverlay: { color: '#eef0fd', symbolColor: '#1e2235', height: 40 },
    };
  }
  if (process.platform === 'darwin') {
    return { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 18, y: 22 } };
  }
  return {};
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1040,
    minHeight: 680,
    show: false,
    // Color del lienzo: evita el destello oscuro antes de que pinte el renderer.
    backgroundColor: '#eef0fd',
    ...windowChrome(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  window.once('ready-to-show', () => window.show());

  // Ningún enlace del dataset debe abrirse dentro de la app.
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  const devServer = process.env['ELECTRON_RENDERER_URL'];
  if (devServer) {
    void window.loadURL(devServer);
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

void app.whenReady().then(() => {
  ipcMain.handle('inbox:load', (_event, thresholds?: Thresholds, policy?: DomainPolicy) =>
    buildSnapshot(thresholds, policy),
  );

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
