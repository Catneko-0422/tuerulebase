import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/auth';
import { useAuth } from '@/contexts/AuthContext';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth(); // We need login to update the user state locally
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (pwd: string) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    return regex.test(pwd);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('兩次輸入的密碼不一致');
      return;
    }

    if (!validatePassword(password)) {
      setError('密碼長度需至少 8 碼，且包含大小寫英文');
      return;
    }

    setIsLoading(true);

    try {
      await authService.changePassword(currentPassword, password);
      
      // Update local user state to reflect is_password_changed = true
      if (user) {
        const updatedUser = { ...user, is_password_changed: true };
        login(updatedUser);
      }
      
      alert('密碼修改成功，請繼續使用系統');
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改失敗');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-fade-in-up border border-slate-100">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800">修改密碼</h1>
            <p className="text-slate-500 mt-2">為了您的帳戶安全，請設定新的密碼</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-slate-700 mb-1">
                目前密碼
              </label>
              <input
                id="current-password"
                type="password"
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="請輸入目前使用的密碼"
              />
            </div>

            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 mb-1">
                新密碼
              </label>
              <input
                id="new-password"
                type="password"
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入新密碼"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1">
                確認新密碼
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="請再次輸入新密碼"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg shadow-md transition-all disabled:opacity-70"
            >
              {isLoading ? '處理中...' : '確認修改'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}