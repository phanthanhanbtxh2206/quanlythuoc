/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { StockReceipt, StockIssue, Prescription, BeneficiaryReportRow, Beneficiary } from '../../types';
import { formatDate, formatCurrency, formatNumber } from '../../utils/formatters';
import { numberToVietnameseWords } from '../../utils/numberToVietnameseWords';
import { useApp } from '../../context/AppContext';
import { Printer, Cloud, Check, Edit3, HelpCircle } from 'lucide-react';

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
          reportTitle?: string;
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
  const { medicines, beneficiaries, syncDocumentToDrive, templateSettings } = useApp();
  const [driveSaved, setDriveSaved] = useState(false);
  const [isLiveEditable, setIsLiveEditable] = useState(false);

  if (!document) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSaveToDrive = () => {
    let docCode = '';
    let docType: 'PHIEU_NHAP' | 'PHIEU_XUAT' | 'DON_THUOC' | 'BAO_CAO_BHYT' = 'PHIEU_NHAP';
    let fileName = '';

    if (document.type === 'RECEIPT') {
      docCode = document.data.receiptCode;
      docType = 'PHIEU_NHAP';
      fileName = `${document.data.receiptCode}.pdf`;
    } else if (document.type === 'ISSUE') {
      docCode = document.data.issueCode;
      docType = 'PHIEU_XUAT';
      fileName = `${document.data.issueCode}.pdf`;
    } else if (document.type === 'PRESCRIPTION') {
      docCode = document.data.code;
      docType = 'DON_THUOC';
      fileName = `${document.data.code}.pdf`;
    } else if (document.type === 'BENEFICIARY_REPORT') {
      docCode = `BC-${document.data.beneficiary.code}-${document.data.startDate}_${document.data.endDate}`;
      docType = 'BAO_CAO_BHYT';
      fileName = `BaoCao_BHYT_${document.data.beneficiary.code}_${document.data.startDate}.pdf`;
    }

    syncDocumentToDrive(docCode, docType, fileName);
    setDriveSaved(true);
    setTimeout(() => setDriveSaved(false), 3000);
  };

  return (
    <Modal
      isOpen={!!document}
      onClose={onClose}
      title="Xem Trước Biểu Mẫu In Chuẩn Khổ A4"
      subtitle="Định dạng biểu mẫu hành chính theo đúng mẫu Excel của TT Bảo Trợ Xã Hội Đà Nẵng"
      maxWidth="5xl"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200">
        <div className="text-xs text-slate-500">
          Biểu mẫu chuẩn hóa tương thích trang in A4, giữ nguyên tiêu đề, mã QHNS và 4 khung chữ ký.
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
          <button
            onClick={handleSaveToDrive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-600 text-teal-700 hover:bg-teal-50 text-xs font-semibold transition-colors"
          >
            {driveSaved ? <Check className="w-4 h-4 text-emerald-600" /> : <Cloud className="w-4 h-4" />}
            <span>{driveSaved ? 'Đã lưu Drive' : 'Lưu Drive'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>In Ngay (A4)</span>
          </button>
        </div>
      </div>

      {isLiveEditable && (
        <div className="mb-4 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Chế độ sửa trực tiếp đang BẬT:</strong> Bạn có thể nhấp chuột vào bất kỳ đoạn chữ, số liệu, dòng họ tên, chức danh hoặc tiêu đề nào trên tờ giấy A4 bên dưới để chỉnh sửa trước khi gửi in hoặc lưu!
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
            {/* Header: Đơn vị & Tiêu đề */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="font-bold text-xs uppercase">{templateSettings.agencyName}</div>
                <div className="text-xs uppercase font-medium">{templateSettings.deptName}</div>
                <div className="text-xs">Mã QHNS: <span className="font-mono font-bold">{templateSettings.qhnsCode}</span></div>
              </div>
              <div className="text-right text-xs">
                <div>{templateSettings.receiptFormCode}</div>
                <div>{templateSettings.receiptNotice}</div>
                <div className="mt-1">Số: <span className="font-bold font-mono">{document.data.receiptCode}</span></div>
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

            {/* General Info */}
            <div className="text-xs space-y-1.5 mb-4">
              <div className="flex">
                <span className="w-48 shrink-0">- Họ tên người giao hàng:</span>
                <span className="font-semibold">{document.data.delivererName}</span>
              </div>
              <div className="flex">
                <span className="w-48 shrink-0">- Địa chỉ / Bộ phận giao:</span>
                <span>{document.data.delivererDept}</span>
              </div>
              <div className="flex">
                <span className="w-48 shrink-0">- Theo hóa đơn số:</span>
                <span className="font-mono font-bold mr-6">{document.data.invoiceNumber || '................'}</span>
                <span className="mr-2">ngày:</span>
                <span className="mr-6">{formatDate(document.data.invoiceDate)}</span>
                <span className="mr-2">của:</span>
                <span className="font-semibold">{document.data.supplierName}</span>
              </div>
              <div className="flex">
                <span className="w-48 shrink-0">- Nội dung nhập kho:</span>
                <span>{document.data.content}</span>
              </div>
              {(document.data.beneficiaryName || document.data.beneficiaryId) && (
                <div className="flex">
                  <span className="w-48 shrink-0">- Đối tượng liên quan:</span>
                  <span className="font-bold text-slate-900">
                    {document.data.beneficiaryName ||
                      beneficiaries.find((b) => b.id === document.data.beneficiaryId)?.fullName ||
                      'Chung'}
                  </span>
                </div>
              )}
              <div className="flex">
                <span className="w-48 shrink-0">- Nhập tại kho:</span>
                <span>{templateSettings.receiptDefaultWarehouse}</span>
              </div>
            </div>

            {/* Table */}
            <table className="w-full text-xs border-collapse border border-slate-900 mb-4">
              <thead>
                <tr className="bg-slate-100 font-bold text-center">
                  <th className="border border-slate-900 p-1.5 w-10">STT</th>
                  <th className="border border-slate-900 p-1.5">Tên thuốc, nhãn hiệu, quy cách, phẩm chất</th>
                  <th className="border border-slate-900 p-1.5 w-20">Mã số</th>
                  <th className="border border-slate-900 p-1.5 w-16">ĐVT</th>
                  <th className="border border-slate-900 p-1.5 w-24">Số lô</th>
                  <th className="border border-slate-900 p-1.5 w-16">Số lượng chứng từ</th>
                  <th className="border border-slate-900 p-1.5 w-16">Thực nhập</th>
                  <th className="border border-slate-900 p-1.5 w-20">Đơn giá (₫)</th>
                  <th className="border border-slate-900 p-1.5 w-24">Thành tiền (₫)</th>
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
                      <td className="border border-slate-900 p-1.5 text-right font-mono">
                        {formatNumber(item.docQuantity)}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-right font-mono font-bold">
                        {formatNumber(item.actualQuantity)}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-right font-mono">
                        {formatNumber(item.unitPrice)}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-right font-mono font-bold">
                        {formatNumber(item.totalPrice)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="font-bold bg-slate-50">
                  <td colSpan={8} className="border border-slate-900 p-1.5 text-right uppercase">
                    Cộng thành tiền:
                  </td>
                  <td className="border border-slate-900 p-1.5 text-right font-mono font-bold">
                    {formatNumber(document.data.totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Total In Words */}
            <div className="text-xs mb-6">
              - Tổng số tiền (viết bằng chữ):{' '}
              <span className="font-bold italic">{numberToVietnameseWords(document.data.totalAmount)}</span>.
            </div>

            {/* 4 Signatures Grid */}
            <div className="grid grid-cols-4 text-center text-xs gap-4 mt-6">
              <div>
                <div className="font-bold uppercase">Người giao hàng</div>
                <div className="text-2xs italic">(Ký, họ tên)</div>
                <div className="h-16"></div>
                <div className="font-semibold">{document.data.delivererName}</div>
              </div>
              <div>
                <div className="font-bold uppercase">Thủ kho</div>
                <div className="text-2xs italic">(Ký, họ tên)</div>
                <div className="h-16"></div>
                <div className="font-semibold">{templateSettings.warehouseKeeperName}</div>
              </div>
              <div>
                <div className="font-bold uppercase">Kế toán trưởng</div>
                <div className="text-2xs italic">(Ký, họ tên)</div>
                <div className="h-16"></div>
                <div className="font-semibold">{templateSettings.accountantName}</div>
              </div>
              <div>
                <div className="font-bold uppercase">Thủ trưởng đơn vị</div>
                <div className="text-2xs italic">(Ký, họ tên, đóng dấu)</div>
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
                <div className="text-xs">Mã QHNS: <span className="font-mono font-bold">{templateSettings.qhnsCode}</span></div>
              </div>
              <div className="text-right text-xs">
                <div>{templateSettings.issueFormCode}</div>
                <div>{templateSettings.issueNotice}</div>
                <div className="mt-1">Số: <span className="font-bold font-mono">{document.data.issueCode}</span></div>
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
                <span className="w-48 shrink-0">- Họ tên người nhận hàng:</span>
                <span className="font-semibold">{document.data.receiverName}</span>
              </div>
              <div className="flex">
                <span className="w-48 shrink-0">- Bộ phận / Địa chỉ:</span>
                <span>{document.data.receiverDept}</span>
              </div>
              <div className="flex">
                <span className="w-48 shrink-0">- Lý do xuất kho:</span>
                <span>{document.data.reason}</span>
              </div>
              <div className="flex">
                <span className="w-48 shrink-0">- Đối tượng nhận thuốc:</span>
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
                <span className="w-48 shrink-0">- Xuất tại kho:</span>
                <span>{templateSettings.issueDefaultWarehouse}</span>
              </div>
              <div className="flex">
                <span className="w-48 shrink-0">- Địa điểm sử dụng:</span>
                <span>{document.data.usageLocation}</span>
              </div>
            </div>

            <table className="w-full text-xs border-collapse border border-slate-900 mb-4">
              <thead>
                <tr className="bg-slate-100 font-bold text-center">
                  <th className="border border-slate-900 p-1.5 w-10">STT</th>
                  <th className="border border-slate-900 p-1.5">Tên thuốc, nhãn hiệu, quy cách</th>
                  <th className="border border-slate-900 p-1.5 w-16">Mã số</th>
                  <th className="border border-slate-900 p-1.5 w-16">ĐVT</th>
                  <th className="border border-slate-900 p-1.5 w-24">Số lô</th>
                  <th className="border border-slate-900 p-1.5 w-16">Yêu cầu</th>
                  <th className="border border-slate-900 p-1.5 w-16">Thực xuất</th>
                  <th className="border border-slate-900 p-1.5 w-20">Đơn giá (₫)</th>
                  <th className="border border-slate-900 p-1.5 w-24">Thành tiền (₫)</th>
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
                      <td className="border border-slate-900 p-1.5 text-right font-mono">
                        {formatNumber(item.requestedQuantity)}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-right font-mono font-bold">
                        {formatNumber(item.actualQuantity)}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-right font-mono">
                        {formatNumber(item.unitPrice)}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-right font-mono font-bold">
                        {formatNumber(item.totalPrice)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="font-bold bg-slate-50">
                  <td colSpan={8} className="border border-slate-900 p-1.5 text-right uppercase">
                    Cộng thành tiền:
                  </td>
                  <td className="border border-slate-900 p-1.5 text-right font-mono font-bold">
                    {formatNumber(document.data.totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="text-xs mb-6">
              - Tổng số tiền (viết bằng chữ):{' '}
              <span className="font-bold italic">{numberToVietnameseWords(document.data.totalAmount)}</span>.
            </div>

            <div className="grid grid-cols-4 text-center text-xs gap-4 mt-6">
              <div>
                <div className="font-bold uppercase">Người nhận hàng</div>
                <div className="text-2xs italic">(Ký, họ tên)</div>
                <div className="h-16"></div>
                <div className="font-semibold">{document.data.receiverName}</div>
              </div>
              <div>
                <div className="font-bold uppercase">Thủ kho</div>
                <div className="text-2xs italic">(Ký, họ tên)</div>
                <div className="h-16"></div>
                <div className="font-semibold">{templateSettings.warehouseKeeperName}</div>
              </div>
              <div>
                <div className="font-bold uppercase">Kế toán trưởng</div>
                <div className="text-2xs italic">(Ký, họ tên)</div>
                <div className="h-16"></div>
                <div className="font-semibold">{templateSettings.accountantName}</div>
              </div>
              <div>
                <div className="font-bold uppercase">Thủ trưởng đơn vị</div>
                <div className="text-2xs italic">(Ký, họ tên, đóng dấu)</div>
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
                <div className="font-bold text-xs uppercase">SỞ LAO ĐỘNG - THƯƠNG BINH VÀ XÃ HỘI TP ĐÀ NẴNG</div>
                <div className="font-bold text-xs uppercase">TRUNG TÂM BẢO TRỢ XÃ HỘI</div>
                <div className="text-2xs uppercase font-medium">PHÒNG Y TẾ - PHCN</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-xs uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div className="text-xs font-semibold italic">Độc lập - Tự do - Hạnh phúc</div>
                <div className="text-2xs italic mt-1">Đà Nẵng, ngày ..... tháng ..... năm 2026</div>
              </div>
            </div>

            <div className="text-center my-4">
              <h1 className="text-base font-bold uppercase tracking-wide">
                BẢNG TỔNG HỢP NHẬP, XUẤT THUỐC MUA NGOÀI CHO ĐỐI TƯỢNG CÓ BẢO HIỂM Y TẾ
              </h1>
              <div className="text-xs italic mt-1">
                Kỳ báo cáo: Từ ngày {formatDate(document.data.startDate)} đến ngày {formatDate(document.data.endDate)}
              </div>
              <div className="text-xs font-bold mt-1">
                Họ và tên đối tượng: <span className="uppercase text-slate-900">{document.data.beneficiary.fullName}</span>{' '}
                - Mã ĐT: <span className="font-mono">{document.data.beneficiary.code}</span> - Số thẻ BHYT:{' '}
                <span className="font-mono text-teal-800">{document.data.beneficiary.insuranceNumber}</span>
              </div>
            </div>

            {/* Exact 6-Column Cluster Table */}
            <table className="w-full text-2xs border-collapse border border-slate-900 mb-4">
              <thead>
                <tr className="bg-slate-100 font-bold text-center">
                  <th rowSpan={2} className="border border-slate-900 p-1 w-6">STT</th>
                  <th rowSpan={2} className="border border-slate-900 p-1 w-44">Tên thuốc và hàm lượng</th>
                  <th rowSpan={2} className="border border-slate-900 p-1 w-10">ĐVT</th>
                  <th colSpan={3} className="border border-slate-900 p-1 bg-amber-50/50">Tồn đầu kỳ</th>
                  <th colSpan={3} className="border border-slate-900 p-1 bg-blue-50/50">Nhập trong kỳ</th>
                  <th colSpan={3} className="border border-slate-900 p-1 bg-indigo-50/50">Tổng nhập</th>
                  <th colSpan={3} className="border border-slate-900 p-1 bg-rose-50/50">Xuất trong kỳ</th>
                  <th colSpan={3} className="border border-slate-900 p-1 bg-emerald-50/50">Tồn cuối kỳ</th>
                </tr>
                <tr className="bg-slate-100 font-semibold text-center text-3xs">
                  {/* Tồn đầu */}
                  <th className="border border-slate-900 p-1 w-10">SL</th>
                  <th className="border border-slate-900 p-1 w-14">Đơn giá</th>
                  <th className="border border-slate-900 p-1 w-16">Thành tiền</th>
                  {/* Nhập trong kỳ */}
                  <th className="border border-slate-900 p-1 w-10">SL</th>
                  <th className="border border-slate-900 p-1 w-14">Đơn giá</th>
                  <th className="border border-slate-900 p-1 w-16">Thành tiền</th>
                  {/* Tổng nhập */}
                  <th className="border border-slate-900 p-1 w-10">SL</th>
                  <th className="border border-slate-900 p-1 w-14">Đơn giá</th>
                  <th className="border border-slate-900 p-1 w-16">Thành tiền</th>
                  {/* Xuất trong kỳ */}
                  <th className="border border-slate-900 p-1 w-10">SL</th>
                  <th className="border border-slate-900 p-1 w-14">Đơn giá</th>
                  <th className="border border-slate-900 p-1 w-16">Thành tiền</th>
                  {/* Tồn cuối */}
                  <th className="border border-slate-900 p-1 w-10">SL</th>
                  <th className="border border-slate-900 p-1 w-14">Đơn giá</th>
                  <th className="border border-slate-900 p-1 w-16">Thành tiền</th>
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

                      {/* Tồn đầu */}
                      <td className="border border-slate-900 p-1 text-right font-mono">{formatNumber(row.openingQty)}</td>
                      <td className="border border-slate-900 p-1 text-right font-mono">{formatNumber(row.openingPrice)}</td>
                      <td className="border border-slate-900 p-1 text-right font-mono">{formatNumber(row.openingAmount)}</td>

                      {/* Nhập */}
                      <td className="border border-slate-900 p-1 text-right font-mono">{formatNumber(row.inQty)}</td>
                      <td className="border border-slate-900 p-1 text-right font-mono">{formatNumber(row.inPrice)}</td>
                      <td className="border border-slate-900 p-1 text-right font-mono">{formatNumber(row.inAmount)}</td>

                      {/* Tổng nhập */}
                      <td className="border border-slate-900 p-1 text-right font-mono font-bold">{formatNumber(row.totalInQty)}</td>
                      <td className="border border-slate-900 p-1 text-right font-mono">{formatNumber(row.totalInPrice)}</td>
                      <td className="border border-slate-900 p-1 text-right font-mono font-bold">{formatNumber(row.totalInAmount)}</td>

                      {/* Xuất */}
                      <td className="border border-slate-900 p-1 text-right font-mono">{formatNumber(row.outQty)}</td>
                      <td className="border border-slate-900 p-1 text-right font-mono">{formatNumber(row.outPrice)}</td>
                      <td className="border border-slate-900 p-1 text-right font-mono">{formatNumber(row.outAmount)}</td>

                      {/* Tồn cuối */}
                      <td className="border border-slate-900 p-1 text-right font-mono font-bold text-teal-900">{formatNumber(row.closingQty)}</td>
                      <td className="border border-slate-900 p-1 text-right font-mono">{formatNumber(row.closingPrice)}</td>
                      <td className="border border-slate-900 p-1 text-right font-mono font-bold text-teal-900">{formatNumber(row.closingAmount)}</td>
                    </tr>
                  ))
                )}

                {/* Grand Total Row */}
                {document.data.rows.length > 0 && (
                  <tr className="font-bold bg-slate-100">
                    <td colSpan={3} className="border border-slate-900 p-1.5 text-center uppercase">
                      Tổng cộng:
                    </td>
                    {/* Tồn đầu */}
                    <td className="border border-slate-900 p-1 text-right font-mono">
                      {formatNumber(document.data.rows.reduce((sum, r) => sum + r.openingQty, 0))}
                    </td>
                    <td className="border border-slate-900 p-1 text-right">-</td>
                    <td className="border border-slate-900 p-1 text-right font-mono">
                      {formatNumber(document.data.rows.reduce((sum, r) => sum + r.openingAmount, 0))}
                    </td>

                    {/* Nhập */}
                    <td className="border border-slate-900 p-1 text-right font-mono">
                      {formatNumber(document.data.rows.reduce((sum, r) => sum + r.inQty, 0))}
                    </td>
                    <td className="border border-slate-900 p-1 text-right">-</td>
                    <td className="border border-slate-900 p-1 text-right font-mono">
                      {formatNumber(document.data.rows.reduce((sum, r) => sum + r.inAmount, 0))}
                    </td>

                    {/* Tổng nhập */}
                    <td className="border border-slate-900 p-1 text-right font-mono">
                      {formatNumber(document.data.rows.reduce((sum, r) => sum + r.totalInQty, 0))}
                    </td>
                    <td className="border border-slate-900 p-1 text-right">-</td>
                    <td className="border border-slate-900 p-1 text-right font-mono">
                      {formatNumber(document.data.rows.reduce((sum, r) => sum + r.totalInAmount, 0))}
                    </td>

                    {/* Xuất */}
                    <td className="border border-slate-900 p-1 text-right font-mono">
                      {formatNumber(document.data.rows.reduce((sum, r) => sum + r.outQty, 0))}
                    </td>
                    <td className="border border-slate-900 p-1 text-right">-</td>
                    <td className="border border-slate-900 p-1 text-right font-mono">
                      {formatNumber(document.data.rows.reduce((sum, r) => sum + r.outAmount, 0))}
                    </td>

                    {/* Tồn cuối */}
                    <td className="border border-slate-900 p-1 text-right font-mono">
                      {formatNumber(document.data.rows.reduce((sum, r) => sum + r.closingQty, 0))}
                    </td>
                    <td className="border border-slate-900 p-1 text-right">-</td>
                    <td className="border border-slate-900 p-1 text-right font-mono">
                      {formatNumber(document.data.rows.reduce((sum, r) => sum + r.closingAmount, 0))}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Signatures */}
            <div className="grid grid-cols-3 text-center text-xs gap-6 mt-8">
              <div>
                <div className="font-bold uppercase">Người lập biểu</div>
                <div className="text-2xs italic">(Ký, họ tên)</div>
                <div className="h-16"></div>
                <div className="font-semibold">{document.data.customTitles?.preparerName || 'DS. Lê Thu Hà'}</div>
              </div>
              <div>
                <div className="font-bold uppercase">Phụ trách Phòng Y tế - PHCN</div>
                <div className="text-2xs italic">(Ký, họ tên)</div>
                <div className="h-16"></div>
                <div className="font-semibold">{document.data.customTitles?.deptLeaderName || 'BS. CKI. Nguyễn Thanh Long'}</div>
              </div>
              <div>
                <div className="font-bold uppercase">Thủ trưởng đơn vị</div>
                <div className="text-2xs italic">(Ký, họ tên, đóng dấu)</div>
                <div className="h-16"></div>
                <div className="font-semibold">{document.data.customTitles?.centerDirectorName || 'Lê Minh Tuấn'}</div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= CASE 4: ĐƠN THUỐC ĐIỀU TRỊ ======================= */}
        {document.type === 'PRESCRIPTION' && (
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="font-bold text-xs uppercase">TRUNG TÂM BẢO TRỢ XÃ HỘI</div>
                <div className="text-xs uppercase font-medium">PHÒNG Y TẾ - PHCN</div>
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
                      <td className="border border-slate-900 p-1.5 text-center font-mono font-bold">
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
