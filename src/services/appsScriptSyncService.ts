/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Beneficiary, StockReceipt, StockIssue, Medicine, StockTransaction, TemplateSettings } from '../types';
import { buildThreeSheetsBeneficiaryData } from '../utils/googleSheetsBackup';

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * GOOGLE APPS SCRIPT BRIDGE - HỆ THỐNG QUẢN LÝ DƯỢC TT BTXH ĐÀ NẴNG
 * Hướng dẫn cài đặt:
 * 1. Mở tệp Google Sheets của đơn vị -> Chọn Tiện ích mở rộng (Extensions) -> Apps Script.
 * 2. Xóa mã mặc định và dán toàn bộ đoạn mã này vào, sau đó bấm Lưu (Ctrl + S).
 * 3. Chọn Triển khai (Deploy) -> Tùy chọn triển khai mới (New deployment) -> Loại: Ứng dụng web (Web app).
 *    - Thực thi dưới dạng (Execute as): Tôi (Me)
 *    - Người có quyền truy cập (Who has access): Bất kỳ ai (Anyone)
 * 4. Sao chép URL Ứng dụng web (https://script.google.com/macros/s/.../exec) dán vào phần Cấu hình đồng bộ của hệ thống.
 */

function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    var payload = JSON.parse(raw);

    if (payload.action === 'PING') {
      var ssPing = SpreadsheetApp.getActiveSpreadsheet();
      return jsonResponse({
        success: true,
        message: 'Kết nối Google Apps Script thành công!',
        spreadsheetId: ssPing.getId(),
        spreadsheetUrl: ssPing.getUrl(),
        spreadsheetName: ssPing.getName()
      });
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

    // Mặc định: Đồng bộ toàn bộ 03 Sheet (Phiếu nhập, Phiếu xuất, Báo cáo)
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetsData = payload.sheets || {};
    var sheetNames = ['Phiếu nhập', 'Phiếu xuất', 'Báo cáo'];
    var counts = { receipts: 0, issues: 0, reports: 0 };

    sheetNames.forEach(function (name) {
      var rows2D = sheetsData[name] || [];
      var sheet = ss.getSheetByName(name);
      if (!sheet) {
        sheet = ss.insertSheet(name);
      } else {
        sheet.clearContents();
      }

      if (rows2D.length > 0 && rows2D[0].length > 0) {
        sheet.getRange(1, 1, rows2D.length, rows2D[0].length).setValues(rows2D);
        // Định dạng hàng tiêu đề chuẩn hành chính
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
    });

    return jsonResponse({
      success: true,
      spreadsheetId: ss.getId(),
      spreadsheetUrl: ss.getUrl(),
      rowCounts: counts,
      timestamp: Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'HH:mm:ss dd/MM/yyyy')
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err && err.message ? err.message : String(err)
    });
  }
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
  rowCounts: {
    receipts: number;
    issues: number;
    reports: number;
  };
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
 * Send simple CORS POST (text/plain) to Google Apps Script Web App to avoid CORS preflight OPTIONS failure
 */
const postToAppsScript = async (appsScriptUrl: string, payload: Record<string, any>): Promise<any> => {
  const cleanUrl = appsScriptUrl.trim();
  if (!isValidAppsScriptUrl(cleanUrl)) {
    throw new Error(
      'URL Apps Script không hợp lệ. URL chuẩn phải có dạng https://script.google.com/macros/s/.../exec'
    );
  }

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
  templateSettings: TemplateSettings
): Promise<AppsScriptSyncResult> => {
  const { receiptSheetRows, issueSheetRows, reportSheetRows } = buildThreeSheetsBeneficiaryData(
    beneficiaries,
    receipts,
    issues,
    medicines,
    transactions
  );

  const receiptValues = jsonTo2DArray(receiptSheetRows);
  const issueValues = jsonTo2DArray(issueSheetRows);
  const reportValues = jsonTo2DArray(reportSheetRows);

  const data = await postToAppsScript(appsScriptUrl, {
    action: 'SYNC_SHEETS',
    agencyName: templateSettings.agencyName,
    qhnsCode: templateSettings.qhnsCode,
    sheets: {
      'Phiếu nhập': receiptValues,
      'Phiếu xuất': issueValues,
      'Báo cáo': reportValues,
    },
  });

  const now = new Date();
  const fallbackTs = `${now.toLocaleTimeString('vi-VN')} ${now.toLocaleDateString('vi-VN')}`;

  return {
    success: true,
    spreadsheetId: data.spreadsheetId || templateSettings.googleSpreadsheetId || '',
    spreadsheetUrl: data.spreadsheetUrl || templateSettings.googleSheetUrl || '',
    timestamp: data.timestamp || fallbackTs,
    rowCounts: data.rowCounts || {
      receipts: Math.max(0, receiptValues.length - 1),
      issues: Math.max(0, issueValues.length - 1),
      reports: Math.max(0, reportValues.length - 1),
    },
  };
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
