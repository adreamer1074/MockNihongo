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
    # 文字・語彙
    KANJI_READING = "kanji_reading"
    ORTHOGRAPHY = "orthography"
    WORD_FORMATION = "word_formation"
    CONTEXTUAL_DEFINITION = "contextual_definition"
    PARAPHRASE = "paraphrase"
    USAGE = "usage"
    # 文法
    GRAMMAR_FORM = "grammar_form"
    SENTENCE_COMPOSITION = "sentence_composition"
    TEXT_GRAMMAR = "text_grammar"
    # 読解
    SHORT_COMPREHENSION = "short_comprehension"
    MEDIUM_COMPREHENSION = "medium_comprehension"
    LONG_COMPREHENSION = "long_comprehension"
    INTEGRATED_COMPREHENSION = "integrated_comprehension"
    ASSERTION_COMPREHENSION = "assertion_comprehension"
    INFORMATION_RETRIEVAL = "information_retrieval"
    # 聴解
    TASK_COMPREHENSION = "task_comprehension"
    POINT_COMPREHENSION = "point_comprehension"
    OUTLINE_COMPREHENSION = "outline_comprehension"
    UTTERANCE_EXPRESSION = "utterance_expression"
    IMMEDIATE_RESPONSE = "immediate_response"
    INTEGRATED_LISTENING = "integrated_listening"

class JLPTLevel(str, Enum):
    N5 = "N5"
    N4 = "N4"
    N3 = "N3"
    N2 = "N2"
    N1 = "N1"

# User Schemas
class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
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
    order: int
    type: QuestionType
    prompt_text: str
    choices: Optional[List[str]] = None
    explanation_text: Optional[str] = None
    question_metadata: Optional[dict] = {}  # metadata予約語を避けてquestion_metadataに変更

class QuestionCreate(QuestionBase):
    answer: List[str]
    section_id: Optional[int] = None  # URLパスから設定されるのでオプション

class QuestionUpdate(BaseModel):
    prompt_text: Optional[str] = None
    choices: Optional[List[str]] = None
    answer: Optional[List[str]] = None
    explanation_text: Optional[str] = None

class Question(QuestionBase):
    id: int
    section_id: int
    # answerは含めない（試験中は見せない）

    class Config:
        from_attributes = True

class QuestionWithAnswer(Question):
    answer: List[str]

# Section Schemas
class SectionBase(BaseModel):
    title: str
    order: int
    time_limit_seconds: Optional[int] = None
    weight: int = 1

class SectionCreate(SectionBase):
    exam_id: Optional[int] = None  # URLパスから設定されるのでオプション

class Section(SectionBase):
    id: int
    exam_id: int
    questions: List[Question] = []

    class Config:
        from_attributes = True

class SectionWithAnswers(SectionBase):
    id: int
    exam_id: int
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
    mode: Optional[ExamMode] = None  # 受験モード（practice/formal）

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
    total_score: Optional[int]
    is_passed: Optional[bool]
    raw_result: Optional[dict]
    exam: Optional['ExamList'] = None  # 試験情報を含める

    class Config:
        from_attributes = True
