from app.core.db import SessionDep


class BaseService:
    def __init__(self, session: SessionDep) -> None:
        self.session = session
