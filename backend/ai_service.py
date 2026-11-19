from openai import OpenAI, APIConnectionError

OLLAMA_URL = "http://localhost:11434/v1"
DEFAULT_MODEL = "llama3"

client = OpenAI(base_url=OLLAMA_URL, api_key="ollama", timeout=30)


def ask_ai(question: str, model: str = DEFAULT_MODEL, history: list[dict] | None = None) -> str:
    messages = [{"role": "system", "content": "Ты персональный финансовый консультант. Отвечай кратко, практично и только на основе предоставленных пользователем данных."}]
    if history:
        messages.extend(history[-12:])
    messages.append({"role": "user", "content": question})

    try:
        response = client.chat.completions.create(model=model, messages=messages)
        content = response.choices[0].message.content
        return content.strip() if content else "Модель не сформировала ответ."
    except APIConnectionError:
        raise ConnectionError("Ollama недоступна. Запустите Ollama и модель llama3.")
    except Exception as exc:
        raise RuntimeError(f"Ошибка генерации ответа: {exc}") from exc


def analyze_finances(stats: dict, model: str = DEFAULT_MODEL) -> str:
    prompt = (
        "Проанализируй реальные расходы пользователя по категориям.\n"
        f"Данные: {stats}\n"
        "Дай конкретные рекомендации: самая затратная категория, доля в бюджете, "
        "главные риски и 3 практических шага экономии."
    )
    return ask_ai(prompt, model)


def parse_smart_transaction(text: str, model: str = DEFAULT_MODEL) -> dict:
    import re
    import json

    amount_match = re.search(r"(\d[\d\s]*)(?:\s*(?:₸|тенге|тг))?", text)
    amount = 0
    if amount_match:
        amount = float(amount_match.group(1).replace(" ", "").replace(",", "."))

    category = "Прочее"
    lowered = text.lower()
    if any(word in lowered for word in ("kfc", "еда", "пища", "продукт", "кафе", "ресторан")):
        category = "Еда"
    elif any(word in lowered for word in ("такси", "автобус", "метро", "транспорт", "uber")):
        category = "Транспорт"
    elif any(word in lowered for word in ("квартира", "аренда", "коммунал")):
        category = "Жильё"
    elif any(word in lowered for word in ("зарплат", "доход", "получил")):
        category = "Доход"

    transaction_type = "income" if "доход" in category.lower() or any(word in lowered for word in ("зарплата", "получил доход")) else "expense"
    prompt = (
        "Верни только JSON объект с ключами category, amount и type. "
        "type принимает income или expense. "
        f"Текст операции: {text}"
    )
    try:
        answer = ask_ai(prompt, model)
        parsed = json.loads(answer.strip().strip("`"))
        if isinstance(parsed, dict) and parsed.get("amount"):
            ai_category = str(parsed.get("category", category)).strip()
            if ai_category.lower() in ("прочее", "other", ""):
                ai_category = category
            return {
                "category": ai_category,
                "amount": float(parsed["amount"]),
                "type": parsed.get("type", transaction_type),
            }
    except Exception:
        pass
    return {"category": category, "amount": amount, "type": transaction_type}