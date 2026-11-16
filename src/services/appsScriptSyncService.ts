/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Beneficiary,
  StockReceipt,
  StockIssue,
  Medicine,
  Prescription,
  StockTransaction,
  AuditLog,
  DriveSyncedFile,
  TemplateSettings,
  User,
} from '../types';
import { buildAllTenSheets2D, TEN_SHEET_NAMES } from '../utils/googleSheetsBackup';

export const DRIVE_STATE_FILENAME = 'btxh_pharmacy_state.json';
export const APPS_SCRIPT_REQUIRED_VERSION = 3;

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * GOOGLE APPS SCRIPT BRIDGE HAI CHIỀU (v3 - 10 TAB ĐỒNG BỘ TOÀN DIỆN)
 * SỞ Y TẾ THÀNH PHỐ ĐÀ NẴNG
 * TRUNG TÂM BẢO TRỢ XÃ HỘI ĐÀ NẴNG - KHO DƯỢC (Mã QHNS: 1041008)
 *
 * Đặc điểm phiên bản v3:
 * - Lưu trữ & đồng bộ toàn bộ 100% dữ liệu trên 1 tệp Google Sheets duy nhất (10 tab), KHÔNG phụ thuộc Drive JSON.
 * - Hỗ trợ LockService chống ghi đè đồng thời khi nhiều trình duyệt/máy đăng ký tài khoản cùng lúc.
 * - Hỗ trợ REGISTER_ACCOUNT & UPDATE_ACCOUNT nguyên tử trên tab "Tài khoản".
 *
 * Hướng dẫn cài đặt / cập nhật:
 * 1. Mở tệp Google Sheets của đơn vị -> Tiện ích mở rộng (Extensions) -> Apps Script.
 * 2. Dán toàn bộ mã này vào Code.gs -> Lưu (Ctrl + S).
 * 3. Chọn Triển khai (Deploy) -> Quản lý các bản triển khai -> Bấm biểu tượng Chỉnh sửa (bút chì) ->
 *    Phiên bản: "Phiên bản mới (New version)" -> Quyền truy cập: "Bất kỳ ai (Anyone)" -> Triển khai.
 * 4. Sao chép URL Web App (https://script.google.com/macros/s/.../exec) dán vào Cấu hình đồng bộ của hệ thống.
 */

var SCRIPT_VERSION = 3;

var ACCOUNT_HEADERS = [
  'STT',
  'ID tài khoản',
  'Họ và tên',
  'Email đăng nhập',
  'Mật khẩu',
  'Số điện thoại',
  'Phòng ban / Đơn vị',
  'Vai trò',
  'Trạng thái',
  'Ngày tạo',
  'Ngày duyệt',
  'Người duyệt'
];

var DATA_PULL_TABS = [
  'Tài khoản',
  'DanhMuc_Thuoc',
  'DoiTuong',
  'ChiTiet_PhieuNhap',
  'ChiTiet_PhieuXuat',
  'DonThuoc_GiaoDich',
  'CauHinh_BieuMau'
];

var ALL_TEN_TABS = [
  'Phiếu nhập',
  'Phiếu xuất',
  'Báo cáo',
  'Tài khoản',
  'DanhMuc_Thuoc',
  'DoiTuong',
  'ChiTiet_PhieuNhap',
  'ChiTiet_PhieuXuat',
  'DonThuoc_GiaoDich',
  'CauHinh_BieuMau'
];

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action) : 'PULL_ALL';

    if (action === 'PING') {
      var ssPing = SpreadsheetApp.getActiveSpreadsheet();
      return jsonResponse({
        success: true,
        scriptVersion: SCRIPT_VERSION,
        message: 'Kết nối Google Apps Script v3 (10 Tab Sheets) thành công!',
        spreadsheetId: ssPing.getId(),
        spreadsheetUrl: ssPing.getUrl(),
        spreadsheetName: ssPing.getName()
      });
    }

    return handlePullAll();
  } catch (err) {
    return jsonResponse({
      success: false,
      scriptVersion: SCRIPT_VERSION,
      error: err && err.message ? err.message : String(err)
    });
  }
}

function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    var payload = JSON.parse(raw);
    var action = payload.action || 'SYNC_ALL';

    if (action === 'PING') {
      var ssPing = SpreadsheetApp.getActiveSpreadsheet();
      return jsonResponse({
        success: true,
        scriptVersion: SCRIPT_VERSION,
        message: 'Kết nối Google Apps Script v3 (10 Tab Sheets) thành công!',
        spreadsheetId: ssPing.getId(),
        spreadsheetUrl: ssPing.getUrl(),
        spreadsheetName: ssPing.getName()
      });
    }

    if (action === 'PULL_ALL') {
      return handlePullAll();
    }

    if (action === 'REGISTER_ACCOUNT') {
      return handleRegisterAccount(payload);
    }

    if (action === 'UPDATE_ACCOUNT') {
      return handleUpdateAccount(payload);
    }

    if (action === 'UPLOAD_DRIVE_DOC') {
      var rootFolderPath = payload.driveFolder || 'QUAN_LY_THUOC_TRUNG_TAM/2026';
      var targetFolder = getOrCreateNestedFolder(rootFolderPath);
      var content = payload.content || '';
      var mimeType = payload.mimeType || 'text/html';
      var fileName = payload.fileName || ('ChungTu_' + new Date().getTime() + '.html');

      var existingFiles = targetFolder.getFilesByName(fileName);
      var file;
      if (existingFiles.hasNext()) {
        file = existingFiles.next();
        file.setContent(content);
      } else {
        file = targetFolder.createFile(fileName, content, mimeType);
      }

      return jsonResponse({
        success: true,
        scriptVersion: SCRIPT_VERSION,
        fileId: file.getId(),
        webViewLink: file.getUrl(),
        driveFolder: rootFolderPath,
        fileName: file.getName()
      });
    }

    return handleSyncAll(payload);
  } catch (err) {
    return jsonResponse({
      success: false,
      scriptVersion: SCRIPT_VERSION,
      error: err && err.message ? err.message : String(err)
    });
  }
}

function normalizePhoneGas(phone) {
  return String(phone || '').replace(/[\s.'-]/g, '').trim();
}

function ensureAccountSheet(ss) {
  var sheet = ss.getSheetByName('Tài khoản');
  if (!sheet) {
    sheet = ss.insertSheet('Tài khoản');
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, ACCOUNT_HEADERS.length).setValues([ACCOUNT_HEADERS]);
    styleSheetHeader(sheet, ACCOUNT_HEADERS.length);
  }
  return sheet;
}

function styleSheetHeader(sheet, colCount) {
  var headerRange = sheet.getRange(1, 1, 1, colCount);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#0F766E');
  headerRange.setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);
}

function handleRegisterAccount(payload) {
  var user = payload.user;
  if (!user || !user.id || !user.email) {
    return jsonResponse({
      success: false,
      scriptVersion: SCRIPT_VERSION,
      error: 'Thiếu thông tin tài khoản đăng ký.'
    });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ensureAccountSheet(ss);
    var lastRow = sheet.getLastRow();
    var lastCol = Math.max(sheet.getLastColumn(), ACCOUNT_HEADERS.length);

    var cleanEmail = String(user.email || '').trim().toLowerCase();
    var cleanPhone = normalizePhoneGas(user.phone);

    if (lastRow >= 2) {
      var existingValues = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
      for (var i = 0; i < existingValues.length; i++) {
        var r = existingValues[i];
        var rowEmail = String(r[3] || '').replace(/^'/, '').trim().toLowerCase();
        var rowPhone = normalizePhoneGas(r[5]);
        if (rowEmail && rowEmail === cleanEmail) {
          return jsonResponse({
            success: false,
            duplicate: true,
            code: 'DUPLICATE_ACCOUNT',
            scriptVersion: SCRIPT_VERSION,
            error: 'Email này đã được đăng ký trong Google Sheets (tab Tài khoản).'
          });
        }
        if (cleanPhone && rowPhone && rowPhone === cleanPhone) {
          return jsonResponse({
            success: false,
            duplicate: true,
            code: 'DUPLICATE_ACCOUNT',
            scriptVersion: SCRIPT_VERSION,
            error: 'Số điện thoại này đã được đăng ký trong Google Sheets (tab Tài khoản).'
          });
        }
      }
    }

    var nextStt = Math.max(1, lastRow);
    var targetRow = lastRow + 1;
    var rowData = [
      nextStt,
      String(user.id || ''),
      String(user.fullName || ''),
      String(user.email || '').trim(),
      String(user.password || '123'),
      String(user.phone || '').trim(),
      String(user.department || 'Phòng Y tế - Phục hồi chức năng'),
      String(user.role || 'DOCTOR'),
      String(user.status || 'PENDING_APPROVAL'),
      String(user.createdAt || ''),
      String(user.approvedAt || ''),
      String(user.approvedBy || '')
    ];

    sheet.getRange(targetRow, 5, 1, 2).setNumberFormat('@');
    sheet.getRange(targetRow, 1, 1, ACCOUNT_HEADERS.length).setValues([rowData]);
    SpreadsheetApp.flush();

    return jsonResponse({
      success: true,
      scriptVersion: SCRIPT_VERSION,
      spreadsheetId: ss.getId(),
      spreadsheetUrl: ss.getUrl(),
      accountCount: Math.max(1, sheet.getLastRow() - 1),
      timestamp: Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'HH:mm:ss dd/MM/yyyy')
    });
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateAccount(payload) {
  var user = payload.user;
  if (!user || (!user.id && !user.email)) {
    return jsonResponse({
      success: false,
      scriptVersion: SCRIPT_VERSION,
      error: 'Thiếu thông tin tài khoản cần cập nhật.'
    });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ensureAccountSheet(ss);
    var lastRow = sheet.getLastRow();
    var lastCol = Math.max(sheet.getLastColumn(), ACCOUNT_HEADERS.length);
    var cleanId = String(user.id || '').trim();
    var cleanEmail = String(user.email || '').trim().toLowerCase();

    var foundRowIdx = -1;
    var existingStt = Math.max(1, lastRow);

    if (lastRow >= 2) {
      var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
      for (var i = 0; i < values.length; i++) {
        var rId = String(values[i][1] || '').trim();
        var rEmail = String(values[i][3] || '').replace(/^'/, '').trim().toLowerCase();
        if ((cleanId && rId === cleanId) || (cleanEmail && rEmail === cleanEmail)) {
          foundRowIdx = i + 2;
          existingStt = values[i][0] || (i + 1);
          break;
        }
      }
    }

    var targetRow = foundRowIdx > 0 ? foundRowIdx : lastRow + 1;
    var rowData = [
      existingStt,
      String(user.id || ''),
      String(user.fullName || ''),
      String(user.email || '').trim(),
      String(user.password || '123'),
      String(user.phone || '').trim(),
      String(user.department || 'Phòng Y tế - Phục hồi chức năng'),
      String(user.role || 'DOCTOR'),
      String(user.status || 'ACTIVE'),
      String(user.createdAt || ''),
      String(user.approvedAt || ''),
      String(user.approvedBy || '')
    ];

    sheet.getRange(targetRow, 5, 1, 2).setNumberFormat('@');
    sheet.getRange(targetRow, 1, 1, ACCOUNT_HEADERS.length).setValues([rowData]);
    SpreadsheetApp.flush();

    return jsonResponse({
      success: true,
      scriptVersion: SCRIPT_VERSION,
      spreadsheetId: ss.getId(),
      spreadsheetUrl: ss.getUrl(),
      accountCount: Math.max(1, sheet.getLastRow() - 1),
      timestamp: Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'HH:mm:ss dd/MM/yyyy')
    });
  } finally {
    lock.releaseLock();
  }
}

function handleSyncAll(payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetsData = payload.sheets || {};
    var counts = { receipts: 0, issues: 0, reports: 0, accounts: 0 };

    ALL_TEN_TABS.forEach(function (name) {
      var rows2D = sheetsData[name];
      if (!rows2D || !Array.isArray(rows2D) || rows2D.length === 0) {
        return;
      }

      var sheet = ss.getSheetByName(name);
      if (!sheet) {
        sheet = ss.insertSheet(name);
      }

      // Chống ghi đè tài khoản PENDING_APPROVAL vừa được đăng ký từ máy khác
      if (name === 'Tài khoản' && !payload.forceReplaceAccounts && sheet.getLastRow() >= 2) {
        var existingLastCol = Math.max(sheet.getLastColumn(), ACCOUNT_HEADERS.length);
        var existingRows = sheet.getRange(2, 1, sheet.getLastRow() - 1, existingLastCol).getValues();
        var seenIds = {};
        var seenEmails = {};
        for (var i = 1; i < rows2D.length; i++) {
          var inId = String(rows2D[i][1] || '').trim();
          var inEmail = String(rows2D[i][3] || '').trim().toLowerCase();
          if (inId) seenIds[inId] = true;
          if (inEmail) seenEmails[inEmail] = true;
        }
        existingRows.forEach(function (er) {
          var erId = String(er[1] || '').trim();
          var erEmail = String(er[3] || '').replace(/^'/, '').trim().toLowerCase();
          var erStatus = String(er[8] || '').trim().toUpperCase();
          if (erStatus === 'PENDING_APPROVAL' && erEmail && !seenIds[erId] && !seenEmails[erEmail]) {
            var nextStt = rows2D.length;
            rows2D.push([
              nextStt,
              erId,
              String(er[2] || ''),
              String(er[3] || ''),
              String(er[4] || '123'),
              String(er[5] || ''),
              String(er[6] || ''),
              String(er[7] || 'DOCTOR'),
              'PENDING_APPROVAL',
              String(er[9] || ''),
              String(er[10] || ''),
              String(er[11] || '')
            ]);
            seenIds[erId] = true;
            seenEmails[erEmail] = true;
          }
        });
      }

      sheet.clearContents();

      if (rows2D[0] && rows2D[0].length > 0) {
        if (name === 'Tài khoản' && rows2D.length > 1) {
          sheet.getRange(2, 5, rows2D.length - 1, 2).setNumberFormat('@');
        }
        if (name === 'DoiTuong' && rows2D.length > 1 && rows2D[0].length >= 7) {
          sheet.getRange(2, 6, rows2D.length - 1, 2).setNumberFormat('@');
        }
        sheet.getRange(1, 1, rows2D.length, rows2D[0].length).setValues(rows2D);
        styleSheetHeader(sheet, rows2D[0].length);
        try {
          sheet.autoResizeColumns(1, Math.min(rows2D[0].length, 16));
        } catch (resizeErr) {
          // Bỏ qua lỗi auto-resize
        }
      }

      var dataCount = Math.max(0, rows2D.length - 1);
      if (name === 'Phiếu nhập') counts.receipts = dataCount;
      if (name === 'Phiếu xuất') counts.issues = dataCount;
      if (name === 'Báo cáo') counts.reports = dataCount;
      if (name === 'Tài khoản') counts.accounts = dataCount;
    });

    SpreadsheetApp.flush();

    return jsonResponse({
      success: true,
      scriptVersion: SCRIPT_VERSION,
      spreadsheetId: ss.getId(),
      spreadsheetUrl: ss.getUrl(),
      rowCounts: counts,
      timestamp: Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'HH:mm:ss dd/MM/yyyy')
    });
  } finally {
    lock.releaseLock();
  }
}

function handlePullAll() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tables = {};
  var isInitialized = false;

  DATA_PULL_TABS.forEach(function (tabName) {
    var sheet = ss.getSheetByName(tabName);
    if (sheet && sheet.getLastRow() > 0 && sheet.getLastColumn() > 0) {
      var vals = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
      tables[tabName] = vals;
      if (vals.length >= 2) {
        isInitialized = true;
      }
    } else {
      tables[tabName] = [];
    }
  });

  return jsonResponse({
    success: true,
    scriptVersion: SCRIPT_VERSION,
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    isSheetInitialized: isInitialized,
    accountRows: tables['Tài khoản'] || [],
    tables: tables,
    timestamp: Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'HH:mm:ss dd/MM/yyyy')
  });
}

function getOrCreateNestedFolder(pathStr) {
  var parts = String(pathStr || 'QUAN_LY_THUOC_TRUNG_TAM').split('/').filter(function (p) {
    return p && p.trim().length > 0;
  });
  var parent = DriveApp.getRootFolder();
  parts.forEach(function (folderName) {
    var iter = parent.getFoldersByName(folderName.trim());
    if (iter.hasNext()) {
      parent = iter.next();
    } else {
      parent = parent.createFolder(folderName.trim());
    }
  });
  return parent;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
`;

export interface AppsScriptPingResult {
  success: boolean;
  scriptVersion?: number;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  spreadsheetName?: string;
  message?: string;
  error?: string;
}

export interface AppsScriptSyncResult {
  success: boolean;
  scriptVersion?: number;
  spreadsheetId: string;
  spreadsheetUrl: string;
  timestamp: string;
  driveStateFileId?: string;
  driveStateWebViewLink?: string;
  rowCounts: {
    receipts: number;
    issues: number;
    reports: number;
    accounts: number;
  };
  error?: string;
}

export interface AppsScriptPullResult {
  success: boolean;
  scriptVersion?: number;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  timestamp?: string;
  isSheetInitialized?: boolean;
  accountRows?: any[][];
  tables?: Record<string, any[][]>;
  error?: string;
}

export interface AppsScriptDriveUploadResult {
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  driveFolder?: string;
  fileName?: string;
  error?: string;
}

export const isValidAppsScriptUrl = (url: string): boolean => {
  const clean = (url || '').trim();
  return /^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec/.test(clean);
};

class AppsScriptError extends Error {
  duplicate?: boolean;
  code?: string;
  constructor(message: string, opts?: { duplicate?: boolean; code?: string }) {
    super(message);
    this.duplicate = opts?.duplicate;
    this.code = opts?.code;
  }
}

export const isDuplicateAccountError = (err: any): boolean =>
  Boolean(err?.duplicate || err?.code === 'DUPLICATE_ACCOUNT');

/**
 * Send payload to Google Apps Script Web App via server-side proxy (no CORS/302 block),
 * with automatic fallback to direct simple CORS POST when running on static-only hosts.
 */
const postToAppsScript = async (appsScriptUrl: string, payload: Record<string, any>): Promise<any> => {
  const cleanUrl = appsScriptUrl.trim();
  if (!isValidAppsScriptUrl(cleanUrl)) {
    throw new AppsScriptError(
      'URL Apps Script không hợp lệ. URL chuẩn phải có dạng https://script.google.com/macros/s/.../exec'
    );
  }

  // 1. Prefer server-side proxy route (/api/apps-script-proxy) to eliminate browser 302/CORS issues
  if (typeof window !== 'undefined' && window.location?.origin) {
    try {
      const proxyRes = await fetch('/api/apps-script-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appsScriptUrl: cleanUrl,
          payload,
        }),
      });

      const contentType = proxyRes.headers.get('content-type') || '';
      if (proxyRes.status !== 404 && contentType.includes('application/json')) {
        const proxyJson = await proxyRes.json();
        if (proxyRes.ok && proxyJson?.success) {
          return proxyJson.data;
        }
        throw new AppsScriptError(
          proxyJson?.error || `Lỗi kết nối Apps Script (${proxyRes.status}).`,
          { duplicate: Boolean(proxyJson?.duplicate), code: proxyJson?.code }
        );
      }
    } catch (proxyErr: any) {
      if (proxyErr instanceof AppsScriptError) throw proxyErr;
      if (proxyErr?.message && !/Failed to fetch|NetworkError|Unexpected token/i.test(proxyErr.message)) {
        throw proxyErr;
      }
    }
  }

  // 2. Fallback: Direct simple CORS POST (text/plain)
  const res = await fetch(cleanUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    if (parsed && parsed.success === false) {
      throw new AppsScriptError(parsed.error || 'Apps Script trả về lỗi thực thi.', {
        duplicate: Boolean(parsed.duplicate),
        code: parsed.code,
      });
    }
    return parsed;
  } catch (e: any) {
    if (e instanceof AppsScriptError) throw e;
    if (!res.ok) {
      throw new AppsScriptError(`Lỗi kết nối Apps Script (${res.status}): ${text.slice(0, 200)}`);
    }
    if (text.includes('ServiceLogin') || text.includes('accounts.google.com')) {
      throw new AppsScriptError(
        'Apps Script đang yêu cầu đăng nhập. Vui lòng triển khai lại với quyền "Who has access: Anyone (Bất kỳ ai)".'
      );
    }
    throw new AppsScriptError(`Phản hồi từ Apps Script không đúng định dạng JSON: ${e?.message || text.slice(0, 120)}`);
  }
};

export const testAppsScriptConnection = async (appsScriptUrl: string): Promise<AppsScriptPingResult> => {
  try {
    const data = await postToAppsScript(appsScriptUrl, { action: 'PING' });
    const scriptVersion = typeof data.scriptVersion === 'number' ? data.scriptVersion : 1;
    return {
      success: true,
      scriptVersion,
      spreadsheetId: data.spreadsheetId,
      spreadsheetUrl: data.spreadsheetUrl,
      spreadsheetName: data.spreadsheetName,
      message:
        scriptVersion < APPS_SCRIPT_REQUIRED_VERSION
          ? `Kết nối được "${data.spreadsheetName || 'Google Sheets'}", nhưng Code.gs đang là phiên bản cũ (v${scriptVersion}). Admin cần dán Code.gs v3 mới và Triển khai phiên bản mới để đồng bộ 10 tab & tài khoản!`
          : data.message || 'Kết nối Google Apps Script v3 (10 Tab Google Sheets) thành công!',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Không thể kết nối tới Google Apps Script Web App.',
    };
  }
};

export const syncAllDataViaAppsScript = async (
  appsScriptUrl: string,
  params: {
    beneficiaries: Beneficiary[];
    receipts: StockReceipt[];
    issues: StockIssue[];
    medicines: Medicine[];
    prescriptions: Prescription[];
    transactions: StockTransaction[];
    auditLogs: AuditLog[];
    syncedFiles?: DriveSyncedFile[];
    templateSettings: TemplateSettings;
    users: User[];
    forceReplaceAccounts?: boolean;
  }
): Promise<AppsScriptSyncResult> => {
  const sheets = buildAllTenSheets2D(params);

  const data = await postToAppsScript(appsScriptUrl, {
    action: 'SYNC_ALL',
    agencyName: params.templateSettings.agencyName,
    qhnsCode: params.templateSettings.qhnsCode,
    forceReplaceAccounts: Boolean(params.forceReplaceAccounts),
    sheets,
  });

  const scriptVersion = typeof data.scriptVersion === 'number' ? data.scriptVersion : 1;
  const now = new Date();
  const fallbackTs = `${now.toLocaleTimeString('vi-VN')} ${now.toLocaleDateString('vi-VN')}`;

  return {
    success: true,
    scriptVersion,
    spreadsheetId: data.spreadsheetId || params.templateSettings.googleSpreadsheetId || '',
    spreadsheetUrl: data.spreadsheetUrl || params.templateSettings.googleSheetUrl || '',
    timestamp: data.timestamp || fallbackTs,
    rowCounts: data.rowCounts || {
      receipts: Math.max(0, (sheets['Phiếu nhập']?.length || 1) - 1),
      issues: Math.max(0, (sheets['Phiếu xuất']?.length || 1) - 1),
      reports: Math.max(0, (sheets['Báo cáo']?.length || 1) - 1),
      accounts: Math.max(0, (sheets['Tài khoản']?.length || 1) - 1),
    },
  };
};

/**
 * Atomic registration directly onto tab "Tài khoản" with LockService & duplicate checking.
 * Automatically falls back cleanly if the spreadsheet is still on legacy Code.gs.
 */
export const registerAccountViaAppsScript = async (
  appsScriptUrl: string,
  user: User,
  templateSettings: TemplateSettings,
  fallbackAllUsers: User[]
): Promise<AppsScriptSyncResult> => {
  const data = await postToAppsScript(appsScriptUrl, {
    action: 'REGISTER_ACCOUNT',
    user,
  });

  const now = new Date();
  const fallbackTs = `${now.toLocaleTimeString('vi-VN')} ${now.toLocaleDateString('vi-VN')}`;

  // Detect legacy Code.gs where unhandled actions fall through to SYNC_ALL and ignore user creation
  if (typeof data.scriptVersion !== 'number' || data.scriptVersion < APPS_SCRIPT_REQUIRED_VERSION) {
    return syncAccountSheetViaAppsScript(appsScriptUrl, fallbackAllUsers, templateSettings);
  }

  return {
    success: true,
    scriptVersion: data.scriptVersion,
    spreadsheetId: data.spreadsheetId || templateSettings.googleSpreadsheetId || '',
    spreadsheetUrl: data.spreadsheetUrl || templateSettings.googleSheetUrl || '',
    timestamp: data.timestamp || fallbackTs,
    rowCounts: {
      receipts: 0,
      issues: 0,
      reports: 0,
      accounts: typeof data.accountCount === 'number' ? data.accountCount : fallbackAllUsers.length,
    },
  };
};

/**
 * Atomic single-user update (approve, reject, role, lock, edit) directly on tab "Tài khoản".
 */
export const updateAccountViaAppsScript = async (
  appsScriptUrl: string,
  user: User,
  templateSettings: TemplateSettings,
  fallbackAllUsers: User[]
): Promise<AppsScriptSyncResult> => {
  const data = await postToAppsScript(appsScriptUrl, {
    action: 'UPDATE_ACCOUNT',
    user,
  });

  const now = new Date();
  const fallbackTs = `${now.toLocaleTimeString('vi-VN')} ${now.toLocaleDateString('vi-VN')}`;

  if (typeof data.scriptVersion !== 'number' || data.scriptVersion < APPS_SCRIPT_REQUIRED_VERSION) {
    return syncAccountSheetViaAppsScript(appsScriptUrl, fallbackAllUsers, templateSettings, true);
  }

  return {
    success: true,
    scriptVersion: data.scriptVersion,
    spreadsheetId: data.spreadsheetId || templateSettings.googleSpreadsheetId || '',
    spreadsheetUrl: data.spreadsheetUrl || templateSettings.googleSheetUrl || '',
    timestamp: data.timestamp || fallbackTs,
    rowCounts: {
      receipts: 0,
      issues: 0,
      reports: 0,
      accounts: typeof data.accountCount === 'number' ? data.accountCount : fallbackAllUsers.length,
    },
  };
};

/**
 * Sync ONLY tab "Tài khoản" via Apps Script.
 */
export const syncAccountSheetViaAppsScript = async (
  appsScriptUrl: string,
  users: User[],
  templateSettings: TemplateSettings,
  forceReplaceAccounts = false
): Promise<AppsScriptSyncResult> => {
  const { buildUsersAccountSheetRows, rowsWithHeadersTo2D } = await import('../utils/googleSheetsBackup');
  const accountRows = buildUsersAccountSheetRows(users);
  const headers = [
    'STT',
    'ID tài khoản',
    'Họ và tên',
    'Email đăng nhập',
    'Mật khẩu',
    'Số điện thoại',
    'Phòng ban / Đơn vị',
    'Vai trò',
    'Trạng thái',
    'Ngày tạo',
    'Ngày duyệt',
    'Người duyệt',
  ];
  const accountValues = rowsWithHeadersTo2D(headers, accountRows);

  const data = await postToAppsScript(appsScriptUrl, {
    action: 'SYNC_ALL',
    agencyName: templateSettings.agencyName,
    qhnsCode: templateSettings.qhnsCode,
    forceReplaceAccounts,
    sheets: {
      'Tài khoản': accountValues,
    },
  });

  if (data?.rowCounts && typeof data.rowCounts.accounts !== 'number') {
    throw new AppsScriptError(
      'Google Apps Script đang chạy phiên bản cũ (chưa hỗ trợ tab "Tài khoản"). Admin vui lòng cập nhật Code.gs v3 mới và Triển khai phiên bản mới.'
    );
  }

  const now = new Date();
  const fallbackTs = `${now.toLocaleTimeString('vi-VN')} ${now.toLocaleDateString('vi-VN')}`;

  return {
    success: true,
    scriptVersion: typeof data.scriptVersion === 'number' ? data.scriptVersion : 2,
    spreadsheetId: data.spreadsheetId || templateSettings.googleSpreadsheetId || '',
    spreadsheetUrl: data.spreadsheetUrl || templateSettings.googleSheetUrl || '',
    timestamp: data.timestamp || fallbackTs,
    rowCounts: data.rowCounts || {
      receipts: 0,
      issues: 0,
      reports: 0,
      accounts: Math.max(0, accountValues.length - 1),
    },
  };
};

export const pullAllDataViaAppsScript = async (
  appsScriptUrl: string
): Promise<AppsScriptPullResult> => {
  try {
    const data = await postToAppsScript(appsScriptUrl, {
      action: 'PULL_ALL',
    });

    const scriptVersion = typeof data.scriptVersion === 'number' ? data.scriptVersion : 1;
    const tables: Record<string, any[][]> =
      data.tables && typeof data.tables === 'object' ? data.tables : {};
    if (!tables['Tài khoản'] && Array.isArray(data.accountRows)) {
      tables['Tài khoản'] = data.accountRows;
    }

    const accountRows = Array.isArray(tables['Tài khoản'])
      ? tables['Tài khoản']
      : Array.isArray(data.accountRows)
      ? data.accountRows
      : [];

    const hasSystemTables = TEN_SHEET_NAMES.some((t) => {
      if (t === 'Phiếu nhập' || t === 'Phiếu xuất' || t === 'Báo cáo') return false;
      const rows = tables[t];
      return Array.isArray(rows) && rows.length >= 2;
    });

    const isSheetInitialized =
      typeof data.isSheetInitialized === 'boolean'
        ? data.isSheetInitialized
        : accountRows.length >= 2 || hasSystemTables;

    return {
      success: true,
      scriptVersion,
      spreadsheetId: data.spreadsheetId,
      spreadsheetUrl: data.spreadsheetUrl,
      timestamp: data.timestamp,
      isSheetInitialized,
      accountRows,
      tables,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Không thể kéo dữ liệu hai chiều từ Google Sheets.',
    };
  }
};

export const uploadDocumentViaAppsScript = async (
  appsScriptUrl: string,
  driveFolder: string,
  fileName: string,
  content: string,
  mimeType = 'text/html'
): Promise<AppsScriptDriveUploadResult> => {
  try {
    const data = await postToAppsScript(appsScriptUrl, {
      action: 'UPLOAD_DRIVE_DOC',
      driveFolder,
      fileName,
      content,
      mimeType,
    });

    return {
      success: true,
      fileId: data.fileId,
      webViewLink: data.webViewLink,
      driveFolder: data.driveFolder || driveFolder,
      fileName: data.fileName || fileName,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Lỗi lưu tài liệu lên Google Drive qua Apps Script.',
    };
  }
};
