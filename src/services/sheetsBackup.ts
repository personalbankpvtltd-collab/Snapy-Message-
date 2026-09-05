import { SCRIPT_URL } from './api';

export interface BackupStatus {
  lastBackupTime: string | null;
  pendingCount: number;
  lastAction: string | null;
  status: 'idle' | 'syncing' | 'error' | 'success';
}

let pendingQueue: { action: string; data: any; timestamp: number }[] = [];
let isProcessingQueue = false;

let backupStatus: BackupStatus = {
  lastBackupTime: null,
  pendingCount: 0,
  lastAction: null,
  status: 'idle',
};

const listeners: ((status: BackupStatus) => void)[] = [];

function notifyListeners() {
  backupStatus.pendingCount = pendingQueue.length;
  listeners.forEach((listener) => listener({ ...backupStatus }));
}

/**
 * Sends data to Google Sheets as secondary backup asynchronously.
 * Does not block the primary Firebase operations.
 */
export const backupToSheets = (action: string, data: any = {}) => {
  if (!SCRIPT_URL) {
    console.warn('[Sheets Backup] SCRIPT_URL not configured. Skipping secondary backup.');
    return;
  }

  // Add to queue
  pendingQueue.push({ action, data, timestamp: Date.now() });
  backupStatus.lastAction = action;
  backupStatus.status = 'syncing';
  notifyListeners();

  // Process in background
  if (!isProcessingQueue) {
    processBackupQueue();
  }
};

async function processBackupQueue() {
  if (isProcessingQueue || pendingQueue.length === 0) return;
  isProcessingQueue = true;

  while (pendingQueue.length > 0) {
    const item = pendingQueue[0];
    try {
      const payload = JSON.stringify({ action: item.action, ...item.data });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout for backup

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`[Secondary Backup - Sheets] Synced action: ${item.action}`);
        backupStatus.lastBackupTime = new Date().toISOString();
        backupStatus.status = 'success';
      } else {
        console.warn(`[Secondary Backup - Sheets] Response status: ${response.status} for ${item.action}`);
      }
    } catch (error: any) {
      console.warn(`[Secondary Backup - Sheets] Warning during backup of ${item.action}:`, error.message);
      backupStatus.status = 'error';
    }

    // Dequeue item even on error to prevent infinite queue lock
    pendingQueue.shift();
    notifyListeners();

    // Small delay between backup items to prevent throttling Apps Script
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  isProcessingQueue = false;
  backupStatus.status = 'idle';
  notifyListeners();
}

export const sheetsBackupService = {
  queueBackup: backupToSheets,
  getStatus: () => ({ ...backupStatus }),
  subscribeStatus: (callback: (status: BackupStatus) => void) => {
    listeners.push(callback);
    callback({ ...backupStatus });
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },
};
