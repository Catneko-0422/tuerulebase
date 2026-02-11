import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '@/pages/Auth/LoginPage'
import HomePage from '@/pages/HomePage'
import UserManagementPage from '@/pages/Admin/UserManagementPage'
import ChangePasswordPage from '@/pages/Auth/ChangePasswordPage'
import RulesPage from '@/pages/Rules/RulesPage'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          {/* 受保護的路由區域 */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/admin/users" element={<UserManagementPage />} />
            <Route path="/rules" element={<RulesPage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
