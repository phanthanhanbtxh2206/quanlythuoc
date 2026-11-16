/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  User,
  Beneficiary,
  Medicine,
  MedicineSource,
  StockReceipt,
  StockReceiptItem,
  StockIssue,
  StockIssueItem,
  Prescription,
  PrescriptionItem,
  StockTransaction,
  AuditLog,
  DriveSyncedFile,
  BeneficiaryReportRow,
  LotStock,
  UserRole,
  UserStatus,
  RolePermissions,
  ROLE_PERMISSIONS,
  TemplateSettings,
  DEFAULT_TEMPLATE_SETTINGS,
  BackupLog,
  CloudStateSnapshot,
} from '../types';
import {
  downloadThreeSheetsExcelWorkbook,
  downloadThreeSheetsCSV,
  parseUsersFromAccountSheet,
} from '../utils/googleSheetsBackup';
import {
  initGoogleAuth,
  signInWithGoogle,
  signOutGoogle,
  getAccessToken,
} from '../services/googleAuth';
import {
  syncAllDataToGoogleSheets,
  readAccountSheetViaOAuth,
  GoogleSheetsSyncResult,
  extractSpreadsheetId,
  GOOGLE_SAMPLE_READONLY_ID,
} from '../services/googleSheetsService';
import {
  syncAllDataViaAppsScript,
  pullAllDataViaAppsScript,
  uploadDocumentViaAppsScript,
  testAppsScriptConnection,
  isValidAppsScriptUrl,
  DRIVE_STATE_FILENAME,
  AppsScriptPingResult,
} from '../services/appsScriptSyncService';
import {
  uploadFileToGoogleDrive,
  upsertJsonFileInGoogleDrive,
  readJsonFileFromGoogleDrive,
} from '../services/googleDriveService';
import {
  INITIAL_USERS,
  INITIAL_BENEFICIARIES,
  INITIAL_MEDICINES,
  INITIAL_SOURCES,
  INITIAL_STOCK_RECEIPTS,
  INITIAL_STOCK_ISSUES,
  INITIAL_PRESCRIPTIONS,
  INITIAL_TRANSACTIONS,
} from '../data/mockData';
import { getTodayISODate } from '../utils/formatters';

export const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes (1 hour)

interface CloudPullResult {
  success: boolean;
  usersUpdated?: number;
  restoredFromDrive?: boolean;
  timestamp?: string;
  error?: string;
}

interface AppContextType {
  // Data
  users: User[];
  currentUser: User;
  beneficiaries: Beneficiary[];
  medicines: Medicine[];
  sources: MedicineSource[];
  receipts: StockReceipt[];
  issues: StockIssue[];
  prescriptions: Prescription[];
  transactions: StockTransaction[];
  auditLogs: AuditLog[];
  syncedFiles: DriveSyncedFile[];
  templateSettings: TemplateSettings;
  backupLogs: BackupLog[];

  // Google Sheets & Drive Bidirectional Sync
  googleUser: any;
  isGoogleAuthenticated: boolean;
  isSyncingSheets: boolean;
  isPullingFromCloud: boolean;
  syncSheetsError: string | null;
  lastSheetsSyncResult: GoogleSheetsSyncResult | null;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string; cancelled?: boolean }>;
  logoutFromGoogle: () => Promise<void>;
  syncNowToGoogleSheets: (skipConfirm?: boolean) => Promise<GoogleSheetsSyncResult | null>;
  pullFromSheetsAndDrive: (silent?: boolean) => Promise<CloudPullResult>;
  testAppsScriptSync: (url: string) => Promise<AppsScriptPingResult>;

  // Template & Auto-backup Actions
  updateTemplateSettings: (settings: Partial<TemplateSettings>) => void;
  resetTemplateSettings: () => void;
  triggerAutoBackup: (actionDescription: string) => void;
  exportFullGoogleSheetData: () => void;
  exportFullGoogleSheetCSV: () => void;

  // User & Authentication Actions (RBAC + Session Timeout)
  isAuthenticated: boolean;
  sessionNotice: string | null;
  clearSessionNotice: () => void;
  remainingSessionSeconds: number;
  setCurrentUser: (user: User) => void;
  loginWithCredentials: (emailOrPhone: string, password?: string) => { success: boolean; error?: string };
  logoutApp: (reason?: string) => void;
  registerNewAccount: (data: {
    email: string;
    password?: string;
    fullName: string;
    department: string;
    phone?: string;
    role: UserRole;
    autoApprove?: boolean;
  }) => { success: boolean; message: string; user?: User };
  hasPermission: (permission: keyof RolePermissions) => boolean;
  canModifyReceipt: (receipt: StockReceipt, action: 'edit' | 'delete') => boolean;
  canModifyIssue: (issue: StockIssue, action: 'edit' | 'delete') => boolean;
  registerUser: (email: string, fullName: string, department: string, phone: string, requestedRole: UserRole) => void;
  approveUser: (userId: string, role: UserRole) => void;
  rejectUser: (userId: string) => void;
  changeUserRole: (userId: string, role: UserRole) => void;
  toggleUserStatus: (userId: string, status: UserStatus) => void;
  updateUserAccount: (
    userId: string,
    updates: {
      fullName?: string;
      email?: string;
      phone?: string;
      department?: string;
      role?: UserRole;
      status?: UserStatus;
      password?: string;
    }
  ) => { success: boolean; error?: string };

  // Medicine Actions
  addMedicine: (medicine: Omit<Medicine, 'id' | 'createdAt'>) => Medicine;
  updateMedicine: (id: string, medicine: Partial<Medicine>) => void;

  // Beneficiary Actions
  addBeneficiary: (beneficiary: Omit<Beneficiary, 'id' | 'createdAt'>) => Beneficiary;
  updateBeneficiary: (id: string, beneficiary: Partial<Beneficiary>) => void;

  // Stock Actions
  createStockReceipt: (
    receiptData: Omit<StockReceipt, 'id' | 'totalAmount' | 'createdBy' | 'createdByName' | 'createdAt' | 'status'>,
    items: Omit<StockReceiptItem, 'id' | 'receiptId' | 'totalPrice'>[]
  ) => StockReceipt;
  updateStockReceipt: (
    receiptId: string,
    receiptData: Partial<StockReceipt>,
    items: Omit<StockReceiptItem, 'id' | 'receiptId' | 'totalPrice'>[]
  ) => { success: boolean; receipt?: StockReceipt; error?: string };
  deleteStockReceipt: (receiptId: string) => { success: boolean; error?: string };

  createStockIssue: (
    issueData: Omit<StockIssue, 'id' | 'totalAmount' | 'createdBy' | 'createdByName' | 'createdAt' | 'status'>,
    items: Omit<StockIssueItem, 'id' | 'issueId' | 'totalPrice'>[]
  ) => { success: boolean; issue?: StockIssue; error?: string };
  updateStockIssue: (
    issueId: string,
    issueData: Partial<StockIssue>,
    items: Omit<StockIssueItem, 'id' | 'issueId' | 'totalPrice'>[]
  ) => { success: boolean; issue?: StockIssue; error?: string };
  deleteStockIssue: (issueId: string) => { success: boolean; error?: string };

  // Prescription & Dispensation Actions
  createPrescription: (
    prescData: Omit<Prescription, 'id' | 'createdAt' | 'status' | 'items'>,
    items: Omit<PrescriptionItem, 'id' | 'prescriptionId' | 'dispensedQuantity'>[]
  ) => Prescription;

  dispensePrescription: (
    prescriptionId: string,
    itemsToDispense: { medicineId: string; batchNumber: string; quantity: number; unitPrice: number; expiryDate: string }[],
    receiverName: string,
    receiverDept: string
  ) => { success: boolean; error?: string; issue?: StockIssue };

  // Queries & Analytics
  getAvailableLots: (medicineId?: string, beneficiaryId?: string) => LotStock[];
  getExpiringLots: (daysThreshold?: number) => { medicine: Medicine; lot: LotStock; daysUntilExpiry: number }[];
  getLowStockMedicines: () => { medicine: Medicine; currentStock: number }[];
  calculateBeneficiaryReport: (beneficiaryId: string, startDate: string, endDate: string) => BeneficiaryReportRow[];

  // Sync & Storage (Admin Only)
  syncDocumentToDrive: (
    docCode: string,
    docType: 'PHIEU_NHAP' | 'PHIEU_XUAT' | 'DON_THUOC' | 'BAO_CAO_BHYT',
    fileName: string,
    documentHtmlContent?: string
  ) => Promise<DriveSyncedFile | null>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Ephemeral working cache keys (sessionStorage ONLY - cleared when closing browser/session)
const SESSION_STORAGE_KEYS = {
  USERS: 'btxh_sess_users_v2',
  BENEFICIARIES: 'btxh_sess_beneficiaries_v2',
  MEDICINES: 'btxh_sess_medicines_v2',
  SOURCES: 'btxh_sess_sources_v2',
  RECEIPTS: 'btxh_sess_receipts_v2',
  ISSUES: 'btxh_sess_issues_v2',
  PRESCRIPTIONS: 'btxh_sess_prescriptions_v2',
  TRANSACTIONS: 'btxh_sess_transactions_v2',
  AUDIT_LOGS: 'btxh_sess_audit_logs_v2',
  SYNCED_FILES: 'btxh_sess_synced_files_v2',
  CURRENT_USER: 'btxh_sess_current_user_v2',
  IS_AUTHENTICATED: 'btxh_sess_authenticated_v2',
  LAST_ACTIVITY: 'btxh_sess_last_activity_v2',
  TEMPLATE_SETTINGS: 'btxh_sess_template_settings_v2',
  BACKUP_LOGS: 'btxh_sess_backup_logs_v2',
};

// Minimal connection bridge pointer so the app knows which Sheets/Apps Script to connect on boot
const CLOUD_BRIDGE_CONFIG_KEY = 'btxh_cloud_bridge_cfg_v2';

// Legacy localStorage keys to scrub so data is strictly persisted on Google Sheets & Drive
const LEGACY_LOCAL_KEYS = [
  'btxh_users_v1',
  'btxh_beneficiaries_v1',
  'btxh_medicines_v1',
  'btxh_sources_v1',
  'btxh_receipts_v1',
  'btxh_issues_v1',
  'btxh_prescriptions_v1',
  'btxh_transactions_v1',
  'btxh_audit_logs_v1',
  'btxh_synced_files_v1',
  'btxh_current_user_v1',
  'btxh_is_authenticated_v1',
  'btxh_template_settings_v1',
  'btxh_backup_logs_v1',
];

const migrateTemplateSettings = (raw: Partial<TemplateSettings>): TemplateSettings => {
  const merged: TemplateSettings = { ...DEFAULT_TEMPLATE_SETTINGS, ...raw };
  if (!merged.parentOrg || /lao\s*động|thương\s*binh/i.test(merged.parentOrg)) {
    merged.parentOrg = 'SỞ Y TẾ THÀNH PHỐ ĐÀ NẴNG';
  }
  if (merged.googleSheetUrl && merged.googleSheetUrl.includes(GOOGLE_SAMPLE_READONLY_ID)) {
    merged.googleSheetUrl = '';
  }
  if (merged.googleSpreadsheetId === GOOGLE_SAMPLE_READONLY_ID) {
    merged.googleSpreadsheetId = '';
  }
  if (!merged.googleSpreadsheetId && merged.googleSheetUrl) {
    merged.googleSpreadsheetId = extractSpreadsheetId(merged.googleSheetUrl);
  }
  const envScriptUrl = (import.meta as any)?.env?.VITE_APPS_SCRIPT_URL;
  if (!merged.appsScriptUrl && envScriptUrl) {
    merged.appsScriptUrl = String(envScriptUrl);
  }
  return merged;
};

const readSessionJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Scrub legacy long-term localStorage records (business data is persisted exclusively on Sheets & Drive + working session cache)
  useEffect(() => {
    LEGACY_LOCAL_KEYS.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        // ignore
      }
    });
  }, []);

  // Ephemeral working-session state initialization
  const [users, setUsers] = useState<User[]>(() => readSessionJson(SESSION_STORAGE_KEYS.USERS, INITIAL_USERS));
  const [currentUser, setCurrentUser] = useState<User>(() =>
    readSessionJson(SESSION_STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[2])
  );

  // Requirement 1: Always require fresh login on first visit or when inactivity >= 60 minutes
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const flag = sessionStorage.getItem(SESSION_STORAGE_KEYS.IS_AUTHENTICATED);
      const lastActiveStr = sessionStorage.getItem(SESSION_STORAGE_KEYS.LAST_ACTIVITY);
      if (flag === 'true' && lastActiveStr) {
        const elapsed = Date.now() - Number(lastActiveStr);
        if (elapsed >= 0 && elapsed < INACTIVITY_TIMEOUT_MS) {
          return true;
        }
      }
    } catch {
      // ignore
    }
    return false;
  });

  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [remainingSessionSeconds, setRemainingSessionSeconds] = useState<number>(
    Math.floor(INACTIVITY_TIMEOUT_MS / 1000)
  );
  const lastActivityRef = useRef<number>(Date.now());

  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(() =>
    readSessionJson(SESSION_STORAGE_KEYS.BENEFICIARIES, INITIAL_BENEFICIARIES)
  );
  const [medicines, setMedicines] = useState<Medicine[]>(() =>
    readSessionJson(SESSION_STORAGE_KEYS.MEDICINES, INITIAL_MEDICINES)
  );
  const [sources] = useState<MedicineSource[]>(() =>
    readSessionJson(SESSION_STORAGE_KEYS.SOURCES, INITIAL_SOURCES)
  );
  const [receipts, setReceipts] = useState<StockReceipt[]>(() =>
    readSessionJson(SESSION_STORAGE_KEYS.RECEIPTS, INITIAL_STOCK_RECEIPTS)
  );
  const [issues, setIssues] = useState<StockIssue[]>(() =>
    readSessionJson(SESSION_STORAGE_KEYS.ISSUES, INITIAL_STOCK_ISSUES)
  );
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(() =>
    readSessionJson(SESSION_STORAGE_KEYS.PRESCRIPTIONS, INITIAL_PRESCRIPTIONS)
  );
  const [transactions, setTransactions] = useState<StockTransaction[]>(() =>
    readSessionJson(SESSION_STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS)
  );

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const parsed = readSessionJson<AuditLog[] | null>(SESSION_STORAGE_KEYS.AUDIT_LOGS, null);
    if (parsed) {
      const seen = new Set<string>();
      return parsed.map((item, idx) => {
        let id = item.id;
        if (!id || seen.has(id)) {
          id = `${id || 'log'}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
        }
        seen.add(id);
        return { ...item, id };
      });
    }
    return [
      {
        id: 'log-1',
        timestamp: new Date().toISOString(),
        userId: 'usr-1',
        userName: 'Lê Minh Tuấn',
        action: 'KHỞI_TẠO',
        entity: 'HỆ_THỐNG',
        entityId: 'SYS',
        details: 'Khởi tạo phiên làm việc hệ thống Quản lý Dược TT BTXH Đà Nẵng',
      },
    ];
  });

  const [syncedFiles, setSyncedFiles] = useState<DriveSyncedFile[]>(() =>
    readSessionJson<DriveSyncedFile[]>(SESSION_STORAGE_KEYS.SYNCED_FILES, [
      {
        id: 'sync-1',
        fileId: 'drv-file-001',
        docCode: 'PNK-20261002-001',
        docType: 'PHIEU_NHAP',
        fileName: 'PNK_20261002_001_DAPHARCO.pdf',
        driveFolder: 'QUAN_LY_THUOC_TRUNG_TAM/2026/PHIEU_NHAP',
        createdAt: '2026-10-02T09:00:00Z',
        fileSize: '142 KB',
        syncedToSheets: true,
      },
      {
        id: 'sync-2',
        fileId: 'drv-file-002',
        docCode: 'PXK-20261005-001',
        docType: 'PHIEU_XUAT',
        fileName: 'PXK_20261005_001_NguyenVanAn.pdf',
        driveFolder: 'QUAN_LY_THUOC_TRUNG_TAM/2026/PHIEU_XUAT',
        createdAt: '2026-10-05T10:00:00Z',
        fileSize: '138 KB',
        syncedToSheets: true,
      },
    ])
  );

  const [templateSettings, setTemplateSettings] = useState<TemplateSettings>(() => {
    const sessRaw = readSessionJson<Partial<TemplateSettings> | null>(
      SESSION_STORAGE_KEYS.TEMPLATE_SETTINGS,
      null
    );
    let bridgeRaw: Partial<TemplateSettings> = {};
    try {
      const savedBridge = localStorage.getItem(CLOUD_BRIDGE_CONFIG_KEY);
      if (savedBridge) bridgeRaw = JSON.parse(savedBridge);
    } catch {
      // ignore
    }
    return migrateTemplateSettings({ ...bridgeRaw, ...(sessRaw || {}) });
  });

  const [backupLogs, setBackupLogs] = useState<BackupLog[]>(() => {
    const parsed = readSessionJson<BackupLog[] | null>(SESSION_STORAGE_KEYS.BACKUP_LOGS, null);
    if (parsed) {
      const seen = new Set<string>();
      return parsed.map((item, idx) => {
        let id = item.id;
        if (!id || seen.has(id)) {
          id = `${id || 'bk'}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
        }
        seen.add(id);
        return { ...item, id };
      });
    }
    return [
      {
        id: 'bk-init',
        timestamp: new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN'),
        action: 'KHỞI_TẠO_HỆ_THỐNG',
        status: 'SUCCESS',
        recordCounts: {
          receipts: INITIAL_STOCK_RECEIPTS.length,
          issues: INITIAL_STOCK_ISSUES.length,
          medicines: INITIAL_MEDICINES.length,
          beneficiaries: INITIAL_BENEFICIARIES.length,
        },
        details: 'Sẵn sàng đồng bộ hai chiều 04 Sheet (kể cả Tài khoản) và Google Drive JSON.',
      },
    ];
  });

  // Synchronized live snapshot ref to eliminate stale closures during background two-way sync
  const latestStateRef = useRef({
    users,
    currentUser,
    beneficiaries,
    medicines,
    receipts,
    issues,
    prescriptions,
    transactions,
    auditLogs,
    syncedFiles,
    templateSettings,
  });
  latestStateRef.current = {
    users,
    currentUser,
    beneficiaries,
    medicines,
    receipts,
    issues,
    prescriptions,
    transactions,
    auditLogs,
    syncedFiles,
    templateSettings,
  };

  // Persist ONLY temporary working session state to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch {}
  }, [users]);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
    } catch {}
  }, [currentUser]);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.IS_AUTHENTICATED, String(isAuthenticated));
      if (isAuthenticated) {
        const now = Date.now();
        lastActivityRef.current = now;
        sessionStorage.setItem(SESSION_STORAGE_KEYS.LAST_ACTIVITY, String(now));
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_KEYS.LAST_ACTIVITY);
      }
    } catch {}
  }, [isAuthenticated]);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.BENEFICIARIES, JSON.stringify(beneficiaries));
    } catch {}
  }, [beneficiaries]);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.MEDICINES, JSON.stringify(medicines));
    } catch {}
  }, [medicines]);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.RECEIPTS, JSON.stringify(receipts));
    } catch {}
  }, [receipts]);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.ISSUES, JSON.stringify(issues));
    } catch {}
  }, [issues]);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.PRESCRIPTIONS, JSON.stringify(prescriptions));
    } catch {}
  }, [prescriptions]);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    } catch {}
  }, [transactions]);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));
    } catch {}
  }, [auditLogs]);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.SYNCED_FILES, JSON.stringify(syncedFiles));
    } catch {}
  }, [syncedFiles]);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.TEMPLATE_SETTINGS, JSON.stringify(templateSettings));
      // Save only the lightweight endpoint discovery pointer in localStorage (no business or account data)
      const cloudPointer = {
        syncMode: templateSettings.syncMode,
        appsScriptUrl: templateSettings.appsScriptUrl,
        googleSheetUrl: templateSettings.googleSheetUrl,
        googleSpreadsheetId: templateSettings.googleSpreadsheetId,
        googleDriveFolder: templateSettings.googleDriveFolder,
        autoBackupEnabled: templateSettings.autoBackupEnabled,
        autoSyncOnTransaction: templateSettings.autoSyncOnTransaction,
      };
      localStorage.setItem(CLOUD_BRIDGE_CONFIG_KEY, JSON.stringify(cloudPointer));
    } catch {}
  }, [templateSettings]);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.BACKUP_LOGS, JSON.stringify(backupLogs));
    } catch {}
  }, [backupLogs]);

  // Helper: Logout cleanly with optional notice
  const logoutApp = useCallback((reason?: string) => {
    const active = latestStateRef.current.currentUser;
    setIsAuthenticated(false);
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.IS_AUTHENTICATED);
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.LAST_ACTIVITY);
    } catch {}
    if (reason) {
      setSessionNotice(reason);
    }
    if (active?.id) {
      const logEntry: AuditLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        userId: active.id,
        userName: active.fullName,
        action: 'ĐĂNG_XUẤT',
        entity: 'NGƯỜI_DÙNG',
        entityId: active.id,
        details: reason || `Cán bộ ${active.fullName} đã đăng xuất khỏi phiên làm việc`,
      };
      setAuditLogs((prev) => [logEntry, ...prev]);
    }
  }, []);

  const clearSessionNotice = useCallback(() => setSessionNotice(null), []);

  // Requirement 1: 60-minute (1-hour) Inactivity Auto-Logout Watchdog
  useEffect(() => {
    if (!isAuthenticated) {
      setRemainingSessionSeconds(Math.floor(INACTIVITY_TIMEOUT_MS / 1000));
      return;
    }

    let lastRecorded = Date.now();
    lastActivityRef.current = lastRecorded;

    const recordActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current >= INACTIVITY_TIMEOUT_MS) {
        logoutApp('Hệ thống tự động đăng xuất do không có thao tác trong 60 phút.');
        return;
      }
      if (now - lastRecorded > 1000) {
        lastRecorded = now;
        lastActivityRef.current = now;
        try {
          sessionStorage.setItem(SESSION_STORAGE_KEYS.LAST_ACTIVITY, String(now));
        } catch {}
      }
    };

    const checkExpiration = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      const rem = Math.max(0, Math.floor((INACTIVITY_TIMEOUT_MS - elapsed) / 1000));
      setRemainingSessionSeconds(rem);
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        logoutApp('Phiên làm việc đã tự động đăng xuất do không thao tác trên hệ thống quá 1 giờ.');
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkExpiration();
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'pointerdown'];
    events.forEach((evt) => window.addEventListener(evt, recordActivity, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', checkExpiration);

    const timer = window.setInterval(checkExpiration, 1000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, recordActivity));
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', checkExpiration);
      window.clearInterval(timer);
    };
  }, [isAuthenticated, logoutApp]);

  const updateTemplateSettings = (newSettings: Partial<TemplateSettings>) => {
    setTemplateSettings((prev) => {
      const updated = migrateTemplateSettings({ ...prev, ...newSettings });
      if (newSettings.googleSheetUrl !== undefined) {
        const parsedId = extractSpreadsheetId(newSettings.googleSheetUrl);
        updated.googleSpreadsheetId = parsedId === GOOGLE_SAMPLE_READONLY_ID ? '' : parsedId;
      }
      latestStateRef.current.templateSettings = updated;
      addAuditLog('CẤU_HÌNH', 'BIỂU_MẪU', 'TEMPLATE', 'Cập nhật cấu hình biểu mẫu mặc định của Trung tâm');
      return updated;
    });
  };

  const resetTemplateSettings = () => {
    const cleanDefault = migrateTemplateSettings(DEFAULT_TEMPLATE_SETTINGS);
    setTemplateSettings((prev) => ({
      ...cleanDefault,
      appsScriptUrl: prev.appsScriptUrl,
      googleSheetUrl: prev.googleSheetUrl,
      googleSpreadsheetId: prev.googleSpreadsheetId,
      googleDriveFolder: prev.googleDriveFolder,
      syncMode: prev.syncMode,
    }));
    addAuditLog('KHÔI_PHỤC_BIỂU_MẪU', 'BIỂU_MẪU', 'TEMPLATE', 'Đặt lại nhãn chữ trên biểu mẫu về mặc định');
  };

  // Google Sheets Auto-Sync States
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState<boolean>(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);
  const [isPullingFromCloud, setIsPullingFromCloud] = useState<boolean>(false);
  const [syncSheetsError, setSyncSheetsError] = useState<string | null>(null);
  const [lastSheetsSyncResult, setLastSheetsSyncResult] = useState<GoogleSheetsSyncResult | null>(null);

  // Initialize Firebase Google OAuth listener
  useEffect(() => {
    const unsubscribe = initGoogleAuth((user, token) => {
      setGoogleUser(user);
      setIsGoogleAuthenticated(!!user && !!token);
      if (user?.email) {
        setTemplateSettings((prev) => ({
          ...prev,
          googleUserEmail: user.email || prev.googleUserEmail,
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  const buildSnapshotPayload = useCallback((): CloudStateSnapshot => {
    const snap = latestStateRef.current;
    return {
      version: 2,
      updatedAt: new Date().toISOString(),
      updatedBy: snap.currentUser?.fullName || 'Hệ thống',
      users: snap.users,
      beneficiaries: snap.beneficiaries,
      medicines: snap.medicines,
      receipts: snap.receipts,
      issues: snap.issues,
      prescriptions: snap.prescriptions,
      transactions: snap.transactions,
      auditLogs: snap.auditLogs.slice(0, 100),
      syncedFiles: snap.syncedFiles.slice(0, 100),
      templateSettings: {
        ...snap.templateSettings,
      },
    };
  }, []);

  // Bidirectional PULL from Google Sheets ("Tài khoản") & Google Drive (btxh_pharmacy_state.json)
  const pullFromSheetsAndDrive = useCallback(async (silent = false): Promise<CloudPullResult> => {
    const activeSettings = latestStateRef.current.templateSettings;
    const hasAppsScript = isValidAppsScriptUrl(activeSettings.appsScriptUrl);
    const token = await getAccessToken();

    if (!hasAppsScript && !token) {
      const msg = 'Chưa cấu hình URL Google Apps Script hoặc phiên Google OAuth để kéo dữ liệu hai chiều.';
      if (!silent) setSyncSheetsError(msg);
      return { success: false, error: msg };
    }

    setIsPullingFromCloud(true);
    if (!silent) setSyncSheetsError(null);

    try {
      let accountRows: any[][] = [];
      let stateJson: CloudStateSnapshot | null = null;
      let pulledSheetId = activeSettings.googleSpreadsheetId || '';
      let pulledSheetUrl = activeSettings.googleSheetUrl || '';
      let timestamp = new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN');

      if (hasAppsScript) {
        const res = await pullAllDataViaAppsScript(
          activeSettings.appsScriptUrl,
          activeSettings.googleDriveFolder || 'QUAN_LY_THUOC_TRUNG_TAM/2026'
        );
        if (!res.success) {
          throw new Error(res.error || 'Không thể kéo dữ liệu qua Google Apps Script.');
        }
        accountRows = res.accountRows || [];
        stateJson = res.stateJson || null;
        if (res.spreadsheetId) pulledSheetId = res.spreadsheetId;
        if (res.spreadsheetUrl) pulledSheetUrl = res.spreadsheetUrl;
        if (res.timestamp) timestamp = res.timestamp;
      } else if (token) {
        if (pulledSheetId) {
          accountRows = await readAccountSheetViaOAuth(token, pulledSheetId);
        }
        const driveRead = await readJsonFileFromGoogleDrive(
          token,
          activeSettings.googleDriveFolder || 'QUAN_LY_THUOC_TRUNG_TAM/2026',
          DRIVE_STATE_FILENAME
        );
        if (driveRead.success && driveRead.content) {
          stateJson = JSON.parse(driveRead.content) as CloudStateSnapshot;
        }
      }

      let restoredFromDrive = false;

      // 1. Apply Drive JSON full state snapshot first
      if (stateJson && typeof stateJson === 'object') {
        restoredFromDrive = true;
        if (Array.isArray(stateJson.beneficiaries) && stateJson.beneficiaries.length > 0) {
          latestStateRef.current.beneficiaries = stateJson.beneficiaries;
          setBeneficiaries(stateJson.beneficiaries);
        }
        if (Array.isArray(stateJson.medicines) && stateJson.medicines.length > 0) {
          latestStateRef.current.medicines = stateJson.medicines;
          setMedicines(stateJson.medicines);
        }
        if (Array.isArray(stateJson.receipts)) {
          latestStateRef.current.receipts = stateJson.receipts;
          setReceipts(stateJson.receipts);
        }
        if (Array.isArray(stateJson.issues)) {
          latestStateRef.current.issues = stateJson.issues;
          setIssues(stateJson.issues);
        }
        if (Array.isArray(stateJson.prescriptions)) {
          latestStateRef.current.prescriptions = stateJson.prescriptions;
          setPrescriptions(stateJson.prescriptions);
        }
        if (Array.isArray(stateJson.transactions)) {
          latestStateRef.current.transactions = stateJson.transactions;
          setTransactions(stateJson.transactions);
        }
        if (Array.isArray(stateJson.auditLogs) && stateJson.auditLogs.length > 0) {
          latestStateRef.current.auditLogs = stateJson.auditLogs;
          setAuditLogs(stateJson.auditLogs);
        }
        if (Array.isArray(stateJson.syncedFiles)) {
          latestStateRef.current.syncedFiles = stateJson.syncedFiles;
          setSyncedFiles(stateJson.syncedFiles);
        }
        if (stateJson.templateSettings) {
          setTemplateSettings((prev) => {
            const merged = migrateTemplateSettings({
              ...prev,
              ...stateJson!.templateSettings,
              appsScriptUrl: prev.appsScriptUrl || stateJson!.templateSettings.appsScriptUrl || '',
              googleSpreadsheetId: pulledSheetId || prev.googleSpreadsheetId,
              googleSheetUrl: pulledSheetUrl || prev.googleSheetUrl,
            });
            latestStateRef.current.templateSettings = merged;
            return merged;
          });
        }
      }

      // 2. Parse Sheet "Tài khoản" (always authoritative for account status/role edits directly on Google Sheets)
      const baseUsers = stateJson?.users && stateJson.users.length > 0 ? stateJson.users : latestStateRef.current.users;
      const mergedUsers =
        accountRows.length >= 2 ? parseUsersFromAccountSheet(accountRows, baseUsers) : baseUsers;

      if (mergedUsers.length > 0) {
        latestStateRef.current.users = mergedUsers;
        setUsers(mergedUsers);
        const cur = latestStateRef.current.currentUser;
        const refreshedCur = mergedUsers.find((u) => u.id === cur?.id);
        if (refreshedCur) {
          latestStateRef.current.currentUser = refreshedCur;
          setCurrentUser(refreshedCur);
        }
      }

      setTemplateSettings((prev) => ({
        ...prev,
        googleSpreadsheetId: pulledSheetId || prev.googleSpreadsheetId,
        googleSheetUrl: pulledSheetUrl || prev.googleSheetUrl,
        lastBackupTime: timestamp,
        lastBackupMessage: `Kéo đồng bộ 2 chiều từ Sheets & Drive (${mergedUsers.length} tài khoản${restoredFromDrive ? ', có JSON Drive' : ''})`,
      }));

      if (!silent) {
        const snap = latestStateRef.current;
        setBackupLogs((prev) => [
          {
            id: `bk-pull-${Date.now()}`,
            timestamp,
            action: 'KÉO_ĐỒNG_BỘ_HAI_CHIỀU',
            status: 'SUCCESS',
            recordCounts: {
              receipts: snap.receipts.length,
              issues: snap.issues.length,
              medicines: snap.medicines.length,
              beneficiaries: snap.beneficiaries.length,
            },
            details: `Đã tải ngược dữ liệu từ tab Tài khoản (${mergedUsers.length} user) và Drive JSON.`,
          },
          ...prev.slice(0, 49),
        ]);
      }

      return {
        success: true,
        usersUpdated: mergedUsers.length,
        restoredFromDrive,
        timestamp,
      };
    } catch (err: any) {
      const errMsg = err?.message || 'Lỗi khi đồng bộ ngược từ Google Sheets & Drive.';
      if (!silent) setSyncSheetsError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setIsPullingFromCloud(false);
    }
  }, []);

  // Auto-pull latest Sheets ("Tài khoản") & Drive JSON on initial boot when Apps Script URL is configured
  useEffect(() => {
    if (isValidAppsScriptUrl(latestStateRef.current.templateSettings.appsScriptUrl)) {
      pullFromSheetsAndDrive(true).catch(() => null);
    }
  }, [pullFromSheetsAndDrive]);

  const executeHybridSheetsSync = async (
    token: string | null,
    reason: string,
    settingsOverride?: TemplateSettings
  ): Promise<GoogleSheetsSyncResult | null> => {
    const snap = latestStateRef.current;
    const activeSettings = settingsOverride || snap.templateSettings;
    const syncMode = activeSettings.syncMode || 'HYBRID';
    const hasAppsScript = isValidAppsScriptUrl(activeSettings.appsScriptUrl);
    const isAdmin = snap.currentUser?.role === 'ADMIN';

    // Non-admin accounts only auto-sync when Apps Script bridge is linked
    if (!isAdmin && !hasAppsScript) {
      return null;
    }

    setIsSyncingSheets(true);
    setSyncSheetsError(null);

    try {
      let result: GoogleSheetsSyncResult | null = null;
      let usedChannel: 'APPS_SCRIPT' | 'OAUTH' = 'OAUTH';
      const stateSnapshot = buildSnapshotPayload();

      // Channel 1: Google Apps Script Web App Bridge (4 sheets + Drive JSON snapshot)
      if (syncMode === 'APPS_SCRIPT' || (syncMode === 'HYBRID' && hasAppsScript)) {
        if (!hasAppsScript) {
          throw new Error(
            'Chưa cấu hình URL Google Apps Script Web App hợp lệ. Vui lòng cài đặt Apps Script hoặc chuyển sang chế độ Kết hợp / Google OAuth.'
          );
        }

        try {
          const gasResult = await syncAllDataViaAppsScript(
            activeSettings.appsScriptUrl,
            snap.beneficiaries,
            snap.receipts,
            snap.issues,
            snap.medicines,
            snap.transactions,
            activeSettings,
            snap.users,
            stateSnapshot
          );
          usedChannel = 'APPS_SCRIPT';
          result = {
            ...gasResult,
            channel: 'APPS_SCRIPT',
          };
        } catch (gasErr: any) {
          if (syncMode === 'APPS_SCRIPT' || !token) {
            throw gasErr;
          }
          console.warn('Apps Script sync lỗi, tự động chuyển dự phòng sang Google OAuth:', gasErr);
        }
      }

      // Channel 2: Direct Google OAuth API fallback or primary (Admin OAuth)
      if (!result) {
        if (!token) {
          throw new Error(
            'Chưa có phiên Google OAuth và chưa gắn URL Google Apps Script. Hãy cài đặt Apps Script hoặc đăng nhập Google OAuth để đồng bộ lên Sheets & Drive.'
          );
        }
        result = await syncAllDataToGoogleSheets(
          token,
          snap.beneficiaries,
          snap.receipts,
          snap.issues,
          snap.medicines,
          snap.transactions,
          activeSettings,
          snap.users
        );
        // Also upsert full JSON state snapshot onto Google Drive
        const driveStateRes = await upsertJsonFileInGoogleDrive(
          token,
          activeSettings.googleDriveFolder || 'QUAN_LY_THUOC_TRUNG_TAM/2026',
          DRIVE_STATE_FILENAME,
          JSON.stringify(stateSnapshot, null, 2)
        );
        if (driveStateRes.success) {
          result.driveStateFileId = driveStateRes.fileId;
          result.driveStateWebViewLink = driveStateRes.webViewLink;
        }
        usedChannel = 'OAUTH';
      }

      setLastSheetsSyncResult(result);
      const channelLabel = usedChannel === 'APPS_SCRIPT' ? 'Apps Script (4 Sheet + Drive)' : 'Google OAuth (4 Sheet + Drive)';

      setTemplateSettings((prev) => ({
        ...prev,
        googleSpreadsheetId: result!.spreadsheetId || prev.googleSpreadsheetId,
        googleSheetUrl: result!.spreadsheetUrl || prev.googleSheetUrl,
        lastSyncChannel: channelLabel,
        lastBackupTime: result!.timestamp,
        lastBackupMessage: `${reason} (${result!.rowCounts.receipts} PNK, ${result!.rowCounts.issues} PXK, ${result!.rowCounts.accounts ?? snap.users.length} tài khoản) · ${channelLabel}`,
      }));

      const newLog: BackupLog = {
        id: `bk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: result.timestamp,
        action: reason,
        status: 'SUCCESS',
        recordCounts: {
          receipts: snap.receipts.length,
          issues: snap.issues.length,
          medicines: snap.medicines.length,
          beneficiaries: snap.beneficiaries.length,
        },
        details: `Đồng bộ 04 Sheet + Drive JSON thành công qua ${channelLabel}: ${result.spreadsheetUrl}`,
      };
      setBackupLogs((prev) => [newLog, ...prev.slice(0, 49)]);

      return result;
    } catch (err: any) {
      console.error('Lỗi đồng bộ Google Sheets:', err);
      const errMsg = err.message || 'Đồng bộ Google Sheets thất bại';
      setSyncSheetsError(errMsg);
      const newLog: BackupLog = {
        id: `bk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp:
          new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN'),
        action: reason,
        status: 'FAILED',
        recordCounts: {
          receipts: snap.receipts.length,
          issues: snap.issues.length,
          medicines: snap.medicines.length,
          beneficiaries: snap.beneficiaries.length,
        },
        details: `Lỗi đồng bộ Google Sheets: ${errMsg}`,
      };
      setBackupLogs((prev) => [newLog, ...prev.slice(0, 49)]);
      return null;
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const testAppsScriptSync = async (url: string): Promise<AppsScriptPingResult> => {
    if (currentUser?.role !== 'ADMIN') {
      return { success: false, error: 'Chỉ Quản trị viên (ADMIN) mới có quyền kiểm tra kết nối.' };
    }
    const res = await testAppsScriptConnection(url);
    if (res.success && res.spreadsheetId) {
      setTemplateSettings((prev) => ({
        ...prev,
        appsScriptUrl: url.trim(),
        googleSpreadsheetId: res.spreadsheetId || prev.googleSpreadsheetId,
        googleSheetUrl: res.spreadsheetUrl || prev.googleSheetUrl,
      }));
    }
    return res;
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string; cancelled?: boolean }> => {
    if (currentUser?.role !== 'ADMIN') {
      return { success: false, error: 'Chỉ Quản trị viên (ADMIN) mới được kết nối đồng bộ Google Sheets.' };
    }
    try {
      setSyncSheetsError(null);
      const res = await signInWithGoogle();
      if (res.cancelled) {
        if (res.error) {
          setSyncSheetsError(res.error);
          return { success: false, error: res.error, cancelled: true };
        }
        return { success: false, cancelled: true };
      }
      if (!res.user || !res.accessToken) {
        return { success: false, error: 'Không nhận được thông tin xác thực từ Google' };
      }
      setGoogleUser(res.user);
      setIsGoogleAuthenticated(true);
      setTemplateSettings((prev) => ({
        ...prev,
        googleUserEmail: res.user?.email || prev.googleUserEmail,
      }));
      await executeHybridSheetsSync(res.accessToken, 'Đồng bộ khởi tạo sau khi kết nối Google');
      return { success: true };
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return { success: false, cancelled: true };
      }
      const msg = err.message || 'Lỗi đăng nhập Google';
      setSyncSheetsError(msg);
      return { success: false, error: msg };
    }
  };

  const logoutFromGoogle = async () => {
    await signOutGoogle();
    setGoogleUser(null);
    setIsGoogleAuthenticated(false);
  };

  const syncNowToGoogleSheets = async (): Promise<GoogleSheetsSyncResult | null> => {
    if (currentUser?.role !== 'ADMIN') {
      setSyncSheetsError('Chỉ tài khoản Quản trị viên (ADMIN) mới có quyền đồng bộ thủ công.');
      return null;
    }

    const activeSettings = latestStateRef.current.templateSettings;
    const hasAppsScript = isValidAppsScriptUrl(activeSettings.appsScriptUrl);
    if (hasAppsScript && (activeSettings.syncMode === 'APPS_SCRIPT' || activeSettings.syncMode === 'HYBRID')) {
      const token = await getAccessToken();
      return executeHybridSheetsSync(token, 'Đồng bộ toàn bộ 04 Sheet & Drive JSON');
    }

    const token = await getAccessToken();
    if (!token) {
      const res = await loginWithGoogle();
      if (!res.success) return null;
      const newToken = await getAccessToken();
      if (!newToken) return null;
      return executeHybridSheetsSync(newToken, 'Đồng bộ toàn bộ 04 Sheet & Drive JSON');
    }
    return executeHybridSheetsSync(token, 'Đồng bộ toàn bộ 04 Sheet & Drive JSON');
  };

  // Trigger Automatic Bidirectional Backup to Google Sheets & Google Drive
  const triggerAutoBackup = (actionDescription: string) => {
    const snap = latestStateRef.current;
    const timestamp = new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN');
    const hasAppsScript = isValidAppsScriptUrl(snap.templateSettings.appsScriptUrl);
    const isAdmin = snap.currentUser?.role === 'ADMIN';

    if (!snap.templateSettings.autoBackupEnabled) return;
    if (!hasAppsScript && !isAdmin) return;

    getAccessToken().then((token) => {
      if (hasAppsScript || (isAdmin && token)) {
        executeHybridSheetsSync(token, `Tự động cập nhật: ${actionDescription}`).catch((err) => {
          console.warn('Lỗi tự động sao lưu ngầm:', err);
        });
      } else if (isAdmin) {
        const newLog: BackupLog = {
          id: `bk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp,
          action: actionDescription,
          status: 'PENDING',
          recordCounts: {
            receipts: snap.receipts.length,
            issues: snap.issues.length,
            medicines: snap.medicines.length,
            beneficiaries: snap.beneficiaries.length,
          },
          details: `Đã ghi nhận (${actionDescription}). Gắn URL Apps Script để mọi tài khoản tự động đồng bộ 04 Sheet & Drive JSON.`,
        };
        setBackupLogs((prev) => [newLog, ...prev.slice(0, 49)]);
      }
    });
  };

  // Export Full Google Sheet Data (04 Sheets: Phiếu nhập, Phiếu xuất, Báo cáo, Tài khoản)
  const exportFullGoogleSheetData = () => {
    const snap = latestStateRef.current;
    downloadThreeSheetsExcelWorkbook(
      snap.beneficiaries,
      snap.receipts,
      snap.issues,
      snap.medicines,
      snap.transactions,
      snap.templateSettings,
      snap.users
    );
    triggerAutoBackup('Xuất tệp sao lưu Google Sheets 04 Sheet (.XLSX)');
  };

  const exportFullGoogleSheetCSV = () => {
    const snap = latestStateRef.current;
    downloadThreeSheetsCSV(
      snap.beneficiaries,
      snap.receipts,
      snap.issues,
      snap.medicines,
      snap.transactions,
      snap.templateSettings,
      snap.users
    );
    triggerAutoBackup('Xuất tệp sao lưu Google Sheets 04 Sheet (.CSV)');
  };

  const addAuditLog = (action: string, entity: string, entityId: string, details: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.fullName,
      action,
      entity,
      entityId,
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Helper to query available lots based on valid transactions
  const getAvailableLots = (medicineId?: string, beneficiaryId?: string): LotStock[] => {
    const lotMap = new Map<string, LotStock>();

    transactions.forEach((tx) => {
      // Filter by medicine if specified
      if (medicineId && tx.medicineId !== medicineId) return;

      const key = `${tx.medicineId}_${tx.batchNumber}`;
      if (!lotMap.has(key)) {
        lotMap.set(key, {
          medicineId: tx.medicineId,
          batchNumber: tx.batchNumber,
          expiryDate: tx.expiryDate,
          unitPrice: tx.unitPrice,
          quantity: 0,
          beneficiaryId: tx.beneficiaryId,
          sourceType: tx.beneficiaryId ? 'BHYT_MUA_NGOAI' : 'NGAN_SACH',
        });
      }

      const lot = lotMap.get(key)!;
      lot.quantity += tx.quantity;
      if (tx.beneficiaryId) lot.beneficiaryId = tx.beneficiaryId;
    });

    let results = Array.from(lotMap.values()).filter((l) => l.quantity > 0);

    // If beneficiary filter is active: show lots specifically bought for this beneficiary OR general central stock
    if (beneficiaryId) {
      results = results.filter((l) => !l.beneficiaryId || l.beneficiaryId === beneficiaryId);
    }

    // Sort by FEFO (First Expired, First Out)
    results.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    return results;
  };

  const getExpiringLots = (daysThreshold = 90) => {
    const lots = getAvailableLots();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const expiring: { medicine: Medicine; lot: LotStock; daysUntilExpiry: number }[] = [];

    lots.forEach((lot) => {
      const exp = new Date(lot.expiryDate);
      exp.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= daysThreshold) {
        const med = medicines.find((m) => m.id === lot.medicineId);
        if (med) {
          expiring.push({ medicine: med, lot, daysUntilExpiry: diffDays });
        }
      }
    });

    expiring.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
    return expiring;
  };

  const getLowStockMedicines = () => {
    const lots = getAvailableLots();
    const stockByMed = new Map<string, number>();

    lots.forEach((lot) => {
      const current = stockByMed.get(lot.medicineId) || 0;
      stockByMed.set(lot.medicineId, current + lot.quantity);
    });

    const lowStock: { medicine: Medicine; currentStock: number }[] = [];
    medicines.forEach((med) => {
      const currentStock = stockByMed.get(med.id) || 0;
      if (currentStock <= med.minStockAlert) {
        lowStock.push({ medicine: med, currentStock });
      }
    });

    return lowStock;
  };

  // Medicine CRUD
  const addMedicine = (medicineData: Omit<Medicine, 'id' | 'createdAt'>): Medicine => {
    const newMed: Medicine = {
      ...medicineData,
      id: `med-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: getTodayISODate(),
    };
    setMedicines((prev) => [newMed, ...prev]);
    addAuditLog('TẠO_MỚI', 'THUỐC', newMed.code, `Tạo mới thuốc ${newMed.name} (${newMed.code})`);
    return newMed;
  };

  const updateMedicine = (id: string, updateData: Partial<Medicine>) => {
    setMedicines((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const updated = { ...m, ...updateData };
          addAuditLog('CẬP_NHẬT', 'THUỐC', updated.code, `Cập nhật thông tin thuốc ${updated.name}`);
          return updated;
        }
        return m;
      })
    );
  };

  // Beneficiary CRUD
  const addBeneficiary = (data: Omit<Beneficiary, 'id' | 'createdAt'>): Beneficiary => {
    const newBen: Beneficiary = {
      ...data,
      id: `ben-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: getTodayISODate(),
    };
    setBeneficiaries((prev) => [newBen, ...prev]);
    addAuditLog('TẠO_MỚI', 'ĐỐI_TƯỢNG', newBen.code, `Thêm hồ sơ đối tượng ${newBen.fullName} (${newBen.code})`);
    return newBen;
  };

  const updateBeneficiary = (id: string, updateData: Partial<Beneficiary>) => {
    setBeneficiaries((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          const updated = { ...b, ...updateData };
          addAuditLog('CẬP_NHẬT', 'ĐỐI_TƯỢNG', updated.code, `Cập nhật hồ sơ đối tượng ${updated.fullName}`);
          return updated;
        }
        return b;
      })
    );
  };

  // User Administration & RBAC Authentication
  const loginWithCredentials = (emailOrPhone: string, password?: string): { success: boolean; error?: string } => {
    const cleanInput = emailOrPhone.trim().toLowerCase();
    const activeUsers = latestStateRef.current.users;
    const user = activeUsers.find(
      (u) =>
        (cleanInput === 'admin' && u.role === 'ADMIN') ||
        u.email.toLowerCase() === cleanInput ||
        u.email.toLowerCase().replace('@btxhdanang.gov.vn', '@btxh.danang.gov.vn') === cleanInput ||
        u.email.toLowerCase().replace('@btxh.danang.gov.vn', '@btxhdanang.gov.vn') === cleanInput ||
        (u.phone && u.phone.trim() === cleanInput) ||
        u.fullName.toLowerCase() === cleanInput
    );

    if (!user) {
      return { success: false, error: 'Không tìm thấy tài khoản với thông tin đăng nhập đã cung cấp.' };
    }

    if (user.status === 'PENDING_APPROVAL') {
      return {
        success: false,
        error: 'Tài khoản đang chờ Quản trị viên phê duyệt. Vui lòng liên hệ quản lý để kích hoạt.',
      };
    }

    if (user.status === 'REJECTED' || user.status === 'DISABLED' || user.status === 'LOCKED') {
      return {
        success: false,
        error: 'Tài khoản đã bị tạm dừng hoặc từ chối truy cập. Vui lòng liên hệ Quản trị viên hệ thống.',
      };
    }

    if (user.password && password !== user.password) {
      return { success: false, error: 'Mật khẩu không chính xác. Vui lòng kiểm tra lại.' };
    }

    latestStateRef.current.currentUser = user;
    setCurrentUser(user);
    setSessionNotice(null);
    lastActivityRef.current = Date.now();
    setIsAuthenticated(true);
    addAuditLog('ĐĂNG_NHẬP', 'NGƯỜI_DÙNG', user.id, `Cán bộ ${user.fullName} (${user.role}) đăng nhập thành công`);
    return { success: true };
  };

  const registerNewAccount = (data: {
    email: string;
    password?: string;
    fullName: string;
    department: string;
    phone?: string;
    role: UserRole;
    autoApprove?: boolean;
  }): { success: boolean; message: string; user?: User } => {
    const existing = latestStateRef.current.users.find(
      (u) =>
        u.email.toLowerCase() === data.email.trim().toLowerCase() ||
        (data.phone && u.phone && u.phone.trim() === data.phone.trim())
    );
    if (existing) {
      return { success: false, message: 'Email hoặc Số điện thoại này đã được đăng ký trong hệ thống.' };
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      email: data.email.trim(),
      password: data.password || '123',
      fullName: data.fullName.trim(),
      role: data.role,
      status: data.autoApprove ? 'ACTIVE' : 'PENDING_APPROVAL',
      department: data.department.trim(),
      phone: data.phone?.trim() || '',
      createdAt: getTodayISODate(),
      approvedAt: data.autoApprove ? getTodayISODate() : undefined,
      approvedBy: data.autoApprove ? 'Quản trị viên' : undefined,
    };

    const nextUsers = [...latestStateRef.current.users, newUser];
    latestStateRef.current.users = nextUsers;
    setUsers(nextUsers);

    addAuditLog(
      'ĐĂNG_KÝ',
      'NGƯỜI_DÙNG',
      newUser.id,
      `Tài khoản mới ${newUser.fullName} (${newUser.role}) đăng ký ${data.autoApprove ? 'và được kích hoạt' : 'chờ duyệt'}`
    );
    triggerAutoBackup(`Đăng ký tài khoản ${newUser.fullName} lên tab Tài khoản`);

    return {
      success: true,
      message: data.autoApprove
        ? 'Đăng ký thành công! Tài khoản đã sẵn sàng đăng nhập.'
        : 'Đăng ký thành công! Hồ sơ đã được ghi nhận và chuyển tới Quản trị viên phê duyệt.',
      user: newUser,
    };
  };

  const hasPermission = (permission: keyof RolePermissions): boolean => {
    if (!currentUser || !currentUser.role) return false;
    const permissions = ROLE_PERMISSIONS[currentUser.role];
    return !!permissions?.[permission];
  };

  // Requirement 3: Admin can edit/delete all; staff can only edit/delete vouchers they created
  const canModifyReceipt = (receipt: StockReceipt, action: 'edit' | 'delete'): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN') return true;
    const permOk = action === 'edit' ? hasPermission('canEditReceipt') : hasPermission('canDeleteReceipt');
    return permOk && receipt.createdBy === currentUser.id;
  };

  const canModifyIssue = (issue: StockIssue, action: 'edit' | 'delete'): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN') return true;
    const permOk = action === 'edit' ? hasPermission('canEditIssue') : hasPermission('canDeleteIssue');
    return permOk && issue.createdBy === currentUser.id;
  };

  const registerUser = (email: string, fullName: string, department: string, phone: string, requestedRole: UserRole) => {
    registerNewAccount({
      email,
      fullName,
      department,
      phone,
      role: requestedRole,
      autoApprove: false,
    });
  };

  const approveUser = (userId: string, role: UserRole) => {
    const nextUsers = latestStateRef.current.users.map((u) => {
      if (u.id === userId) {
        const updated: User = {
          ...u,
          status: 'ACTIVE',
          role,
          approvedAt: getTodayISODate(),
          approvedBy: currentUser.fullName,
        };
        addAuditLog('PHÊ_DUYỆT', 'NGƯỜI_DÙNG', u.id, `Phê duyệt tài khoản ${u.fullName} với vai trò ${role}`);
        return updated;
      }
      return u;
    });
    latestStateRef.current.users = nextUsers;
    setUsers(nextUsers);
    triggerAutoBackup('Phê duyệt tài khoản cán bộ');
  };

  const rejectUser = (userId: string) => {
    const nextUsers = latestStateRef.current.users.map((u) => {
      if (u.id === userId) {
        const updated: User = { ...u, status: 'REJECTED' };
        addAuditLog('TỪ_CHỐI', 'NGƯỜI_DÙNG', u.id, `Từ chối cấp quyền tài khoản ${u.fullName}`);
        return updated;
      }
      return u;
    });
    latestStateRef.current.users = nextUsers;
    setUsers(nextUsers);
    triggerAutoBackup('Từ chối tài khoản đăng ký');
  };

  const changeUserRole = (userId: string, role: UserRole) => {
    const nextUsers = latestStateRef.current.users.map((u) => {
      if (u.id === userId) {
        const updated: User = { ...u, role };
        addAuditLog('PHÂN_QUYỀN', 'NGƯỜI_DÙNG', u.id, `Thay đổi vai trò của cán bộ ${u.fullName} thành ${role}`);
        if (currentUser.id === userId) {
          latestStateRef.current.currentUser = updated;
          setCurrentUser(updated);
        }
        return updated;
      }
      return u;
    });
    latestStateRef.current.users = nextUsers;
    setUsers(nextUsers);
    triggerAutoBackup('Cập nhật vai trò tài khoản');
  };

  const toggleUserStatus = (userId: string, status: UserStatus) => {
    const nextUsers = latestStateRef.current.users.map((u) => {
      if (u.id === userId) {
        const updated: User = { ...u, status };
        addAuditLog('TRẠNG_THÁI', 'NGƯỜI_DÙNG', u.id, `Đổi trạng thái tài khoản ${u.fullName} sang ${status}`);
        return updated;
      }
      return u;
    });
    latestStateRef.current.users = nextUsers;
    setUsers(nextUsers);
    triggerAutoBackup('Thay đổi trạng thái khóa/mở tài khoản');
  };

  const updateUserAccount = (
    userId: string,
    updates: {
      fullName?: string;
      email?: string;
      phone?: string;
      department?: string;
      role?: UserRole;
      status?: UserStatus;
      password?: string;
    }
  ): { success: boolean; error?: string } => {
    if (currentUser?.role !== 'ADMIN') {
      return { success: false, error: 'Chỉ Quản trị viên (ADMIN) mới có quyền chỉnh sửa tài khoản cán bộ.' };
    }

    const target = latestStateRef.current.users.find((u) => u.id === userId);
    if (!target) {
      return { success: false, error: 'Không tìm thấy tài khoản cán bộ.' };
    }

    const nextEmail = updates.email !== undefined ? updates.email.trim() : target.email;
    if (!nextEmail || !nextEmail.includes('@')) {
      return { success: false, error: 'Địa chỉ Email không hợp lệ.' };
    }

    const duplicate = latestStateRef.current.users.find(
      (u) => u.id !== userId && u.email.toLowerCase() === nextEmail.toLowerCase()
    );
    if (duplicate) {
      return { success: false, error: 'Địa chỉ Email này đã được sử dụng bởi tài khoản khác.' };
    }

    const nextFullName = updates.fullName !== undefined ? updates.fullName.trim() : target.fullName;
    if (!nextFullName) {
      return { success: false, error: 'Họ và tên cán bộ không được để trống.' };
    }

    const updatedUser: User = {
      ...target,
      fullName: nextFullName,
      email: nextEmail,
      phone: updates.phone !== undefined ? updates.phone.trim() : target.phone,
      department: updates.department !== undefined ? updates.department.trim() : target.department,
      role: updates.role ?? target.role,
      status: updates.status ?? target.status,
      password: updates.password && updates.password.trim().length > 0 ? updates.password.trim() : target.password,
      approvedAt:
        updates.status === 'ACTIVE' && !target.approvedAt ? getTodayISODate() : target.approvedAt,
      approvedBy:
        updates.status === 'ACTIVE' && !target.approvedBy ? currentUser.fullName : target.approvedBy,
    };

    const nextUsers = latestStateRef.current.users.map((u) => (u.id === userId ? updatedUser : u));
    latestStateRef.current.users = nextUsers;
    setUsers(nextUsers);

    if (currentUser.id === userId) {
      latestStateRef.current.currentUser = updatedUser;
      setCurrentUser(updatedUser);
    }

    const resetNote = updates.password && updates.password.trim().length > 0 ? ' (bao gồm đặt lại mật khẩu)' : '';
    addAuditLog(
      'CẬP_NHẬT_TÀI_KHOẢN',
      'NGƯỜI_DÙNG',
      updatedUser.id,
      `Quản trị viên cập nhật toàn bộ thông tin cán bộ ${updatedUser.fullName} (${updatedUser.email}, vai trò ${updatedUser.role}, trạng thái ${updatedUser.status})${resetNote}`
    );
    triggerAutoBackup(`Cập nhật hồ sơ tài khoản ${updatedUser.fullName}`);

    return { success: true };
  };

  // Stock Receipt Management
  const createStockReceipt = (
    receiptData: Omit<StockReceipt, 'id' | 'totalAmount' | 'createdBy' | 'createdByName' | 'createdAt' | 'status'>,
    itemsData: Omit<StockReceiptItem, 'id' | 'receiptId' | 'totalPrice'>[]
  ): StockReceipt => {
    const receiptId = `rcp-${Date.now()}`;
    let totalAmount = 0;

    const receiptItems: StockReceiptItem[] = itemsData.map((item, index) => {
      const totalPrice = item.actualQuantity * item.unitPrice;
      totalAmount += totalPrice;
      return {
        ...item,
        id: `rcp-item-${Date.now()}-${index}`,
        receiptId,
        totalPrice,
      };
    });

    const newReceipt: StockReceipt = {
      ...receiptData,
      id: receiptId,
      totalAmount,
      status: 'APPROVED',
      createdBy: currentUser.id,
      createdByName: currentUser.fullName,
      createdAt: new Date().toISOString(),
      items: receiptItems,
    };

    const newTransactions: StockTransaction[] = receiptItems.map((item, idx) => ({
      id: `tx-rcp-${Date.now()}-${idx}`,
      date: newReceipt.receiptDate,
      type: 'RECEIPT',
      refCode: newReceipt.receiptCode,
      medicineId: item.medicineId,
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate || '',
      quantity: item.actualQuantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      beneficiaryId: newReceipt.beneficiaryId || newReceipt.beneficiaryName,
      createdAt: new Date().toISOString(),
    }));

    const nextReceipts = [newReceipt, ...latestStateRef.current.receipts];
    const nextTransactions = [...latestStateRef.current.transactions, ...newTransactions];
    latestStateRef.current.receipts = nextReceipts;
    latestStateRef.current.transactions = nextTransactions;

    setReceipts(nextReceipts);
    setTransactions(nextTransactions);

    addAuditLog(
      'NHẬP_KHO',
      'PHIẾU_NHẬP',
      newReceipt.receiptCode,
      `Nhập kho phiếu ${newReceipt.receiptCode} từ ${newReceipt.supplierName}, tổng tiền ${totalAmount.toLocaleString()} ₫`
    );

    triggerAutoBackup(`Lập phiếu nhập kho ${newReceipt.receiptCode}`);

    return newReceipt;
  };

  const updateStockReceipt = (
    receiptId: string,
    receiptData: Partial<StockReceipt>,
    itemsData: Omit<StockReceiptItem, 'id' | 'receiptId' | 'totalPrice'>[]
  ): { success: boolean; receipt?: StockReceipt; error?: string } => {
    const existing = latestStateRef.current.receipts.find((r) => r.id === receiptId);
    if (!existing) {
      return { success: false, error: 'Không tìm thấy phiếu nhập kho cần hiệu chỉnh.' };
    }

    if (!canModifyReceipt(existing, 'edit')) {
      const msg = `Chỉ tài khoản tạo phiếu (${existing.createdByName}) hoặc Quản trị viên (Admin) mới được chỉnh sửa phiếu nhập ${existing.receiptCode}.`;
      addAuditLog('TỪ_CHỐI_SỬA', 'PHIẾU_NHẬP', existing.receiptCode, msg);
      return { success: false, error: msg };
    }

    let totalAmount = 0;
    const receiptCode = receiptData.receiptCode || existing.receiptCode;

    const receiptItems: StockReceiptItem[] = itemsData.map((item, index) => {
      const totalPrice = item.actualQuantity * item.unitPrice;
      totalAmount += totalPrice;
      return {
        ...item,
        id: `rcp-item-${Date.now()}-${index}`,
        receiptId,
        totalPrice,
      };
    });

    const updatedReceipt: StockReceipt = {
      ...existing,
      ...receiptData,
      id: receiptId,
      receiptCode,
      totalAmount,
      createdBy: existing.createdBy,
      createdByName: existing.createdByName,
      items: receiptItems,
    };

    const oldRefCode = existing.receiptCode;
    const remainingTransactions = latestStateRef.current.transactions.filter(
      (t) => t.refCode !== oldRefCode && t.refCode !== receiptCode
    );

    const newTransactions: StockTransaction[] = receiptItems.map((item, idx) => ({
      id: `tx-rcp-${Date.now()}-${idx}`,
      date: updatedReceipt.receiptDate,
      type: 'RECEIPT',
      refCode: updatedReceipt.receiptCode,
      medicineId: item.medicineId,
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate || '',
      quantity: item.actualQuantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      beneficiaryId: updatedReceipt.beneficiaryId || updatedReceipt.beneficiaryName,
      createdAt: new Date().toISOString(),
    }));

    const nextReceipts = latestStateRef.current.receipts.map((r) => (r.id === receiptId ? updatedReceipt : r));
    const nextTransactions = [...remainingTransactions, ...newTransactions];
    latestStateRef.current.receipts = nextReceipts;
    latestStateRef.current.transactions = nextTransactions;

    setReceipts(nextReceipts);
    setTransactions(nextTransactions);

    addAuditLog(
      'HIỆU_CHỈNH',
      'PHIẾU_NHẬP',
      updatedReceipt.receiptCode,
      `Hiệu chỉnh phiếu nhập kho ${updatedReceipt.receiptCode}, tổng tiền cập nhật ${totalAmount.toLocaleString()} ₫`
    );

    triggerAutoBackup(`Hiệu chỉnh phiếu nhập kho ${updatedReceipt.receiptCode}`);

    return { success: true, receipt: updatedReceipt };
  };

  const deleteStockReceipt = (receiptId: string): { success: boolean; error?: string } => {
    const existing = latestStateRef.current.receipts.find((r) => r.id === receiptId);
    if (!existing) {
      return { success: false, error: 'Không tìm thấy phiếu nhập kho.' };
    }
    if (!canModifyReceipt(existing, 'delete')) {
      const msg = `Chỉ tài khoản tạo phiếu (${existing.createdByName}) hoặc Quản trị viên (Admin) mới được xóa phiếu nhập ${existing.receiptCode}.`;
      addAuditLog('TỪ_CHỐI_XÓA', 'PHIẾU_NHẬP', existing.receiptCode, msg);
      return { success: false, error: msg };
    }

    const nextReceipts = latestStateRef.current.receipts.filter((r) => r.id !== receiptId);
    const nextTransactions = latestStateRef.current.transactions.filter((t) => t.refCode !== existing.receiptCode);
    latestStateRef.current.receipts = nextReceipts;
    latestStateRef.current.transactions = nextTransactions;

    setReceipts(nextReceipts);
    setTransactions(nextTransactions);
    addAuditLog(
      'XÓA_CHỨNG_TỪ',
      'PHIẾU_NHẬP',
      existing.receiptCode,
      `Xóa phiếu nhập kho ${existing.receiptCode}`
    );
    triggerAutoBackup(`Xóa phiếu nhập kho ${existing.receiptCode}`);
    return { success: true };
  };

  // Stock Issue Management (with atomic stock validation & creator ownership)
  const createStockIssue = (
    issueData: Omit<StockIssue, 'id' | 'totalAmount' | 'createdBy' | 'createdByName' | 'createdAt' | 'status'>,
    itemsData: Omit<StockIssueItem, 'id' | 'issueId' | 'totalPrice'>[]
  ): { success: boolean; issue?: StockIssue; error?: string } => {
    const availableLots = getAvailableLots();

    for (const item of itemsData) {
      const matchingLot = availableLots.find(
        (l) => l.medicineId === item.medicineId && l.batchNumber === item.batchNumber
      );
      const availableQty = matchingLot ? matchingLot.quantity : 0;
      if (item.actualQuantity > availableQty) {
        const med = medicines.find((m) => m.id === item.medicineId);
        return {
          success: false,
          error: `Số lượng thực xuất (${item.actualQuantity}) vượt quá tồn khả dụng (${availableQty}) của thuốc ${med?.name || ''} - Lô ${item.batchNumber}.`,
        };
      }
    }

    const issueId = `iss-${Date.now()}`;
    let totalAmount = 0;

    const issueItems: StockIssueItem[] = itemsData.map((item, index) => {
      const totalPrice = item.actualQuantity * item.unitPrice;
      totalAmount += totalPrice;
      return {
        ...item,
        id: `iss-item-${Date.now()}-${index}`,
        issueId,
        totalPrice,
      };
    });

    const newIssue: StockIssue = {
      ...issueData,
      id: issueId,
      totalAmount,
      status: 'APPROVED',
      createdBy: currentUser.id,
      createdByName: currentUser.fullName,
      createdAt: new Date().toISOString(),
      items: issueItems,
    };

    const newTransactions: StockTransaction[] = issueItems.map((item, idx) => ({
      id: `tx-iss-${Date.now()}-${idx}`,
      date: newIssue.issueDate,
      type: 'ISSUE',
      refCode: newIssue.issueCode,
      medicineId: item.medicineId,
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate || '',
      quantity: -item.actualQuantity,
      unitPrice: item.unitPrice,
      totalPrice: -item.totalPrice,
      beneficiaryId: newIssue.beneficiaryId || newIssue.beneficiaryName,
      createdAt: new Date().toISOString(),
    }));

    const nextIssues = [newIssue, ...latestStateRef.current.issues];
    const nextTransactions = [...latestStateRef.current.transactions, ...newTransactions];
    latestStateRef.current.issues = nextIssues;
    latestStateRef.current.transactions = nextTransactions;

    setIssues(nextIssues);
    setTransactions(nextTransactions);

    addAuditLog(
      'XUẤT_KHO',
      'PHIẾU_XUẤT',
      newIssue.issueCode,
      `Xuất kho ${newIssue.issueCode} cho đối tượng, tổng tiền ${totalAmount.toLocaleString()} ₫`
    );

    triggerAutoBackup(`Lập phiếu xuất kho ${newIssue.issueCode}`);

    return { success: true, issue: newIssue };
  };

  const updateStockIssue = (
    issueId: string,
    issueData: Partial<StockIssue>,
    itemsData: Omit<StockIssueItem, 'id' | 'issueId' | 'totalPrice'>[]
  ): { success: boolean; issue?: StockIssue; error?: string } => {
    const existing = latestStateRef.current.issues.find((i) => i.id === issueId);
    if (!existing) {
      return { success: false, error: 'Không tìm thấy phiếu xuất kho cần hiệu chỉnh.' };
    }

    if (!canModifyIssue(existing, 'edit')) {
      const msg = `Chỉ tài khoản tạo phiếu (${existing.createdByName}) hoặc Quản trị viên (Admin) mới được chỉnh sửa phiếu xuất ${existing.issueCode}.`;
      addAuditLog('TỪ_CHỐI_SỬA', 'PHIẾU_XUẤT', existing.issueCode, msg);
      return { success: false, error: msg };
    }

    const issueCode = issueData.issueCode || existing.issueCode;

    const otherTransactions = latestStateRef.current.transactions.filter(
      (t) => t.refCode !== existing.issueCode && t.refCode !== issueCode
    );

    const lotMap = new Map<string, number>();
    otherTransactions.forEach((tx) => {
      const key = `${tx.medicineId}_${tx.batchNumber}`;
      lotMap.set(key, (lotMap.get(key) || 0) + tx.quantity);
    });

    for (const item of itemsData) {
      const key = `${item.medicineId}_${item.batchNumber}`;
      const avail = lotMap.get(key) || 0;
      if (item.actualQuantity > avail) {
        const med = medicines.find((m) => m.id === item.medicineId);
        return {
          success: false,
          error: `Số lượng thực xuất (${item.actualQuantity}) vượt quá tồn khả dụng (${avail}) của thuốc ${med?.name || ''} - Lô ${item.batchNumber}.`,
        };
      }
    }

    let totalAmount = 0;
    const issueItems: StockIssueItem[] = itemsData.map((item, index) => {
      const totalPrice = item.actualQuantity * item.unitPrice;
      totalAmount += totalPrice;
      return {
        ...item,
        id: `iss-item-${Date.now()}-${index}`,
        issueId,
        totalPrice,
      };
    });

    const updatedIssue: StockIssue = {
      ...existing,
      ...issueData,
      id: issueId,
      issueCode,
      totalAmount,
      createdBy: existing.createdBy,
      createdByName: existing.createdByName,
      items: issueItems,
    };

    const newTransactions: StockTransaction[] = issueItems.map((item, idx) => ({
      id: `tx-iss-${Date.now()}-${idx}`,
      date: updatedIssue.issueDate,
      type: 'ISSUE',
      refCode: updatedIssue.issueCode,
      medicineId: item.medicineId,
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate || '',
      quantity: -item.actualQuantity,
      unitPrice: item.unitPrice,
      totalPrice: -item.totalPrice,
      beneficiaryId: updatedIssue.beneficiaryId || updatedIssue.beneficiaryName,
      createdAt: new Date().toISOString(),
    }));

    const nextIssues = latestStateRef.current.issues.map((i) => (i.id === issueId ? updatedIssue : i));
    const nextTransactions = [...otherTransactions, ...newTransactions];
    latestStateRef.current.issues = nextIssues;
    latestStateRef.current.transactions = nextTransactions;

    setIssues(nextIssues);
    setTransactions(nextTransactions);

    addAuditLog(
      'HIỆU_CHỈNH',
      'PHIẾU_XUẤT',
      updatedIssue.issueCode,
      `Hiệu chỉnh phiếu xuất kho ${updatedIssue.issueCode}, tổng tiền cập nhật ${totalAmount.toLocaleString()} ₫`
    );

    triggerAutoBackup(`Hiệu chỉnh phiếu xuất kho ${updatedIssue.issueCode}`);

    return { success: true, issue: updatedIssue };
  };

  const deleteStockIssue = (issueId: string): { success: boolean; error?: string } => {
    const existing = latestStateRef.current.issues.find((i) => i.id === issueId);
    if (!existing) {
      return { success: false, error: 'Không tìm thấy phiếu xuất kho.' };
    }
    if (!canModifyIssue(existing, 'delete')) {
      const msg = `Chỉ tài khoản tạo phiếu (${existing.createdByName}) hoặc Quản trị viên (Admin) mới được xóa phiếu xuất ${existing.issueCode}.`;
      addAuditLog('TỪ_CHỐI_XÓA', 'PHIẾU_XUẤT', existing.issueCode, msg);
      return { success: false, error: msg };
    }

    const nextIssues = latestStateRef.current.issues.filter((i) => i.id !== issueId);
    const nextTransactions = latestStateRef.current.transactions.filter((t) => t.refCode !== existing.issueCode);
    latestStateRef.current.issues = nextIssues;
    latestStateRef.current.transactions = nextTransactions;

    setIssues(nextIssues);
    setTransactions(nextTransactions);
    addAuditLog(
      'XÓA_CHỨNG_TỪ',
      'PHIẾU_XUẤT',
      existing.issueCode,
      `Xóa phiếu xuất kho ${existing.issueCode}`
    );
    triggerAutoBackup(`Xóa phiếu xuất kho ${existing.issueCode}`);
    return { success: true };
  };

  // Prescription Management
  const createPrescription = (
    prescData: Omit<Prescription, 'id' | 'createdAt' | 'status' | 'items'>,
    itemsData: Omit<PrescriptionItem, 'id' | 'prescriptionId' | 'dispensedQuantity'>[]
  ): Prescription => {
    const prescId = `presc-${Date.now()}`;
    const items = itemsData.map((item, index) => ({
      ...item,
      id: `pr-item-${Date.now()}-${index}`,
      prescriptionId: prescId,
      dispensedQuantity: 0,
    }));

    const newPresc: Prescription = {
      ...prescData,
      id: prescId,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      items,
    };

    setPrescriptions((prev) => [newPresc, ...prev]);
    const ben = beneficiaries.find((b) => b.id === newPresc.beneficiaryId);
    addAuditLog('KÊ_ĐƠN', 'ĐƠN_THUỐC', newPresc.code, `Lập đơn thuốc ${newPresc.code} cho đối tượng ${ben?.fullName}`);

    return newPresc;
  };

  // Dispense Prescription Workflow
  const dispensePrescription = (
    prescriptionId: string,
    itemsToDispense: { medicineId: string; batchNumber: string; quantity: number; unitPrice: number; expiryDate: string }[],
    receiverName: string,
    receiverDept: string
  ): { success: boolean; error?: string; issue?: StockIssue } => {
    const presc = prescriptions.find((p) => p.id === prescriptionId);
    if (!presc) return { success: false, error: 'Không tìm thấy đơn thuốc!' };

    const ben = beneficiaries.find((b) => b.id === presc.beneficiaryId);
    if (!ben) return { success: false, error: 'Không tìm thấy thông tin đối tượng!' };

    // Format new Issue Code
    const todayStr = getTodayISODate().replace(/-/g, '');
    const issueCode = `PXK-${todayStr}-${Math.floor(100 + Math.random() * 900)}`;

    const issueItems = itemsToDispense.map((item) => ({
      medicineId: item.medicineId,
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate,
      requestedQuantity: item.quantity,
      actualQuantity: item.quantity,
      unitPrice: item.unitPrice,
    }));

    // Create Stock Issue
    const issueResult = createStockIssue(
      {
        issueCode,
        issueDate: getTodayISODate(),
        receiverName,
        receiverDept,
        reason: `Cấp phát thuốc theo đơn ${presc.code} cho đối tượng ${ben.fullName}`,
        beneficiaryId: ben.id,
        prescriptionId: presc.id,
        usageLocation: ben.roomArea,
      },
      issueItems
    );

    if (!issueResult.success) {
      return { success: false, error: issueResult.error };
    }

    // Update prescription items dispensed quantity
    setPrescriptions((prev) =>
      prev.map((p) => {
        if (p.id === prescriptionId) {
          let allCompleted = true;
          const updatedItems = p.items.map((pi) => {
            const dispensedItem = itemsToDispense.find((d) => d.medicineId === pi.medicineId);
            const addedQty = dispensedItem ? dispensedItem.quantity : 0;
            const newDispensed = pi.dispensedQuantity + addedQty;
            if (newDispensed < pi.prescribedQuantity) {
              allCompleted = false;
            }
            return {
              ...pi,
              dispensedQuantity: newDispensed,
            };
          });

          return {
            ...p,
            status: allCompleted ? 'COMPLETED' : 'DISPENSING',
            items: updatedItems,
          };
        }
        return p;
      })
    );

    addAuditLog('CẤP_PHÁT', 'ĐƠN_THUỐC', presc.code, `Cấp phát thuốc đơn ${presc.code}, sinh phiếu xuất ${issueCode}`);

    return { success: true, issue: issueResult.issue };
  };

  // The Core Calculation Engine for "BẢNG TỔNG HỢP NHẬP, XUẤT THUỐC MUA NGOÀI CHO ĐỐI TƯỢNG CÓ BẢO HIỂM Y TẾ"
  const calculateBeneficiaryReport = (
    beneficiaryKey: string,
    startDate?: string,
    endDate?: string
  ): BeneficiaryReportRow[] => {
    if (!beneficiaryKey) return [];

    const cleanKey = beneficiaryKey.startsWith('name:')
      ? beneficiaryKey.slice(5).trim().toLowerCase()
      : beneficiaryKey.trim().toLowerCase();

    // 1. Tìm đối tượng tương ứng trong danh mục hồ sơ
    const masterBen = beneficiaries.find(
      (b) => b.id.toLowerCase() === cleanKey || b.fullName.trim().toLowerCase() === cleanKey
    );

    const matchName = masterBen?.fullName.trim().toLowerCase() || cleanKey;
    const matchId = masterBen?.id.toLowerCase() || (cleanKey.startsWith('ben-') ? cleanKey : '');

    const isMatch = (targetId?: string, targetName?: string) => {
      const cleanId = (targetId || '').trim().toLowerCase();
      const cleanTargetName = (targetName || '').trim().toLowerCase();
      if (matchId && cleanId && cleanId === matchId) return true;
      if (cleanTargetName && cleanTargetName === matchName) return true;
      if (cleanId && cleanId === matchName) return true;
      if (matchId && cleanTargetName === matchId) return true;
      return false;
    };

    // 2. Tìm tất cả phiếu nhập kho của đối tượng
    const benReceipts = receipts.filter((r) => isMatch(r.beneficiaryId, r.beneficiaryName));

    // 3. Tìm tất cả phiếu xuất kho của đối tượng
    const benIssues = issues.filter((i) => isMatch(i.beneficiaryId, i.beneficiaryName));

    // 4. Tìm tất cả sổ giao dịch liên quan
    const benTransactions = transactions.filter((tx) => {
      if (isMatch(tx.beneficiaryId)) return true;
      if (benReceipts.some((r) => r.receiptCode === tx.refCode)) return true;
      if (benIssues.some((i) => i.issueCode === tx.refCode)) return true;
      return false;
    });

    // 5. Gom và trích xuất danh sách tất cả các loại thuốc của đối tượng
    const medicineMap = new Map<
      string,
      {
        medicineId: string;
        medicineName: string;
        activeIngredient: string;
        concentration: string;
        unit: string;
        openingQty: number;
        openingAmount: number;
        inQty: number;
        inAmount: number;
        outQty: number;
        outAmount: number;
      }
    >();

    const getOrCreateMed = (mId: string) => {
      if (!medicineMap.has(mId)) {
        const med = medicines.find((m) => m.id === mId);
        medicineMap.set(mId, {
          medicineId: mId,
          medicineName: med?.name || 'Thuốc mua ngoài BHYT',
          activeIngredient: med?.activeIngredient || '',
          concentration: med?.concentration || '',
          unit: med?.unit || 'Viên',
          openingQty: 0,
          openingAmount: 0,
          inQty: 0,
          inAmount: 0,
          outQty: 0,
          outAmount: 0,
        });
      }
      return medicineMap.get(mId)!;
    };

    // A. Trích xuất trực tiếp từ Phiếu Nhập Kho
    benReceipts.forEach((r) => {
      const rDate = r.receiptDate;
      const isPrior = Boolean(startDate && rDate < startDate);
      const isInPeriod =
        (!startDate && !endDate) ||
        (!startDate && endDate && rDate <= endDate) ||
        (startDate && !endDate && rDate >= startDate) ||
        (startDate && endDate && rDate >= startDate && rDate <= endDate);

      (r.items || []).forEach((item) => {
        const med = getOrCreateMed(item.medicineId);
        const qty = Number(item.actualQuantity) || 0;
        const amount = Number(item.totalPrice) || qty * (Number(item.unitPrice) || 0);

        if (isPrior) {
          med.openingQty += qty;
          med.openingAmount += amount;
        } else if (isInPeriod) {
          med.inQty += qty;
          med.inAmount += amount;
        }
      });
    });

    // B. Trích xuất trực tiếp từ Phiếu Xuất Kho
    benIssues.forEach((i) => {
      const iDate = i.issueDate;
      const isPrior = Boolean(startDate && iDate < startDate);
      const isInPeriod =
        (!startDate && !endDate) ||
        (!startDate && endDate && iDate <= endDate) ||
        (startDate && !endDate && iDate >= startDate) ||
        (startDate && endDate && iDate >= startDate && iDate <= endDate);

      (i.items || []).forEach((item) => {
        const med = getOrCreateMed(item.medicineId);
        const qty = Number(item.actualQuantity) || 0;
        const amount = Number(item.totalPrice) || qty * (Number(item.unitPrice) || 0);

        if (isPrior) {
          med.openingQty -= qty;
          med.openingAmount -= amount;
        } else if (isInPeriod) {
          med.outQty += qty;
          med.outAmount += amount;
        }
      });
    });

    // C. Bổ sung các transactions độc lập (nếu có giao dịch chưa gắn refCode theo phiếu)
    benTransactions.forEach((tx) => {
      const hasReceipt = benReceipts.some((r) => r.receiptCode === tx.refCode);
      const hasIssue = benIssues.some((i) => i.issueCode === tx.refCode);
      if (hasReceipt || hasIssue) return; // Đã trích xuất trực tiếp từ phiếu

      const txDate = tx.date;
      const isPrior = Boolean(startDate && txDate < startDate);
      const isInPeriod =
        (!startDate && !endDate) ||
        (!startDate && endDate && txDate <= endDate) ||
        (startDate && !endDate && txDate >= startDate) ||
        (startDate && endDate && txDate >= startDate && txDate <= endDate);

      const med = getOrCreateMed(tx.medicineId);
      const qty = Math.abs(tx.quantity);
      const amount = Math.abs(tx.totalPrice);

      if (tx.type === 'RECEIPT') {
        if (isPrior) {
          med.openingQty += qty;
          med.openingAmount += amount;
        } else if (isInPeriod) {
          med.inQty += qty;
          med.inAmount += amount;
        }
      } else if (tx.type === 'ISSUE') {
        if (isPrior) {
          med.openingQty -= qty;
          med.openingAmount -= amount;
        } else if (isInPeriod) {
          med.outQty += qty;
          med.outAmount += amount;
        }
      }
    });

    // 6. Tính toán các cụm chỉ số tổng hợp
    const rows: BeneficiaryReportRow[] = [];
    let stt = 1;

    medicineMap.forEach((med) => {
      const openingQty = Math.max(0, med.openingQty);
      const openingAmount = Math.max(0, med.openingAmount);
      const inQty = med.inQty;
      const inAmount = med.inAmount;

      const totalInQty = openingQty + inQty;
      const totalInAmount = openingAmount + inAmount;

      const outQty = med.outQty;
      const outAmount = med.outAmount;

      const closingQty = Math.max(0, totalInQty - outQty);
      const closingAmount = Math.max(0, totalInAmount - outAmount);

      const openingPrice = openingQty > 0 ? Number((openingAmount / openingQty).toFixed(2)) : 0;
      const inPrice = inQty > 0 ? Number((inAmount / inQty).toFixed(2)) : 0;
      const totalInPrice = totalInQty > 0 ? Number((totalInAmount / totalInQty).toFixed(2)) : 0;
      const outPrice = outQty > 0 ? Number((outAmount / outQty).toFixed(2)) : 0;
      const closingPrice = closingQty > 0 ? Number((closingAmount / closingQty).toFixed(2)) : 0;

      rows.push({
        stt: stt++,
        medicineId: med.medicineId,
        medicineName: med.medicineName,
        activeIngredient: med.activeIngredient,
        concentration: med.concentration,
        unit: med.unit,
        openingQty,
        openingPrice,
        openingAmount,
        inQty,
        inPrice,
        inAmount,
        totalInQty,
        totalInPrice,
        totalInAmount,
        outQty,
        outPrice,
        outAmount,
        closingQty,
        closingPrice,
        closingAmount,
      });
    });

    return rows;
  };

  const syncDocumentToDrive = async (
    docCode: string,
    docType: 'PHIEU_NHAP' | 'PHIEU_XUAT' | 'DON_THUOC' | 'BAO_CAO_BHYT',
    fileName: string,
    documentHtmlContent?: string
  ): Promise<DriveSyncedFile | null> => {
    if (currentUser?.role !== 'ADMIN') {
      setSyncSheetsError('Chỉ Quản trị viên (ADMIN) mới có quyền lưu trữ tài liệu lên Google Drive.');
      return null;
    }

    const year = new Date().getFullYear();
    const baseFolder = (templateSettings.googleDriveFolder || `QUAN_LY_THUOC_TRUNG_TAM/${year}`).replace(/\/+$/, '');
    const subFolderMap = {
      PHIEU_NHAP: 'PHIEU_NHAP',
      PHIEU_XUAT: 'PHIEU_XUAT',
      DON_THUOC: 'DON_THUOC',
      BAO_CAO_BHYT: 'BAO_CAO',
    };
    const driveFolder = `${baseFolder}/${subFolderMap[docType]}`;
    const safeFileName = fileName.endsWith('.html') || fileName.endsWith('.json') ? fileName : fileName.replace(/\.pdf$/i, '.html');
    const htmlPayload =
      documentHtmlContent ||
      `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${docCode}</title></head><body><h2>${templateSettings.agencyName}</h2><p>Chứng từ: <strong>${docCode}</strong> (${docType})</p><p>Lưu trữ lúc: ${new Date().toLocaleString('vi-VN')}</p></body></html>`;

    let uploadedFileId = `drv-${Math.random().toString(36).substring(2, 10)}`;
    let webViewLink: string | undefined = undefined;
    let uploadChannel: 'APPS_SCRIPT' | 'OAUTH_DRIVE_V3' | 'LOCAL_RECORD' = 'LOCAL_RECORD';

    const hasAppsScript = isValidAppsScriptUrl(templateSettings.appsScriptUrl);
    if (hasAppsScript && (templateSettings.syncMode === 'APPS_SCRIPT' || templateSettings.syncMode === 'HYBRID')) {
      const gasUpload = await uploadDocumentViaAppsScript(
        templateSettings.appsScriptUrl,
        driveFolder,
        safeFileName,
        htmlPayload,
        'text/html'
      );
      if (gasUpload.success && gasUpload.fileId) {
        uploadedFileId = gasUpload.fileId;
        webViewLink = gasUpload.webViewLink;
        uploadChannel = 'APPS_SCRIPT';
      }
    }

    if (uploadChannel === 'LOCAL_RECORD') {
      const token = await getAccessToken();
      if (token) {
        const driveRes = await uploadFileToGoogleDrive(token, driveFolder, safeFileName, htmlPayload, 'text/html');
        if (driveRes.success && driveRes.fileId) {
          uploadedFileId = driveRes.fileId;
          webViewLink = driveRes.webViewLink;
          uploadChannel = 'OAUTH_DRIVE_V3';
        }
      }
    }

    const byteSize = new Blob([htmlPayload]).size;
    const sizeLabel = byteSize > 1024 ? `${Math.max(1, Math.round(byteSize / 1024))} KB` : `${byteSize} B`;

    const newSyncFile: DriveSyncedFile = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fileId: uploadedFileId,
      docCode,
      docType,
      fileName: safeFileName,
      driveFolder,
      webViewLink,
      uploadChannel,
      createdAt: new Date().toISOString(),
      fileSize: sizeLabel,
      syncedToSheets: uploadChannel !== 'LOCAL_RECORD',
    };

    setSyncedFiles((prev) => [newSyncFile, ...prev]);
    addAuditLog(
      'LƯU_TRỮ_DRIVE',
      'TÀI_LIỆU',
      docCode,
      `Đã lưu chứng từ ${safeFileName} vào ${driveFolder} (${uploadChannel === 'APPS_SCRIPT' ? 'Google Apps Script Drive' : uploadChannel === 'OAUTH_DRIVE_V3' ? 'Google Drive API v3' : 'Phiên tạm'})`
    );

    return newSyncFile;
  };

  return (
    <AppContext.Provider
      value={{
        users,
        currentUser,
        beneficiaries,
        medicines,
        sources,
        receipts,
        issues,
        prescriptions,
        transactions,
        auditLogs,
        syncedFiles,
        templateSettings,
        backupLogs,
        googleUser,
        isGoogleAuthenticated,
        isSyncingSheets,
        isPullingFromCloud,
        syncSheetsError,
        lastSheetsSyncResult,
        loginWithGoogle,
        logoutFromGoogle,
        syncNowToGoogleSheets,
        pullFromSheetsAndDrive,
        testAppsScriptSync,
        updateTemplateSettings,
        resetTemplateSettings,
        triggerAutoBackup,
        exportFullGoogleSheetData,
        exportFullGoogleSheetCSV,
        isAuthenticated,
        sessionNotice,
        clearSessionNotice,
        remainingSessionSeconds,
        setCurrentUser,
        loginWithCredentials,
        logoutApp,
        registerNewAccount,
        hasPermission,
        canModifyReceipt,
        canModifyIssue,
        registerUser,
        approveUser,
        rejectUser,
        changeUserRole,
        toggleUserStatus,
        updateUserAccount,
        addMedicine,
        updateMedicine,
        addBeneficiary,
        updateBeneficiary,
        createStockReceipt,
        updateStockReceipt,
        deleteStockReceipt,
        createStockIssue,
        updateStockIssue,
        deleteStockIssue,
        createPrescription,
        dispensePrescription,
        getAvailableLots,
        getExpiringLots,
        getLowStockMedicines,
        calculateBeneficiaryReport,
        syncDocumentToDrive,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
