import re
from typing import Tuple, List, Dict, Any

# Crisis keywords grouped by severity
CRISIS_MARKERS = [
    # Suicide & self-harm
    "покончить с собой", "суицид", "не хочу жить", "хочу умереть", "вскрыть вены",
    "порезы на руках", "порезать себя", "спрыгнуть с крыши", "спрыгнуть из окна",
    "повеситься", "убить себя", "устал жить", "нет смысла жить", "выпить таблеток",
    "причинить себе вред", "селфхарм",
    # Life threats and severe violence
    "угрожают расправой", "угрожает убить", "обещают зарезать", "приставил нож",
    "пистолет", "оружие", "избивают каждый день", "жестоко избили", "физическое насилие",
    "насилие в семье", "бьет отец", "бьет мать", "бьет отчим", "морят голодом",
    "изнасилование", "домогательства", "пристает", "педофил", "шантажируют интимными фото",
    "убьют", "зарежут"
]

CATEGORY_RULES = [
    {
        "name": "Кибербуллинг",
        "keywords": ["кибербуллинг", "интернет", "соцсети", "телеграм", "вк", "вконтакте", "слили фото", "слив", "чат класса", "группа", "деанон", "травят в сети", "хейт"],
        "specialization": "psychology",
        "priority": "standard"
    },
    {
        "name": "Травля и оскорбления",
        "keywords": ["травля", "оскорбления", "обзывают", "травят", "гнобят", "унижают", "дразнят", "бойкот", "издеваются", "буллинг"],
        "specialization": "psychology",
        "priority": "standard"
    },
    {
        "name": "Конфликт с одноклассниками",
        "keywords": ["одноклассник", "одноклассники", "одноклассница", "драка", "поссорился", "подрались", "на перемене", "в классе", "конфликт с ребятами"],
        "specialization": "conflictology",
        "priority": "standard"
    },
    {
        "name": "Давление и угрозы",
        "keywords": ["угрожают", "угрозы", "давление", "шантаж", "вымогают", "вымогательство", "заставляют", "требуют деньги", "запугивают"],
        "specialization": "law",
        "priority": "urgent"
    },
    {
        "name": "Конфликт с учителем",
        "keywords": ["учитель", "учительница", "преподаватель", "педагог", "занижает оценки", "директор", "завуч", "кричит на уроке", "выгнал из класса"],
        "specialization": "conflictology",
        "priority": "standard"
    },
    {
        "name": "Конфликт с родителями",
        "keywords": ["родители", "мама", "папа", "не понимают", "скандал дома", "ругают дома", "ссора с мамой", "ссора с папой", "выгоняют"],
        "specialization": "psychology",
        "priority": "standard"
    },
    {
        "name": "Вопрос юридического характера",
        "keywords": ["закон", "права", "юрист", "полиция", "комиссия", "пдн", "заявление", "статья", "ответственность", "правомерно"],
        "specialization": "law",
        "priority": "standard"
    }
]


def detect_crisis(text: str, clarification_answers: Dict[str, Any] = None) -> Tuple[bool, List[str]]:
    """
    Detect crisis markers in text and answers.
    Returns (is_crisis, list_of_matched_markers)
    """
    normalized = text.lower()
    matched = []

    for marker in CRISIS_MARKERS:
        if marker in normalized:
            matched.append(marker)

    # Also check clarification answers if provided
    if clarification_answers:
        for val in clarification_answers.values():
            if isinstance(val, str):
                val_norm = val.lower()
                for marker in CRISIS_MARKERS:
                    if marker in val_norm and marker not in matched:
                        matched.append(marker)

    is_crisis = len(matched) > 0
    return is_crisis, matched


def suggest_category_and_specialist(text: str) -> Dict[str, Any]:
    """
    Suggest category and specialist group based on heuristic matching.
    """
    normalized = text.lower()
    best_match = None
    max_score = 0

    for rule in CATEGORY_RULES:
        score = 0
        for kw in rule["keywords"]:
            if kw in normalized:
                score += 1
        if score > max_score:
            max_score = score
            best_match = rule

    if best_match and max_score > 0:
        return {
            "suggested_category": best_match["name"],
            "suggested_specialization": best_match["specialization"],
            "confidence": min(1.0, 0.4 + max_score * 0.2),
            "reason": f"Обнаружены ключевые слова: {', '.join([k for k in best_match['keywords'] if k in normalized][:3])}"
        }

    return {
        "suggested_category": "Травля и оскорбления",
        "suggested_specialization": "psychology",
        "confidence": 0.3,
        "reason": "По умолчанию для свободных обращений рекомендуется первичная консультация психолога"
    }
