import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PurchaseOrderProvider } from './context/PurchaseOrderContext';
import { ProductionProvider } from './context/ProductionContext';
import { TNAProvider } from './context/TNAContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy Load Pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));

// Masters
const SupplierList = lazy(() => import('./pages/SupplierList'));
const SupplierForm = lazy(() => import('./pages/SupplierForm'));
const ItemList = lazy(() => import('./pages/ItemList'));
const ItemForm = lazy(() => import('./pages/ItemForm'));
const ItemDetails = lazy(() => import('./pages/ItemDetails'));
const StyleList = lazy(() => import('./pages/StyleList'));
const StyleForm = lazy(() => import('./pages/StyleForm'));
const StyleDetails = lazy(() => import('./pages/StyleDetails'));

// Procurement
const PurchaseOrderList = lazy(() => import('./pages/PurchaseOrderList'));
const PurchaseOrderForm = lazy(() => import('./pages/PurchaseOrderForm'));
const ChallanList = lazy(() => import('./pages/ChallanList'));
const ChallanForm = lazy(() => import('./pages/ChallanForm'));
const ChallanDetails = lazy(() => import('./pages/ChallanDetails'));
const OutwardChallanList = lazy(() => import('./pages/OutwardChallanList'));
const OutwardChallanForm = lazy(() => import('./pages/OutwardChallanForm'));
const OutwardChallanDetails = lazy(() => import('./pages/OutwardChallanDetails'));
const InvoiceList = lazy(() => import('./pages/InvoiceList'));
const InvoiceForm = lazy(() => import('./pages/InvoiceForm'));
const InvoiceDetails = lazy(() => import('./pages/InvoiceDetails'));
const BarcodeGenerator = lazy(() => import('./pages/BarcodeGenerator'));
const InventoryList = lazy(() => import('./pages/InventoryList'));
const CostingList = lazy(() => import('./pages/CostingList'));
const CostingForm = lazy(() => import('./pages/CostingForm'));
const CostingDetails = lazy(() => import('./pages/CostingDetails'));

// Production & Manufacturing
const ProductionMasters = lazy(() => import('./pages/ProductionMasters'));
const ProductionOrderList = lazy(() => import('./pages/ProductionOrderList'));
const ProductionOrderForm = lazy(() => import('./pages/ProductionOrderForm'));
const ProductionOrderDetails = lazy(() => import('./pages/ProductionOrderDetails'));
const CuttingList = lazy(() => import('./pages/CuttingList'));
const CuttingForm = lazy(() => import('./pages/CuttingForm'));
const CuttingDetails = lazy(() => import('./pages/CuttingDetails'));
const StitchingList = lazy(() => import('./pages/StitchingList'));
const CuttingReceiving = lazy(() => import('./pages/CuttingReceiving'));
const StitchingProduction = lazy(() => import('./pages/StitchingProduction'));
const StitchingIssueForm = lazy(() => import('./pages/StitchingIssueForm'));
const StitchingIssueDetails = lazy(() => import('./pages/StitchingIssueDetails'));
const FinishingList = lazy(() => import('./pages/FinishingList'));
const FinishingInspectionForm = lazy(() => import('./pages/FinishingInspectionForm'));
const CartonPacking = lazy(() => import('./pages/CartonPacking'));
const MaterialIssueList = lazy(() => import('./pages/MaterialIssueList'));
const FinishingReceiveList = lazy(() => import('./pages/FinishingReceiveList'));
const FinishingReceiveForm = lazy(() => import('./pages/FinishingReceiveForm'));
const DispatchList = lazy(() => import('./pages/DispatchList'));
const DispatchForm = lazy(() => import('./pages/DispatchForm'));
const MaterialIssueForm = lazy(() => import('./pages/MaterialIssueForm'));
const FabricIssueList = lazy(() => import('./pages/FabricIssueList'));
const FabricIssueForm = lazy(() => import('./pages/FabricIssueForm'));
const FabricIssueDetails = lazy(() => import('./pages/FabricIssueDetails'));
const CuttingFabricReceiving = lazy(() => import('./pages/CuttingFabricReceiving'));

// TNA
const TNADashboard = lazy(() => import('./pages/tna/TNADashboard'));
const TNATemplateList = lazy(() => import('./pages/tna/TNATemplateList'));
const TNATemplateForm = lazy(() => import('./pages/tna/TNATemplateForm'));
const TNAReports = lazy(() => import('./pages/tna/TNAReports'));
const TNAPlanDetails = lazy(() => import('./pages/tna/TNAPlanDetails'));
const TNACreate = lazy(() => import('./pages/tna/TNACreate'));

// HR Module
const HRDashboard = lazy(() => import('./pages/hr/HRDashboard'));
const EmployeeManagement = lazy(() => import('./pages/hr/EmployeeManagement'));
const AttendanceMarking = lazy(() => import('./pages/hr/AttendanceMarking'));
const SalaryCalculation = lazy(() => import('./pages/hr/SalaryCalculation'));

// Admin
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const MigrationTool = lazy(() => import('./components/MigrationTool'));

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <PurchaseOrderProvider>
          <ProductionProvider>
            <TNAProvider>
              <Router>
                <Suspense fallback={<LoadingSpinner />}>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }>
                      <Route index element={<Dashboard />} />
                      <Route path="suppliers" element={<SupplierList />} />
                      <Route path="suppliers/new" element={<SupplierForm />} />
                      <Route path="suppliers/edit/:id" element={<SupplierForm />} />
                      <Route path="items" element={<ItemList />} />
                      <Route path="items/new" element={<ItemForm />} />
                      <Route path="items/edit/:id" element={<ItemForm />} />
                      <Route path="items/:id" element={<ItemDetails />} />
                      <Route path="styles" element={<StyleList />} />
                      <Route path="styles/new" element={<StyleForm />} />
                      <Route path="styles/edit/:id" element={<StyleForm />} />
                      <Route path="styles/:id" element={<StyleDetails />} />
                      <Route path="purchase-orders" element={<PurchaseOrderList />} />
                      <Route path="purchase-orders/new" element={<PurchaseOrderForm />} />
                      <Route path="purchase-orders/edit/:id" element={<PurchaseOrderForm />} />
                      <Route path="challans" element={<ChallanList />} />
                      <Route path="challans/new" element={<ChallanForm />} />
                      <Route path="challans/edit/:id" element={<ChallanForm />} />
                      <Route path="challans/:id" element={<ChallanDetails />} />
                      <Route path="challans/view/:id" element={<ChallanDetails />} />
                      <Route path="outward-challans" element={<OutwardChallanList />} />
                      <Route path="outward-challans/new" element={<OutwardChallanForm />} />
                      <Route path="outward-challans/edit/:id" element={<OutwardChallanForm />} />
                      <Route path="outward-challans/:id" element={<OutwardChallanDetails />} />
                      <Route path="invoices" element={<InvoiceList />} />
                      <Route path="invoices/new" element={<InvoiceForm />} />
                      <Route path="invoices/edit/:id" element={<InvoiceForm />} />
                      <Route path="invoices/:id" element={<InvoiceDetails />} />
                      <Route path="invoices/:id/barcodes" element={<BarcodeGenerator />} />
                      <Route path="challans/:id/barcodes" element={<BarcodeGenerator />} />
                      <Route path="inventory" element={<InventoryList />} />
                      <Route path="costing" element={<CostingList />} />
                      <Route path="costing/new" element={<CostingForm />} />
                      <Route path="costing/edit/:id" element={<CostingForm />} />
                      <Route path="costing/:id" element={<CostingDetails />} />

                      {/* Manufacturing Routes */}
                      <Route path="cutting" element={<CuttingList />} />
                      <Route path="cutting/new" element={<CuttingForm />} />
                      <Route path="cutting/edit/:id" element={<CuttingForm />} />
                      <Route path="cutting/:id" element={<CuttingDetails />} />
                      <Route path="cutting/fabric-issue" element={<FabricIssueList />} />
                      <Route path="cutting/fabric-issue/new" element={<FabricIssueForm />} />
                      <Route path="cutting/fabric-issue/edit/:id" element={<FabricIssueForm />} />
                      <Route path="cutting/fabric-issue/:id" element={<FabricIssueDetails />} />
                      <Route path="cutting/fabric-receive" element={<CuttingFabricReceiving />} />

                      <Route path="stitching" element={<StitchingList />} />
                      <Route path="stitching/receive" element={<CuttingReceiving />} />
                      <Route path="stitching/production" element={<StitchingProduction />} />
                      <Route path="stitching/issue/new" element={<StitchingIssueForm />} />
                      <Route path="stitching/issue/edit/:id" element={<StitchingIssueForm />} />
                      <Route path="stitching/issue/:id" element={<StitchingIssueDetails />} />

                      <Route path="production/material-issues" element={<MaterialIssueList />} />
                      <Route path="production/material-issues/new" element={<MaterialIssueForm />} />
                      <Route path="production/material-issues/edit/:id" element={<MaterialIssueForm />} />

                      <Route path="finishing" element={<FinishingList />} />
                      <Route path="finishing/new" element={<FinishingInspectionForm />} />
                      <Route path="finishing/packing" element={<CartonPacking />} />
                      <Route path="finishing/receive" element={<FinishingReceiveList />} />
                      <Route path="finishing/receive/new" element={<FinishingReceiveForm />} />
                      <Route path="finishing/receive/edit/:id" element={<FinishingReceiveForm />} />
                      <Route path="dispatch" element={<DispatchList />} />
                      <Route path="dispatch/new" element={<DispatchForm />} />
                      <Route path="dispatch/edit/:id" element={<DispatchForm />} />

                      {/* Production Masters restricted to Admin/Manager */}
                      <Route path="production-masters" element={
                        <ProtectedRoute allowedRoles={['admin', 'manager']}>
                          <ProductionMasters />
                        </ProtectedRoute>
                      } />
                      <Route path="production-orders" element={<ProductionOrderList />} />
                      <Route path="production-orders/new" element={<ProductionOrderForm />} />
                      <Route path="production-orders/edit/:id" element={<ProductionOrderForm />} />
                      <Route path="production-orders/:id" element={<ProductionOrderDetails />} />

                      {/* TNA Routes */}
                      <Route path="tna" element={<TNADashboard />} />
                      <Route path="tna/reports" element={<TNAReports />} />
                      <Route path="tna/new" element={<TNACreate />} />
                      <Route path="tna/templates" element={<TNATemplateList />} />
                      <Route path="tna/templates/new" element={<TNATemplateForm />} />
                      <Route path="tna/templates/edit/:id" element={<TNATemplateForm />} />
                      <Route path="tna/:id" element={<TNAPlanDetails />} />

                      {/* HR Routes restricted to Admin/Manager */}
                      <Route path="hr/employees" element={
                        <ProtectedRoute allowedRoles={['admin', 'manager']}>
                          <EmployeeManagement />
                        </ProtectedRoute>
                      } />
                      <Route path="hr/attendance" element={
                        <ProtectedRoute allowedRoles={['admin', 'manager']}>
                          <AttendanceMarking />
                        </ProtectedRoute>
                      } />
                      <Route path="hr/salaries" element={
                        <ProtectedRoute allowedRoles={['admin', 'manager']}>
                          <SalaryCalculation />
                        </ProtectedRoute>
                      } />
                      <Route path="hr" element={
                        <ProtectedRoute allowedRoles={['admin', 'manager']}>
                          <HRDashboard />
                        </ProtectedRoute>
                      } />

                      {/* Admin User Management */}
                      <Route path="admin/users" element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <UserManagement />
                        </ProtectedRoute>
                      } />

                      <Route path="tada" element={<div className="p-8 font-bold">TADA Module (Coming Soon)</div>} />
                    </Route>
                  </Routes>
                </Suspense>
              </Router>
            </TNAProvider>
          </ProductionProvider>
        </PurchaseOrderProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
