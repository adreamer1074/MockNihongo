from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

class ExamType(str, enum.Enum):
    OFFICIAL = "official"
    MOCK = "mock"

class ExamMode(str, enum.Enum):
    FORMAL = "formal"      # 本格試験（時間制限あり）
    PRACTICE = "practice"  # 模擬試験（時間制限なし）

class QuestionType(str, enum.Enum):
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

class JLPTLevel(str, enum.Enum):
    N5 = "N5"
    N4 = "N4"
    N3 = "N3"
    N2 = "N2"
    N1 = "N1"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    exams = relationship("Exam", back_populates="creator")
    attempts = relationship("Attempt", back_populates="user")

class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    level = Column(SQLEnum(JLPTLevel), nullable=False)
    type = Column(SQLEnum(ExamType), nullable=False)
    mode = Column(SQLEnum(ExamMode), nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_public = Column(Boolean, default=False)
    config = Column(JSON, default={})  # 設定情報（合格基準など）
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    creator = relationship("User", back_populates="exams")
    sections = relationship("Section", back_populates="exam", cascade="all, delete-orphan")
    attempts = relationship("Attempt", back_populates="exam", cascade="all, delete-orphan")

class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False)
    title = Column(String, nullable=False)  # 例：「文字・語彙」「文法」「読解」
    order = Column(Integer, nullable=False)
    time_limit_seconds = Column(Integer, nullable=True)
    weight = Column(Integer, default=1)  # 配点の重み

    # Relationships
    exam = relationship("Exam", back_populates="sections")
    questions = relationship("Question", back_populates="section", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    order = Column(Integer, nullable=False)
    type = Column(SQLEnum(QuestionType), nullable=False)
    prompt_text = Column(Text, nullable=False)
    choices = Column(JSON, nullable=True)  # 選択肢の配列
    answer = Column(JSON, nullable=False)  # 正解（配列形式）
    explanation_text = Column(Text, nullable=True)
    question_metadata = Column(JSON, default={})  # 追加情報（underline_word, star_position, passage, audio_url など）

    # Relationships
    section = relationship("Section", back_populates="questions")
    attempt_items = relationship("AttemptItem", back_populates="question")

class Attempt(Base):
    __tablename__ = "attempts"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # ゲストの場合はnull
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    score = Column(Integer, nullable=True)
    total_score = Column(Integer, nullable=True)
    is_passed = Column(Boolean, nullable=True)
    raw_result = Column(JSON, default={})  # セクション別スコアなど

    # Relationships
    exam = relationship("Exam", back_populates="attempts")
    user = relationship("User", back_populates="attempts")
    items = relationship("AttemptItem", back_populates="attempt", cascade="all, delete-orphan")

class AttemptItem(Base):
    __tablename__ = "attempt_items"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("attempts.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    selected = Column(JSON, nullable=True)  # ユーザーの選択
    is_correct = Column(Boolean, nullable=True)
    time_spent = Column(Integer, nullable=True)  # 秒数

    # Relationships
    attempt = relationship("Attempt", back_populates="items")
    question = relationship("Question", back_populates="attempt_items")
