import pytest
from app.engine.rule_engine import RuleEngine

def test_rule_engine_leaf_condition():
    facts = {
        "institution": {"type": "ENGINEERING", "established_year": 2015},
        "document": {"fire_noc": {"days_to_expiry": 45}}
    }
    
    # Test 'in' operator
    rule1 = {"fact": "institution.type", "operator": "in", "value": ["ENGINEERING", "POLYTECHNIC"]}
    passed, trace = RuleEngine.evaluate(rule1, facts)
    assert passed is True
    assert trace["actual"] == "ENGINEERING"

    # Test 'lt' operator
    rule2 = {"fact": "document.fire_noc.days_to_expiry", "operator": "lt", "value": 60}
    passed, trace = RuleEngine.evaluate(rule2, facts)
    assert passed is True

    # Test 'gte' operator fail
    rule3 = {"fact": "document.fire_noc.days_to_expiry", "operator": "gte", "value": 60}
    passed, trace = RuleEngine.evaluate(rule3, facts)
    assert passed is False

def test_rule_engine_all_and_any():
    facts = {
        "institution": {"type": "PHARMACY", "score": 85},
        "faculty_ratio": 15
    }

    # Test 'all'
    rule_all = {
        "all": [
            {"fact": "institution.type", "operator": "eq", "value": "PHARMACY"},
            {"fact": "faculty_ratio", "operator": "lte", "value": 20}
        ]
    }
    passed, trace = RuleEngine.evaluate(rule_all, facts)
    assert passed is True
    assert trace["type"] == "all"

    # Test 'any'
    rule_any = {
        "any": [
            {"fact": "institution.type", "operator": "eq", "value": "ENGINEERING"},
            {"fact": "institution.score", "operator": "gte", "value": 80}
        ]
    }
    passed, trace = RuleEngine.evaluate(rule_any, facts)
    assert passed is True
    assert trace["type"] == "any"

def test_rule_engine_not():
    facts = {"flag": True}
    rule_not = {
        "not": {"fact": "flag", "operator": "eq", "value": False}
    }
    passed, trace = RuleEngine.evaluate(rule_not, facts)
    assert passed is True

