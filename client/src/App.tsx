import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminRoute, ProtectedRoute, StaffRoute } from "@/components/auth-gate";
import LoginPage from "@/pages/Login";
import RegisterPage from "@/pages/Register";
import VerifyEmailRoute, { VerifyEmailPage } from "@/pages/VerifyEmail";
import ForgotPasswordPage from "@/pages/ForgotPassword";
import ResetPasswordPage from "@/pages/ResetPassword";
import DashboardPage from "@/pages/Dashboard";
import StudentsPage from "@/pages/Students";
import StudentDetailPage from "@/pages/StudentDetail";
import TeachersPage from "@/pages/Teachers";
import ClassesPage from "@/pages/Classes";
import AttendancePage from "@/pages/Attendance";
import ExamsPage from "@/pages/Exams";
import ExamDetailPage from "@/pages/ExamDetail";
import ReportsPage from "@/pages/Reports";
import ProfilePage from "@/pages/Profile";
import SettingsPage from "@/pages/Settings";
import SecurityPage from "@/pages/Security";
import AdminOverviewPage from "@/pages/admin/AdminOverview";
import AdminUsersPage from "@/pages/admin/AdminUsers";
import AdminRolesPage from "@/pages/admin/AdminRoles";
import AdminActivityPage from "@/pages/admin/AdminActivity";
import NotFoundPage from "@/pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailRoute />} />
      <Route path="/verify-email-change" element={<VerifyEmailPage mode="change" />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route element={<StaffRoute />}>
            <Route index element={<DashboardPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="students/:id" element={<StudentDetailPage />} />
            <Route path="classes" element={<ClassesPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="exams" element={<ExamsPage />} />
            <Route path="exams/:id" element={<ExamDetailPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route
              path="teachers"
              element={
                <AdminRoute>
                  <TeachersPage />
                </AdminRoute>
              }
            />
          </Route>

          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="security" element={<SecurityPage />} />

          <Route
            path="admin"
            element={
              <AdminRoute>
                <AdminOverviewPage />
              </AdminRoute>
            }
          />
          <Route
            path="admin/users"
            element={
              <AdminRoute>
                <AdminUsersPage />
              </AdminRoute>
            }
          />
          <Route
            path="admin/roles"
            element={
              <AdminRoute>
                <AdminRolesPage />
              </AdminRoute>
            }
          />
          <Route
            path="admin/activity"
            element={
              <AdminRoute>
                <AdminActivityPage />
              </AdminRoute>
            }
          />

          <Route path="404" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
