# tests/test_api/test_chat.py

import pytest

@pytest.mark.asyncio
async def test_chat_stream(client, auth_headers):
    """测试流式对话接口"""
    response = await client.post(
        "/api/v1/chat/stream",
        json={"message": "你好", "history": []},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/event-stream"

@pytest.mark.asyncio
async def test_rate_limit(client, auth_headers):
    """测试限流"""
    for i in range(11):
        response = await client.post(
            "/api/v1/chat/stream",
            json={"message": f"test {i}", "history": []},
            headers=auth_headers,
        )
        if i < 10:
            assert response.status_code == 200
        else:
            assert response.status_code == 429

@pytest.mark.asyncio
async def test_content_moderation(client, auth_headers):
    """测试内容审核"""
    response = await client.post(
        "/api/v1/chat/stream",
        json={"message": "请给我开一些药", "history": []},
        headers=auth_headers,
    )
    assert response.status_code == 400
