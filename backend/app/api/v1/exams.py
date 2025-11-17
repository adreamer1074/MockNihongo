from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Exam, Section, Question, User
from app.schemas import (
    ExamCreate, ExamUpdate, ExamList, Exam as ExamSchema, ExamWithAnswers,
    SectionCreate, QuestionCreate
)
from app.auth import get_current_user, get_optional_user

router = APIRouter()

@router.get("", response_model=List[ExamList])
def get_exams(
    level: Optional[str] = None,
    type: Optional[str] = None,
    is_public: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """試験一覧取得"""
    query = db.query(Exam)
    
    if level:
        query = query.filter(Exam.level == level)
    if type:
        query = query.filter(Exam.type == type)
    if is_public is not None:
        query = query.filter(Exam.is_public == is_public)
    else:
        # デフォルトは公開試験のみ
        query = query.filter(Exam.is_public == True)
    
    exams = query.all()
    return exams

@router.get("/{exam_id}", response_model=ExamSchema)
def get_exam(exam_id: int, db: Session = Depends(get_db)):
    """試験詳細取得（正解は含まない）"""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # 非公開試験の場合は作成者のみアクセス可能（今回は簡略化）
    return exam

@router.get("/{exam_id}/with-answers", response_model=ExamWithAnswers)
def get_exam_with_answers(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """試験詳細取得（正解を含む）- 作成者のみ"""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # 作成者チェック
    if exam.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return exam

@router.post("", response_model=ExamSchema, status_code=status.HTTP_201_CREATED)
def create_exam(
    exam_data: ExamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """試験作成"""
    new_exam = Exam(
        title=exam_data.title,
        level=exam_data.level,
        type=exam_data.type,
        mode=exam_data.mode,
        creator_id=current_user.id,
        is_public=exam_data.is_public,
        config=exam_data.config
    )
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)
    return new_exam

@router.put("/{exam_id}", response_model=ExamSchema)
def update_exam(
    exam_id: int,
    exam_data: ExamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """試験更新"""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if exam_data.title is not None:
        exam.title = exam_data.title
    if exam_data.is_public is not None:
        exam.is_public = exam_data.is_public
    if exam_data.config is not None:
        exam.config = exam_data.config
    
    db.commit()
    db.refresh(exam)
    return exam

@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """試験削除"""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db.delete(exam)
    db.commit()
    return None

@router.post("/{exam_id}/sections", status_code=status.HTTP_201_CREATED)
def create_section(
    exam_id: int,
    section_data: SectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """セクション作成"""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # exam_idをパスから設定
    section_dict = section_data.dict()
    section_dict['exam_id'] = exam_id
    
    new_section = Section(**section_dict)
    db.add(new_section)
    db.commit()
    db.refresh(new_section)
    return new_section

@router.post("/{exam_id}/sections/{section_id}/questions", status_code=status.HTTP_201_CREATED)
def create_question(
    exam_id: int,
    section_id: int,
    question_data: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """問題作成"""
    # 試験とセクションの存在確認
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    section = db.query(Section).filter(
        Section.id == section_id,
        Section.exam_id == exam_id
    ).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    
    # section_idをパスから設定
    question_dict = question_data.dict()
    question_dict['section_id'] = section_id
    
    new_question = Question(**question_dict)
    db.add(new_question)
    db.commit()
    db.refresh(new_question)
    return new_question
