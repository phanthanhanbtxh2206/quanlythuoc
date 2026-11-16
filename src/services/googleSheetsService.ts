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
import {
  buildAllTenSheets2D,
  SIX_SYSTEM_SHEET_NAMES,
  TEN_SHEET_NAMES,
} from '../utils/googleSheetsBackup';

export interface GoogleSheetsSyncResult {
  success: boolean;
  spreadsheetId: string;
  spreadsheetUrl: string;
  timestamp: string;
  channel?: 'APPS_SCRIPT' | 'OAUTH';
  scriptVersion?: number;
  driveStateFileId?: string;
  driveStateWebViewLink?: string;
  rowCounts: {
    receipts: number;
    issues: number;
    reports: number;
    accounts?: number;
  };
  error?: string;
}

export const GOOGLE_SAMPLE_READONLY_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';

/**
 * Extract Spreadsheet ID from either a full Google Sheets URL or a bare ID string.
 */
export const extractSpreadsheetId = (urlOrId?: string): string => {
  const clean = (urlOrId || '').trim();
  if (!clean) return '';
  const match = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  if (/^[a-zA-Z0-9-_]{20,}$/.test(clean)) {
    return clean;
  }
  return '';
};

const translateSheetsApiError = (status: number, rawBody: string, context: string): string => {
  if (status === 401) {
    return `Phiên đăng nhập Google OAuth đã hết hạn hoặc bị thu hồi (401). Vui lòng bấm "Kết nối lại Google" hoặc dùng Google Apps Script v3 để đồng bộ liên tục mọi thiết bị.`;
  }
  if (status === 403) {
    return `Không có quyền ghi vào bảng tính này (403 - Giới hạn phạm vi drive.file). Với chế độ Google OAuth, ứng dụng chỉ ghi được bảng tính do chính ứng dụng tạo mới hoặc bảng tính đã gắn Google Apps Script Bridge. Hãy xóa link cũ để tạo bảng tính mới hoặc cài Apps Script URL.`;
  }
  if (status === 404) {
    return `Không tìm thấy Google Spreadsheet theo ID đã cấu hình (404). Hệ thống có thể tự tạo bảng tính mới nếu bạn xóa ID cũ.`;
  }
  return `${context} (${status}): ${rawBody.slice(0, 220)}`;
};

/**
 * Ensure the Google Spreadsheet exists and contains all 10 tabs.
 */
export const ensurePharmacySpreadsheet = async (
  accessToken: string,
  existingSpreadsheetId?: string,
  title?: string
): Promise<{ id: string; url: string; createdNew: boolean }> => {
  const defaultTitle =
    title || 'Sổ Quản Lý Dược Phẩm & Cấp Phát Thuốc - TTBTXH Đà Nẵng (10 Tab)';

  const candidateId = extractSpreadsheetId(existingSpreadsheetId);

  if (candidateId && candidateId !== GOOGLE_SAMPLE_READONLY_ID) {
    const checkRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${candidateId}?fields=spreadsheetId,properties.title,sheets.properties`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (checkRes.ok) {
      const meta = await checkRes.json();
      const existingSheetTitles: string[] = (meta.sheets || []).map(
        (s: any) => s.properties?.title
      );

      const missingSheets = TEN_SHEET_NAMES.filter((s) => !existingSheetTitles.includes(s));

      if (missingSheets.length > 0) {
        const addRequests = missingSheets.map((sheetTitle) => ({
          addSheet: {
            properties: {
              title: sheetTitle,
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
        }));

        const addRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${candidateId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ requests: addRequests }),
          }
        );

        if (!addRes.ok) {
          const errText = await addRes.text();
          throw new Error(
            translateSheetsApiError(addRes.status, errText, 'Lỗi thêm trang tính vào Google Sheets')
          );
        }
      }

      return {
        id: candidateId,
        url: `https://docs.google.com/spreadsheets/d/${candidateId}/edit`,
        createdNew: false,
      };
    }

    if (checkRes.status === 401) {
      const errText = await checkRes.text();
      throw new Error(translateSheetsApiError(401, errText, 'Lỗi xác thực Google'));
    }

    if (checkRes.status === 403) {
      console.warn('Spreadsheet bên ngoài trả về 403 với scope drive.file, đang tạo bảng tính thuộc quyền ứng dụng...');
    }
  }

  // Create a new Google Spreadsheet with all 10 tabs configured
  const createPayload = {
    properties: {
      title: defaultTitle,
    },
    sheets: TEN_SHEET_NAMES.map((sheetTitle) => ({
      properties: {
        title: sheetTitle,
        gridProperties: { frozenRowCount: 1 },
      },
    })),
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const errorDetails = await createRes.text();
    throw new Error(
      translateSheetsApiError(createRes.status, errorDetails, 'Lỗi tạo Google Spreadsheet mới')
    );
  }

  const createdData = await createRes.json();
  const newId = createdData.spreadsheetId;

  return {
    id: newId,
    url: `https://docs.google.com/spreadsheets/d/${newId}/edit`,
    createdNew: true,
  };
};

/**
 * Prefix leading-zero numeric-looking strings (e.g., phone 0905123456) with "'" for USER_ENTERED Sheets API
 */
const sanitizeOAuthValues = (tabName: string, values: any[][]): any[][] => {
  if (tabName !== 'Tài khoản' && tabName !== 'DoiTuong') return values;
  return values.map((row, rowIdx) => {
    if (rowIdx === 0) return row;
    return row.map((cell, colIdx) => {
      if (tabName === 'Tài khoản' && (colIdx === 4 || colIdx === 5)) {
        const s = String(cell ?? '');
        if (s && !s.startsWith("'")) return `'${s}`;
      }
      if (tabName === 'DoiTuong' && (colIdx === 5 || colIdx === 6)) {
        const s = String(cell ?? '');
        if (s && !s.startsWith("'")) return `'${s}`;
      }
      return cell;
    });
  });
};

/**
 * Synchronize all 10 tabs in the single Google Spreadsheet via OAuth token.
 */
export const syncAllDataToGoogleSheets = async (
  accessToken: string,
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
  }
): Promise<GoogleSheetsSyncResult> => {
  const sheetsMap = buildAllTenSheets2D(params);

  const resolvedExistingId =
    extractSpreadsheetId(params.templateSettings.googleSpreadsheetId) ||
    extractSpreadsheetId(params.templateSettings.googleSheetUrl);

  const title = `Sổ Quản Lý Dược Phẩm & Cấp Phát Thuốc - ${params.templateSettings.agencyName || 'TTBTXH Đà Nẵng'}`;
  const spreadsheet = await ensurePharmacySpreadsheet(accessToken, resolvedExistingId, title);
  const spreadsheetId = spreadsheet.id;

  // Clear existing ranges in one batchClear call
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ranges: TEN_SHEET_NAMES.map((name) => `'${name}'!A1:ZZ2000`),
      }),
    }
  ).catch(() => null);

  const updateData = TEN_SHEET_NAMES.filter((name) => {
    const vals = sheetsMap[name];
    return Array.isArray(vals) && vals.length > 0;
  }).map((name) => ({
    range: `'${name}'!A1`,
    values: sanitizeOAuthValues(name, sheetsMap[name]),
  }));

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: updateData,
      }),
    }
  );

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(
      translateSheetsApiError(updateRes.status, errText, 'Lỗi cập nhật dữ liệu 10 tab Google Sheets')
    );
  }

  const now = new Date();
  const timestamp = `${now.toLocaleTimeString('vi-VN')} ${now.toLocaleDateString('vi-VN')}`;

  return {
    success: true,
    spreadsheetId,
    spreadsheetUrl: spreadsheet.url,
    timestamp,
    channel: 'OAUTH',
    rowCounts: {
      receipts: Math.max(0, (sheetsMap['Phiếu nhập']?.length || 1) - 1),
      issues: Math.max(0, (sheetsMap['Phiếu xuất']?.length || 1) - 1),
      reports: Math.max(0, (sheetsMap['Báo cáo']?.length || 1) - 1),
      accounts: Math.max(0, (sheetsMap['Tài khoản']?.length || 1) - 1),
    },
  };
};

/**
 * Read back rows from tab "Tài khoản" + 6 system tabs via Google Sheets API v4 (batchGet)
 */
export const readAllSheetsViaOAuth = async (
  accessToken: string,
  spreadsheetId: string
): Promise<{
  accountRows: any[][];
  tables: Record<string, any[][]>;
  isSheetInitialized: boolean;
}> => {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) {
    return { accountRows: [], tables: {}, isSheetInitialized: false };
  }

  const tabsToRead = ['Tài khoản', ...SIX_SYSTEM_SHEET_NAMES];
  const rangesQuery = tabsToRead
    .map((t) => `ranges=${encodeURIComponent(`'${t}'!A1:Z2000`)}`)
    .join('&');

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values:batchGet?${rangesQuery}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    return { accountRows: [], tables: {}, isSheetInitialized: false };
  }

  const data = await res.json();
  const valueRanges: any[] = Array.isArray(data.valueRanges) ? data.valueRanges : [];
  const tables: Record<string, any[][]> = {};
  let isSheetInitialized = false;

  tabsToRead.forEach((tabName, idx) => {
    const vals = Array.isArray(valueRanges[idx]?.values) ? valueRanges[idx].values : [];
    tables[tabName] = vals;
    if (vals.length >= 2) {
      isSheetInitialized = true;
    }
  });

  return {
    accountRows: tables['Tài khoản'] || [],
    tables,
    isSheetInitialized,
  };
};

/**
 * Read back rows from tab "Tài khoản" via Google Sheets API v4 (two-way pull)
 */
export const readAccountSheetViaOAuth = async (
  accessToken: string,
  spreadsheetId: string
): Promise<any[][]> => {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) return [];
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent("'Tài khoản'!A1:L500")}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.values) ? data.values : [];
};
