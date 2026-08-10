# tests/conftest.py

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.main import app
from app.db.session import get_db

@pytest_asyncio.fixture
async def client():
    """测试用 HTTP 客户端"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest_asyncio.fixture
async def db_session():
    """测试用数据库会话（使用测试数据库）"""
    engine = create_async_engine("postgresql+asyncpg://test:test@localhost/test_db")
    async with AsyncSession(engine) as session:
        yield session
        await session.rollback()

@pytest.fixture
def auth_headers():
    """测试用认证头"""
    # TODO: 生成测试用 JWT Token
    return {"Authorization": "Bearer test-token"}
