# app/db/init_db.py

import asyncio
from app.db.base import Base
from app.db.session import engine


async def init_db():
    """初始化数据库 -- 创建所有表"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created.")


async def drop_db():
    """删除所有表（仅开发环境使用）"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    print("Database tables dropped.")


if __name__ == "__main__":
    asyncio.run(init_db())
