# app/ai/llm_client.py

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI
from typing import List, Dict, AsyncGenerator, Optional
import os
import logging
import asyncio

logger = logging.getLogger(__name__)

class LLMClient:
    """
    大模型客户端 -- 支持多模型降级 + 流式输出 + 重试 (修订 P0-4 + P1-4)

    降级链: Claude (主力) -> DeepSeek (备用)
    重试: 指数退避，最多 3 次
    """

    def __init__(self):
        self.providers = {}
        self.provider_order = []

        # Claude (主力)
        claude_key = os.getenv("ANTHROPIC_API_KEY")
        if claude_key:
            self.providers['claude'] = AsyncAnthropic(
                api_key=claude_key,
                timeout=30.0,
                max_retries=3,  # SDK 内置重试
            )
            self.provider_order.append('claude')

        # DeepSeek (降级) -- 兼容 OpenAI SDK
        deepseek_key = os.getenv("DEEPSEEK_API_KEY")
        if deepseek_key:
            self.providers['deepseek'] = AsyncOpenAI(
                api_key=deepseek_key,
                base_url="https://api.deepseek.com",
                timeout=30.0,
                max_retries=3,
            )
            self.provider_order.append('deepseek')

        if not self.provider_order:
            raise RuntimeError("未配置任何 LLM API Key")

    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        max_tokens: int = 2048,
    ) -> AsyncGenerator[str, None]:
        """
        流式生成 -- 按降级链尝试，逐 token 返回

        降级逻辑：
        1. 尝试 Claude 流式
        2. Claude 失败 -> 尝试 DeepSeek 流式
        3. 全部失败 -> 抛出异常（由上层处理）
        """
        last_error = None

        for provider in self.provider_order:
            try:
                logger.info(f"Using LLM provider: {provider}")
                if provider == 'claude':
                    async for chunk in self._stream_claude(
                        messages, system_prompt, max_tokens
                    ):
                        yield chunk
                    return  # 成功则不再降级

                elif provider == 'deepseek':
                    async for chunk in self._stream_deepseek(
                        messages, system_prompt, max_tokens
                    ):
                        yield chunk
                    return

            except Exception as e:
                logger.warning(f"Provider {provider} failed: {e}, trying fallback...")
                last_error = e
                continue

        # 所有 provider 都失败
        raise RuntimeError(f"All LLM providers failed. Last error: {last_error}")

    async def _stream_claude(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        max_tokens: int,
    ) -> AsyncGenerator[str, None]:
        """Claude 流式输出"""
        async with self.providers['claude'].messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=max_tokens,
            system=system_prompt,
            messages=messages,
        ) as stream:
            async for text in stream.text_stream:
                yield text

    async def _stream_deepseek(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        max_tokens: int,
    ) -> AsyncGenerator[str, None]:
        """DeepSeek 流式输出（OpenAI 兼容接口）"""
        # DeepSeek 使用 OpenAI 格式，system 消息放在 messages 首条
        full_messages = [{"role": "system", "content": system_prompt}] + messages

        stream = await self.providers['deepseek'].chat.completions.create(
            model="deepseek-chat",
            max_tokens=max_tokens,
            messages=full_messages,
            stream=True,
        )

        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def generate(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        max_tokens: int = 2048,
    ) -> str:
        """非流式生成（用于计划生成等非交互场景）"""
        result = []
        async for chunk in self.generate_stream(messages, system_prompt, max_tokens):
            result.append(chunk)
        return ''.join(result)
