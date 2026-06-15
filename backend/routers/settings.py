from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import SystemSetting
from schemas import SystemSetting as SystemSettingSchema, SystemSettingUpdate

router = APIRouter()

@router.get("/settings/{key}", response_model=SystemSettingSchema)
def get_setting(key: str, db: Session = Depends(get_db)):
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not setting:
        # Return a default empty setting instead of 404 for ease of use
        return SystemSettingSchema(id=0, key=key, value="", updated_at=None)
    return setting

@router.post("/settings/{key}", response_model=SystemSettingSchema)
def update_setting(key: str, update: SystemSettingUpdate, db: Session = Depends(get_db)):
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if setting:
        setting.value = update.value
    else:
        setting = SystemSetting(key=key, value=update.value)
        db.add(setting)
    
    db.commit()
    db.refresh(setting)
    return setting
