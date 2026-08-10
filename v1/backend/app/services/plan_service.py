# app/services/plan_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import json
import logging

from app.models.plan import TrainingPlan
from app.ai.llm_client import LLMClient
from app.ai.prompts.plan_generator import PLAN_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

class PlanService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = LLMClient()

    async def generate_plan(self, user_id: str, request: dict) -> TrainingPlan:
        """调用 LLM 生成训练计划"""
        prompt = f"请根据以下信息生成训练计划：目标={request.get('goal')}，周期={request.get('duration_weeks')}周"

        response = await self.llm.generate(
            messages=[{"role": "user", "content": prompt}],
            system_prompt=PLAN_SYSTEM_PROMPT,
            max_tokens=2048,
        )

        try:
            plan_data = json.loads(response)
        except json.JSONDecodeError:
            plan_data = {"title": "训练计划", "content": response}

        plan = TrainingPlan(
            user_id=user_id,
            title=plan_data.get("title", "训练计划"),
            goal=plan_data.get("goal", request.get("goal", "health")),
            duration_weeks=plan_data.get("duration_weeks", 4),
            plan_content=plan_data,
        )
        self.db.add(plan)
        await self.db.commit()
        await self.db.refresh(plan)
        return plan

    async def get_plans(self, user_id: str) -> List[TrainingPlan]:
        from sqlalchemy import select
        stmt = (
            select(TrainingPlan)
            .where(TrainingPlan.user_id == user_id)
            .order_by(TrainingPlan.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_plan(self, user_id: str, plan_id: str) -> TrainingPlan:
        from sqlalchemy import select
        stmt = select(TrainingPlan).where(
            TrainingPlan.id == plan_id,
            TrainingPlan.user_id == user_id,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
