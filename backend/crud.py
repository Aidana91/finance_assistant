from models import Transaction


def add_transaction(db, transaction):
    item = Transaction(
        type=transaction.type,
        category=transaction.category.strip(),
        amount=transaction.amount,
        date=transaction.date,
        comment=transaction.comment.strip(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def get_transactions(db):
    return db.query(Transaction).order_by(Transaction.date.desc(), Transaction.id.desc()).all()


def get_transaction(db, transaction_id):
    return db.query(Transaction).filter(Transaction.id == transaction_id).first()


def update_transaction(db, transaction_id, transaction):
    item = get_transaction(db, transaction_id)
    if not item:
        return None
    for field, value in transaction.model_dump(exclude_unset=True).items():
        setattr(item, field, value.strip() if isinstance(value, str) and field == "comment" else value)
    db.commit()
    db.refresh(item)
    return item


def delete_transaction(db, transaction_id):
    item = get_transaction(db, transaction_id)
    if item:
        db.delete(item)
        db.commit()
    return item
