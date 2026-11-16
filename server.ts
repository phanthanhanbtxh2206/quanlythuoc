/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BRIDGE_CONFIG_PATH = path.join(__dirname, '.cloud-bridge-config.json');

interface SharedBridgeConfig {
  syncMode?: string;
  appsScriptUrl?: string;
  googleSheetUrl?: string;
  googleSpreadsheetId?: string;
  googleDriveFolder?: string;
  autoBackupEnabled?: boolean;
  autoSyncOnTransaction?: boolean;
  updatedAt?: string;
}

interface RelayedUserRecord {
  id: string;
  email: string;
  password?: string;
  fullName: string;
  role: string;
  status: string;
  department: string;
  phone?: string;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  cloudSyncedToSheets?: boolean;
  updatedAt?: string;
}

const isValidGasUrl = (url?: string): boolean => {
  const clean = (url || '').trim();
  return /^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec/.test(clean);
};

const normalizePhone = (phone?: string): string => (phone || '').replace(/[\s.-]/g, '').trim();

const loadPersistedBridgeConfig = (): SharedBridgeConfig => {
  const envUrl = (process.env.VITE_APPS_SCRIPT_URL || process.env.APPS_SCRIPT_URL || '').trim();
  const base: SharedBridgeConfig = {
    appsScriptUrl: envUrl,
    googleSheetUrl: '',
    googleSpreadsheetId: '',
    googleDriveFolder: 'QUAN_LY_THUOC_TRUNG_TAM/2026',
    syncMode: 'HYBRID',
    autoBackupEnabled: true,
    autoSyncOnTransaction: true,
  };

  try {
    if (fs.existsSync(BRIDGE_CONFIG_PATH)) {
      const raw = fs.readFileSync(BRIDGE_CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...base,
          syncMode: typeof parsed.syncMode === 'string' ? parsed.syncMode : base.syncMode,
          appsScriptUrl:
            typeof parsed.appsScriptUrl === 'string' && parsed.appsScriptUrl.trim()
              ? parsed.appsScriptUrl.trim()
              : base.appsScriptUrl,
          googleSheetUrl: typeof parsed.googleSheetUrl === 'string' ? parsed.googleSheetUrl.trim() : '',
          googleSpreadsheetId:
            typeof parsed.googleSpreadsheetId === 'string' ? parsed.googleSpreadsheetId.trim() : '',
          googleDriveFolder:
            typeof parsed.googleDriveFolder === 'string' && parsed.googleDriveFolder.trim()
              ? parsed.googleDriveFolder.trim()
              : base.googleDriveFolder,
          autoBackupEnabled:
            typeof parsed.autoBackupEnabled === 'boolean' ? parsed.autoBackupEnabled : base.autoBackupEnabled,
          autoSyncOnTransaction:
            typeof parsed.autoSyncOnTransaction === 'boolean'
              ? parsed.autoSyncOnTransaction
              : base.autoSyncOnTransaction,
          updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : undefined,
        };
      }
    }
  } catch (err) {
    console.warn('Could not read persisted bridge config, using defaults:', err);
  }

  return base;
};

const savePersistedBridgeConfig = (cfg: SharedBridgeConfig) => {
  try {
    // Store ONLY non-sensitive connection endpoint settings (zero user/business data on server disk)
    const cleanPayload: SharedBridgeConfig = {
      syncMode: cfg.syncMode || 'HYBRID',
      appsScriptUrl: (cfg.appsScriptUrl || '').trim(),
      googleSheetUrl: (cfg.googleSheetUrl || '').trim(),
      googleSpreadsheetId: (cfg.googleSpreadsheetId || '').trim(),
      googleDriveFolder: (cfg.googleDriveFolder || 'QUAN_LY_THUOC_TRUNG_TAM/2026').trim(),
      autoBackupEnabled: cfg.autoBackupEnabled !== false,
      autoSyncOnTransaction: cfg.autoSyncOnTransaction !== false,
      updatedAt: cfg.updatedAt || new Date().toISOString(),
    };
    fs.writeFileSync(BRIDGE_CONFIG_PATH, JSON.stringify(cleanPayload, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist bridge config to disk:', err);
  }
};

const sharedBridgeConfig: SharedBridgeConfig = loadPersistedBridgeConfig();
const relayedUsersMap = new Map<string, RelayedUserRecord>();

async function postAppsScriptServerSide(appsScriptUrl: string, payload: Record<string, unknown>) {
  const cleanUrl = appsScriptUrl.trim();
  if (!isValidGasUrl(cleanUrl)) {
    throw new Error(
      'URL Apps Script không hợp lệ. URL chuẩn phải có dạng https://script.google.com/macros/s/.../exec'
    );
  }

  const response = await fetch(cleanUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  const text = await response.text();
  try {
    const parsed = JSON.parse(text);
    if (parsed && parsed.success === false) {
      const err: Error & { code?: string; duplicate?: boolean } = new Error(
        parsed.error || 'Apps Script trả về lỗi thực thi.'
      );
      if (parsed.duplicate) err.duplicate = true;
      if (parsed.code) err.code = String(parsed.code);
      throw err;
    }
    return parsed;
  } catch (err: any) {
    if (err?.duplicate || err?.code || (err?.message && !/JSON/i.test(err.message))) {
      throw err;
    }
    if (!response.ok) {
      throw new Error(`Lỗi kết nối Apps Script (${response.status}): ${text.slice(0, 200)}`);
    }
    if (text.includes('ServiceLogin') || text.includes('accounts.google.com')) {
      throw new Error(
        'Apps Script đang yêu cầu đăng nhập Google. Vui lòng triển khai lại Web App với quyền "Who has access: Anyone (Bất kỳ ai)".'
      );
    }
    throw new Error(err?.message || `Phản hồi từ Apps Script không hợp lệ: ${text.slice(0, 120)}`);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  app.use('/api', (_req: Request, res: Response, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    next();
  });

  // Liveness / readiness health check
  app.get('/healthz', (_req: Request, res: Response) => {
    res.status(200).send('OK');
  });

  // 1. Shared Google Sheets / Apps Script Bridge Configuration (persisted pointer only)
  app.get('/api/cloud-bridge', (_req: Request, res: Response) => {
    res.json({
      success: true,
      config: sharedBridgeConfig,
    });
  });

  app.post('/api/cloud-bridge', (req: Request, res: Response) => {
    const body = req.body || {};
    if (typeof body.appsScriptUrl === 'string' && body.appsScriptUrl.trim()) {
      sharedBridgeConfig.appsScriptUrl = body.appsScriptUrl.trim();
    } else if (body.appsScriptUrl === '') {
      sharedBridgeConfig.appsScriptUrl = '';
    }
    if (typeof body.googleSheetUrl === 'string') {
      sharedBridgeConfig.googleSheetUrl = body.googleSheetUrl.trim();
    }
    if (typeof body.googleSpreadsheetId === 'string') {
      sharedBridgeConfig.googleSpreadsheetId = body.googleSpreadsheetId.trim();
    }
    if (typeof body.googleDriveFolder === 'string' && body.googleDriveFolder.trim()) {
      sharedBridgeConfig.googleDriveFolder = body.googleDriveFolder.trim();
    }
    if (typeof body.syncMode === 'string') {
      sharedBridgeConfig.syncMode = body.syncMode;
    }
    if (typeof body.autoBackupEnabled === 'boolean') {
      sharedBridgeConfig.autoBackupEnabled = body.autoBackupEnabled;
    }
    if (typeof body.autoSyncOnTransaction === 'boolean') {
      sharedBridgeConfig.autoSyncOnTransaction = body.autoSyncOnTransaction;
    }
    sharedBridgeConfig.updatedAt = new Date().toISOString();

    savePersistedBridgeConfig(sharedBridgeConfig);

    res.json({
      success: true,
      config: sharedBridgeConfig,
    });
  });

  // 2. Server-Side Google Apps Script Proxy (avoids browser CORS / 302 redirect blocks)
  app.post('/api/apps-script-proxy', async (req: Request, res: Response) => {
    try {
      const appsScriptUrl =
        (typeof req.body?.appsScriptUrl === 'string' && req.body.appsScriptUrl.trim()) ||
        sharedBridgeConfig.appsScriptUrl ||
        '';
      const payload = req.body?.payload;
      if (!payload || typeof payload !== 'object') {
        res.status(400).json({ success: false, error: 'Thiếu dữ liệu payload gửi tới Apps Script.' });
        return;
      }
      const data = await postAppsScriptServerSide(appsScriptUrl, payload);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(err?.duplicate ? 409 : 502).json({
        success: false,
        duplicate: Boolean(err?.duplicate),
        code: err?.code,
        error: err?.message || 'Không thể kết nối tới Google Apps Script Web App.',
      });
    }
  });

  // 3. Cross-Browser / Cross-Tab Pending Registration Relay (real-time fallback & fast propagation)
  app.get('/api/pending-registrations', (_req: Request, res: Response) => {
    res.json({
      success: true,
      users: Array.from(relayedUsersMap.values()),
    });
  });

  app.post('/api/pending-registrations', (req: Request, res: Response) => {
    const incomingUser = req.body?.user as RelayedUserRecord | undefined;
    if (!incomingUser || !incomingUser.id || !incomingUser.email) {
      res.status(400).json({ success: false, error: 'Dữ liệu tài khoản đăng ký không hợp lệ.' });
      return;
    }

    const cleanEmail = incomingUser.email.trim().toLowerCase();
    const cleanPhone = normalizePhone(incomingUser.phone);

    for (const existing of relayedUsersMap.values()) {
      if (existing.id === incomingUser.id) continue;
      if (existing.email.trim().toLowerCase() === cleanEmail) {
        res.status(409).json({ success: false, error: 'Email này đã có yêu cầu đăng ký trong hệ thống.' });
        return;
      }
      if (cleanPhone && normalizePhone(existing.phone) === cleanPhone) {
        res.status(409).json({ success: false, error: 'Số điện thoại này đã được đăng ký trong hệ thống.' });
        return;
      }
    }

    const stored: RelayedUserRecord = {
      ...incomingUser,
      cloudSyncedToSheets: Boolean(incomingUser.cloudSyncedToSheets),
      updatedAt: new Date().toISOString(),
    };
    relayedUsersMap.set(stored.id, stored);

    res.json({
      success: true,
      user: stored,
      users: Array.from(relayedUsersMap.values()),
    });
  });

  app.patch('/api/pending-registrations/:id', (req: Request, res: Response) => {
    const id = String(req.params.id || '');
    const updates = req.body || {};
    const existing = relayedUsersMap.get(id);
    if (existing) {
      const updated: RelayedUserRecord = {
        ...existing,
        ...updates,
        id: existing.id,
        updatedAt: new Date().toISOString(),
      };
      relayedUsersMap.set(id, updated);
    } else if (updates && updates.email) {
      relayedUsersMap.set(id, {
        ...updates,
        id,
        updatedAt: new Date().toISOString(),
      });
    }
    res.json({
      success: true,
      users: Array.from(relayedUsersMap.values()),
    });
  });

  app.post('/api/pending-registrations/mark-synced', (req: Request, res: Response) => {
    const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
    ids.forEach((id) => {
      const rec = relayedUsersMap.get(id);
      if (rec) {
        relayedUsersMap.set(id, {
          ...rec,
          cloudSyncedToSheets: true,
          updatedAt: new Date().toISOString(),
        });
      }
    });
    res.json({
      success: true,
      users: Array.from(relayedUsersMap.values()),
    });
  });

  // Dev vs Production Vite/Static Serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
