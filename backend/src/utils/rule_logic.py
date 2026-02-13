import re
from src.models.coding_rule import CodingNode

def parse_electronic_value(code_str):
    """
    解析電子元件數值代碼 (符合 BS 1852 / IEC 60062 / EIA 3-digit 標準)。
    
    功能:
    將簡寫代碼轉換為易讀數值。
    
    範例: 
    - 4K7  -> 4.7k
    - R010 -> 10m
    - 04U7 -> 4.7µ
    - 102U -> 1000µ (EIA 指數法: 10 * 10^2)
    - 100U -> 100µ (直讀法)
    """
    if not code_str:
        return code_str
        
    units = {
        'R': '', 'K': 'k', 'M': 'M', 
        'U': 'µ', 'u': 'µ', 
        'N': 'n', 'P': 'p'
    }
    
    # Regex: 匹配 "數字(可選) + 單位字元(RKMUNP) + 數字(可選)"
    match = re.match(r'^(\d*)([RKMUNP])(\d*)$', code_str, re.IGNORECASE)
    if match:
        left, unit_char, right = match.groups()
        
        # 防呆: 必須至少有一邊有數字
        if not left and not right:
            return code_str
            
        unit_suffix = units.get(unit_char.upper(), '')

        # 特殊處理: 當單位在最後面 (right 為空) 且左邊是 3 位數時
        # 需要區分 "直讀法" (100U -> 100) 與 "EIA指數法" (102U -> 1000)
        if not right and len(left) == 3 and left.isdigit():
            # 啟發式規則:
            # 1. 以 '0' 開頭或結尾 -> 直讀法 (010, 100)
            # 2. 其他 -> EIA 指數法 (102 = 10 * 10^2)
            if left.startswith('0') or left.endswith('0'):
                val_float = float(left)
            else:
                try:
                    base = int(left[:2])
                    multiplier = int(left[2])
                    val_float = float(base * (10 ** multiplier))
                except ValueError:
                    val_float = float(left)
            
            val_formatted = f"{val_float:g}"
            return f"{val_formatted}{unit_suffix}"

        # 一般 BS 1852 格式組合: 左邊 + . + 右邊
        val_str = f"{left}.{right}" if right else left
        if not val_str: val_str = "0"
        
        try:
            val_float = float(val_str)
            
            # 針對電阻 R 開頭且數值小於 1 的情況，轉換為 m (milli) 單位
            # 例如 R010 -> 0.01 -> 10m
            if unit_char.upper() == 'R' and 0 < val_float < 1:
                val_formatted = f"{val_float * 1000:g}"
                return f"{val_formatted}m"

            # 格式化: 移除多餘的 .0 (例如 4.70 -> 4.7)
            val_formatted = f"{val_float:g}"
            
            return f"{val_formatted}{unit_suffix}"
        except ValueError:
            return code_str
            
    return code_str

def match_node(node, code):
    """
    檢查單一節點是否匹配給定的代碼片段。
    回傳匹配結果 (數值、意義、剩餘代碼) 或 None。
    """
    if node.node_type == 'STATIC':
        # STATIC 節點本身不匹配值，而是看它的 OPTION 子節點是否匹配
        options = CodingNode.query.filter_by(parent_id=node.id, node_type='OPTION').all()
        # 排序: 優先匹配較長的代碼 (避免 "10" 錯誤匹配到 "1")
        options.sort(key=lambda x: len(x.code or ''), reverse=True)
        
        for opt in options:
            if opt.code and code.startswith(opt.code):
                return {
                    "value": opt.code,
                    "meaning": opt.name,
                    "remaining": code[len(opt.code):]
                }
        return None

    elif node.node_type == 'FIXED':
        if node.code and code.startswith(node.code):
             return {
                "value": node.code,
                "meaning": node.name,
                "remaining": code[len(node.code):]
            }
        return None

    elif node.node_type in ['INPUT', 'SERIAL']:
        length = node.segment_length
        if len(code) >= length:
            val = code[:length]
            meaning = val
            
            # 嘗試解析電子元件數值格式
            formatted_val = parse_electronic_value(val)
            if formatted_val != val:
                name_lower = node.name.lower()
                # 根據節點名稱賦予單位
                if 'capacit' in name_lower or '電容' in name_lower:
                    meaning = f"{formatted_val}F"
                elif 'resist' in name_lower or '電阻' in name_lower:
                    meaning = f"{formatted_val}Ω"
                elif 'induct' in name_lower or '電感' in name_lower:
                    meaning = f"{formatted_val}H"
                else:
                    meaning = formatted_val

            return {
                "value": val,
                "meaning": meaning,
                "remaining": code[length:]
            }
        return None
    
    return None

def attempt_decode_chain(node, code):
    """
    遞迴嘗試解碼整串代碼。
    從當前節點開始，尋找一條能完全消耗代碼的路徑。
    """
    # 1. 檢查當前節點是否匹配
    match_data = match_node(node, code)
    if not match_data:
        return None
    
    current_segment = {
        "node_name": node.name,
        "value": match_data['value'],
        "meaning": match_data['meaning'],
        "type": node.node_type
    }
    
    segments = [current_segment]
    remaining_code = match_data['remaining']
    
    # 2. 尋找下一層節點 (排除 OPTION，因為 OPTION 是用來匹配 STATIC 的)
    children = CodingNode.query.filter(
        CodingNode.parent_id == node.id,
        CodingNode.node_type != 'OPTION'
    ).order_by(CodingNode.sort_order).all()
    
    # 如果沒有子節點，且代碼還有剩餘，這裡視為此路徑結束 (由上層判斷是否完全匹配)
    if not children:
        return {"segments": segments, "remaining": remaining_code}
    
    # 3. 嘗試匹配任何一個子節點 (深度優先搜尋)
    for child in children:
        child_result = attempt_decode_chain(child, remaining_code)
        if child_result:
            return {
                "segments": segments + child_result['segments'],
                "remaining": child_result['remaining']
            }
            
    return None