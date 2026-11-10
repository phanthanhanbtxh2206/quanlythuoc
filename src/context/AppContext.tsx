/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
  TemplateSettings,
  BackupLog,
} from '../types';
import {
  downloadThreeSheetsExcelWorkbook,
  downloadThreeSheetsCSV,
} from '../utils/googleSheetsBackup';
import {
  initGoogleAuth,
  signInWithGoogle,
  signOutGoogle,
  getAccessToken,
} from '../services/googleAuth';
import {
  syncAllDataToGoogleSheets,
  GoogleSheetsSyncResult,
} from '../services/googleSheetsService';
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

  // Google Sheets Real-time Auto-Sync
  googleUser: any;
  isGoogleAuthenticated: boolean;
  isSyncingSheets: boolean;
  syncSheetsError: string | null;
  lastSheetsSyncResult: GoogleSheetsSyncResult | null;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string; cancelled?: boolean }>;
  logoutFromGoogle: () => Promise<void>;
  syncNowToGoogleSheets: (skipConfirm?: boolean) => Promise<GoogleSheetsSyncResult | null>;

  // Template & Auto-backup Actions
  updateTemplateSettings: (settings: Partial<TemplateSettings>) => void;
  resetTemplateSettings: () => void;
  triggerAutoBackup: (actionDescription: string) => void;
  exportFullGoogleSheetData: () => void;
  exportFullGoogleSheetCSV: () => void;

  // User Actions
  setCurrentUser: (user: User) => void;
  registerUser: (email: string, fullName: string, department: string, phone: string, requestedRole: UserRole) => void;
  approveUser: (userId: string, role: UserRole) => void;
  rejectUser: (userId: string) => void;

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
  ) => StockReceipt;
  deleteStockReceipt: (receiptId: string) => void;
  
  createStockIssue: (
    issueData: Omit<StockIssue, 'id' | 'totalAmount' | 'createdBy' | 'createdByName' | 'createdAt' | 'status'>,
    items: Omit<StockIssueItem, 'id' | 'issueId' | 'totalPrice'>[]
  ) => { success: boolean; issue?: StockIssue; error?: string };
  updateStockIssue: (
    issueId: string,
    issueData: Partial<StockIssue>,
    items: Omit<StockIssueItem, 'id' | 'issueId' | 'totalPrice'>[]
  ) => { success: boolean; issue?: StockIssue; error?: string };
  deleteStockIssue: (issueId: string) => void;

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

  // Sync & Storage
  syncDocumentToDrive: (
    docCode: string,
    docType: 'PHIEU_NHAP' | 'PHIEU_XUAT' | 'DON_THUOC' | 'BAO_CAO_BHYT',
    fileName: string
  ) => DriveSyncedFile;
  resetAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USERS: 'btxh_users_v1',
  BENEFICIARIES: 'btxh_beneficiaries_v1',
  MEDICINES: 'btxh_medicines_v1',
  SOURCES: 'btxh_sources_v1',
  RECEIPTS: 'btxh_receipts_v1',
  ISSUES: 'btxh_issues_v1',
  PRESCRIPTIONS: 'btxh_prescriptions_v1',
  TRANSACTIONS: 'btxh_transactions_v1',
  AUDIT_LOGS: 'btxh_audit_logs_v1',
  SYNCED_FILES: 'btxh_synced_files_v1',
  CURRENT_USER: 'btxh_current_user_v1',
  TEMPLATE_SETTINGS: 'btxh_template_settings_v1',
  BACKUP_LOGS: 'btxh_backup_logs_v1',
};

const DEFAULT_TEMPLATE_SETTINGS: TemplateSettings = {
  parentOrg: 'SỞ LAO ĐỘNG - THƯƠNG BINH VÀ XÃ HỘI TP ĐÀ NẴNG',
  agencyName: 'TRUNG TÂM BẢO TRỢ XÃ HỘI',
  deptName: 'PHÒNG Y TẾ - PHCN',
  qhnsCode: '1041008',
  facilityAddress: 'Đà Nẵng',

  receiptFormCode: 'Mẫu số: C20-HD',
  receiptNotice: '(Ban hành theo Thông tư BTC)',
  receiptTitle: 'PHIẾU NHẬP KHO',
  receiptDefaultWarehouse: 'Kho Dược - Phòng Y tế & PHCN Trung tâm',

  issueFormCode: 'Mẫu số: C21-HD',
  issueNotice: '(Ban hành theo Thông tư BTC)',
  issueTitle: 'PHIẾU XUẤT KHO',
  issueDefaultWarehouse: 'Kho Dược - Phòng Y tế - PHCN Trung tâm',

  reportTitle: 'BẢNG TỔNG HỢP NHẬP, XUẤT THUỐC MUA NGOÀI CHO ĐỐI TƯỢNG CÓ BẢO HIỂM Y TẾ',

  preparerName: 'DS. Lê Thu Hà',
  preparerTitle: 'Người lập biểu',
  deptLeaderName: 'BS. CKI. Nguyễn Thanh Long',
  deptLeaderTitle: 'Phụ trách Phòng Y tế - PHCN',
  accountantName: 'Trần Đình Trọng',
  accountantTitle: 'Kế toán trưởng',
  warehouseKeeperName: 'Trần Văn Kho',
  warehouseKeeperTitle: 'Thủ kho',
  centerDirectorName: 'Lê Minh Tuấn',
  centerDirectorTitle: 'Thủ trưởng đơn vị',

  autoBackupEnabled: true,
  googleSheetUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
  googleDriveFolder: 'QUAN_LY_THUOC_TRUNG_TAM/2026',
  autoSyncOnTransaction: true,
  lastBackupTime: '10:00:00 26/10/2026',
  lastBackupMessage: 'Đã sẵn sàng tự động sao lưu toàn diện lên Google Sheet và Drive',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State Initialization from LocalStorage or Defaults
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_USERS[2]; // Default to Pharmacist DS. Lê Thu Hà
  });

  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BENEFICIARIES);
    return saved ? JSON.parse(saved) : INITIAL_BENEFICIARIES;
  });

  const [medicines, setMedicines] = useState<Medicine[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MEDICINES);
    return saved ? JSON.parse(saved) : INITIAL_MEDICINES;
  });

  const [sources] = useState<MedicineSource[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SOURCES);
    return saved ? JSON.parse(saved) : INITIAL_SOURCES;
  });

  const [receipts, setReceipts] = useState<StockReceipt[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RECEIPTS);
    return saved ? JSON.parse(saved) : INITIAL_STOCK_RECEIPTS;
  });

  const [issues, setIssues] = useState<StockIssue[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ISSUES);
    return saved ? JSON.parse(saved) : INITIAL_STOCK_ISSUES;
  });

  const [prescriptions, setPrescriptions] = useState<Prescription[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRESCRIPTIONS);
    return saved ? JSON.parse(saved) : INITIAL_PRESCRIPTIONS;
  });

  const [transactions, setTransactions] = useState<StockTransaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'log-1',
        timestamp: new Date().toISOString(),
        userId: 'usr-1',
        userName: 'Lê Minh Tuấn',
        action: 'KHỞI_TẠO',
        entity: 'HỆ_THỐNG',
        entityId: 'SYS',
        details: 'Khởi tạo dữ liệu ban đầu hệ thống Quản lý Dược TT BTXH Đà Nẵng',
      },
    ];
  });

  const [syncedFiles, setSyncedFiles] = useState<DriveSyncedFile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SYNCED_FILES);
    if (saved) return JSON.parse(saved);
    return [
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
    ];
  });

  const [templateSettings, setTemplateSettings] = useState<TemplateSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TEMPLATE_SETTINGS);
    if (saved) {
      try {
        return { ...DEFAULT_TEMPLATE_SETTINGS, ...JSON.parse(saved) };
      } catch {
        // fallback
      }
    }
    return DEFAULT_TEMPLATE_SETTINGS;
  });

  const [backupLogs, setBackupLogs] = useState<BackupLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BACKUP_LOGS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [
      {
        id: 'bk-init',
        timestamp: '10:00:00 26/10/2026',
        action: 'KHỞI_TẠO_HỆ_THỐNG',
        status: 'SUCCESS',
        recordCounts: {
          receipts: INITIAL_STOCK_RECEIPTS.length,
          issues: INITIAL_STOCK_ISSUES.length,
          medicines: INITIAL_MEDICINES.length,
          beneficiaries: INITIAL_BENEFICIARIES.length,
        },
        details: 'Khởi tạo tự động đồng bộ Google Sheet & Drive sẵn sàng hoạt động.',
      },
    ];
  });

  // Persist State to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BENEFICIARIES, JSON.stringify(beneficiaries));
  }, [beneficiaries]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MEDICINES, JSON.stringify(medicines));
  }, [medicines]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(receipts));
  }, [receipts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ISSUES, JSON.stringify(issues));
  }, [issues]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRESCRIPTIONS, JSON.stringify(prescriptions));
  }, [prescriptions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SYNCED_FILES, JSON.stringify(syncedFiles));
  }, [syncedFiles]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TEMPLATE_SETTINGS, JSON.stringify(templateSettings));
  }, [templateSettings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BACKUP_LOGS, JSON.stringify(backupLogs));
  }, [backupLogs]);

  // Template Settings Updates
  const updateTemplateSettings = (newSettings: Partial<TemplateSettings>) => {
    setTemplateSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      addAuditLog('CẤU_HÌNH', 'BIỂU_MẪU', 'TEMPLATE', 'Cập nhật cấu hình biểu mẫu mặc định của Trung tâm');
      return updated;
    });
  };

  const resetTemplateSettings = () => {
    setTemplateSettings(DEFAULT_TEMPLATE_SETTINGS);
    addAuditLog('KHÔI_PHỤC', 'BIỂU_MẪU', 'TEMPLATE', 'Khôi phục cấu hình biểu mẫu mặc định ban đầu');
  };

  // Google Sheets Auto-Sync States
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState<boolean>(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);
  const [syncSheetsError, setSyncSheetsError] = useState<string | null>(null);
  const [lastSheetsSyncResult, setLastSheetsSyncResult] = useState<GoogleSheetsSyncResult | null>(null);

  // Initialize Firebase Auth listener
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

  const executeSheetsSync = async (
    token: string,
    reason: string
  ): Promise<GoogleSheetsSyncResult | null> => {
    setIsSyncingSheets(true);
    setSyncSheetsError(null);
    try {
      const result = await syncAllDataToGoogleSheets(
        token,
        beneficiaries,
        receipts,
        issues,
        medicines,
        transactions,
        templateSettings
      );

      setLastSheetsSyncResult(result);
      setTemplateSettings((prev) => ({
        ...prev,
        googleSpreadsheetId: result.spreadsheetId,
        googleSheetUrl: result.spreadsheetUrl,
        lastBackupTime: result.timestamp,
        lastBackupMessage: `${reason} (${result.rowCounts.receipts} PNK, ${result.rowCounts.issues} PXK, ${result.rowCounts.reports} báo cáo)`,
      }));

      const newLog: BackupLog = {
        id: `bk-${Date.now()}`,
        timestamp: result.timestamp,
        action: reason,
        status: 'SUCCESS',
        recordCounts: {
          receipts: receipts.length,
          issues: issues.length,
          medicines: medicines.length,
          beneficiaries: beneficiaries.length,
        },
        details: `Đã tự động đồng bộ lên Google Sheets thành công: ${result.spreadsheetUrl}`,
      };
      setBackupLogs((prev) => [newLog, ...prev.slice(0, 49)]);

      return result;
    } catch (err: any) {
      console.error('Lỗi đồng bộ Google Sheets:', err);
      const errMsg = err.message || 'Đồng bộ Google Sheets thất bại';
      setSyncSheetsError(errMsg);
      const newLog: BackupLog = {
        id: `bk-${Date.now()}`,
        timestamp:
          new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN'),
        action: reason,
        status: 'FAILED',
        recordCounts: {
          receipts: receipts.length,
          issues: issues.length,
          medicines: medicines.length,
          beneficiaries: beneficiaries.length,
        },
        details: `Lỗi đồng bộ Google Sheets: ${errMsg}`,
      };
      setBackupLogs((prev) => [newLog, ...prev.slice(0, 49)]);
      return null;
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string; cancelled?: boolean }> => {
    try {
      setSyncSheetsError(null);
      const res = await signInWithGoogle();
      if (res.cancelled) {
        if (res.error) {
          setSyncSheetsError(res.error);
          return { success: false, error: res.error, cancelled: true };
        }
        // User closed the popup, do not show error banner
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
      // Auto-trigger sync on login
      await executeSheetsSync(res.accessToken, 'Đồng bộ khởi tạo sau khi kết nối Google');
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
    const token = await getAccessToken();
    if (!token) {
      const res = await loginWithGoogle();
      if (!res.success) return null;
      const newToken = await getAccessToken();
      if (!newToken) return null;
      return executeSheetsSync(newToken, 'Đồng bộ toàn bộ dữ liệu lên Google Sheets');
    }
    return executeSheetsSync(token, 'Đồng bộ toàn bộ dữ liệu lên Google Sheets');
  };

  // Trigger Automatic Backup to Google Sheet & Drive
  const triggerAutoBackup = (actionDescription: string) => {
    const timestamp = new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN');
    const newLog: BackupLog = {
      id: `bk-${Date.now()}`,
      timestamp,
      action: actionDescription,
      status: 'SUCCESS',
      recordCounts: {
        receipts: receipts.length,
        issues: issues.length,
        medicines: medicines.length,
        beneficiaries: beneficiaries.length,
      },
      details: `Đã tự động sao lưu dữ liệu cập nhật sau khi ${actionDescription} vào Google Sheet & Google Drive.`,
    };

    setBackupLogs((prev) => [newLog, ...prev.slice(0, 49)]);
    setTemplateSettings((prev) => ({
      ...prev,
      lastBackupTime: timestamp,
      lastBackupMessage: `Đã tự động sao lưu: ${actionDescription}`,
    }));

    // Auto-sync directly to Google Sheets if token is present and auto-sync is enabled
    if (templateSettings.autoBackupEnabled) {
      getAccessToken().then((token) => {
        if (token) {
          executeSheetsSync(token, `Tự động cập nhật sau khi ${actionDescription}`).catch(console.error);
        }
      });
    }
  };

  // Export Full Google Sheet Data (Optimized 03 Sheets: Phiếu nhập, Phiếu xuất, Báo cáo - 1 dòng / đối tượng)
  const exportFullGoogleSheetData = () => {
    downloadThreeSheetsExcelWorkbook(
      beneficiaries,
      receipts,
      issues,
      medicines,
      transactions,
      templateSettings
    );
    triggerAutoBackup('Xuất tệp sao lưu Google Sheets tối ưu 03 Sheet (.XLSX)');
  };

  const exportFullGoogleSheetCSV = () => {
    downloadThreeSheetsCSV(
      beneficiaries,
      receipts,
      issues,
      medicines,
      transactions,
      templateSettings
    );
    triggerAutoBackup('Xuất tệp sao lưu Google Sheets tối ưu 03 Sheet (.CSV)');
  };

  const addAuditLog = (action: string, entity: string, entityId: string, details: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
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

  // User Administration
  const registerUser = (email: string, fullName: string, department: string, phone: string, requestedRole: UserRole) => {
    const newUser: User = {
      id: `usr-${Date.now()}`,
      email,
      fullName,
      role: requestedRole,
      status: 'PENDING_APPROVAL',
      department,
      phone,
      createdAt: getTodayISODate(),
    };
    setUsers((prev) => [...prev, newUser]);
    addAuditLog('ĐĂNG_KÝ', 'NGƯỜI_DÙNG', newUser.id, `Tài khoản ${fullName} (${email}) đăng ký chờ duyệt`);
  };

  const approveUser = (userId: string, role: UserRole) => {
    setUsers((prev) =>
      prev.map((u) => {
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
      })
    );
  };

  const rejectUser = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated: User = { ...u, status: 'REJECTED' };
          addAuditLog('TỪ_CHỐI', 'NGƯỜI_DÙNG', u.id, `Từ chối cấp quyền tài khoản ${u.fullName}`);
          return updated;
        }
        return u;
      })
    );
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

    // Create Stock Transactions
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

    setReceipts((prev) => [newReceipt, ...prev]);
    setTransactions((prev) => [...prev, ...newTransactions]);

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
  ): StockReceipt => {
    let totalAmount = 0;
    const existing = receipts.find((r) => r.id === receiptId);
    const receiptCode = receiptData.receiptCode || existing?.receiptCode || '';

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
      ...(existing || {}),
      ...receiptData,
      id: receiptId,
      receiptCode,
      totalAmount,
      items: receiptItems,
    } as StockReceipt;

    // Replace transactions for this receipt
    const oldRefCode = existing?.receiptCode;
    const remainingTransactions = transactions.filter(
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

    setReceipts((prev) => prev.map((r) => (r.id === receiptId ? updatedReceipt : r)));
    setTransactions([...remainingTransactions, ...newTransactions]);

    addAuditLog(
      'HIỆU_CHỈNH',
      'PHIẾU_NHẬP',
      updatedReceipt.receiptCode,
      `Hiệu chỉnh phiếu nhập kho ${updatedReceipt.receiptCode}, tổng tiền cập nhật ${totalAmount.toLocaleString()} ₫`
    );

    triggerAutoBackup(`Hiệu chỉnh phiếu nhập kho ${updatedReceipt.receiptCode}`);

    return updatedReceipt;
  };

  const deleteStockReceipt = (receiptId: string) => {
    const existing = receipts.find((r) => r.id === receiptId);
    if (!existing) return;
    setReceipts((prev) => prev.filter((r) => r.id !== receiptId));
    setTransactions((prev) => prev.filter((t) => t.refCode !== existing.receiptCode));
    addAuditLog(
      'XÓA_CHỨNG_TỪ',
      'PHIẾU_NHẬP',
      existing.receiptCode,
      `Xóa phiếu nhập kho ${existing.receiptCode}`
    );
    triggerAutoBackup(`Xóa phiếu nhập kho ${existing.receiptCode}`);
  };

  // Stock Issue Management (with atomic stock validation!)
  const createStockIssue = (
    issueData: Omit<StockIssue, 'id' | 'totalAmount' | 'createdBy' | 'createdByName' | 'createdAt' | 'status'>,
    itemsData: Omit<StockIssueItem, 'id' | 'issueId' | 'totalPrice'>[]
  ): { success: boolean; issue?: StockIssue; error?: string } => {
    // 1. Stock availability validation
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

    // Create negative stock transactions
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

    setIssues((prev) => [newIssue, ...prev]);
    setTransactions((prev) => [...prev, ...newTransactions]);

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
    const existing = issues.find((i) => i.id === issueId);
    const issueCode = issueData.issueCode || existing?.issueCode || '';

    // Calculate temporary available lots without this issue's existing transactions
    const otherTransactions = transactions.filter(
      (t) => t.refCode !== existing?.issueCode && t.refCode !== issueCode
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
      ...(existing || {}),
      ...issueData,
      id: issueId,
      issueCode,
      totalAmount,
      items: issueItems,
    } as StockIssue;

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

    setIssues((prev) => prev.map((i) => (i.id === issueId ? updatedIssue : i)));
    setTransactions([...otherTransactions, ...newTransactions]);

    addAuditLog(
      'HIỆU_CHỈNH',
      'PHIẾU_XUẤT',
      updatedIssue.issueCode,
      `Hiệu chỉnh phiếu xuất kho ${updatedIssue.issueCode}, tổng tiền cập nhật ${totalAmount.toLocaleString()} ₫`
    );

    triggerAutoBackup(`Hiệu chỉnh phiếu xuất kho ${updatedIssue.issueCode}`);

    return { success: true, issue: updatedIssue };
  };

  const deleteStockIssue = (issueId: string) => {
    const existing = issues.find((i) => i.id === issueId);
    if (!existing) return;
    setIssues((prev) => prev.filter((i) => i.id !== issueId));
    setTransactions((prev) => prev.filter((t) => t.refCode !== existing.issueCode));
    addAuditLog(
      'XÓA_CHỨNG_TỪ',
      'PHIẾU_XUẤT',
      existing.issueCode,
      `Xóa phiếu xuất kho ${existing.issueCode}`
    );
    triggerAutoBackup(`Xóa phiếu xuất kho ${existing.issueCode}`);
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

  const syncDocumentToDrive = (
    docCode: string,
    docType: 'PHIEU_NHAP' | 'PHIEU_XUAT' | 'DON_THUOC' | 'BAO_CAO_BHYT',
    fileName: string
  ): DriveSyncedFile => {
    const year = new Date().getFullYear();
    const folderMapping = {
      PHIEU_NHAP: `QUAN_LY_THUOC_TRUNG_TAM/${year}/PHIEU_NHAP`,
      PHIEU_XUAT: `QUAN_LY_THUOC_TRUNG_TAM/${year}/PHIEU_XUAT`,
      DON_THUOC: `QUAN_LY_THUOC_TRUNG_TAM/${year}/DON_THUOC`,
      BAO_CAO_BHYT: `QUAN_LY_THUOC_TRUNG_TAM/${year}/BAO_CAO`,
    };

    const newSyncFile: DriveSyncedFile = {
      id: `sync-${Date.now()}`,
      fileId: `drv-${Math.random().toString(36).substring(2, 10)}`,
      docCode,
      docType,
      fileName,
      driveFolder: folderMapping[docType],
      createdAt: new Date().toISOString(),
      fileSize: `${Math.floor(120 + Math.random() * 80)} KB`,
      syncedToSheets: true,
    };

    setSyncedFiles((prev) => [newSyncFile, ...prev]);
    addAuditLog('LƯU_TRỮ_DRIVE', 'TÀI_LIỆU_PDF', docCode, `Đã xuất và lưu PDF ${fileName} lên thư mục ${newSyncFile.driveFolder}`);

    return newSyncFile;
  };

  const resetAllData = () => {
    localStorage.clear();
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[2]);
    setBeneficiaries(INITIAL_BENEFICIARIES);
    setMedicines(INITIAL_MEDICINES);
    setReceipts(INITIAL_STOCK_RECEIPTS);
    setIssues(INITIAL_STOCK_ISSUES);
    setPrescriptions(INITIAL_PRESCRIPTIONS);
    setTransactions(INITIAL_TRANSACTIONS);
    setAuditLogs([]);
    setSyncedFiles([]);
    window.location.reload();
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
        syncSheetsError,
        lastSheetsSyncResult,
        loginWithGoogle,
        logoutFromGoogle,
        syncNowToGoogleSheets,
        updateTemplateSettings,
        resetTemplateSettings,
        triggerAutoBackup,
        exportFullGoogleSheetData,
        exportFullGoogleSheetCSV,
        setCurrentUser,
        registerUser,
        approveUser,
        rejectUser,
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
        resetAllData,
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
