import json
from pathlib import Path

from app.core.config import settings
from app.core.enums import DocumentType
from app.schemas.document import DOCUMENT_MODELS

DOCUMENT_FILES = {
    DocumentType.EGRUL: "egrul.json",
    DocumentType.BKI: "bki_report.json",
    DocumentType.FINANCIAL: "financial_report.json",
}


class MockRegistry:
    def __init__(self, root: Path) -> None:
        self.root = root
        self._by_inn: dict[str, dict[DocumentType, dict]] | None = None
        self._scenarios: list[dict] | None = None

    def _load(self) -> None:
        by_inn: dict[str, dict[DocumentType, dict]] = {}
        scenarios: list[dict] = []
        for directory in sorted(p for p in self.root.iterdir() if p.is_dir()):
            documents = {
                doc_type: self._read(directory / filename)
                for doc_type, filename in DOCUMENT_FILES.items()
            }
            for doc_type, payload in documents.items():
                DOCUMENT_MODELS[doc_type].model_validate(payload)
            by_inn[documents[DocumentType.EGRUL]["inn"]] = documents
            applicant = self._read(directory / "applicant.json")
            scenarios.append({"key": directory.name, **applicant})
        self._by_inn = by_inn
        self._scenarios = scenarios

    @staticmethod
    def _read(path: Path) -> dict:
        return json.loads(path.read_text(encoding="utf-8"))

    def find_documents(self, inn: str) -> dict[DocumentType, dict]:
        if self._by_inn is None:
            self._load()
        return {
            doc_type: dict(payload)
            for doc_type, payload in (self._by_inn or {}).get(inn, {}).items()
        }

    def scenarios(self) -> list[dict]:
        if self._scenarios is None:
            self._load()
        return list(self._scenarios or [])


registry = MockRegistry(Path(settings.mock_docs_dir))
