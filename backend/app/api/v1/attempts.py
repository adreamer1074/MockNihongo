from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from app.database import get_db
from app.models import Attempt, AttemptItem, Exam, Question, Section
from app.schemas import (
    AttemptCreate, AttemptStart, AttemptSubmit, AttemptFinish,
    AttemptItemResponse, Attempt as AttemptSchema
)
from app.auth import get_optional_user, get_current_user
from app.models import User

router = APIRouter()

@router.get("/my-history", response_model=List[AttemptSchema])
def get_my_attempts(
    limit: int = 3,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ログインユーザーの受験履歴取得"""
    attempts = db.query(Attempt)\
        .filter(Attempt.user_id == current_user.id)\
        .order_by(Attempt.started_at.desc())\
        .limit(limit)\
        .all()
    
    return attempts

@router.post("", response_model=AttemptStart, status_code=status.HTTP_201_CREATED)
def start_attempt(
    attempt_data: AttemptCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """試験受験開始"""
    exam = db.query(Exam).filter(Exam.id == attempt_data.exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # 受験モードが指定されている場合は試験のmodeを更新
    if attempt_data.mode:
        exam.mode = attempt_data.mode
        db.commit()
        db.refresh(exam)
    
    # Attemptを作成
    new_attempt = Attempt(
        exam_id=exam.id,
        user_id=current_user.id if current_user else None
    )
    db.add(new_attempt)
    db.commit()
    db.refresh(new_attempt)
    
    return {
        "attempt_id": new_attempt.id,
        "exam": exam,
        "started_at": new_attempt.started_at
    }

@router.post("/{attempt_id}/answers", response_model=List[AttemptItemResponse])
def submit_answers(
    attempt_id: int,
    submit_data: AttemptSubmit,
    db: Session = Depends(get_db)
):
    """回答送信（模擬モード用：即時フィードバック）"""
    attempt = db.query(Attempt).filter(Attempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    exam = db.query(Exam).filter(Exam.id == attempt.exam_id).first()
    
    responses = []
    
    for answer_data in submit_data.answers:
        question = db.query(Question).filter(Question.id == answer_data.question_id).first()
        if not question:
            continue
        
        # 正誤判定
        is_correct = set(answer_data.selected or []) == set(question.answer)
        
        # AttemptItemを作成または更新
        attempt_item = db.query(AttemptItem).filter(
            AttemptItem.attempt_id == attempt_id,
            AttemptItem.question_id == answer_data.question_id
        ).first()
        
        if attempt_item:
            attempt_item.selected = answer_data.selected
            attempt_item.is_correct = is_correct
        else:
            attempt_item = AttemptItem(
                attempt_id=attempt_id,
                question_id=answer_data.question_id,
                selected=answer_data.selected,
                is_correct=is_correct
            )
            db.add(attempt_item)
        
        # 模擬モードの場合は正解と解説を返す
        response = {
            "question_id": question.id,
            "is_correct": is_correct,
            "correct_answer": question.answer if exam.mode == "practice" else None,
            "explanation": question.explanation_text if exam.mode == "practice" else None
        }
        responses.append(response)
    
    db.commit()
    return responses

@router.post("/{attempt_id}/finish", response_model=AttemptFinish)
def finish_attempt(
    attempt_id: int,
    db: Session = Depends(get_db)
):
    """試験終了・採点"""
    attempt = db.query(Attempt).filter(Attempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    if attempt.ended_at:
        raise HTTPException(status_code=400, detail="Attempt already finished")
    
    # スコア計算
    items = db.query(AttemptItem).filter(AttemptItem.attempt_id == attempt_id).all()
    total_questions = len(items)
    correct_count = sum(1 for item in items if item.is_correct)
    score = int((correct_count / total_questions * 100)) if total_questions > 0 else 0
    
    # セクション別スコア
    exam = db.query(Exam).filter(Exam.id == attempt.exam_id).first()
    section_scores = {}
    
    for section in exam.sections:
        section_items = [item for item in items if any(q.id == item.question_id for q in section.questions)]
        section_total = len(section_items)
        section_correct = sum(1 for item in section_items if item.is_correct)
        section_scores[section.title] = {
            "correct": section_correct,
            "total": section_total,
            "percentage": int((section_correct / section_total * 100)) if section_total > 0 else 0
        }
    
    # Attempt更新
    attempt.ended_at = datetime.utcnow()
    attempt.score = score
    attempt.total_score = score
    attempt.is_passed = score >= exam.config.get("pass_threshold", 60) if exam.config else None
    attempt.raw_result = {"section_scores": section_scores}
    
    db.commit()
    
    return {
        "score": score,
        "total_questions": total_questions,
        "section_scores": section_scores,
        "is_passed": score >= exam.config.get("pass_threshold", 60) if exam.config else None
    }

@router.get("/{attempt_id}", response_model=AttemptSchema)
def get_attempt(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """試験結果取得"""
    attempt = db.query(Attempt).filter(Attempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    # ユーザーチェック（ゲストまたは自分のattempt）
    if current_user and attempt.user_id and attempt.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return attempt
