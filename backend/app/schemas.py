from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum

# Enums
class ExamType(str, Enum):
    OFFICIAL = "official"
    MOCK = "mock"

class ExamMode(str, Enum):
    FORMAL = "formal"
    PRACTICE = "practice"

class QuestionType(str, Enum):
    MULTIPLE_CHOICE_SINGLE = "multiple_choice_single"
    MULTIPLE_CHOICE_MULTIPLE = "multiple_choice_multiple"
    FILL_BLANK = "fill_blank"

class JLPTLevel(str, Enum):
    N5 = "N5"
    N4 = "N4"
    N3 = "N3"
    N2 = "N2"
    N1 = "N1"

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: int
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Question Schemas
class QuestionBase(BaseModel):
    section_id: int
    order: int
    type: QuestionType
    prompt_text: str
    choices: Optional[List[str]] = None
    explanation_text: Optional[str] = None
    metadata: Optional[dict] = {}

class QuestionCreate(QuestionBase):
    answer: List[str]

class QuestionUpdate(BaseModel):
    prompt_text: Optional[str] = None
    choices: Optional[List[str]] = None
    answer: Optional[List[str]] = None
    explanation_text: Optional[str] = None

class Question(QuestionBase):
    id: int
    # answerは含めない（試験中は見せない）

    class Config:
        from_attributes = True

class QuestionWithAnswer(Question):
    answer: List[str]

# Section Schemas
class SectionBase(BaseModel):
    exam_id: int
    title: str
    order: int
    time_limit_seconds: Optional[int] = None
    weight: int = 1

class SectionCreate(SectionBase):
    pass

class Section(SectionBase):
    id: int
    questions: List[Question] = []

    class Config:
        from_attributes = True

class SectionWithAnswers(SectionBase):
    id: int
    questions: List[QuestionWithAnswer] = []

    class Config:
        from_attributes = True

# Exam Schemas
class ExamBase(BaseModel):
    title: str
    level: JLPTLevel
    type: ExamType
    mode: ExamMode
    is_public: bool = False
    config: Optional[dict] = {}

class ExamCreate(ExamBase):
    pass

class ExamUpdate(BaseModel):
    title: Optional[str] = None
    is_public: Optional[bool] = None
    config: Optional[dict] = None

class ExamList(ExamBase):
    id: int
    creator_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

class Exam(ExamBase):
    id: int
    creator_id: Optional[int]
    created_at: datetime
    sections: List[Section] = []

    class Config:
        from_attributes = True

class ExamWithAnswers(ExamBase):
    id: int
    creator_id: Optional[int]
    created_at: datetime
    sections: List[SectionWithAnswers] = []

    class Config:
        from_attributes = True

# Attempt Schemas
class AttemptItemCreate(BaseModel):
    question_id: int
    selected: Optional[List[str]] = None

class AttemptItemResponse(BaseModel):
    question_id: int
    is_correct: bool
    correct_answer: Optional[List[str]] = None
    explanation: Optional[str] = None

class AttemptCreate(BaseModel):
    exam_id: int

class AttemptStart(BaseModel):
    attempt_id: int
    exam: Exam
    started_at: datetime

class AttemptSubmit(BaseModel):
    answers: List[AttemptItemCreate]

class AttemptFinish(BaseModel):
    score: int
    total_questions: int
    section_scores: dict
    is_passed: Optional[bool] = None

class Attempt(BaseModel):
    id: int
    exam_id: int
    user_id: Optional[int]
    started_at: datetime
    ended_at: Optional[datetime]
    score: Optional[int]
    raw_result: Optional[dict]

    class Config:
        from_attributes = True
