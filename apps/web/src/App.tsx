import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { QrSurveyPage } from "./pages/survey/QrSurveyPage";
import { ThankYouPage } from "./pages/survey/ThankYouPage";
import { StaffSurveyPage } from "./pages/survey/StaffSurveyPage";
import { QrAdminPage } from "./pages/admin/QrAdminPage";
import { ShopDashboardPage } from "./pages/dashboard/ShopDashboardPage";
import { GetQrPage } from "./pages/public/GetQrPage";
import { AdminLayout } from "./components/AdminLayout";
import { AdminReportsPage } from "./pages/admin/AdminReportsPage";
import { AdminSessionsPage } from "./pages/admin/AdminSessionsPage";
import { AdminQuestionsPage } from "./pages/admin/AdminQuestionsPage";

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<GetQrPage />} />
        <Route path="/lay-qr" element={<GetQrPage />} />
        <Route path="/s/:token" element={<QrSurveyPage />} />
        <Route path="/s/:token/thank-you" element={<ThankYouPage />} />

        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/app" element={<Navigate to="/app/survey" replace />} />
            <Route path="/app/survey" element={<StaffSurveyPage />} />
            <Route element={<ProtectedRoute roles={["ADMIN", "REGION_MANAGER", "SHOP_MANAGER"]} />}>
              <Route path="/app/dashboard" element={<ShopDashboardPage />} />
              <Route path="/app/qr" element={<QrAdminPage />} />
            </Route>
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<Navigate to="/admin/reports" replace />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
            <Route path="/admin/sessions" element={<AdminSessionsPage />} />
            <Route path="/admin/questions" element={<AdminQuestionsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
