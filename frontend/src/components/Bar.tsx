import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/favicon.png';


function Bar() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const menuItems = [
        { label: '管理人員', path: '/admin/users', adminOnly: true },
        { label: '編輯規則', path: '/rules', adminOnly: true },
        { label: '自動編碼', path: '/auto-code' },
        { label: '單一解碼', path: '/single-decode' },
        { label: '批量解碼', path: '/batch-decode' },
    ];

    return (
        <>
            <nav className="w-full h-16 bg-[#2f2e2e] flex items-center justify-between px-6 shadow-md relative z-30">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="text-white hover:bg-white/10 p-2 rounded-full transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    </button>
                    <img src={logo} alt="Logo" className="h-10 w-auto" />
                </div>
            </nav>

            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar Drawer */}
            <div className={`fixed top-0 left-0 h-full w-64 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
                    <span className="font-bold text-lg text-slate-800">功能選單</span>
                    <button 
                        onClick={() => setIsSidebarOpen(false)}
                        className="text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="p-4 flex flex-col gap-2">
                    {menuItems.map((item) => {
                        // 權限檢查：如果是 adminOnly 且使用者不是 admin/superuser，則不顯示
                        if (item.adminOnly && !user?.is_superuser && user?.role !== 'admin') return null;
                        
                        return (
                            <button 
                                key={item.label} 
                                onClick={() => { navigate(item.path); setIsSidebarOpen(false); }}
                                className="w-full text-left px-4 py-3 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors font-medium"
                            >
                                {item.label}
                            </button>
                        );
                    })}
                    <div className="h-px bg-slate-100 my-2"></div>
                    <button 
                        onClick={logout}
                        className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                    >
                        登出
                    </button>
                </div>
            </div>
        </>
    );
}

export default Bar;