import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/favicon.png';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth';
import { ApiError } from '@/lib/api';

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');

  const validatePassword = (pwd: string) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    return regex.test(pwd);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!validatePassword(password)) {
      setError('密碼格式錯誤：需至少 8 碼且包含大小寫英文');
      setIsLoading(false);
      return;
    }

    try {
      // 使用 Service 進行 API 呼叫
      const data = await authService.login(username, password);
      
      // 使用 Context 更新全域狀態
      login(data.data.user);
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        // 可以在這裡針對特定錯誤碼做處理，例如 429 Too Many Requests
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : '發生錯誤，請稍後再試');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await authService.forgotPassword(forgotUsername);
      alert('已送出請求，請通知管理員協助重設密碼');
      setIsForgotModalOpen(false);
    } catch (err) {
      alert('請求失敗，請稍後再試');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 pb-32 gap-1">
      <img src={logo} alt="Logo" className="h-24 w-auto" />

      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-fade-in-up border border-slate-100">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800">歡迎回來</h1>
            <p className="text-slate-500 mt-2">請輸入您的帳號以登入系統</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">
                帳號
              </label>
              <input
                id="username"
                type="text"
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 bg-slate-50 hover:bg-white"
                placeholder="請輸入帳號"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  密碼
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-sm text-indigo-600 hover:text-indigo-500 transition-colors cursor-pointer"
                >
                  忘記密碼？
                </button>
              </div>
              <input
                id="password"
                type="password"
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 bg-slate-50 hover:bg-white"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 active:scale-95"
            >
              {isLoading ? '登入中...' : '登入系統'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            還沒有帳號？{' '}
            <a href="#" className="text-indigo-600 hover:text-indigo-500 font-medium transition-colors">
              聯絡 IT 部門
            </a>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">忘記密碼</h3>
              <button onClick={() => setIsForgotModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleForgotPassword} className="p-6 space-y-4">
              <p className="text-sm text-slate-500">請輸入您的帳號，系統將通知管理員協助重設。</p>
              <div>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="請輸入帳號"
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition-colors cursor-pointer"
              >
                送出請求
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPage;