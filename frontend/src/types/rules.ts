export type NodeType = 'STATIC' | 'INPUT' | 'SERIAL' | 'FIXED' | 'OPTION';

export interface CodingRule {
  id: number;
  name: string;
  total_length: number;
  is_active: boolean;
}

export interface CodingNode {
  id: number;
  rule_id: number;
  parent_id: number | null;
  name: string;
  segment_length: number;
  node_type: NodeType;
  code: string | null;
  value_regex: string | null;
  value_placeholder: string | null;
  sort_order: number;
  description: string | null;
  has_children: boolean;
}
