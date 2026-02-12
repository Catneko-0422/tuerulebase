import { useState, useEffect } from 'react';
import { rulesService } from '@/services/rules';
import type { CodingNode } from '@/types/rules';

// 定義一個穩定的空陣列常數，避免 useEffect 無限迴圈
const EMPTY_NODES: CodingNode[] = [];

interface RuleNodeProps {
  ruleId: number;
  parentId: number | null;
  level: number;
  onSegmentChange: (level: number, node: CodingNode | null, value: string) => void;
  injectedNodes?: CodingNode[]; // 從上一層傳遞下來的節點 (處理兄弟節點順序)
}

export default function RuleNode({ ruleId, parentId, level, onSegmentChange, injectedNodes = EMPTY_NODES }: RuleNodeProps) {
  const [displayNodes, setDisplayNodes] = useState<CodingNode[]>([]);
  const [deferredNodes, setDeferredNodes] = useState<CodingNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 當前層級的選擇狀態
  const [selectedNode, setSelectedNode] = useState<CodingNode | null>(null);
  const [inputValue, setInputValue] = useState('');

  // 1. 載入與分流節點
  useEffect(() => {
    let isMounted = true;
    const fetchAndProcessNodes = async () => {
      setIsLoading(true);
      setError('');
      try {
        // 只有當有 parentId 或者它是根節點且沒有注入節點時才去 fetch
        let fetchedNodes: CodingNode[] = [];
        if (parentId !== null || (level === 0 && injectedNodes.length === 0)) {
             const res = await rulesService.getNodes(ruleId, parentId);
             fetchedNodes = res.data;
        }

        if (isMounted) {
          const allNodes = [...fetchedNodes, ...injectedNodes];
          
          // 分流邏輯：
          // 1. 找出所有 "選項" (OPTION)
          // 2. 如果有選項，則本層級只顯示選項，其他節點 (INPUT, STATIC 等) 暫存到下一層 (deferred)
          // 3. 如果沒有選項，則本層級顯示 "第一個" 節點 (線性流程)，剩下的暫存到下一層
          
          const options = allNodes.filter(n => n.node_type === 'OPTION');
          const others = allNodes.filter(n => n.node_type !== 'OPTION');

          if (options.length > 0) {
            // Case A: 選擇題 (Selection)
            // 顯示所有選項，非選項的節點往後推
            setDisplayNodes(options);
            setDeferredNodes(others);
          } else {
            // Case B: No explicit Options (e.g. Categories, or just one node)
            // Treat ALL nodes as alternatives (Display all)
            // 修正：如果沒有 OPTION，但有多個節點 (如多個 STATIC 分類)，應全部顯示供選擇，而非只顯示第一個
            setDisplayNodes(allNodes);
            setDeferredNodes([]);
          }
          
          // 重置選擇
          setSelectedNode(null);
          setInputValue('');
        }
      } catch (err) {
        if (isMounted) setError('Failed to load nodes');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchAndProcessNodes();
    return () => { isMounted = false; };
  }, [ruleId, parentId, injectedNodes, level]); // injectedNodes 現在是穩定的，不會導致迴圈

  // 2. 自動選擇邏輯 (針對 FIXED 和 STATIC)
  useEffect(() => {
    if (displayNodes.length === 1) {
      const node = displayNodes[0];
      
      // STATIC: 自動選取 (作為標題)，但不填值 (value='')
      if (node.node_type === 'STATIC') {
        if (selectedNode?.id !== node.id) {
          setSelectedNode(node);
          onSegmentChange(level, node, ''); 
        }
      }
    }
  }, [displayNodes, level, onSegmentChange, selectedNode]);

  // 處理下拉選單變更
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nodeId = parseInt(e.target.value, 10);
    const node = displayNodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      setInputValue('');
      onSegmentChange(level, node, node.code || '');
    }
  };

  // 處理輸入框變更
  const handleInputChange = (node: CodingNode) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // 當開始輸入時，立即將此節點設為選取狀態，以便 input value 能正確綁定
    if (selectedNode?.id !== node.id) {
      setSelectedNode(node);
    }
    
    // 驗證長度是否符合
    if (val.length === node.segment_length) {
      onSegmentChange(level, node, val);
    } else {
      // 輸入中但長度未符，回報空值给父層，但保持 selectedNode 以維持 UI 狀態
      onSegmentChange(level, null, '');
    }
  };

  if (isLoading) return <div className="p-4 text-slate-400 text-sm">Loading...</div>;
  if (error) return <div className="p-4 text-red-500 text-sm">{error}</div>;
  if (displayNodes.length === 0) return null;

  // --- 渲染邏輯 ---

  // 情況 A: 單一節點 (Linear Step)
  if (displayNodes.length === 1) {
    const node = displayNodes[0];

    // A1. STATIC (分類標題): 顯示標題，直接渲染下一層
    if (node.node_type === 'STATIC') {
      return (
        // 使用 Fragment 避免視覺巢狀結構，並加入分隔線
        <>
          <div className="flex items-center gap-4 my-4">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="text-sm font-semibold text-slate-500">{node.name}</span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>
          {/* 直接渲染下一層，不包在任何 div 中 */}
            <RuleNode 
              ruleId={ruleId} 
              parentId={node.id} 
              level={level + 1} 
              onSegmentChange={onSegmentChange}
              injectedNodes={deferredNodes}
            />
        </>
      );
    }

    // A2. FIXED (固定值): 顯示為唯讀，直接渲染下一層
    if (node.node_type === 'FIXED') {
      const isSelected = selectedNode?.id === node.id;
      return (
        <>
          <div 
            className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-100 border-blue-300 ring-2 ring-blue-200' : 'bg-white border-slate-200 hover:border-blue-300'}`}
            onClick={() => {
              setSelectedNode(node);
              onSegmentChange(level, node, node.code || '');
            }}
          >
            <span className={`font-medium flex-1 ${isSelected ? 'text-blue-800' : 'text-slate-700'}`}>{node.name}</span>
            <span className={`font-mono px-2 py-0.5 rounded text-sm border ${isSelected ? 'bg-white text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              {node.code}
            </span>
          </div>
          {/* 視覺分隔線 */}
          {isSelected && <div className="h-8 w-px bg-slate-200 mx-auto"></div>}

          {selectedNode && (
            // 直接渲染，不包 div
              <RuleNode 
                ruleId={ruleId} 
                parentId={node.id} 
                level={level + 1} 
                onSegmentChange={onSegmentChange}
                injectedNodes={deferredNodes}
              />
          )}
        </>
      );
    }

    // A3. INPUT / SERIAL: 顯示輸入框
    if (['INPUT', 'SERIAL'].includes(node.node_type)) {
      return (
        <>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            {node.name}
            {node.node_type === 'SERIAL' && <span className="ml-2 text-xs font-normal text-slate-500">(流水號)</span>}
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange(node)}
            maxLength={node.segment_length}
            placeholder={`Enter ${node.segment_length} characters`}
            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
          />
          {/* 視覺分隔線 */}
          {selectedNode && <div className="h-8 w-px bg-slate-200 mx-auto"></div>}

          {selectedNode && (
            // 直接渲染，不包 div
              <RuleNode 
                ruleId={ruleId} 
                parentId={node.id} 
                level={level + 1} 
                onSegmentChange={onSegmentChange}
                injectedNodes={deferredNodes}
              />
          )}
        </>
      );
    }
  }

  // 情況 B: 多重節點 (Multiple Options) -> 顯示下拉選單 + 輸入框 (混合支援)
  const selectNodes = displayNodes.filter(n => ['STATIC', 'FIXED', 'OPTION'].includes(n.node_type));
  const inputNodes = displayNodes.filter(n => ['INPUT', 'SERIAL'].includes(n.node_type));

  return (
    <>
      <label className="block text-sm font-bold text-slate-700 mb-2">
        請選擇 (Select Option)
      </label>
      
      {selectNodes.length > 0 && (
        <select
          value={selectedNode?.id || ''}
          onChange={handleSelectChange}
          className="w-full p-2 border border-slate-300 rounded bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="" disabled>-- Select --</option>
          {selectNodes.map(node => (
            <option key={node.id} value={node.id}>
              {node.name} {node.code ? `(${node.code})` : ''}
            </option>
          ))}
        </select>
      )}

      {inputNodes.map(node => (
        <div key={node.id} className="mt-3">
          <label className="block text-xs font-medium text-slate-500 mb-1">
            {node.name} {node.node_type === 'SERIAL' && '(流水號)'}
          </label>
          <input
            type="text"
            value={selectedNode?.id === node.id ? inputValue : ''}
            onChange={handleInputChange(node)}
            maxLength={node.segment_length}
            placeholder={`Enter ${node.segment_length} characters`}
            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
          />
        </div>
      ))}

      {/* 視覺分隔線 */}
      {selectedNode && <div className="h-8 w-px bg-slate-200 mx-auto"></div>}

      {selectedNode && (
        // 直接渲染，不包 div
          <RuleNode 
            ruleId={ruleId} 
            parentId={selectedNode.id} 
            level={level + 1} 
            onSegmentChange={onSegmentChange}
            injectedNodes={deferredNodes}
          />
      )}
    </>
  );
}
