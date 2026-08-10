import { contextBridge, ipcRenderer } from 'electron';
import type { DomainPolicy, Thresholds } from '@mailwatch/core';

/** Única superficie que el renderer puede tocar del proceso principal. */
const api = {
  /** El renderer ajusta el espacio superior según los botones de ventana. */
  platform: process.platform,
  loadInbox: (thresholds?: Thresholds, policy?: DomainPolicy) =>
    ipcRenderer.invoke('inbox:load', thresholds, policy),
};

contextBridge.exposeInMainWorld('mailwatch', api);

export type MailWatchApi = typeof api;
