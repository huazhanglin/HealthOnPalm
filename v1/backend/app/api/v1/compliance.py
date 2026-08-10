# app/api/v1/compliance.py

from fastapi import APIRouter, Depends
from app.api.deps import get_current_user
from app.models.user import User
from app.services.compliance_service import ComplianceService
from app.db.session import get_db

router = APIRouter()

@router.post("/compliance/delete-account")
async def request_account_deletion(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """请求注销账号 -- 软删除 30 天后物理删除"""
    service = ComplianceService()
    await service.request_account_deletion(str(current_user.id), db)
    return {"message": "注销请求已提交，账号将在 30 天后永久删除"}

@router.get("/compliance/export-data")
async def export_user_data(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """导出用户全部数据（数据可携带权）"""
    service = ComplianceService()
    data = await service.export_user_data(str(current_user.id), db)
    return data
