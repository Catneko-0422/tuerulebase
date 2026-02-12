import { useState, useEffect, useMemo, useRef } from 'react';
import Bar from '@/components/Bar';
import type { CodingNode } from '@/types/rules';
import { rulesService, type CreateNodePayload } from '@/services/rules';
import { clearAuthCookies } from '@/lib/api';

const MAX_CODE_LENGTH = 16;

function OptionsModal({ ruleId, parentId, parentLength, onClose }: { ruleId: number, parentId: number, parentLength: number, onClose: () => void }) {
  const [options, setOptions] = useState<CodingNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newOption, setNewOption] = useState({ name: '', code: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsPerPage = 10;

  const fetchOptions = async () => {
    setIsLoading(true);
    try {
      const res = await rulesService.getNodes(ruleId, parentId);
      const filteredOptions = res.data.filter(n => n.node_type === 'OPTION');
      // Sort options by code
      filteredOptions.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
      setOptions(filteredOptions);
    } catch (error) {
      console.error("Failed to load options", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, [ruleId, parentId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredOptions = useMemo(() => {
    return options.filter(opt => 
      opt.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (opt.code && opt.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [options, searchTerm]);

  const totalPages = Math.ceil(filteredOptions.length / itemsPerPage);
  const currentOptions = filteredOptions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await rulesService.createNode({
        rule_id: ruleId,
        parent_id: parentId,
        name: newOption.name,
        code: newOption.code,
        segment_length: parentLength,
        node_type: 'OPTION'
      });
      setNewOption({ name: '', code: '' });
      fetchOptions();
    } catch (error) {
      alert('Failed to add option');
    }
  };

  const handleDeleteOption = async (id: number) => {
    const password = prompt('Please enter admin password to delete this option:');
    if (!password) return;
    try {
      await rulesService.deleteNode(id, password);
      fetchOptions();
    } catch (error) {
      alert('Failed to delete option');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      let successCount = 0;
      let failCount = 0;

      setIsLoading(true);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // 跳過標題行 (如果有的話)
        if (i === 0 && (line.toLowerCase().includes('name') && line.toLowerCase().includes('code'))) {
          continue;
        }

        const parts = line.split(',');
        if (parts.length < 2) {
          failCount++;
          continue;
        }

        const name = parts[0].trim();
        const code = parts[1].trim();

        try {
          await rulesService.createNode({
            rule_id: ruleId,
            parent_id: parentId,
            name: name,
            code: code,
            segment_length: parentLength,
            node_type: 'OPTION'
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to import line: ${line}`, error);
          failCount++;
        }
      }

      setIsLoading(false);
      alert(`Import completed.\nSuccess: ${successCount}\nFailed: ${failCount}`);
      fetchOptions();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Manage Options</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        
        <form onSubmit={handleAddOption} className="flex flex-col gap-2 mb-6">
          <div className='flex gap-2'>
            <input required placeholder="Name (e.g. Chip Resistor)" className="border p-2 rounded flex-1" value={newOption.name} onChange={e => setNewOption({...newOption, name: e.target.value})} />
            <input required placeholder="Code (e.g. 03)" className="border p-2 rounded w-24" value={newOption.code} onChange={e => setNewOption({...newOption, code: e.target.value})} />
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Add</button>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".csv" 
              onChange={handleFileUpload} 
            />
          </div>
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 whitespace-nowrap"
            title="CSV Format: Name,Code"
          >
            Import CSV
          </button>
        </form>
        
        <div className="mb-4">
          <input 
            placeholder="Search options..." 
            className="w-full border p-2 rounded" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>

        <div className="space-y-2">
          {isLoading ? <div className="text-center text-slate-500">Loading...</div> : currentOptions.map(opt => (
            <div key={opt.id} className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-100">
              <div>
                <span className="font-bold text-slate-700">{opt.name}</span>
                <span className="ml-2 font-mono text-sm bg-white px-1 rounded border text-slate-500">{opt.code}</span>
              </div>
              <button onClick={() => handleDeleteOption(opt.id)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
            </div>
          ))}
          {!isLoading && filteredOptions.length === 0 && <div className="text-center text-slate-400">No options found.</div>}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">Page {currentPage} of {totalPages}</span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 遞迴顯示節點的元件
function TreeNode({ node, onAddChild, onDelete, treeVersion, currentTotalLength, path }: { node: CodingNode; onAddChild: (parent: CodingNode) => void; onDelete: (id: number) => void; treeVersion: number; currentTotalLength: number; path: CodingNode[] }) {
  const [children, setChildren] = useState<CodingNode[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const fetchChildren = async () => {
    setIsLoading(true);
    try {
      const res = await rulesService.getNodes(node.rule_id, node.id);
      setChildren(res.data);
    } catch (error) {
      console.error("Failed to load children", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isExpanded) {
      fetchChildren();
    }
    setIsExpanded(!isExpanded);
  };

  // 當 treeVersion 改變且目前是展開狀態時，重新載入子節點
  useEffect(() => {
    if (isExpanded) {
      fetchChildren();
    }
  }, [treeVersion]);

  const isMaxLengthReached = currentTotalLength >= MAX_CODE_LENGTH;

  return (
    <div className="ml-6 border-l-2 border-slate-200 pl-4 py-2">
      <div className="flex items-center gap-2 bg-white p-3 rounded-lg shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
        {/* Only show expand button if it's not an OPTION (though OPTIONs are hidden from tree now) */}
        {!isMaxLengthReached ? (
          <button 
            onClick={handleToggle}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-500"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        ) : <div className="w-6 h-6" />}
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">{node.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              node.node_type === 'STATIC' ? 'bg-blue-100 text-blue-700' :
              node.node_type === 'INPUT' ? 'bg-green-100 text-green-700' :
              node.node_type === 'FIXED' ? 'bg-yellow-100 text-yellow-700' :
              node.node_type === 'OPTION' ? 'bg-gray-100 text-gray-700' :
              'bg-purple-100 text-purple-700'
            }`}>
              {node.node_type}
            </span>
            {node.code && <span className="text-sm font-mono bg-slate-100 px-1 rounded text-slate-600">Code: {node.code}</span>}
            <span className="text-sm text-slate-500">Len: {node.segment_length}</span>
          </div>
        </div>

        <div className="flex gap-2">
          {node.node_type === 'STATIC' && (
            <button 
              onClick={() => setShowOptions(true)}
              className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100"
            >
              Manage Options
            </button>
          )}
          {node.node_type !== 'OPTION' && !isMaxLengthReached && (
            <button 
              onClick={() => onAddChild(node)}
              className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100"
            >
              {node.node_type === 'STATIC' ? '+ 下一層規則' : '+ 子節點'}
            </button>
          )}
          <button 
            onClick={() => onDelete(node.id)}
            className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100"
          >
            刪除
          </button>
        </div>
      </div>

      {isMaxLengthReached && (
        <div className="mt-4 mb-2 overflow-x-auto">
          <table className="min-w-max w-full border-collapse border border-slate-300 text-sm">
            <thead>
              <tr className="bg-slate-100">
                {path.map((n, i) => (
                  <th key={i} className="border border-slate-300 px-2 py-1 font-medium text-slate-700 whitespace-nowrap">
                    {n.name} <span className="text-xs text-slate-500">Len: {n.segment_length}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {path.map((n, i) => (
                  <td key={i} className="border border-slate-300 px-2 py-1 text-center text-slate-500 font-mono whitespace-nowrap">
                    {'x'.repeat(n.segment_length)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {isExpanded && (
        <div className="mt-2">
          {isLoading ? (
            <div className="text-sm text-slate-400 ml-4">載入中...</div>
          ) : children.length > 0 ? (
            // Filter out OPTION nodes from the main tree
            children.filter(c => c.node_type !== 'OPTION').map(child => (
              <TreeNode 
                key={child.id} 
                node={child} 
                onAddChild={onAddChild} 
                onDelete={onDelete} 
                treeVersion={treeVersion} 
                currentTotalLength={currentTotalLength + child.segment_length}
                path={[...path, child]}
              />
            ))
          ) : (
            <div className="text-sm text-slate-400 ml-4">無子節點 (非選項)</div>
          )}
        </div>
      )}
      {showOptions && <OptionsModal ruleId={node.rule_id} parentId={node.id} parentLength={node.segment_length} onClose={() => setShowOptions(false)} />}
    </div>
  );
}

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