import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { rulesService } from '@/services/rules';
import type { CodingNode } from '@/types/rules';

interface RuleNodeProps {
  ruleId: number;
  parentId: number | null;
  onNodeSelect: (node: CodingNode, value: string) => void;
  level: number;
}

export default function RuleNode({ ruleId, parentId, onNodeSelect, level }: RuleNodeProps) {
  const [nodes, setNodes] = useState<CodingNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedValue, setSelectedValue] = useState('');
  const [selectedNode, setSelectedNode] = useState<CodingNode | null>(null);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const fetchNodes = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await rulesService.getNodes(ruleId, parentId);
        setNodes(response.data);
      } catch (err) {
        setError('Failed to load rule nodes.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNodes();
  }, [ruleId, parentId]);

  const handleStaticSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    const nodeId = parseInt(e.target.value, 10);
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedValue(e.target.value);
      setSelectedNode(node);
      onNodeSelect(node, node.code!);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const node = nodes[0]; // Assuming only one INPUT node per level
    setInputValue(e.target.value);

    // Basic validation against segment length
    if (e.target.value.length === node.segment_length) {
      // More complex regex validation could be added here
      setSelectedNode(node);
      onNodeSelect(node, e.target.value);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-slate-500">Loading layer {level}...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  if (nodes.length === 0) {
    return null; // End of the line
  }

  // 如果只有一個節點且是 FIXED 類型，自動選取並顯示
  if (nodes.length === 1 && nodes[0].node_type === 'FIXED') {
     // 這裡可以做自動選取的邏輯，但為了避免無限迴圈，通常由使用者確認或在 useEffect 處理
     // 暫時先顯示為唯讀輸入框
     // 若要自動選取，需小心處理 onSelect 的觸發時機
  }

  // Determine node type for this level
  const nodeType = nodes[0].node_type;
  const nodeName = nodes[0].name;

  return (
    <div className="p-4 border-l-4 border-slate-200 ml-4 mb-4 bg-white/50 rounded-r-lg">
      <label className="block text-sm font-bold text-slate-700 mb-2">
        Layer {level}: {nodeName}
      </label>

      {nodeType === 'STATIC' && (
        <select
          value={selectedValue}
          onChange={handleStaticSelect}
          className="w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="" disabled>-- Select an option --</option>
          {nodes.map(node => (
            // 只顯示 FIXED 類型的子節點作為選項
            node.node_type === 'FIXED' && (
              <option key={node.id} value={node.id}>{node.name} ({node.code})</option>
            )
          ))}
        </select>
      )}

      {nodeType === 'INPUT' && (
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          maxLength={nodes[0].segment_length}
          placeholder={nodes[0].value_placeholder || `Enter ${nodes[0].segment_length} characters`}
          className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
        />
      )}

      {nodeType === 'SERIAL' && (
        <div className="p-2 bg-slate-200 text-slate-600 rounded-md font-mono">
          [System Generated Serial: {nodes[0].segment_length} digits]
        </div>
      )}

      {nodeType === 'FIXED' && nodes.length === 1 && (
         <div className="p-2 bg-gray-100 text-gray-700 rounded-md font-mono border border-gray-300">
            {nodes[0].name} ({nodes[0].code}) [Fixed]
         </div>
      )}

      {/* Recursive call to render the next level */}
      {selectedNode && selectedNode.has_children && (
        <RuleNode
          ruleId={ruleId}
          parentId={selectedNode.id}
          onNodeSelect={onNodeSelect}
          level={level + 1}
        />
      )}
    </div>
  );
}