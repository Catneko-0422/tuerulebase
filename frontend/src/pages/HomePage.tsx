import Bar from '@/components/Bar';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  if (!user) {
    return null; // ProtectedRoute 會處理重導向，這裡只要防呆即可
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div>
        <Bar />
      </div>
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">系統首頁</h1>
        </div>
        
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
          <h2 className="text-xl font-semibold mb-4 text-slate-700">使用者資訊</h2>
          <div className="space-y-3">
            <div className="flex border-b border-slate-200 pb-2">
              <span className="font-medium text-slate-500 w-32">使用者 ID</span>
              <span className="text-slate-800">{user.id}</span>
            </div>
            <div className="flex border-b border-slate-200 pb-2">
              <span className="font-medium text-slate-500 w-32">帳號</span>
              <span className="text-slate-800">{user.username}</span>
            </div>
            <div className="flex border-b border-slate-200 pb-2">
              <span className="font-medium text-slate-500 w-32">角色權限</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                {user.role}
              </span>
            </div>
            <div className="flex pt-2">
              <span className="font-medium text-slate-500 w-32">超級管理員</span>
              <span className={`font-bold ${user.is_superuser ? 'text-green-600' : 'text-slate-400'}`}>
                {user.is_superuser ? '是' : '否'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
