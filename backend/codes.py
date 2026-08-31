"""Sequential code generator: PROD-2026-001, PAR-2026-001, etc.
One counter per prefix+year so numbering restarts each calendar year.
"""
from sqlalchemy import Column, String, Integer
from sqlalchemy.orm import Session
from models import Base


class CodeSequence(Base):
    __tablename__ = "code_sequences"
    prefix = Column(String, primary_key=True)  # e.g. "PROD-2026"
    counter = Column(Integer, default=0)


def next_code(db: Session, prefix: str) -> str:
    from datetime import datetime
    year = datetime.utcnow().year
    key = f"{prefix}-{year}"

    seq = db.query(CodeSequence).filter(CodeSequence.prefix == key).first()
    if seq:
        seq.counter += 1
    else:
        seq = CodeSequence(prefix=key, counter=1)
        db.add(seq)
    db.flush()
    return f"{key}-{str(seq.counter).zfill(3)}"
