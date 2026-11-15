/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { StockReceipt, StockIssue, Prescription, BeneficiaryReportRow, Beneficiary } from '../../types';
import { formatDate, formatNumber } from '../../utils/formatters';
import { numberToVietnameseWords } from '../../utils/numberToVietnameseWords';
import { useApp } from '../../context/AppContext';
import { Printer, Cloud, Check, Edit3, AlertCircle, ExternalLink } from 'lucide-react';

export type PrintDocumentType =
  | { type: 'RECEIPT'; data: StockReceipt }
  | { type: 'ISSUE'; data: StockIssue }
  | { type: 'PRESCRIPTION'; data: Prescription }
  | {
      type: 'BENEFICIARY_REPORT';
      data: {
        beneficiary: Beneficiary;
        startDate: string;
        endDate: string;
        rows: BeneficiaryReportRow[];
        customTitles?: {
          parentOrg?: string;
          agencyName?: string;
          deptName?: string;
          nationalMottoTop?: string;
          nationalMottoSub?: string;
          reportTitle?: string;
          reportSubtitle?: string;
          reportFooterNote?: string;
          preparerName?: string;
          deptLeaderName?: string;
          centerDirectorName?: string;
        };
      };
    };

interface PrintModalProps {
  document: PrintDocumentType | null;
  onClose: () => void;
}

export const PrintModal: React.FC<PrintModalProps> = ({ document, onClose }) => {
  const { medicines, beneficiaries, syncDocumentToDrive, templateSettings, currentUser, hasPermission } = useApp();
  const [driveSaving, setDriveSaving] = useState(false);
  const [driveSavedInfo, setDriveSavedInfo] = useState<{ message: string; link?: string } | null>(null);
  const [isLiveEditable, setIsLiveEditable] = useState(false);

  if (!document) return null;

  const isAdmin = currentUser?.role === 'ADMIN' && hasPermission('canManageSync');

  const handlePrint = () => {
    window.print();
  };

  const buildHtmlSnapshot = (title: string): string | undefined => {
    const el = window.document.getElementById('printable-area');
    if (!el) return undefined;
    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    body { font-family: "Times New Roman", Times, serif; color: #0f172a; margin: 24px; line-height: 1.4; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
    th, td { border: 1px solid #0f172a; padding: 6px; }
    th { background: #f1f5f9; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: bold; }
    .uppercase { text-transform: uppercase; }
    .italic { font-style: italic; }
  </style>
</head>
<body>${el.innerHTML}</body>
</html>`;
  };

  const handleSaveToDrive = async () => {
    if (!isAdmin) return;
    let docCode = '';
    let docType: 'PHIEU_NHAP' | 'PHIEU_XUAT' | 'DON_THUOC' | 'BAO_CAO_BHYT' = 'PHIEU_NHAP';
    let fileName = '';

    if (document.type === 'RECEIPT') {
      docCode = document.data.receiptCode;
      docType = 'PHIEU_NHAP';
      fileName = `${document.data.receiptCode}.html`;
    } else if (document.type === 'ISSUE') {
      docCode = document.data.issueCode;
      docType = 'PHIEU_XUAT';
      fileName = `${document.data.issueCode}.html`;
    } else if (document.type === 'PRESCRIPTION') {
      docCode = document.data.code;
      docType = 'DON_THUOC';
      fileName = `${document.data.code}.html`;
    } else if (document.type === 'BENEFICIARY_REPORT') {
      docCode = `BC-${document.data.beneficiary.code}-${document.data.startDate}_${document.data.endDate}`;
      docType = 'BAO_CAO_BHYT';
      fileName = `BaoCao_BHYT_${document.data.beneficiary.code}_${document.data.startDate}.html`;
    }

    setDriveSaving(true);
    setDriveSavedInfo(null);
    const snapshot = buildHtmlSnapshot(docCode);
    const saved = await syncDocumentToDrive(docCode, docType, fileName, snapshot);
    setDriveSaving(false);

    if (saved) {
      const channelText =
        saved.uploadChannel === 'APPS_SCRIPT'
          ? 'Đã tải lên Google Drive qua Apps Script'
          : saved.uploadChannel === 'OAUTH_DRIVE_V3'
          ? 'Đã tải lên Google Drive qua OAuth API'
          : 'Đã ghi nhận lưu trữ cục bộ (chưa kết nối Drive cloud)';
      setDriveSavedInfo({ message: channelText, link: saved.webViewLink });
    } else {
      setDriveSavedInfo({ message: 'Không thể lưu lên Google Drive. Vui lòng kiểm tra cấu hình đồng bộ.' });
    }
  };

  return (
    <Modal
      isOpen={!!document}
      onClose={onClose}
      title="Xem Trước Biểu Mẫu In Chuẩn Khổ A4"
      subtitle={`Định dạng chuẩn hóa theo cấu hình ${templateSettings.agencyName}`}
      maxWidth="5xl"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200">
        <div className="text-xs text-slate-500">
          Áp dụng tự động các tùy chỉnh tiêu ngữ, cột bảng kê, ghi chú và khung chữ ký từ Cấu Hình Mặc Định.
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsLiveEditable(!isLiveEditable)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isLiveEditable
                ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-xs'
                : 'border-slate-300 hover:bg-slate-100 text-slate-700'
            }`}
            title="Cho phép nhấp chuột vào bất kỳ chữ nào trên trang giấy để chỉnh sửa trước khi in"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-600" />
            <span>{isLiveEditable ? 'Tắt sửa trực tiếp' : 'Sửa trực tiếp trên trang in'}</span>
          </button>

          {isAdmin && (
            <button
              onClick={handleSaveToDrive}
              disabled={driveSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-600 text-teal-700 hover:bg-teal-50 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {driveSaving ? (
                <div className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
              ) : driveSavedInfo ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Cloud className="w-4 h-4" />
              )}
              <span>{driveSaving ? 'Đang tải Drive...' : 'Lưu Drive'}</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>In Ngay (A4)</span>
          </button>
        </div>
      </div>

      {driveSavedInfo && isAdmin && (
        <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{driveSavedInfo.message}</span>
          </div>
          {driveSavedInfo.link && (
            <a
              href={driveSavedInfo.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline shrink-0"
            >
              <span>Mở trên Drive</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {isLiveEditable && (
        <div className="mb-4 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Chế độ sửa trực tiếp đang BẬT:</strong> Bạn có thể nhấp chuột vào bất kỳ đoạn chữ, số liệu, họ tên hoặc tiêu đề nào trên bản in bên dưới để chỉnh sửa trước khi in hoặc lưu!
          </span>
        </div>
      )}

      {/* Printable Paper Canvas */}
      <div
        id="printable-area"
        contentEditable={isLiveEditable}
        suppressContentEditableWarning={true}
        className={`bg-white p-8 border rounded-lg shadow-sm text-slate-900 font-serif leading-normal transition-all ${
          isLiveEditable ? 'border-amber-400 ring-2 ring-amber-200/50 cursor-text' : 'border-slate-300'
        }`}
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        {/* ======================= CASE 1: PHIẾU NHẬP KHO ======================= */}
        {document.type === 'RECEIPT' && (
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="font-bold text-xs uppercase">{templateSettings.agencyName}</div>
                <div className="text-xs uppercase font-medium">{templateSettings.deptName}</div>
                <div className="text-xs">
                  Mã QHNS: <span className="font-mono font-bold">{templateSettings.qhnsCode}</span>
                </div>
              </div>
              <div className="text-right text-xs">
                <div className="font-bold">{templateSettings.receiptFormCode}</div>
                <div className="italic text-2xs">{templateSettings.receiptNotice}</div>
                <div className="mt-1">
                  Số: <span className="font-bold font-mono">{document.data.receiptCode}</span>
                </div>
                <div>Nợ: .......................................</div>
                <div>Có: .......................................</div>
              </div>
            </div>

            <div className="text-center my-4">
              <h1 className="text-xl font-bold uppercase tracking-wide">{templateSettings.receiptTitle}</h1>
              <div className="text-xs italic mt-0.5">
                Ngày {document.data.receiptDate.split('-')[2]} tháng {document.data.receiptDate.split('-')[1]} năm{' '}
                {document.data.receiptDate.split('-')[0]}
              </div>
            </div>

            <div className="text-xs space-y-1.5 mb-4">
              <div className="flex">
                <span className="w-52 shrink-0">{templateSettings.receiptLabelDeliverer}</span>
                <span className="font-semibold">{document.data.delivererName}</span>
              </div>
              <div className="flex">
                <span className="w-52 shrink-0">{templateSettings.receiptLabelDelivererDept}</span>
                <span>{document.data.delivererDept}</span>
              </div>
              <div className="flex flex-wrap">
                <span className="w-52 shrink-0">{templateSettings.receiptLabelInvoice}</span>
                <span className="font-mono font-bold mr-6">{document.data.invoiceNumber || '................'}</span>
                <span className="mr-2">ngày:</span>
                <span className="mr-6">{formatDate(document.data.invoiceDate)}</span>
                <span className="mr-2">của:</span>
                <span className="font-semibold">{document.data.supplierName}</span>
              </div>
              <div className="flex">
                <span className="w-52 shrink-0">{templateSettings.receiptLabelContent}</span>
                <span>{document.data.content}</span>
              </div>
              {(document.data.beneficiaryName || document.data.beneficiaryId) && (
                <div className="flex">
                  <span className="w-52 shrink-0">{templateSettings.receiptLabelBeneficiary}</span>
                  <span className="font-bold text-slate-900">
                    {document.data.beneficiaryName ||
                      beneficiaries.find((b) => b.id === document.data.beneficiaryId)?.fullName ||
                      'Chung'}
                  </span>
                </div>
              )}
              <div className="flex">
                <span className="w-52 shrink-0">{templateSettings.receiptLabelWarehouse}</span>
                <span>{templateSettings.receiptDefaultWarehouse}</span>
              </div>
            </div>

            <table className="w-full text-xs border-collapse border border-slate-900 mb-4">
              <thead>
                <tr className="bg-slate-100 font-bold text-center">
                  <th className="border border-slate-900 p-1.5 w-10">{templateSettings.receiptColStt}</th>
                  <th className="border border-slate-900 p-1.5">{templateSettings.receiptColName}</th>
                  <th className="border border-slate-900 p-1.5 w-20">{templateSettings.receiptColCode}</th>
                  <th className="border border-slate-900 p-1.5 w-16">{templateSettings.receiptColUnit}</th>
                  <th className="border border-slate-900 p-1.5 w-24">{templateSettings.receiptColBatch}</th>
                  <th className="border border-slate-900 p-1.5 w-16">{templateSettings.receiptColDocQty}</th>
                  <th className="border border-slate-900 p-1.5 w-16">{templateSettings.receiptColActualQty}</th>
                  <th className="border border-slate-900 p-1.5 w-20">{templateSettings.receiptColUnitPrice}</th>
                  <th className="border border-slate-900 p-1.5 w-24">{templateSettings.receiptColTotalPrice}</th>
                </tr>
                <tr className="text-center font-normal text-2xs italic">
                  <td className="border border-slate-900 p-0.5">A</td>
                  <td className="border border-slate-900 p-0.5">B</td>
                  <td className="border border-slate-900 p-0.5">C</td>
                  <td className="border border-slate-900 p-0.5">D</td>
                  <td className="border border-slate-900 p-0.5">E</td>
                  <td className="border border-slate-900 p-0.5">1</td>
                  <td className="border border-slate-900 p-0.5">2</td>
                  <td className="border border-slate-900 p-0.5">3</td>
                  <td className="border border-slate-900 p-0.5">4 = 2 x 3</td>
                </tr>
              </thead>
              <tbody>
                {document.data.items?.map((item, idx) => {
                  const med = medicines.find((m) => m.id === item.medicineId);
                  return (
                    <tr key={item.id}>
                      <td className="border border-slate-900 p-1.5 text-center">{idx + 1}</td>
                      <td className="border border-slate-900 p-1.5">
                        <div className="font-bold">{med?.name}</div>
                        <div className="text-2xs italic text-slate-700">
                          {med?.activeIngredient} ({med?.concentration}) - {med?.packaging}
                        </div>
                      </td>
                      <td className="border border-slate-900 p-1.5 text-center font-mono">{med?.code}</td>
                      <td className="border border-slate-900 p-1.5 text-center">{med?.unit}</td>
                      <td className="border border-slate-900 p-1.5 text-center font-mono font-medium">
                        {item.batchNumber}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-right font-mono tabular-nums">
                        {formatNumber(item.docQuantity)}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-right font-mono font-bold tabular-nums">
                        {formatNumber(item.actualQuantity)}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-right font-mono tabular-nums">
                        {formatNumber(item.unitPrice)}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-right font-mono font-bold tabular-nums">
                        {formatNumber(item.totalPrice)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="font-bold bg-slate-50">
                  <td colSpan={8} className="border border-slate-900 p-1.5 text-right uppercase">
                    {templateSettings.totalAmountLabel}
                  </td>
                  <td className="border border-slate-900 p-1.5 text-right font-mono font-bold tabular-nums">
                    {formatNumber(document.data.totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="text-xs mb-2">
              {templateSettings.totalAmountWordsLabel}{' '}
              <span className="font-bold italic">{numberToVietnameseWords(document.data.totalAmount)}</span>.
            </div>
            {templateSettings.receiptFooterNote && (
              <div className="text-2xs italic text-slate-700 mb-6">{templateSettings.receiptFooterNote}</div>
            )}

            <div className="grid grid-cols-4 text-center text-xs gap-4 mt-6">
              <div>
                <div className="font-bold uppercase">{templateSettings.receiptDelivererRoleLabel}</div>
                <div className="text-2xs italic">{templateSettings.receiptDelivererSignNote}</div>
                <div className="h-16"></div>
                <div className="font-semibold">{document.data.delivererName}</div>
              </div>
              <div>
                <div className="font-bold uppercase">{templateSettings.warehouseKeeperTitle}</div>
                <div className="text-2xs italic">{templateSettings.warehouseKeeperSignNote}</div>
                <div className="h-16"></div>
                <div className="font-semibold">{templateSettings.warehouseKeeperName}</div>
              </div>
              <div>
                <div className="font-bold uppercase">{templateSettings.accountantTitle}</div>
                <div className="text-2xs italic">{templateSettings.accountantSignNote}</div>
                <div className="h-16"></div>
                <div className="font-semibold">{templateSettings.accountantName}</div>
              </div>
              <div>
                <div className="font-bold uppercase">{templateSettings.centerDirectorTitle}</div>
                <div className="text-2xs italic">{templateSettings.centerDirectorSignNote}</div>
                <div className="h-16"></div>
                <div className="font-semibold">{templateSettings.centerDirectorName}</div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= CASE 2: PHIẾU XUẤT KHO ======================= */}
        {document.type === 'ISSUE' && (
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="font-bold text-xs uppercase">{templateSettings.agencyName}</div>
                <div className="text-xs uppercase font-medium">{templateSettings.deptName}</div>
                <div className="text-xs">
                  Mã QHNS: <span className="font-mono font-bold">{templateSettings.qhnsCode}</span>
                </div>
              </div>
              <div className="text-right text-xs">
                <div className="font-bold">{templateSettings.issueFormCode}</div>
                <div className="italic text-2xs">{templateSettings.issueNotice}</div>
                <div className="mt-1">
                  Số: <span className="font-bold font-mono">{document.data.issueCode}</span>
                </div>
                <div>Nợ: .......................................</div>
                <div>Có: .......................................</div>
              </div>
            </div>

            <div className="text-center my-4">
              <h1 className="text-xl font-bold uppercase tracking-wide">{templateSettings.issueTitle}</h1>
              <div className="text-xs italic mt-0.5">
                Ngày {document.data.issueDate.split('-')[2]} tháng {document.data.issueDate.split('-')[1]} năm{' '}
                {document.data.issueDate.split('-')[0]}
              </div>
            </div>

            <div className="text-xs space-y-1.5 mb-4">
              <div className="flex">
                <span className="w-52 shrink-0">{templateSettings.issueLabelReceiver}</span>
                <span className="font-semibold">{document.data.receiverName}</span>
              </div>
              <div className="flex">
                <span className="w-52 shrink-0">{templateSettings.issueLabelReceiverDept}</span>
                <span>{document.data.receiverDept}</span>
              </div>
              <div className="flex">
                <span className="w-52 shrink-0">{templateSettings.issueLabelReason}</span>
                <span>{document.data.reason}</span>
              </div>
              <div className="flex flex-wrap">
                <span className="w-52 shrink-0">{templateSettings.issueLabelBeneficiary}</span>
                <span className="font-bold text-slate-900">
                  {document.data.beneficiaryName ||
                    beneficiaries.find((b) => b.id === document.data.beneficiaryId)?.fullName ||
                    'Đối tượng điều trị'}
                </span>
                {beneficiaries.find((b) => b.id === document.data.beneficiaryId) && (
                  <span className="ml-4 text-slate-600">
                    (Mã: {beneficiaries.find((b) => b.id === document.data.beneficiaryId)?.code} - BHYT:{' '}
                    {beneficiaries.find((b) => b.id === document.data.beneficiaryId)?.insuranceNumber})
                  </span>
                )}
              </div>
              <div className="flex">
                <span className="w-52 shrink-0">{templateSettings.issueLabelWarehouse}</span>
                <span>{templateSettings.issueDefaultWarehouse}</span>
              </div>
              <div className="flex">
                <span className="w-52 shrink-0">{templateSettings.issueLabelUsageLocation}</span>
                <span>{document.data.usageLocation}</span>
              </div>
            </div>

            <table className="w-full text-xs border-collapse border border-slate-900 mb-4">
              <thead>
                <tr className="bg-slate-100 font-bold text-center">
                  <th className="border border-slate-900 p-1.5 w-10">{templateSettings.issueColStt}</th>
                  <th className="border border-slate-900 p-1.5">{templateSettings.issueColName}</th>
                  <th className="border border-slate-900 p-1.5 w-16">{templateSettings.issueColCode}</th>
                  <th className="border border-slate-900 p-1.5 w-16">{templateSettings.issueColUnit}</th>
                  <th className="border border-slate-900 p-1.5 w-24">{templateSettings.issueColBatch}</th>
                  <th className="border border-slate-900 p-1.5 w-16">{templateSettings.issueColReqQty}</th>
                  <th className="border border-slate-900 p-1.5 w-16">{templateSettings.issueColActualQty}</th>
                  <th className="border border-slate-900 p-1.5 w-20">{templateSettings.issueColUnitPrice}</th>
                  <th className="border border-slate-900 p-1.5 w-24">{templateSettings.issueColTotalPrice}</th>
                </tr>
                <tr className="text-center font-normal text-2xs italic">
                  <td className="border border-slate-900 p-0.5">A</td>
                  <td className="border border-slate-900 p-0.5">B</td>
                  <td className="border border-slate-900 p-0.5">C</td>
                  <td className="border border-slate-900 p-0.5">D</td>
                  <td className="border border-slate-900 p-0.5">E</td>
                  <td className="border border-slate-900 p-0.5">1</td>
                  <td className="border border-slate-900 p-0.5">2</td>
                  <td className="border border-slate-900 p-0.5">3</td>
                  <td className="border border-slate-900 p-0.5">4 = 2 x 3</td>
                </tr>
              </thead>
              <tbody>
                {document.data.items?.map((item, idx) => {
                  const med = medicines.find((m) => m.id === item.medicineId);
                  return (
                    <tr key={item.id}>
                      <td className="border border-slate-900 p-1.5 text-center">{idx + 1}</td>
                      <td className="border border-slate-900 p-1.5">
                        <div className="font-bold">{med?.name}</div>
                        <div className="text-2xs italic text-slate-700">{med?.activeIngredient}</div>
                      </td>
                      <td className="border border-slate-900 p-1.5 text-center font-mono">{med?.code}</td>
                      <td className="border border-slate-900 p-1.5 text-center">{med?.unit}</td>
                      <td className="border border-slate-900 p-1.5 text-center font-mono font-medium">
                        {item.batchNumber}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-right font-mono tabular-nums">
                        {formatNumber(item.requestedQuantity)}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-right font-mono font-bold tabular-nums">
                        {formatNumber(item.actualQuantity)}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-right font-mono tabular-nums">
                        {formatNumber(item.unitPrice)}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-right font-mono font-bold tabular-nums">
                        {formatNumber(item.totalPrice)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="font-bold bg-slate-50">
                  <td colSpan={8} className="border border-slate-900 p-1.5 text-right uppercase">
                    {templateSettings.totalAmountLabel}
                  </td>
                  <td className="border border-slate-900 p-1.5 text-right font-mono font-bold tabular-nums">
                    {formatNumber(document.data.totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="text-xs mb-2">
              {templateSettings.totalAmountWordsLabel}{' '}
              <span className="font-bold italic">{numberToVietnameseWords(document.data.totalAmount)}</span>.
            </div>
            {templateSettings.issueFooterNote && (
              <div className="text-2xs italic text-slate-700 mb-6">{templateSettings.issueFooterNote}</div>
            )}

            <div className="grid grid-cols-4 text-center text-xs gap-4 mt-6">
              <div>
                <div className="font-bold uppercase">{templateSettings.issueReceiverRoleLabel}</div>
                <div className="text-2xs italic">{templateSettings.issueReceiverSignNote}</div>
                <div className="h-16"></div>
                <div className="font-semibold">{document.data.receiverName}</div>
              </div>
              <div>
                <div className="font-bold uppercase">{templateSettings.warehouseKeeperTitle}</div>
                <div className="text-2xs italic">{templateSettings.warehouseKeeperSignNote}</div>
                <div className="h-16"></div>
                <div className="font-semibold">{templateSettings.warehouseKeeperName}</div>
              </div>
              <div>
                <div className="font-bold uppercase">{templateSettings.accountantTitle}</div>
                <div className="text-2xs italic">{templateSettings.accountantSignNote}</div>
                <div className="h-16"></div>
                <div className="font-semibold">{templateSettings.accountantName}</div>
              </div>
              <div>
                <div className="font-bold uppercase">{templateSettings.centerDirectorTitle}</div>
                <div className="text-2xs italic">{templateSettings.centerDirectorSignNote}</div>
                <div className="h-16"></div>
                <div className="font-semibold">{templateSettings.centerDirectorName}</div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= CASE 3: BẢNG TỔNG HỢP ĐỐI TƯỢNG BHYT ======================= */}
        {document.type === 'BENEFICIARY_REPORT' && (
          <div>
            <div className="flex justify-between items-start mb-2">
              <div className="text-center">
                <div className="font-bold text-xs uppercase">
                  {document.data.customTitles?.parentOrg || templateSettings.parentOrg}
                </div>
                <div className="font-bold text-xs uppercase">
                  {document.data.customTitles?.agencyName || templateSettings.agencyName}
                </div>
                <div className="text-2xs uppercase font-medium">
                  {document.data.customTitles?.deptName || templateSettings.deptName}
                </div>
              </div>
              <div className="text-center">
                <div className="font-bold text-xs uppercase">
                  {document.data.customTitles?.nationalMottoTop || templateSettings.nationalMottoTop}
                </div>
                <div className="text-xs font-semibold italic">
                  {document.data.customTitles?.nationalMottoSub || templateSettings.nationalMottoSub}
                </div>
                <div className="text-2xs italic mt-1">{templateSettings.datePlaceLine}</div>
              </div>
            </div>

            <div className="text-center my-4">
              <h1 className="text-base font-bold uppercase tracking-wide">
                {document.data.customTitles?.reportTitle || templateSettings.reportTitle}
              </h1>
              {(document.data.customTitles?.reportSubtitle || templateSettings.reportSubtitle) && (
                <div className="text-2xs text-slate-600 mt-0.5">
                  {document.data.customTitles?.reportSubtitle || templateSettings.reportSubtitle}
                </div>
              )}
              <div className="text-xs italic mt-1">
                Kỳ báo cáo: Từ ngày {formatDate(document.data.startDate)} đến ngày {formatDate(document.data.endDate)}
              </div>
              <div className="text-xs font-bold mt-1">
                Họ và tên đối tượng: <span className="uppercase text-slate-900">{document.data.beneficiary.fullName}</span>{' '}
                - Mã ĐT: <span className="font-mono">{document.data.beneficiary.code}</span> - Số thẻ BHYT:{' '}
                <span className="font-mono text-teal-800">{document.data.beneficiary.insuranceNumber}</span>
              </div>
            </div>

            <table className="w-full text-2xs border-collapse border border-slate-900 mb-4">
              <thead>
                <tr className="bg-slate-100 font-bold text-center">
                  <th rowSpan={2} className="border border-slate-900 p-1 w-6">{templateSettings.reportColStt}</th>
                  <th rowSpan={2} className="border border-slate-900 p-1 w-44">{templateSettings.reportColName}</th>
                  <th rowSpan={2} className="border border-slate-900 p-1 w-10">{templateSettings.reportColUnit}</th>
                  <th colSpan={3} className="border border-slate-900 p-1 bg-amber-50/50">{templateSettings.reportGroupOpening}</th>
                  <th colSpan={3} className="border border-slate-900 p-1 bg-blue-50/50">{templateSettings.reportGroupIn}</th>
                  <th colSpan={3} className="border border-slate-900 p-1 bg-indigo-50/50">{templateSettings.reportGroupTotalIn}</th>
                  <th colSpan={3} className="border border-slate-900 p-1 bg-rose-50/50">{templateSettings.reportGroupOut}</th>
                  <th colSpan={3} className="border border-slate-900 p-1 bg-emerald-50/50">{templateSettings.reportGroupClosing}</th>
                </tr>
                <tr className="bg-slate-100 font-semibold text-center text-3xs">
                  {Array.from({ length: 5 }).map((_, groupIdx) => (
                    <React.Fragment key={groupIdx}>
                      <th className="border border-slate-900 p-1 w-10">{templateSettings.reportSubColQty}</th>
                      <th className="border border-slate-900 p-1 w-14">{templateSettings.reportSubColPrice}</th>
                      <th className="border border-slate-900 p-1 w-16">{templateSettings.reportSubColAmount}</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {document.data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="border border-slate-900 p-4 text-center italic text-slate-500">
                      Không có phát sinh giao dịch nhập xuất thuốc nào cho đối tượng trong kỳ này.
                    </td>
                  </tr>
                ) : (
                  document.data.rows.map((row) => (
                    <tr key={row.medicineId}>
                      <td className="border border-slate-900 p-1 text-center">{row.stt}</td>
                      <td className="border border-slate-900 p-1 font-semibold">{row.medicineName}</td>
                      <td className="border border-slate-900 p-1 text-center">{row.unit}</td>

                      <td className="border border-slate-900 p-1 text-right font-mono tabular-nums">{formatNumber(row.openingQty)}</td>
                      <td className="border border-slate-900 p-1 text-right font-mono tabular-nums">{formatNumber(row.openingPrice)}</td>
                      <td className="border border-slate-900 p-1 text-right font-mono tabular-nums">{formatNumber(row.openingAmount)}</td>

                      <td className="border border-slate-900 p-1 text-right font-mono tabular-nums">{formatNumber(row.inQty)}</td>
                      <td className="border border-slate-900 p-1 text-right font-mono tabular-nums">{formatNumber(row.inPrice)}</td>
                      <td className="border border-slate-900 p-1 text-right font-mono tabular-nums">{formatNumber(row.inAmount)}</td>

                      <td className="border border-slate-900 p-1 text-right font-mono font-bold tabular-nums">{formatNumber(row.totalInQty)}</td>
                      <td className="border border-slate-900 p-1 text-right font-mono tabular-nums">{formatNumber(row.totalInPrice)}</td>
                      <td className="border border-slate-900 p-1 text-right font-mono font-bold tabular-nums">{formatNumber(row.totalInAmount)}</td>

                      <td className="border border-slate-900 p-1 text-right font-mono tabular-nums">{formatNumber(row.outQty)}</td>
                      <td className="border border-slate-900 p-1 text-right font-mono tabular-nums">{formatNumber(row.outPrice)}</td>
                      <td className="border border-slate-900 p-1 text-right font-mono tabular-nums">{formatNumber(row.outAmount)}</td>

                      <td className="border border-slate-900 p-1 text-right font-mono font-bold text-teal-900 tabular-nums">{formatNumber(row.closingQty)}</td>
                      <td className="border border-slate-900 p-1 text-right font-mono tabular-nums">{formatNumber(row.closingPrice)}</td>
                      <td className="border border-slate-900 p-1 text-right font-mono font-bold text-teal-900 tabular-nums">{formatNumber(row.closingAmount)}</td>
                    </tr>
                  ))
                )}

                {document.data.rows.length > 0 && (
                  <tr className="font-bold bg-slate-100">
                    <td colSpan={3} className="border border-slate-900 p-1.5 text-center uppercase">
                      {templateSettings.reportGrandTotalLabel}
                    </td>
                    <td className="border border-slate-900 p-1 text-right font-mono tabular-nums">
                      {formatNumber(document.data.rows.reduce((sum, r) => sum + r.openingQty, 0))}
                    </td>
                    <td className="border border-slate-900 p-1 text-right">-</td>
                    <td className="border border-slate-900 p-1 text-right font-mono tabular-nums">
                      {formatNumber(document.data.rows.reduce((sum, r) => sum + r.openingAmount, 0))}
                    </td>

                    <td className="border border-slate-900 p-1 text-right font-mono tabular-nums">
                      {formatNumber(document.data.rows.reduce((sum, r) => sum + r.inQty, 0))}
                    </td>
                    <td className="border border-slate-900 p-1 text-right">-</td>
                    <td className="border border-slate-900 p-1 text-right font-mono tabular-nums">
                      {formatNumber(document.data.rows.reduce((sum, r) => sum + r.inAmount, 0))}
                    </td>

                    <td className="border border-slate-900 p-1 text-right font-mono tabular-nums">
                      {formatNumber(document.data.rows.reduce((sum, r) => sum + r.totalInQty, 0))}
                    </td>
                    <td className="border border-slate-900 p-1 text-right">-</td>
                    <td className="border border-slate-900 p-1 text-right font-mono tabular-nums">
                      {formatNumber(document.data.rows.reduce((sum, r) => sum + r.totalInAmount, 0))}
                    </td>

                    <td className="border border-slate-900 p-1 text-right font-mono tabular-nums">
                      {formatNumber(document.data.rows.reduce((sum, r) => sum + r.outQty, 0))}
                    </td>
                    <td className="border border-slate-900 p-1 text-right">-</td>
                    <td className="border border-slate-900 p-1 text-right font-mono tabular-nums">
                      {formatNumber(document.data.rows.reduce((sum, r) => sum + r.outAmount, 0))}
                    </td>

                    <td className="border border-slate-900 p-1 text-right font-mono tabular-nums">
                      {formatNumber(document.data.rows.reduce((sum, r) => sum + r.closingQty, 0))}
                    </td>
                    <td className="border border-slate-900 p-1 text-right">-</td>
                    <td className="border border-slate-900 p-1 text-right font-mono tabular-nums">
                      {formatNumber(document.data.rows.reduce((sum, r) => sum + r.closingAmount, 0))}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {(document.data.customTitles?.reportFooterNote || templateSettings.reportFooterNote) && (
              <div className="text-2xs italic text-slate-700 mb-4">
                {document.data.customTitles?.reportFooterNote || templateSettings.reportFooterNote}
              </div>
            )}

            <div className="grid grid-cols-3 text-center text-xs gap-6 mt-8">
              <div>
                <div className="font-bold uppercase">{templateSettings.preparerTitle}</div>
                <div className="text-2xs italic">{templateSettings.preparerSignNote}</div>
                <div className="h-16"></div>
                <div className="font-semibold">{document.data.customTitles?.preparerName || templateSettings.preparerName}</div>
              </div>
              <div>
                <div className="font-bold uppercase">{templateSettings.deptLeaderTitle}</div>
                <div className="text-2xs italic">{templateSettings.deptLeaderSignNote}</div>
                <div className="h-16"></div>
                <div className="font-semibold">{document.data.customTitles?.deptLeaderName || templateSettings.deptLeaderName}</div>
              </div>
              <div>
                <div className="font-bold uppercase">{templateSettings.centerDirectorTitle}</div>
                <div className="text-2xs italic">{templateSettings.centerDirectorSignNote}</div>
                <div className="h-16"></div>
                <div className="font-semibold">{document.data.customTitles?.centerDirectorName || templateSettings.centerDirectorName}</div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= CASE 4: ĐƠN THUỐC ĐIỀU TRỊ ======================= */}
        {document.type === 'PRESCRIPTION' && (
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="font-bold text-xs uppercase">{templateSettings.agencyName}</div>
                <div className="text-xs uppercase font-medium">{templateSettings.deptName}</div>
                <div className="text-2xs">Mã QHNS: {templateSettings.qhnsCode} · {templateSettings.facilityAddress}</div>
              </div>
              <div className="text-right text-xs">
                <div>Mã đơn: <span className="font-bold font-mono">{document.data.code}</span></div>
                <div>Ngày kê: {formatDate(document.data.prescriptionDate)}</div>
              </div>
            </div>

            <div className="text-center my-4">
              <h1 className="text-xl font-bold uppercase tracking-wide">ĐƠN THUỐC ĐIỀU TRỊ</h1>
            </div>

            {(() => {
              const ben = beneficiaries.find((b) => b.id === document.data.beneficiaryId);
              return (
                <div className="text-xs space-y-1 mb-4">
                  <div className="flex">
                    <span className="w-36 shrink-0">- Họ tên đối tượng:</span>
                    <span className="font-bold uppercase text-slate-900">{ben?.fullName}</span>
                    <span className="ml-6">Giới tính: {ben?.gender}</span>
                    <span className="ml-6">Năm sinh: {ben?.birthYear}</span>
                  </div>
                  <div className="flex">
                    <span className="w-36 shrink-0">- Số thẻ BHYT:</span>
                    <span className="font-mono font-bold text-teal-800">{ben?.insuranceNumber || 'Không có'}</span>
                    <span className="ml-6">Khu phòng: {ben?.roomArea}</span>
                  </div>
                  <div className="flex">
                    <span className="w-36 shrink-0">- Chẩn đoán:</span>
                    <span className="font-semibold">{document.data.diagnosis}</span>
                  </div>
                </div>
              );
            })()}

            <table className="w-full text-xs border-collapse border border-slate-900 mb-4">
              <thead>
                <tr className="bg-slate-100 font-bold text-center">
                  <th className="border border-slate-900 p-1.5 w-10">STT</th>
                  <th className="border border-slate-900 p-1.5">Tên thuốc & hàm lượng</th>
                  <th className="border border-slate-900 p-1.5 w-16">ĐVT</th>
                  <th className="border border-slate-900 p-1.5 w-20">Số lượng kê</th>
                  <th className="border border-slate-900 p-1.5">Liều dùng & Hướng dẫn sử dụng</th>
                </tr>
              </thead>
              <tbody>
                {document.data.items?.map((item, idx) => {
                  const med = medicines.find((m) => m.id === item.medicineId);
                  return (
                    <tr key={item.id}>
                      <td className="border border-slate-900 p-1.5 text-center">{idx + 1}</td>
                      <td className="border border-slate-900 p-1.5">
                        <div className="font-bold">{med?.name}</div>
                        <div className="text-2xs italic text-slate-700">{med?.activeIngredient}</div>
                      </td>
                      <td className="border border-slate-900 p-1.5 text-center">{med?.unit}</td>
                      <td className="border border-slate-900 p-1.5 text-center font-mono font-bold tabular-nums">
                        {item.prescribedQuantity}
                      </td>
                      <td className="border border-slate-900 p-1.5">
                        <div className="font-semibold">{item.dosage} - {item.frequency}</div>
                        <div className="text-2xs italic">{item.instructions} ({item.daysCount} ngày)</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {document.data.note && (
              <div className="text-xs italic mb-4">- Lời dặn của bác sĩ: {document.data.note}</div>
            )}

            <div className="flex justify-end mt-8">
              <div className="text-center text-xs w-48">
                <div className="font-bold uppercase">Bác sĩ kê đơn</div>
                <div className="text-2xs italic">(Ký và ghi rõ họ tên)</div>
                <div className="h-16"></div>
                <div className="font-semibold">{document.data.doctorName}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
