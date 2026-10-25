from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, TimestampMixin, pg_enum
from app.core.enums import LegalForm


class Company(Base, TimestampMixin):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True)
    inn: Mapped[str] = mapped_column(String(12), index=True)
    name: Mapped[str] = mapped_column(String(255))
    legal_form: Mapped[LegalForm] = mapped_column(pg_enum(LegalForm, "legal_form"))
