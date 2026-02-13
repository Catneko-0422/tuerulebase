import { useState, useEffect } from 'react';
import type { CodingNode } from '@/types/rules';
import { rulesService } from '@/services/rules';
import OptionsModal from '@/pages/Rules/components/OptionsModal';

const MAX_CODE_LENGTH = 16;

interface TreeNodeProps {
  node: CodingNode;
  onAddChild: (parent: CodingNode) => void;
  onDelete: (id: number) => void;
  treeVersion: number;
  currentTotalLength: number;
  path: CodingNode[];
}

export default function TreeNode({ node, onAddChild, onDelete, treeVersion, currentTotalLength, path }: TreeNodeProps) {
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