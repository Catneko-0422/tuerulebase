from flask import Blueprint, request, jsonify, current_app
from src.models.coding_rule import CodingNode, CodingRule
from src.extensions import db
from src.utils.decorators import admin_required
from src.models.user import User
from flask_jwt_extended import get_jwt_identity
from sqlalchemy.exc import IntegrityError
from src.utils.rule_logic import attempt_decode_chain

coding_rules_bp = Blueprint('coding_rules', __name__)

@coding_rules_bp.route('', methods=['GET'])
def get_rules():
    try:
        rules = CodingRule.query.all()
        return jsonify({
            "data": [
                {
                    "id": r.id,
                    "name": r.name,
                    "total_length": r.total_length,
                    "is_active": r.is_active
                } for r in rules
            ]
        }), 200
    except Exception as e:
        return jsonify({"message": f"Error fetching rules: {str(e)}"}), 500

@coding_rules_bp.route('', methods=['POST'])
@admin_required()
def create_rule():
    try:
        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify({"message": "Name is required"}), 400
            
        new_rule = CodingRule(
            name=data['name'],
            total_length=data.get('total_length', 16)
        )
        db.session.add(new_rule)
        db.session.commit()
        return jsonify({"message": "Rule created", "id": new_rule.id}), 201
    except Exception as e:
        return jsonify({"message": f"Error creating rule: {str(e)}"}), 500

@coding_rules_bp.route('/<int:rule_id>/nodes', methods=['GET'])
def get_nodes(rule_id):
    try:
        parent_id = request.args.get('parent_id', type=int)
        
        # 根據 rule_id 和 parent_id 取得節點列表
        nodes = CodingNode.query.filter_by(
            rule_id=rule_id, 
            parent_id=parent_id
        ).order_by(CodingNode.sort_order).all()
        
        result = []
        for node in nodes:
            # 檢查此節點是否有子節點 (用於前端判斷是否繼續渲染下一層)
            has_children = CodingNode.query.filter_by(parent_id=node.id).first() is not None
            
            result.append({
                "id": node.id,
                "rule_id": node.rule_id,
                "parent_id": node.parent_id,
                "name": node.name,
                "node_type": node.node_type,
                "segment_length": node.segment_length,
                "code": node.code,
                "value_regex": node.value_regex,
                "value_placeholder": node.value_placeholder,
                "has_children": has_children
            })
            
        return jsonify({"data": result}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching nodes: {str(e)}")
        return jsonify({"message": "Internal Server Error"}), 500

@coding_rules_bp.route('/nodes', methods=['POST'])
@admin_required()
def create_node():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "No input data provided"}), 400

        required_fields = ['rule_id', 'name', 'segment_length']
        if not all(field in data for field in required_fields):
            return jsonify({"message": f"Missing required fields: {', '.join(required_fields)}"}), 400
        
        new_node = CodingNode(
            rule_id=data['rule_id'],
            parent_id=data.get('parent_id'),
            name=data['name'],
            segment_length=data['segment_length'],
            node_type=data.get('node_type', 'STATIC'),
            code=data.get('code'),
            value_regex=data.get('value_regex'),
            value_placeholder=data.get('value_placeholder'),
            sort_order=data.get('sort_order', 0),
            description=data.get('description')
        )
        
         # Check if rule exists
        rule = CodingRule.query.get(data['rule_id'])
        if not rule:
             return jsonify({"message": f"Rule with id {data['rule_id']} not found"}), 404

        db.session.add(new_node)
        db.session.commit()
        
        return jsonify({"message": "Node created", "id": new_node.id}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating node: {str(e)}")
        return jsonify({"message": "Internal Server Error"}), 500

@coding_rules_bp.route('/nodes/<int:node_id>', methods=['DELETE'])
@admin_required()
def delete_node(node_id):
    try:
        data = request.get_json(silent=True)
        if not data or 'current_password' not in data:
            return jsonify({"message": "Password is required"}), 400

        current_password = data['current_password']
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user or not user.check_password(current_password):
            return jsonify({"message": "Invalid admin password"}), 401

        node = CodingNode.query.get(node_id)
        if not node:
            return jsonify({"message": "Node not found"}), 404
            
        db.session.delete(node)
        db.session.commit()
        return jsonify({"message": "Node deleted"}), 200
    except IntegrityError:
        db.session.rollback()
        current_app.logger.warning(f"Failed to delete node {node_id}: IntegrityError (likely has children)")
        return jsonify({"message": "Cannot delete node: it has associated children or data."}), 409
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting node: {str(e)}")
        return jsonify({"message": "Internal Server Error"}), 500

@coding_rules_bp.route('/decode', methods=['POST'])
def decode_rule():
    try:
        data = request.get_json()
        code = data.get('code', '').strip()
        if not code:
            return jsonify({"message": "Code is required"}), 400

        # 1. 取得所有根節點 (嘗試從不同的規則入口開始匹配)
        roots = CodingNode.query.filter_by(parent_id=None).all()
        
        decoded_result = None

        for root in roots:
            # 嘗試從這個根節點開始解碼
            result = attempt_decode_chain(root, code)
            # 如果成功解碼且沒有剩餘字串 (或符合您的寬鬆標準)，則視為成功
            if result and result['remaining'] == '':
                decoded_result = result
                break
        
        if decoded_result:
            return jsonify({
                "message": "Decode successful",
                "data": decoded_result['segments']
            }), 200
        else:
            return jsonify({"message": "Decoding failed: No matching rule found or code is incomplete"}), 404

    except Exception as e:
        current_app.logger.error(f"Decode error: {str(e)}")
        return jsonify({"message": "Internal Server Error"}), 500