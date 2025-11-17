from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import os
import tempfile
from app.database import get_db
from app.models import User
from app.auth import get_current_user
from app.pdf_parser import PDFParser

router = APIRouter()

@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """PDFアップロード＆解析"""
    
    # ファイルタイプチェック
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # 一時ファイルに保存
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
        content = await file.read()
        tmp_file.write(content)
        tmp_path = tmp_file.name
    
    try:
        # PDFを解析
        questions = PDFParser.parse_pdf_to_questions(tmp_path)
        
        return {
            "success": True,
            "questions": questions,
            "message": f"{len(questions)}個の問題を抽出しました。確認・修正してください。"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF解析エラー: {str(e)}")
    
    finally:
        # 一時ファイルを削除
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
