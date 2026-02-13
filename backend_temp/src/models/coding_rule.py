from src.extensions import db

class CodingRule(db.Model):
    __tablename__ = 'coding_rules'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    total_length = db.Column(db.Integer, default=16)
    is_active = db.Column(db.Boolean, default=True)

    def __repr__(self):
        return f'<CodingRule {self.name}>'

class CodingNode(db.Model):
    __tablename__ = 'coding_nodes'

    id = db.Column(db.Integer, primary_key=True)
    rule_id = db.Column(db.Integer, db.ForeignKey('coding_rules.id'), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('coding_nodes.id'), nullable=True)
    
    name = db.Column(db.String(100), nullable=False)
    segment_length = db.Column(db.Integer, nullable=False)
    
    # 'STATIC', 'INPUT', 'SERIAL'
    node_type = db.Column(db.String(20), nullable=False, default='STATIC')
    
    code = db.Column(db.String(20), nullable=True)
    value_regex = db.Column(db.String(100), nullable=True)
    value_placeholder = db.Column(db.String(50), nullable=True)
    
    sort_order = db.Column(db.Integer, default=0)
    description = db.Column(db.Text, nullable=True)

    # Relationships
    rule = db.relationship('CodingRule', backref=db.backref('nodes', lazy=True))
    children = db.relationship('CodingNode', 
                             backref=db.backref('parent', remote_side=[id]),
                             lazy=True,
                             cascade="all, delete-orphan")

    def __repr__(self):
        return f'<CodingNode {self.name}>'