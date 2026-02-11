import { useEffect, useState, useMemo } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '@/services/user';
import type { CreateUserPayload } from '@/services/user';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/types/auth';
import Bar from '@/components/Bar';

export default function UserManagementPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<CreateUserPayload>({ username: '', password: '', role: 'staff', current_password: '', email: '' });
  const [error, setError] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [resetTargetId, setResetTargetId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [adminPasswordForReset, setAdminPasswordForReset] = useState('');
  const [adminPasswordForDelete, setAdminPasswordForDelete] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyRequested, setShowOnlyRequested] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof User; direction: 'ascending' | 'descending' } | null>({ key: 'username', direction: 'ascending' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 權限檢查：如果不是管理員，踢回首頁
  useEffect(() => {
    if (user && !user.is_superuser && user.role !== 'admin') {
      alert('您沒有權限訪問此頁面');
      navigate('/');
    }
  }, [user, navigate]);

  const fetchUsers = async () => {
    try {
      const data = await userService.getUsers();
      setUsers(data.data.users);
      setError('');
    } catch (err) {
      console.error(err);
      setError('無法載入用戶列表');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredAndSortedUsers = useMemo(() => {
    let sortableUsers = [...users];

    if (searchTerm) {
      sortableUsers = sortableUsers.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (showOnlyRequested) {
      sortableUsers = sortableUsers.filter(u => u.reset_password_requested);
    }

    if (sortConfig !== null) {
      sortableUsers.sort((a, b) => {
        const key = sortConfig.key;
        const valA = a[key] ?? '';
        const valB = b[key] ?? '';

        if (valA < valB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return sortableUsers;
  }, [users, searchTerm, showOnlyRequested, sortConfig]);

  const validatePassword = (pwd: string) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    return regex.test(pwd);
  };

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();

    if (!validatePassword(formData.password)) {
      alert('密碼長度需至少 8 碼，且包含大小寫英文');
      return;
    }

    if (formData.email && !validateEmail(formData.email)) {
      alert('Email 格式錯誤');
      return;
    }

    try {
      await userService.createUser(formData);
      setIsModalOpen(false);
      setFormData({ username: '', password: '', role: 'staff', current_password: '', email: '' }); // 重置表單
      fetchUsers(); // 重新整理列表
      alert('用戶新增成功');
    } catch (err) {
      alert(err instanceof Error ? err.message : '新增失敗');
    }
  };

  const handleDelete = (id: number) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (deleteTargetId === null) return;
    try {
      await userService.deleteUser(deleteTargetId, adminPasswordForDelete);
      setUsers(users.filter(u => u.id !== deleteTargetId));
      setDeleteTargetId(null);
      setAdminPasswordForDelete('');
    } catch (err) {
      alert(err instanceof Error ? err.message : '刪除失敗');
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (resetTargetId === null) return;

    if (!validatePassword(resetPassword)) {
      alert('密碼長度需至少 8 碼，且包含大小寫英文');
      return;
    }

    try {
      await userService.resetPassword(resetTargetId, resetPassword, adminPasswordForReset);
      setResetTargetId(null);
      setResetPassword('');
      setAdminPasswordForReset('');
      alert('密碼重設成功');
    } catch (err) {
      alert(err instanceof Error ? err.message : '重設失敗');
    }
  };

  const requestSort = (key: keyof User) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
  const currentUsers = filteredAndSortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <Bar />
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">用戶管理</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow transition-colors cursor-pointer"
          >
            + 新增用戶
          </button>
        </div>

        <div className="mb-4 flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="搜尋帳號或 Email..."
            className="w-full sm:w-64 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              checked={showOnlyRequested}
              onChange={e => setShowOnlyRequested(e.target.checked)}
            />
            <span className="text-sm text-slate-700">只顯示請求重設密碼的用戶</span>
          </label>
        </div>

        {error && <div className="text-red-500 mb-4">{error}</div>}

        <div className="bg-white rounded-xl shadow overflow-hidden border border-slate-200">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">載入中...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">
                    <button onClick={() => requestSort('username')} className="flex items-center gap-1 hover:text-indigo-600">
                      帳號 {sortConfig?.key === 'username' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}
                    </button>
                  </th>
                  <th className="p-4 font-semibold">
                    <button onClick={() => requestSort('email')} className="flex items-center gap-1 hover:text-indigo-600">
                      Email {sortConfig?.key === 'email' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}
                    </button>
                  </th>
                  <th className="p-4 font-semibold">
                    <button onClick={() => requestSort('role')} className="flex items-center gap-1 hover:text-indigo-600">
                      角色 {sortConfig?.key === 'role' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}
                    </button>
                  </th>
                  <th className="p-4 font-semibold text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-800">
                      {u.username}
                      {u.reset_password_requested && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                          請求重設
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-600">{u.email || '-'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {!u.is_superuser && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setResetTargetId(u.id)}
                            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium px-3 py-1 rounded hover:bg-indigo-50 transition-colors cursor-pointer"
                          >
                            重設密碼
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium px-3 py-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            刪除
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {currentUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">目前沒有其他用戶</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center items-center gap-2 text-sm">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一頁
            </button>
            <span className="text-slate-600">
              第 {currentPage} / {totalPages} 頁
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一頁
            </button>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">新增用戶</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">帳號</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">密碼</label>
                <input
                  type="password"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  placeholder="至少8碼，需含大小寫英文"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">您的密碼 (管理員驗證)</label>
                <input
                  type="password"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.current_password}
                  onChange={e => setFormData({...formData, current_password: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">角色</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                >
                  <option value="staff">一般人員 (Staff)</option>
                  <option value="admin">管理員 (Admin)</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  確認新增
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTargetId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">重設密碼</h3>
              <button onClick={() => setResetTargetId(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">新密碼</label>
                <input
                  type="password"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  placeholder="請輸入新密碼"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">您的密碼 (管理員驗證)</label>
                <input
                  type="password"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={adminPasswordForReset}
                  onChange={e => setAdminPasswordForReset(e.target.value)}
                  placeholder="請輸入您的管理員密碼"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setResetTargetId(null)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  確認重設
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up">
            <div className="p-6 text-center">
              <h3 className="text-xl font-bold text-slate-800 mb-2">確認刪除</h3>
              <p className="text-slate-500 mb-6">確定要刪除此用戶嗎？此動作無法復原。</p>
              
              <div className="mb-6 text-left">
                <label className="block text-sm font-medium text-slate-700 mb-1">您的密碼 (管理員驗證)</label>
                <input
                  type="password"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={adminPasswordForDelete}
                  onChange={e => setAdminPasswordForDelete(e.target.value)}
                  placeholder="請輸入您的管理員密碼"
                />
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setDeleteTargetId(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
                >
                  確認刪除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}