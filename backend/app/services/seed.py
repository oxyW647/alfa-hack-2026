from app.core.config import settings
from app.core.db import SessionLocal
from app.core.enums import UserRole
from app.core.security import hash_password
from app.repositories.user import UserRepository


async def seed_demo_users() -> None:
    demo = (
        (settings.demo_client_email, settings.demo_client_password, "Демо-клиент", UserRole.CLIENT),
        (
            settings.demo_employee_email,
            settings.demo_employee_password,
            "Демо-сотрудник банка",
            UserRole.EMPLOYEE,
        ),
    )
    async with SessionLocal() as session:
        users = UserRepository(session)
        for email, password, full_name, role in demo:
            if await users.by_email(email) is not None:
                continue
            await users.insert_if_absent(
                email=email.lower(),
                password_hash=hash_password(password),
                full_name=full_name,
                role=role,
                is_active=True,
            )
        await session.commit()
