import { useState, useEffect, useCallback } from 'react';
import Bar from '@/components/Bar';
import { rulesService } from '@/services/rules';
import RuleNode from '@/pages/Rules/RuleNode';
import type { CodingNode, CodingRule } from '@/types/rules';

export default function ManualCodingPage() {
  const [rules, setRules] = useState<CodingRule[]>([]);
  const [activeRuleId, setActiveRuleId] = useState<number | null>(null);
  
  // 儲存每個層級的選擇結果
  // Key: level, Value: { node, value }
  const [segments, setSegments] = useState<{ [level: number]: { node: CodingNode, value: string } }>({});
  const [isLoading, setIsLoading] = useState(true);

  // 初始化：取得所有規則
  useEffect(() => {
    const initRule = async () => {
      try {
        const res = await rulesService.getRules();
        setRules(res.data);
      } catch (error) {
        console.error("Failed to initialize rule", error);
      } finally {
        setIsLoading(false);
      }
    };
    initRule();
  }, []);

  // 處理節點選擇/變更的回呼
  const handleSegmentChange = useCallback((level: number, node: CodingNode | null, value: string) => {
    setSegments(prev => {
      const newSegments = { ...prev };
      
      if (node && value) {
        // 如果有選取節點且有值，更新該層級
        newSegments[level] = { node, value };
      } else if (node && !value) {
        // 特殊情況：STATIC 節點 (有節點但無值)，我們記錄它以便顯示路徑，但不影響代碼
        newSegments[level] = { node, value: '' };
      } else {
        // 如果 node 為 null (例如輸入框清空)，移除該層級
        delete newSegments[level];
      }
      
      // 清除所有比當前層級更深的選擇 (因為路徑改變了)
      Object.keys(newSegments).forEach(key => {
        if (parseInt(key) > level) {
          delete newSegments[parseInt(key)];
        }
      });
      
      return newSegments;
    });
  }, []);

  const handleReset = () => {
    setSegments({});
    // 保持 activeRuleId 不變，只重置選擇
  };

  // 組合最終代碼
  // 過濾掉 value 為空的 segment (例如 STATIC 分類節點)
  const finalCode = Object.keys(segments)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map(k => segments[parseInt(k)].value)
    .filter(val => val !== '') 
    .join('');

  return (
    <div className="min-h-screen bg-slate-100">
      <Bar />
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">手動編碼 (Manual Coding)</h1>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
          >
            重置頁面
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側：編碼操作區 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. 規則選擇器 */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <label className="block text-sm font-bold text-slate-700 mb-2">選擇編碼規則 (Select Rule)</label>
               <select 
                 className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                 value={activeRuleId || ''}
                 onChange={(e) => {
                    setActiveRuleId(Number(e.target.value));
                    setSegments({}); // 切換規則時重置
                 }}
               >
                 <option value="" disabled>-- 請選擇規則 --</option>
                 {rules.map(r => (
                   <option key={r.id} value={r.id}>{r.name}</option>
                 ))}
               </select>
            </div>

            {/* 2. 遞迴節點選擇區 */}
            {activeRuleId && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[400px]">
                <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">編碼流程</h2>
                <RuleNode 
                  ruleId={activeRuleId} 
                  parentId={null} 
                  level={0} 
                  onSegmentChange={handleSegmentChange} 
                />
              </div>
            )}
            
            {!activeRuleId && !isLoading && (
              <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                請先選擇上方規則以開始編碼
              </div>
            )}
          </div>

          {/* 右側：結果預覽區 */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-lg sticky top-8 border border-slate-100">
              <h2 className="text-lg font-bold text-slate-700 mb-4 border-b pb-2">編碼結果預覽</h2>
              
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Current Code</label>
                <div className="p-4 bg-slate-800 text-white font-mono text-2xl rounded-lg break-all min-h-[4rem] flex items-center shadow-inner tracking-widest">
                  {finalCode || <span className="text-slate-600 text-lg italic">Waiting...</span>}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-600">組成明細 (Segments):</h3>
                {Object.keys(segments).length === 0 && (
                  <p className="text-sm text-slate-400 italic">尚無選擇資料</p>
                )}
                <ul className="space-y-2">
                  {Object.keys(segments)
                    .sort((a, b) => parseInt(a) - parseInt(b))
                    .map(level => {
                      const seg = segments[parseInt(level)];
                      const isCategory = seg.node.node_type === 'STATIC' && !seg.value;
                      
                      return (
                        <li key={level} className={`text-sm flex justify-between items-center p-2 rounded border ${isCategory ? 'bg-slate-50 border-slate-100' : 'bg-indigo-50 border-indigo-100'}`}>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase">Layer {level}</span>
                            <span className={`font-medium ${isCategory ? 'text-slate-600' : 'text-indigo-900'}`}>
                              {seg.node.name}
                            </span>
                          </div>
                          {seg.value && (
                            <span className="font-mono font-bold text-indigo-600 bg-white px-2 py-0.5 rounded shadow-sm">
                              {seg.value}
                            </span>
                          )}
                        </li>
                      );
                    })}
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                >
                  清除
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(finalCode)}
                  disabled={!finalCode}
                  className="flex-[2] bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-2 rounded-lg font-medium transition-colors shadow-md active:transform active:scale-95"
                >
                  複製代碼
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
