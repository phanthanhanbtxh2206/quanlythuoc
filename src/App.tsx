/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthView } from './components/auth/AuthView';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { MedicineListView } from './components/medicines/MedicineListView';
import { BeneficiaryListView } from './components/beneficiaries/BeneficiaryListView';
import { MedicineSourceView } from './components/sources/MedicineSourceView';
import { StockReceiptListView } from './components/stock-receipts/StockReceiptListView';
import { StockIssueListView } from './components/stock-issues/StockIssueListView';
import { InventoryView } from './components/inventory/InventoryView';
import { PrescriptionListView } from './components/prescriptions/PrescriptionListView';
import { DispensationView } from './components/dispensations/DispensationView';
import { BeneficiaryReportView } from './components/reports/BeneficiaryReportView';
import { GeneralReportView } from './components/reports/GeneralReportView';
import { SyncSheetsDriveView } from './components/sync/SyncSheetsDriveView';
import { UserManagementView } from './components/users/UserManagementView';
import { AuditLogView } from './components/audit/AuditLogView';
import { GoogleSyncGuidanceBar } from './components/sync/GoogleSyncGuidanceBar';
import { TemplateSettingsView } from './components/settings/TemplateSettingsView';

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

function MainApp() {
  const { isAuthenticated, currentUser, hasPermission } = useApp();
  const [activeTab, setActiveTab] = useState<string>('stock-receipts');
  const [reportBeneficiaryId, setReportBeneficiaryId] = useState<string | undefined>(undefined);
  const [dispensePrescriptionId, setDispensePrescriptionId] = useState<string | undefined>(undefined);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const canManageSync = currentUser?.role === 'ADMIN' && hasPermission('canManageSync');

  const handleNavigateToReport = (benId: string) => {
    setReportBeneficiaryId(benId);
    setActiveTab('beneficiary-report');
  };

  const handleNavigateToDispense = (prescId: string) => {
    setDispensePrescriptionId(prescId);
    setActiveTab('dispensations');
  };

  return (
    <AnimatePresence mode="wait">
      {!isAuthenticated ? (
        <motion.div
          key="auth-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
        >
          <AuthView />
        </motion.div>
      ) : (
        <motion.div
          key="workspace-screen"
          initial={{ opacity: 0, y: 12, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.985 }}
          transition={{ duration: 0.32, ease: EASE_OUT }}
          className="flex h-[100dvh] w-full overflow-hidden bg-slate-100 text-slate-800 font-sans antialiased"
        >
          {/* Sidebar Navigation (Desktop + Mobile Drawer) */}
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Header */}
            <Header
              activeTab={activeTab}
              onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
            />

            {/* Viewport Scrollable Area */}
            <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6">
              <div className="max-w-7xl mx-auto">
                {/* Top Auto-Backup & Sync Guidance Bar (ADMIN ONLY) */}
                {canManageSync && <GoogleSyncGuidanceBar />}

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 18, scale: 0.988 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 0.992 }}
                    transition={{ duration: 0.26, ease: EASE_OUT }}
                  >
                    {activeTab === 'dashboard' && <DashboardView onNavigate={(tab) => setActiveTab(tab)} />}
                    {activeTab === 'medicines' && <MedicineListView />}
                    {activeTab === 'beneficiaries' && (
                      <BeneficiaryListView onSelectReportBeneficiary={handleNavigateToReport} />
                    )}
                    {activeTab === 'sources' && <MedicineSourceView />}
                    {activeTab === 'stock-receipts' && <StockReceiptListView />}
                    {activeTab === 'stock-issues' && <StockIssueListView />}
                    {activeTab === 'inventory' && <InventoryView />}
                    {activeTab === 'prescriptions' && (
                      <PrescriptionListView onNavigateToDispense={handleNavigateToDispense} />
                    )}
                    {activeTab === 'dispensations' && (
                      <DispensationView initialPrescriptionId={dispensePrescriptionId} />
                    )}
                    {activeTab === 'beneficiary-report' && (
                      <BeneficiaryReportView initialBeneficiaryId={reportBeneficiaryId} />
                    )}
                    {activeTab === 'template-settings' && <TemplateSettingsView />}
                    {activeTab === 'general-reports' && <GeneralReportView />}
                    {activeTab === 'sync' &&
                      (canManageSync ? (
                        <SyncSheetsDriveView />
                      ) : (
                        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
                          <h3 className="text-base font-bold text-slate-900">Quyền truy cập bị hạn chế</h3>
                          <p className="text-xs text-slate-600 max-w-md mx-auto">
                            Chỉ tài khoản Quản trị viên (Admin) mới có quyền xem giao diện và sử dụng tính năng sao lưu, đồng bộ Google Sheets &amp; Google Drive.
                          </p>
                        </div>
                      ))}
                    {activeTab === 'users' && <UserManagementView />}
                    {activeTab === 'audit' && <AuditLogView />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </main>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <MainApp />
      </AppProvider>
    </MotionConfig>
  );
}
