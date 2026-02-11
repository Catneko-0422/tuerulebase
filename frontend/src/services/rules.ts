import { request } from '@/lib/api';
import type { CodingNode, CodingRule } from '@/types/rules';

interface NodesResponse {
  data: CodingNode[];
}

export interface CreateNodePayload {
  rule_id: number;
  parent_id: number | null;
  name: string;
  segment_length: number;
  node_type: 'STATIC' | 'INPUT' | 'SERIAL' | 'FIXED' | 'OPTION';
  code?: string;
  value_regex?: string;
  value_placeholder?: string;
  sort_order?: number;
  description?: string;
}

export const rulesService = {
  getRules: () => request<{ data: CodingRule[] }>('/coding-rules'),
  
  createRule: (name: string, totalLength: number = 16) => {
    return request<{ message: string, id: number }>('/coding-rules', {
      method: 'POST',
      body: JSON.stringify({ name, total_length: totalLength })
    });
  },

  /**
   * 取得指定規則與父節點下的所有子節點
   */
  getNodes: (ruleId: number, parentId: number | null = null) => {
    const endpoint = parentId 
      ? `/coding-rules/${ruleId}/nodes?parent_id=${parentId}` 
      : `/coding-rules/${ruleId}/nodes`;
    return request<NodesResponse>(endpoint);
  },

  createNode: (data: CreateNodePayload) => {
    return request<void>('/coding-rules/nodes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteNode: (nodeId: number, currentPassword?: string) => {
    // 假設後端有實作 DELETE /coding-rules/nodes/:id
    return request<void>(`/coding-rules/nodes/${nodeId}`, { 
      method: 'DELETE',
      body: JSON.stringify({ current_password: currentPassword })
    });
  },
};