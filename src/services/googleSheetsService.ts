/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Beneficiary, StockReceipt, StockIssue, Medicine, StockTransaction, TemplateSettings, User } from '../types';
import { buildFourSheetsData } from '../utils/googleSheetsBackup';

export interface GoogleSheetsSyncResult {
  success: boolean;
  spreadsheetId: string;
  spreadsheetUrl: string;
  timestamp: string;
  channel?: 'APPS_SCRIPT' | 'OAUTH';
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

/**
 * Convert JSON array of objects to 2D array for Google Sheets API
 */
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

const translateSheetsApiError = (status: number, rawBody: string, context: string): string => {
  if (status === 401) {
    return `Phiên đăng nhập Google OAuth đã hết hạn hoặc bị thu hồi (401). Vui lòng bấm "Kết nối lại Google" hoặc chuyển sang dùng Google Apps Script để đồng bộ không giới hạn thời gian.`;
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
 * Ensure the Google Spreadsheet exists and contains the 3 sheets:
 * "Phiếu nhập", "Phiếu xuất", "Báo cáo"
 */
export const ensurePharmacySpreadsheet = async (
  accessToken: string,
  existingSpreadsheetId?: string,
  title?: string
): Promise<{ id: string; url: string; createdNew: boolean }> => {
  const defaultTitle =
    title || 'Sổ Quản Lý Dược Phẩm & Cấp Phát Thuốc - TTBTXH (Tự Động Sao Lưu)';

  const candidateId = extractSpreadsheetId(existingSpreadsheetId);

  // 1. If an ID is provided (and not Google's public sample sheet), test accessibility
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

      // Ensure all 4 required sheets exist
      const requiredSheets = ['Phiếu nhập', 'Phiếu xuất', 'Báo cáo', 'Tài khoản'];
      const missingSheets = requiredSheets.filter((s) => !existingSheetTitles.includes(s));

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
      // Bảng tính do người dùng tạo thủ công bên ngoài không nằm trong phạm vi drive.file -> giải thích rõ và tạo bảng tính mới thuộc ứng dụng
      console.warn('Spreadsheet bên ngoài trả về 403 với scope drive.file, đang tạo bảng tính thuộc quyền ứng dụng...');
    }
  }

  // 2. Create a new Google Spreadsheet with 3 sheets configured
  const createPayload = {
    properties: {
      title: defaultTitle,
    },
    sheets: [
      {
        properties: {
          title: 'Phiếu nhập',
          gridProperties: { frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Phiếu xuất',
          gridProperties: { frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Báo cáo',
          gridProperties: { frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Tài khoản',
          gridProperties: { frozenRowCount: 1 },
        },
      },
    ],
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
 * Automatically synchronize all pharmacy data + accounts across 4 sheets via OAuth token.
 */
export const syncAllDataToGoogleSheets = async (
  accessToken: string,
  beneficiaries: Beneficiary[],
  receipts: StockReceipt[],
  issues: StockIssue[],
  medicines: Medicine[],
  transactions: StockTransaction[],
  templateSettings: TemplateSettings,
  users: User[] = []
): Promise<GoogleSheetsSyncResult> => {
  // 1. Generate structured 4-sheet rows
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

  // 2. Resolve target spreadsheet ID from either googleSpreadsheetId or pasted googleSheetUrl
  const resolvedExistingId =
    extractSpreadsheetId(templateSettings.googleSpreadsheetId) ||
    extractSpreadsheetId(templateSettings.googleSheetUrl);

  const title = `Sổ Quản Lý Dược Phẩm & Cấp Phát Thuốc - ${templateSettings.agencyName || 'TTBTXH'}`;
  const spreadsheet = await ensurePharmacySpreadsheet(accessToken, resolvedExistingId, title);
  const spreadsheetId = spreadsheet.id;

  // 3. Clear existing values to prevent stale trailing cells
  const sheetsToClear = ["'Phiếu nhập'", "'Phiếu xuất'", "'Báo cáo'", "'Tài khoản'"];
  await Promise.all(
    sheetsToClear.map((sName) =>
      fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
          sName + '!A1:ZZ1000'
        )}:clear`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      ).catch(() => null)
    )
  );

  // 4. Batch update values for all 4 sheets simultaneously
  const updatePayload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: "'Phiếu nhập'!A1",
        values: receiptValues,
      },
      {
        range: "'Phiếu xuất'!A1",
        values: issueValues,
      },
      {
        range: "'Báo cáo'!A1",
        values: reportValues,
      },
      ...(accountValues.length > 0
        ? [
            {
              range: "'Tài khoản'!A1",
              values: accountValues,
            },
          ]
        : []),
    ],
  };

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    }
  );

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(
      translateSheetsApiError(updateRes.status, errText, 'Lỗi cập nhật dữ liệu Google Sheets')
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
      receipts: Math.max(0, receiptValues.length - 1),
      issues: Math.max(0, issueValues.length - 1),
      reports: Math.max(0, reportValues.length - 1),
      accounts: Math.max(0, accountValues.length - 1),
    },
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
