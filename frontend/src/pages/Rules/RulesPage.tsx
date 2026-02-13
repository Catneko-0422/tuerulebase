import { useState, useEffect } from 'react';
import Bar from '@/components/Bar';
import type { CodingNode } from '@/types/rules';
import { rulesService, type CreateNodePayload } from '@/services/rules';
import { clearAuthCookies } from '@/lib/api';
import TreeNode from './components/TreeNode';

export default function RulesPage() {
  const [activeRuleId, setActiveRuleId] = useState<number | null>(null);
  const [rootNodes, setRootNodes] = useState<CodingNode[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [treeVersion, setTreeVersion] = useState(0); // 用於觸發樹的重新整理
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  
  // Form State
  const [formData, setFormData] = useState<CreateNodePayload>({
    rule_id: 0, // Will be updated when modal opens
    parent_id: null,
    name: '',
    segment_length: 1,
    node_type: 'STATIC',
    code: '',
  });

  // 初始化：檢查是否有規則，沒有則自動建立
  useEffect(() => {
    const initRule = async () => {
      try {
        const res = await rulesService.getRules();
        if (res.data.length > 0) {
          setActiveRuleId(res.data[0].id);
        } else {
          // 自動建立預設規則
          const createRes = await rulesService.createRule("2026 Standard Coding Rules");
          setActiveRuleId(createRes.id);
        }
      } catch (error) {
        console.error("Failed to initialize rule", error);
      }
    };
    initRule();
  }, []);

  const fetchRootNodes = async () => {
    if (!activeRuleId) return;
    try {
      const res = await rulesService.getNodes(activeRuleId, null);
      setRootNodes(res.data);
    } catch (error) {
      console.error("Failed to fetch root nodes", error);
    }
  };

  useEffect(() => {
    if (activeRuleId) {
      fetchRootNodes();
    }
  }, [activeRuleId, treeVersion]); // 加入 treeVersion 作為依賴

  // Auto-calculate segment length when code changes
  useEffect(() => {
    if (formData.code) {
      setFormData(prev => ({ ...prev, segment_length: prev.code!.length }));
    }
  }, [formData.code]);

  const handleAddNode = (parent: CodingNode | null) => {
    if (!activeRuleId) return;
    
    const defaultType = 'FIXED';
    const defaultLength = 1;

    setFormData({ 
      ...formData, 
      rule_id: activeRuleId,
      parent_id: parent ? parent.id : null,
      name: '',
      segment_length: defaultLength,
      node_type: defaultType,
      code: ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteNode = (id: number) => {
    setDeleteTargetId(id);
    setDeletePassword('');
  };

  const confirmDeleteNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteTargetId) return;

    try {
      await rulesService.deleteNode(deleteTargetId, deletePassword);
      // 透過更新版本號來觸發重新整理
      setTreeVersion(v => v + 1);
      setDeleteTargetId(null);
    } catch (error: any) {
      console.error("Delete failed", error);
      // 偵測 401 或 CSRF 相關錯誤
      if (error?.status === 401 && error?.message?.includes('password')) {
        alert('密碼錯誤，無法刪除。');
      } else if (error?.status === 401 || error?.message?.includes('CSRF') || error?.message?.includes('Missing')) {
        clearAuthCookies();
        alert('驗證失效 (Cookie 遺失或不匹配)。\n系統已自動清除舊資料。\n\n請點擊「確定」後重新登入。');
        window.location.reload();
      } else {
        alert('刪除失敗，請檢查控制台日誌。');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await rulesService.createNode(formData);
      setIsModalOpen(false);
      // 透過更新版本號來觸發重新整理
      setTreeVersion(v => v + 1);
    } catch (error) {
      alert('新增失敗');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <Bar />
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">規則編輯器</h1>
          <button
            onClick={() => handleAddNode(null)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow transition-colors"
          >
            + 新增根節點
          </button>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          {rootNodes.map(node => (
            <TreeNode 
              key={node.id} 
              node={node} 
              onAddChild={handleAddNode} 
              onDelete={handleDeleteNode} 
              treeVersion={treeVersion} 
              currentTotalLength={node.segment_length}
              path={[node]}
            />
          ))}
          {rootNodes.length === 0 && <div className="text-center text-slate-500 py-8">尚無規則節點</div>}
        </div>
      </div>

      {/* Add Node Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">新增節點</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">名稱</label>
                <input required className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">類型</label>
                <select 
                  className="w-full border p-2 rounded disabled:bg-slate-100 disabled:text-slate-500" 
                  value={formData.node_type} 
                  onChange={e => setFormData({...formData, node_type: e.target.value as CodingNode['node_type']})}
                >
                  <option value="STATIC">固定選項 (STATIC)</option>
                  <option value="FIXED">固定值 (FIXED)</option>
                  <option value="INPUT">手動輸入 (INPUT)</option>
                  <option value="SERIAL">流水號 (SERIAL)</option>
                </select>
              </div>
              {(formData.node_type === 'FIXED' || formData.node_type === 'OPTION') && (
                <div>
                  <label className="block text-sm font-medium mb-1">代碼 (Code)</label>
                  <input required className="w-full border p-2 rounded" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="輸入代碼，長度將自動計算" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">長度</label>
                <input 
                  type="number" 
                  required 
                  className="w-full border p-2 rounded disabled:bg-slate-100 disabled:text-slate-500 bg-slate-50" 
                  value={formData.segment_length} 
                  onChange={e => setFormData({...formData, segment_length: parseInt(e.target.value)})}
                  disabled={!!formData.code}
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded">取消</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">新增</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-xl font-bold mb-4 text-red-600">確認刪除</h3>
            <p className="text-slate-600 mb-4">此操作無法復原。請輸入您的管理員密碼以確認刪除。</p>
            <form onSubmit={confirmDeleteNode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">管理員密碼</label>
                <input type="password" required autoFocus className="w-full border p-2 rounded" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setDeleteTargetId(null)} className="px-4 py-2 border rounded hover:bg-slate-50">取消</button>
                <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">確認刪除</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}