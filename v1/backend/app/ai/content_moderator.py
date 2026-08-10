# app/ai/content_moderator.py

import re
import logging

logger = logging.getLogger(__name__)

class ContentModerator:
    """内容审核 -- 输入过滤 + 输出安全检查"""

    # 输入敏感词模式
    INPUT_BLOCKED_PATTERNS = [
        r'诊断.*病',
        r'开.*药',
        r'处方',
        r'治疗方案',
        r'吃药',
        r'用药',
    ]

    # 输出禁止模式
    OUTPUT_BLOCKED_PATTERNS = [
        r'你可能患有.{0,10}病',
        r'建议你服用.{0,10}药',
        r'诊断为.{0,10}病',
        r'你需要.{0,10}治疗',
    ]

    @classmethod
    def is_input_safe(cls, text: str) -> bool:
        """检查用户输入是否安全"""
        for pattern in cls.INPUT_BLOCKED_PATTERNS:
            if re.search(pattern, text):
                logger.warning(f"Blocked input: matched pattern '{pattern}'")
                return False
        return True

    @classmethod
    def is_output_safe(cls, text: str) -> bool:
        """检查 AI 输出是否安全"""
        for pattern in cls.OUTPUT_BLOCKED_PATTERNS:
            if re.search(pattern, text):
                logger.warning(f"Unsafe output detected: matched pattern '{pattern}'")
                return False
        return True
