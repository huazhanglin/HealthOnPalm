# app/api/v1/chat.py

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import List
import json
import logging

from app.schemas.message import MessageCreate, MessageResponse
from app.services.chat_service import ChatService
from app.api.deps import get_current_user, get_chat_service, get_redis
from app.models.user import User
from app.ai.content_moderator import ContentModerator
from app.api.middleware.rate_limit import check_rate_limit

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/chat/stream")
async def send_message_stream(
    request: MessageCreate,
    current_user: User = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service),  # (修订 P0-2)
    redis=Depends(get_redis),
):
    """
    流式对话 -- SSE 逐 token 返回 (修订 P0-4)

    返回格式: text/event-stream
    每条事件: data: {"content": "..."}\n\n
    结束事件: data: {"done": true}\n\n
    错误事件: data: {"error": "..."}\n\n
    """
    # 内容审核 -- 输入过滤
    if not ContentModerator.is_input_safe(request.message):
        raise HTTPException(status_code=400, detail="输入内容包含敏感信息，请修改后重试")

    # 限流检查
    await check_rate_limit(
        user_id=str(current_user.id),
        is_premium=current_user.is_premium,
        resource="chat",
        redis=redis,
    )

    async def event_stream():
        try:
            async for chunk in chat_service.process_message_stream(
                user_id=current_user.id,
                message=request.message,
                history=request.history,
            ):
                yield f"data: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            logger.exception("Stream chat failed")
            yield f"data: {json.dumps({'error': '生成回复失败，请稍后重试'}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Nginx 不缓冲
        },
    )

@router.get("/chat/history", response_model=List[MessageResponse])
async def get_chat_history(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service),
):
    """获取对话历史"""
    messages = await chat_service.get_history(
        user_id=current_user.id,
        limit=min(limit, 100),  # 上限保护
        offset=offset,
    )
    return messages
