import sqlite3
import json
from typing import Optional, Dict, Any


class ApplicationStorage:
    def __init__(self, db_path: str = "applications.db"):
        self.db_path = db_path
        self._conn = None

    def _get_connection(self):
        if self._conn is None:
            self._conn = sqlite3.connect(self.db_path)
            self._conn.row_factory = sqlite3.Row
        return self._conn

    def init_db(self):
        """Создает таблицы, если их нет."""
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS companies (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT,
                    payload_json TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS applications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    company_id INTEGER NOT NULL,
                    route TEXT,
                    preliminary_score INTEGER,
                    final_score INTEGER,
                    loan_json TEXT NOT NULL,
                    checks_json TEXT,
                    bank_offer_json TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (company_id) REFERENCES companies(id)
                )
            """)

    def save_company(self, name: str, payload: Dict[str, Any]) -> int:
        """Сохраняет компанию. Возвращает её ID."""
        with self._get_connection() as conn:
            cursor = conn.execute(
                "INSERT INTO companies (name, payload_json) VALUES (?, ?)",
                (name, json.dumps(payload, ensure_ascii=False))
            )
            return cursor.lastrowid

    def get_company(self, company_id: int) -> Optional[Dict[str, Any]]:
        """Возвращает компанию по ID."""
        with self._get_connection() as conn:
            row = conn.execute(
                "SELECT id, name, payload_json FROM companies WHERE id = ?",
                (company_id,)
            ).fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "name": row["name"],
            "payload": json.loads(row["payload_json"])
        }

    def update_company_payload(self, company_id: int, payload: dict):
        """Обновляет данные компании (например, после загрузки документов)."""
        with self._get_connection() as conn:
            conn.execute(
                "UPDATE companies SET payload_json = ? WHERE id = ?",
                (json.dumps(payload, ensure_ascii=False), company_id)
            )

    def save_application(self, company_id: int, loan: Dict[str, Any], checks: Dict[str, Any] = None) -> int:
        """Сохраняет заявку. Возвращает её ID."""
        with self._get_connection() as conn:
            cursor = conn.execute(
                "INSERT INTO applications (company_id, loan_json, checks_json) VALUES (?, ?, ?)",
                (company_id, json.dumps(loan, ensure_ascii=False), json.dumps(checks or {}, ensure_ascii=False))
            )
            return cursor.lastrowid

    def update_application_result(self, app_id: int, route: str, score: int):
        """Обновляет результат скоринга и статус заявки."""
        with self._get_connection() as conn:
            conn.execute(
                "UPDATE applications SET route = ?, score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (route, score, app_id)
            )

    def update_checks(self, app_id: int, checks: dict):
        """Обновляет результаты проверок (документы, антифрод и т.д.)."""
        with self._get_connection() as conn:
            conn.execute(
                "UPDATE applications SET checks_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (json.dumps(checks, ensure_ascii=False), app_id)
            )

    def update_preliminary_score(self, app_id: int, score: int, route: str):
        """Сохраняет результат скоринга до проверки документов."""
        with self._get_connection() as conn:
            conn.execute(
                "UPDATE applications SET preliminary_score = ?, route = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (score, route, app_id)
            )

    def update_final_score(self, app_id: int, score: int, route: str):
        """Сохраняет результат скоринга после проверки документов."""
        with self._get_connection() as conn:
            conn.execute(
                "UPDATE applications SET final_score = ?, route = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (score, route, app_id)
            )

    def update_bank_offer(self, app_id: int, offer: dict):
        """Сохраняет альтернативное предложение банка."""
        with self._get_connection() as conn:
            conn.execute(
                "UPDATE applications SET bank_offer_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (json.dumps(offer, ensure_ascii=False), app_id)
            )

    def get_application(self, app_id: int) -> Optional[Dict[str, Any]]:
        """Возвращает полную заявку (склеенную с компанией)."""
        with self._get_connection() as conn:
            row = conn.execute("""
                SELECT a.id, a.company_id, a.route, 
                       a.preliminary_score, a.final_score, 
                       a.loan_json, a.checks_json, a.bank_offer_json, 
                       c.payload_json as company_payload
                FROM applications a
                JOIN companies c ON a.company_id = c.id
                WHERE a.id = ?
            """, (app_id,)).fetchone()

        if not row:
            return None

        company_payload = json.loads(row["company_payload"])

        # Собираем JSON, который ждет скоринг
        return {
            "id": row["id"],
            "company_id": row["company_id"],
            "route": row["route"],
            "preliminary_score": row["preliminary_score"],
            "final_score": row["final_score"],

            # Данные для скоринга
            "company": company_payload.get("company"),
            "financials": company_payload.get("financials"),
            "credit_history": company_payload.get("credit_history"),
            "loan": json.loads(row["loan_json"]),
            "checks": json.loads(row["checks_json"]) if row["checks_json"] else {},

            # Предложение банка
            "bank_offer": json.loads(row["bank_offer_json"]) if row["bank_offer_json"] else None
        }
