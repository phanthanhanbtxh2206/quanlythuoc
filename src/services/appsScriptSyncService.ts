/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Beneficiary,
  StockReceipt,
  StockIssue,
  Medicine,
  StockTransaction,
  TemplateSettings,
  User,
  CloudStateSnapshot,
} from '../types';
import { buildFourSheetsData } from '../utils/googleSheetsBackup';

export const DRIVE_STATE_FILENAME = 'btxh_pharmacy_state.json';

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * GOOGLE APPS SCRIPT BRIDGE HAI CHIỀU - SỞ Y TẾ TP ĐÀ NẴNG
 * TRUNG TÂM BẢO TRỢ XÃ HỘI ĐÀ NẴNG - KHO DƯỢC (QHNS: 1041008)
 *
 * Hướng dẫn cài đặt:
 * 1. Mở tệp Google Sheets của đơn vị -> Tiện ích mở rộng (Extensions) -> Apps Script.
 * 2. Xóa mã mặc định và dán toàn bộ đoạn mã này vào, sau đó bấm Lưu (Ctrl + S).
 * 3. Chọn Triển khai (Deploy) -> Quản lý các bản triển khai / Triển khai mới -> Loại: Ứng dụng web (Web app).
 *    - Thực thi dưới dạng (Execute as): Tôi (Me)
 *    - Người có quyền truy cập (Who has access): Bất kỳ ai (Anyone)
 * 4. Sao chép URL Ứng dụng web (https://script.google.com/macros/s/.../exec) dán vào Cấu hình đồng bộ của hệ thống.
 */

var STATE_FILE_NAME = 'btxh_pharmacy_state.json';

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action) : 'PULL_ALL';
    var driveFolder = (e && e.parameter && e.parameter.driveFolder) ? String(e.parameter.driveFolder) : 'QUAN_LY_THUOC_TRUNG_TAM/2026';

    if (action === 'PING') {
      var ssPing = SpreadsheetApp.getActiveSpreadsheet();
      return jsonResponse({
        success: true,
        message: 'Kết nối hai chiều Google Apps Script thành công!',
        spreadsheetId: ssPing.getId(),
        spreadsheetUrl: ssPing.getUrl(),
        spreadsheetName: ssPing.getName()
      });
    }

    return handlePullAll(driveFolder);
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err && err.message ? err.message : String(err)
    });
  }
}

function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    var payload = JSON.parse(raw);

    if (payload.action === 'PING') {
      var ssPing = SpreadsheetApp.getActiveSpreadsheet();
      return jsonResponse({
        success: true,
        message: 'Kết nối hai chiều Google Apps Script thành công!',
        spreadsheetId: ssPing.getId(),
        spreadsheetUrl: ssPing.getUrl(),
        spreadsheetName: ssPing.getName()
      });
    }

    if (payload.action === 'PULL_ALL') {
      return handlePullAll(payload.driveFolder || 'QUAN_LY_THUOC_TRUNG_TAM/2026');
    }

    if (payload.action === 'UPLOAD_DRIVE_DOC') {
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
        fileId: file.getId(),
        webViewLink: file.getUrl(),
        driveFolder: rootFolderPath,
        fileName: file.getName()
      });
    }

    // Đồng bộ hai chiều lên 04 Sheet (Phiếu nhập, Phiếu xuất, Báo cáo, Tài khoản) + JSON snapshot trên Drive
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetsData = payload.sheets || {};
    var sheetNames = ['Phiếu nhập', 'Phiếu xuất', 'Báo cáo', 'Tài khoản'];
    var counts = { receipts: 0, issues: 0, reports: 0, accounts: 0 };

    sheetNames.forEach(function (name) {
      var rows2D = sheetsData[name];
      if (!rows2D || !Array.isArray(rows2D) || rows2D.length === 0) {
        return;
      }
      var sheet = ss.getSheetByName(name);
      if (!sheet) {
        sheet = ss.insertSheet(name);
      } else {
        sheet.clearContents();
      }

      if (rows2D[0] && rows2D[0].length > 0) {
        sheet.getRange(1, 1, rows2D.length, rows2D[0].length).setValues(rows2D);
        var headerRange = sheet.getRange(1, 1, 1, rows2D[0].length);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#0F766E');
        headerRange.setFontColor('#FFFFFF');
        sheet.setFrozenRows(1);
        sheet.autoResizeColumns(1, rows2D[0].length);
      }

      var dataCount = Math.max(0, rows2D.length - 1);
      if (name === 'Phiếu nhập') counts.receipts = dataCount;
      if (name === 'Phiếu xuất') counts.issues = dataCount;
      if (name === 'Báo cáo') counts.reports = dataCount;
      if (name === 'Tài khoản') counts.accounts = dataCount;
    });

    // Lưu hoặc cập nhật bản chụp JSON đầy đủ trên Google Drive để phục hồi & đồng bộ đa thiết bị
    var driveStateFileId = '';
    var driveStateWebViewLink = '';
    if (payload.stateJson) {
      try {
        var driveFolder = payload.driveFolder || 'QUAN_LY_THUOC_TRUNG_TAM/2026';
        var folder = getOrCreateNestedFolder(driveFolder);
        var stateStr = typeof payload.stateJson === 'string' ? payload.stateJson : JSON.stringify(payload.stateJson);
        var iter = folder.getFilesByName(STATE_FILE_NAME);
        var stateFile;
        if (iter.hasNext()) {
          stateFile = iter.next();
          stateFile.setContent(stateStr);
        } else {
          stateFile = folder.createFile(STATE_FILE_NAME, stateStr, 'application/json');
        }
        driveStateFileId = stateFile.getId();
        driveStateWebViewLink = stateFile.getUrl();
      } catch (driveWriteErr) {
        // Không làm gián đoạn việc ghi 4 trang tính Google Sheets nếu Drive chưa được cấp quyền
      }
    }

    return jsonResponse({
      success: true,
      spreadsheetId: ss.getId(),
      spreadsheetUrl: ss.getUrl(),
      rowCounts: counts,
      driveStateFileId: driveStateFileId,
      driveStateWebViewLink: driveStateWebViewLink,
      timestamp: Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'HH:mm:ss dd/MM/yyyy')
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err && err.message ? err.message : String(err)
    });
  }
}

function handlePullAll(driveFolder) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var accountSheet = ss.getSheetByName('Tài khoản');
  var accountRows = [];
  if (accountSheet && accountSheet.getLastRow() > 0 && accountSheet.getLastColumn() > 0) {
    accountRows = accountSheet.getRange(1, 1, accountSheet.getLastRow(), accountSheet.getLastColumn()).getValues();
  }

  var stateJson = null;
  var driveStateFileId = '';
  try {
    var folder = getOrCreateNestedFolder(driveFolder || 'QUAN_LY_THUOC_TRUNG_TAM/2026');
    var iter = folder.getFilesByName(STATE_FILE_NAME);
    if (iter.hasNext()) {
      var stateFile = iter.next();
      driveStateFileId = stateFile.getId();
      var rawState = stateFile.getBlob().getDataAsString('UTF-8');
      if (rawState) {
        stateJson = JSON.parse(rawState);
      }
    }
  } catch (driveErr) {
    // Bỏ qua nếu chưa có tệp JSON trên Drive
  }

  return jsonResponse({
    success: true,
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    accountRows: accountRows,
    stateJson: stateJson,
    driveStateFileId: driveStateFileId,
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
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  spreadsheetName?: string;
  message?: string;
  error?: string;
}

export interface AppsScriptSyncResult {
  success: boolean;
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
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  timestamp?: string;
  accountRows?: any[][];
  stateJson?: CloudStateSnapshot | null;
  driveStateFileId?: string;
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

const jsonTo2DArray = (rows: Record<string, any>[]): any[][] => {
  if (!rows || rows.length === 0) return [];
  const headers = Object.keys(rows[0]);
  const values = rows.map((r) =>
    headers.map((h) => {
      const v = r[h];
      return v !== undefined && v !== null ? v : '';
    })
  );
  return [headers, ...values];
};

export const isValidAppsScriptUrl = (url: string): boolean => {
  const clean = (url || '').trim();
  return /^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec/.test(clean);
};

/**
 * Send payload to Google Apps Script Web App via server-side proxy (no CORS/302 block),
 * with automatic fallback to direct simple CORS POST when running on static-only hosts.
 */
const postToAppsScript = async (appsScriptUrl: string, payload: Record<string, any>): Promise<any> => {
  const cleanUrl = appsScriptUrl.trim();
  if (!isValidAppsScriptUrl(cleanUrl)) {
    throw new Error(
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
        throw new Error(proxyJson?.error || `Lỗi kết nối Apps Script (${proxyRes.status}).`);
      }
    } catch (proxyErr: any) {
      // Only fall through to direct fetch when proxy endpoint is unavailable (e.g. GitHub Pages static build)
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
      throw new Error(parsed.error || 'Apps Script trả về lỗi thực thi.');
    }
    return parsed;
  } catch (e: any) {
    if (!res.ok) {
      throw new Error(`Lỗi kết nối Apps Script (${res.status}): ${text.slice(0, 200)}`);
    }
    if (text.includes('ServiceLogin') || text.includes('accounts.google.com')) {
      throw new Error(
        'Apps Script đang yêu cầu đăng nhập. Vui lòng triển khai lại với quyền "Who has access: Anyone (Bất kỳ ai)".'
      );
    }
    throw new Error(`Phản hồi từ Apps Script không đúng định dạng JSON: ${e?.message || text.slice(0, 120)}`);
  }
};

export const testAppsScriptConnection = async (appsScriptUrl: string): Promise<AppsScriptPingResult> => {
  try {
    const data = await postToAppsScript(appsScriptUrl, { action: 'PING' });
    return {
      success: true,
      spreadsheetId: data.spreadsheetId,
      spreadsheetUrl: data.spreadsheetUrl,
      spreadsheetName: data.spreadsheetName,
      message: data.message || 'Kết nối Google Apps Script thành công!',
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
  beneficiaries: Beneficiary[],
  receipts: StockReceipt[],
  issues: StockIssue[],
  medicines: Medicine[],
  transactions: StockTransaction[],
  templateSettings: TemplateSettings,
  users: User[] = [],
  stateSnapshot?: CloudStateSnapshot
): Promise<AppsScriptSyncResult> => {
  const { receiptSheetRows, issueSheetRows, reportSheetRows, accountSheetRows } = buildFourSheetsData(
    beneficiaries,
    receipts,
    issues,
    medicines,
    transactions,
    users
  );

  const receiptValues = jsonTo2DArray(receiptSheetRows);
  const issueValues = jsonTo2DArray(issueSheetRows);
  const reportValues = jsonTo2DArray(reportSheetRows);
  const accountValues = jsonTo2DArray(accountSheetRows);

  const data = await postToAppsScript(appsScriptUrl, {
    action: 'SYNC_ALL',
    agencyName: templateSettings.agencyName,
    qhnsCode: templateSettings.qhnsCode,
    driveFolder: templateSettings.googleDriveFolder || 'QUAN_LY_THUOC_TRUNG_TAM/2026',
    sheets: {
      'Phiếu nhập': receiptValues,
      'Phiếu xuất': issueValues,
      'Báo cáo': reportValues,
      'Tài khoản': accountValues,
    },
    stateJson: stateSnapshot || undefined,
  });

  const now = new Date();
  const fallbackTs = `${now.toLocaleTimeString('vi-VN')} ${now.toLocaleDateString('vi-VN')}`;

  return {
    success: true,
    spreadsheetId: data.spreadsheetId || templateSettings.googleSpreadsheetId || '',
    spreadsheetUrl: data.spreadsheetUrl || templateSettings.googleSheetUrl || '',
    timestamp: data.timestamp || fallbackTs,
    driveStateFileId: data.driveStateFileId,
    driveStateWebViewLink: data.driveStateWebViewLink,
    rowCounts: data.rowCounts || {
      receipts: Math.max(0, receiptValues.length - 1),
      issues: Math.max(0, issueValues.length - 1),
      reports: Math.max(0, reportValues.length - 1),
      accounts: Math.max(0, accountValues.length - 1),
    },
  };
};

/**
 * Sync ONLY tab "Tài khoản" (plus optional Drive JSON state) via Apps Script
 * so self-registration updates Google Sheets immediately without touching voucher/report sheets.
 */
export const syncAccountSheetViaAppsScript = async (
  appsScriptUrl: string,
  users: User[],
  templateSettings: TemplateSettings,
  stateSnapshot?: CloudStateSnapshot
): Promise<AppsScriptSyncResult> => {
  const { buildUsersAccountSheetRows } = await import('../utils/googleSheetsBackup');
  const accountValues = jsonTo2DArray(buildUsersAccountSheetRows(users));

  const data = await postToAppsScript(appsScriptUrl, {
    action: 'SYNC_ALL',
    agencyName: templateSettings.agencyName,
    qhnsCode: templateSettings.qhnsCode,
    driveFolder: templateSettings.googleDriveFolder || 'QUAN_LY_THUOC_TRUNG_TAM/2026',
    sheets: {
      'Tài khoản': accountValues,
    },
    stateJson: stateSnapshot || undefined,
  });

  if (data?.rowCounts && typeof data.rowCounts.accounts !== 'number') {
    throw new Error(
      'Google Apps Script đang chạy phiên bản cũ (chưa hỗ trợ tab "Tài khoản"). Admin vui lòng cập nhật mã Code.gs mới và Triển khai phiên bản mới.'
    );
  }

  const now = new Date();
  const fallbackTs = `${now.toLocaleTimeString('vi-VN')} ${now.toLocaleDateString('vi-VN')}`;

  return {
    success: true,
    spreadsheetId: data.spreadsheetId || templateSettings.googleSpreadsheetId || '',
    spreadsheetUrl: data.spreadsheetUrl || templateSettings.googleSheetUrl || '',
    timestamp: data.timestamp || fallbackTs,
    driveStateFileId: data.driveStateFileId,
    driveStateWebViewLink: data.driveStateWebViewLink,
    rowCounts: data.rowCounts || {
      receipts: 0,
      issues: 0,
      reports: 0,
      accounts: Math.max(0, accountValues.length - 1),
    },
  };
};

export const pullAllDataViaAppsScript = async (
  appsScriptUrl: string,
  driveFolder = 'QUAN_LY_THUOC_TRUNG_TAM/2026'
): Promise<AppsScriptPullResult> => {
  try {
    const data = await postToAppsScript(appsScriptUrl, {
      action: 'PULL_ALL',
      driveFolder,
    });

    return {
      success: true,
      spreadsheetId: data.spreadsheetId,
      spreadsheetUrl: data.spreadsheetUrl,
      timestamp: data.timestamp,
      accountRows: Array.isArray(data.accountRows) ? data.accountRows : [],
      stateJson: data.stateJson || null,
      driveStateFileId: data.driveStateFileId,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Không thể kéo dữ liệu hai chiều từ Google Sheets & Drive.',
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
