# app/main.py

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
import sys

from app.core.config import settings, setup_logging

# 配置日志
setup_logging(debug=settings.DEBUG)

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="健康智能体后端 API",
    docs_url="/docs" if settings.DEBUG else None,    # 生产环境关闭文档
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 请求日志中间件
from app.api.middleware.request_logging import setup_request_logging
setup_request_logging(app)

# 全局异常处理 -- 不暴露内部错误 (修订 P0-3)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception on {request.method} {request.url.path}")
    return JSONResponse(
        status_code=500,
        content={"detail": "服务暂时不可用，请稍后重试"}
    )

# 注册路由
from app.api.v1 import auth, chat, health, plan_api, compliance
app.include_router(auth.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(health.router, prefix="/api/v1")
app.include_router(plan_api.router, prefix="/api/v1")
app.include_router(compliance.router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.on_event("shutdown")
async def shutdown():
    from app.db.session import close_db
    await close_db()
