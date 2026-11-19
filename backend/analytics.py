from models import Transaction


def calculate_balance(db):

    transactions = db.query(
        Transaction
    ).all()

    balance = 0

    for item in transactions:

        if item.type == "income":
            balance += item.amount
        else:
            balance -= item.amount

    return balance


def expenses_by_category(db):

    transactions = db.query(
        Transaction
    ).all()

    stats = {}

    for item in transactions:

        if item.type == "expense":

            if item.category not in stats:
                stats[item.category] = 0

            stats[item.category] += item.amount

    return stats
