from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base, TimestampMixin, pg_enum
from app.core.enums import DocumentSource, DocumentType


class Document(Base, TimestampMixin):
    __tablename__ = "documents"
    __table_args__ = (UniqueConstraint("application_id", "doc_type"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), index=True
    )
    doc_type: Mapped[DocumentType] = mapped_column(pg_enum(DocumentType, "document_type"))
    source: Mapped[DocumentSource] = mapped_column(pg_enum(DocumentSource, "document_source"))
    payload: Mapped[dict] = mapped_column(JSONB)

    application: Mapped["Application"] = relationship(back_populates="documents")


from app.models.application import Application
