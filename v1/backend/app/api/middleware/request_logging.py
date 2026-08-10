# app/api/middleware/request_logging.py

from fastapi import Request
from loguru import logger
import time

def setup_request_logging(app):
    """注册请求日志中间件"""

    @app.middleware("http")
    async def request_logging_middleware(request: Request, call_next):
        """记录每个请求的耗时和状态"""
        start = time.time()

        # 请求信息
        logger.info(f"-> {request.method} {request.url.path}")

        response = await call_next(request)

        # 响应信息
        elapsed_ms = int((time.time() - start) * 1000)
        logger.info(
            f"<- {request.method} {request.url.path} "
            f"[{response.status_code}] {elapsed_ms}ms"
        )

        # 慢请求告警
        if elapsed_ms > 3000:
            logger.warning(f"Slow request: {request.url.path} took {elapsed_ms}ms")

        return response
