import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminRoute, ProtectedRoute } from "@/components/auth-gate";
import LoginPage from "@/pages/Login";
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
import NotFoundPage from "@/pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="students/:id" element={<StudentDetailPage />} />
          <Route
            path="teachers"
            element={
              <AdminRoute>
                <TeachersPage />
              </AdminRoute>
            }
          />
          <Route path="classes" element={<ClassesPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="exams" element={<ExamsPage />} />
          <Route path="exams/:id" element={<ExamDetailPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="404" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
