# app/api/middleware/rate_limit.py

from redis.asyncio import Redis
from fastapi import HTTPException, Request
from datetime import date
import logging

logger = logging.getLogger(__name__)

RATE_LIMITS = {
    "chat": {"free": 10, "window": 86400},       # 10 次/日
    "history": {"free": 30, "window": 3600},      # 30 次/时
    "health_data": {"free": 20, "window": 3600},  # 20 次/时
    "plan": {"free": 3, "window": 86400},         # 3 次/日
}

async def check_rate_limit(
    user_id: str,
    is_premium: bool,
    resource: str,
    redis: Redis,
):
    """
    检查限流 -- Redis 滑动窗口

    Args:
        user_id: 用户 ID
        is_premium: 是否付费用户
        resource: 资源类型（chat/history/health_data/plan）
        redis: Redis 连接
    """
    if is_premium:
        return  # 付费用户不限流

    config = RATE_LIMITS.get(resource)
    if not config:
        return  # 无配置则不限流

    key = f"rate_limit:{resource}:{user_id}:{date.today()}"
    count = await redis.incr(key)

    if count == 1:
        await redis.expire(key, config["window"])

    if count > config["free"]:
        remaining = 0
        logger.info(f"Rate limit exceeded for user {user_id}: {resource} ({count}/{config['free']})")
        raise HTTPException(
            status_code=429,
            detail={
                "message": f"今日{resource}次数已用完（{config['free']}次/日）",
                "upgrade_url": "/profile/subscription",
            }
        )
