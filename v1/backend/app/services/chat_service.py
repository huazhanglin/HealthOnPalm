# app/services/chat_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis
from typing import List, Dict, AsyncGenerator, Optional
import logging
import time

from app.ai.llm_client import LLMClient
from app.ai.prompts.health_coach import SYSTEM_PROMPT
from app.ai.content_moderator import ContentModerator
from app.models.message import Message
from app.core.config import settings

logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self, db: AsyncSession, redis: Redis):
        self.db = db
        self.redis = redis
        self.llm = LLMClient()

    async def process_message_stream(
        self,
        user_id: str,
        message: str,
        history: Optional[List[Dict]] = None,
    ) -> AsyncGenerator[str, None]:
        """
        流式处理用户消息

        1. 构建 LLM 上下文（系统提示 + 历史 + 当前消息）
        2. 流式生成回复
        3. 内容安全检查
        4. 保存对话记录
        """
        start_time = time.time()
        full_response = []

        # 构建消息列表
        messages = self._build_messages(history or [], message)

        # 流式生成
        async for chunk in self.llm.generate_stream(
            messages=messages,
            system_prompt=SYSTEM_PROMPT,
            max_tokens=2048,
        ):
            full_response.append(chunk)
            yield chunk

        # 生成完成后异步保存
        response_text = ''.join(full_response)
        elapsed_ms = int((time.time() - start_time) * 1000)

        # 内容安全检查 -- 输出过滤
        if not ContentModerator.is_output_safe(response_text):
            logger.warning(f"Unsafe output detected for user {user_id}")
            # 记录但不阻断（已流式输出，无法撤回）

        # 保存对话记录（含成本追踪字段） (修订 P1-9)
        await self._save_message(
            user_id=user_id,
            role='user',
            content=message,
        )
        await self._save_message(
            user_id=user_id,
            role='agent',
            content=response_text,
            response_time_ms=elapsed_ms,
        )

    def _build_messages(
        self, history: List[Dict], current_message: str
    ) -> List[Dict[str, str]]:
        """构建 LLM 消息列表 -- 历史截断 (修订 P1-2)"""
        # 后端也做截断，不信任客户端
        max_history = 10
        recent = history[-max_history:] if len(history) > max_history else history

        messages = []
        for h in recent:
            messages.append({
                'role': h.get('role', 'user'),
                'content': h.get('content', ''),
            })
        messages.append({'role': 'user', 'content': current_message})
        return messages

    async def _save_message(
        self,
        user_id: str,
        role: str,
        content: str,
        response_time_ms: Optional[int] = None,
    ):
        """保存消息到数据库"""
        msg = Message(
            user_id=user_id,
            role=role,
            content=content,
            response_time_ms=response_time_ms,
        )
        self.db.add(msg)
        await self.db.commit()

    async def get_history(
        self, user_id: str, limit: int = 50, offset: int = 0
    ) -> List[Message]:
        """获取对话历史"""
        from sqlalchemy import select
        stmt = (
            select(Message)
            .where(Message.user_id == user_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
