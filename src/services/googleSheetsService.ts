/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Beneficiary, StockReceipt, StockIssue, Medicine, StockTransaction, TemplateSettings } from '../types';
import { buildThreeSheetsBeneficiaryData } from '../utils/googleSheetsBackup';

export interface GoogleSheetsSyncResult {
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

  // 1. If an ID is provided, test if the spreadsheet exists and is accessible
  if (existingSpreadsheetId) {
    try {
      const checkRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${existingSpreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties`,
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

        // Ensure all 3 required sheets exist
        const requiredSheets = ['Phiếu nhập', 'Phiếu xuất', 'Báo cáo'];
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

          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${existingSpreadsheetId}:batchUpdate`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ requests: addRequests }),
            }
          );
        }

        return {
          id: existingSpreadsheetId,
          url: `https://docs.google.com/spreadsheets/d/${existingSpreadsheetId}/edit`,
          createdNew: false,
        };
      }
    } catch (e) {
      console.warn('Không thể tái sử dụng Google Spreadsheet cũ, sẽ tạo mới:', e);
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
    throw new Error(`Lỗi tạo Google Spreadsheet mới (${createRes.status}): ${errorDetails}`);
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
 * Automatically synchronize all pharmacy data to Google Sheets across 3 sheets.
 */
export const syncAllDataToGoogleSheets = async (
  accessToken: string,
  beneficiaries: Beneficiary[],
  receipts: StockReceipt[],
  issues: StockIssue[],
  medicines: Medicine[],
  transactions: StockTransaction[],
  templateSettings: TemplateSettings
): Promise<GoogleSheetsSyncResult> => {
  // 1. Generate structured 3-sheet rows
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

  // 2. Ensure spreadsheet exists
  const title = `Sổ Quản Lý Dược Phẩm & Cấp Phát Thuốc - ${templateSettings.agencyName || 'TTBTXH'}`;
  const spreadsheet = await ensurePharmacySpreadsheet(
    accessToken,
    (templateSettings as any).googleSpreadsheetId,
    title
  );

  const spreadsheetId = spreadsheet.id;

  // 3. Clear existing values to prevent stale trailing cells
  const sheetsToClear = ["'Phiếu nhập'", "'Phiếu xuất'", "'Báo cáo'"];
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

  // 4. Batch update values for all 3 sheets simultaneously
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
    throw new Error(`Lỗi cập nhật dữ liệu Google Sheets (${updateRes.status}): ${errText}`);
  }

  const now = new Date();
  const timestamp = `${now.toLocaleTimeString('vi-VN')} ${now.toLocaleDateString('vi-VN')}`;

  return {
    success: true,
    spreadsheetId,
    spreadsheetUrl: spreadsheet.url,
    timestamp,
    rowCounts: {
      receipts: Math.max(0, receiptValues.length - 1),
      issues: Math.max(0, issueValues.length - 1),
      reports: Math.max(0, reportValues.length - 1),
    },
  };
};
