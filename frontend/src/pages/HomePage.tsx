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
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl mt-8 p-8 border border-slate-100">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">系統首頁</h1>
        </div>
        <div className="text-lg text-slate-600">
          <p>歡迎使用規則管理系統！</p>
          <p className="mt-4">請使用側邊欄的導覽列來管理您的規則和節點。</p>
        </div>
      </div>
    </div>
  );
}
