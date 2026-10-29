from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

class RuleEngine:
    """
    Data-driven AST rule evaluation engine.
    Evaluates JSON-based declarative rules against contextual facts with full explain traces.
    """

    OPERATORS = {
        "eq": lambda a, b: a == b,
        "ne": lambda a, b: a != b,
        "gt": lambda a, b: a is not None and b is not None and a > b,
        "gte": lambda a, b: a is not None and b is not None and a >= b,
        "lt": lambda a, b: a is not None and b is not None and a < b,
        "lte": lambda a, b: a is not None and b is not None and a <= b,
        "in": lambda a, b: a in b if b is not None else False,
        "not_in": lambda a, b: a not in b if b is not None else True,
        "exists": lambda a, b: (a is not None) == bool(b),
        "between": lambda a, b: b[0] <= a <= b[1] if a is not None and isinstance(b, (list, tuple)) and len(b) == 2 else False,
        "contains": lambda a, b: b in a if a is not None else False,
    }

    @classmethod
    def get_fact_value(cls, path: str, facts: Dict[str, Any]) -> Any:
        """Resolves dot-delimited path into facts dict (e.g. 'document.fire_noc.days_to_expiry')."""
        parts = path.split(".")
        current = facts
        for part in parts:
            if isinstance(current, dict):
                current = current.get(part)
            else:
                return None
        return current

    @classmethod
    def evaluate_condition(cls, condition: Dict[str, Any], facts: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """
        Evaluates a single leaf condition:
        {"fact": "document.fire_noc.days_to_expiry", "operator": "gte", "value": 30}
        Returns (passed: bool, trace: dict)
        """
        fact_path = condition.get("fact", "")
        operator_name = condition.get("operator", "eq")
        target_value = condition.get("value")

        actual_value = cls.get_fact_value(fact_path, facts)
        op_func = cls.OPERATORS.get(operator_name)

        if not op_func:
            return False, {
                "fact": fact_path,
                "operator": operator_name,
                "expected": target_value,
                "actual": actual_value,
                "passed": False,
                "error": f"Unknown operator '{operator_name}'"
            }

        try:
            passed = bool(op_func(actual_value, target_value))
        except Exception as e:
            passed = False

        trace = {
            "fact": fact_path,
            "operator": operator_name,
            "expected": target_value,
            "actual": actual_value,
            "passed": passed
        }
        return passed, trace

    @classmethod
    def evaluate(cls, rule: Dict[str, Any], facts: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """
        Recursively evaluates a rule tree containing 'all', 'any', 'not', or leaf conditions.
        Returns:
            (passed: bool, explain: dict)
        """
        if not rule:
            return True, {"passed": True, "type": "empty"}

        # Case 1: 'all' (Logical AND)
        if "all" in rule:
            sub_traces = []
            all_passed = True
            for sub_rule in rule["all"]:
                sub_passed, sub_trace = cls.evaluate(sub_rule, facts)
                sub_traces.append(sub_trace)
                if not sub_passed:
                    all_passed = False
            return all_passed, {
                "type": "all",
                "passed": all_passed,
                "children": sub_traces
            }

        # Case 2: 'any' (Logical OR)
        if "any" in rule:
            sub_traces = []
            any_passed = False
            for sub_rule in rule["any"]:
                sub_passed, sub_trace = cls.evaluate(sub_rule, facts)
                sub_traces.append(sub_trace)
                if sub_passed:
                    any_passed = True
            return any_passed, {
                "type": "any",
                "passed": any_passed,
                "children": sub_traces
            }

        # Case 3: 'not' (Logical NOT)
        if "not" in rule:
            sub_passed, sub_trace = cls.evaluate(rule["not"], facts)
            not_passed = not sub_passed
            return not_passed, {
                "type": "not",
                "passed": not_passed,
                "child": sub_trace
            }

        # Case 4: Leaf condition
        if "fact" in rule:
            passed, trace = cls.evaluate_condition(rule, facts)
            return passed, trace

        return False, {"passed": False, "error": "Invalid rule structure"}

