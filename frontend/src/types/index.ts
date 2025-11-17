export interface User {
  id: number;
  username: string;
  email: string | null;
  name: string;
  is_verified: boolean;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface UserCreate {
  username: string;
  email?: string;
  name: string;
  password: string;
}

export interface UserLogin {
  username: string; // OAuth2PasswordRequestForm uses "username"
  password: string;
}

export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
export type ExamType = 'official' | 'mock';
export type ExamMode = 'formal' | 'practice';

// JLPT問題タイプの詳細分類
export type QuestionType = 
  // 文字・語彙
  | 'kanji_reading'           // 漢字読み（アンダーバー付き）
  | 'orthography'             // 表記（正しい表記を選ぶ）
  | 'word_formation'          // 語形成（N1のみ）
  | 'contextual_definition'   // 文脈規定（意味を選ぶ）
  | 'paraphrase'              // 言い換え類義（同じ意味の表現）
  | 'usage'                   // 用法（正しい使い方）
  // 文法
  | 'grammar_form'            // 文の文法1（文法形式の判断）
  | 'sentence_composition'    // 文の文法2（文の組み立て・★入れ問題）
  | 'text_grammar'            // 文章の文法
  // 読解
  | 'short_comprehension'     // 内容理解（短文）
  | 'medium_comprehension'    // 内容理解（中文）
  | 'long_comprehension'      // 内容理解（長文）
  | 'integrated_comprehension'// 統合理解
  | 'assertion_comprehension' // 主張理解（長文）
  | 'information_retrieval'   // 情報検索
  // 聴解
  | 'task_comprehension'      // 課題理解
  | 'point_comprehension'     // ポイント理解
  | 'outline_comprehension'   // 概要理解
  | 'utterance_expression'    // 発話表現
  | 'immediate_response'      // 即時応答
  | 'integrated_listening';   // 統合理解（聴解）

export interface Exam {
  id: number;
  title: string;
  level: JLPTLevel;
  type: ExamType;
  mode: ExamMode;
  creator_id: number | null;
  is_public: boolean;
  config: Record<string, any>;
  created_at: string;
  sections: Section[];
}

export interface Section {
  id: number;
  exam_id: number;
  title: string;
  order: number;
  time_limit_seconds: number | null;
  weight: number;
  questions: Question[];
}

export interface Question {
  id: number;
  section_id: number;
  order: number;
  type: QuestionType;
  prompt_text: string;
  choices: string[] | null;
  explanation_text: string | null;
  meta: Record<string, any>;
}

export interface QuestionWithAnswer extends Question {
  answer: string[];
}

export interface AttemptCreate {
  exam_id: number;
  mode?: ExamMode; // 受験モード（practice/formal）
}

export interface AttemptStart {
  attempt_id: number;
  exam: Exam;
  started_at: string;
}

export interface AttemptItemCreate {
  question_id: number;
  selected: string[] | null;
}

export interface AttemptSubmit {
  answers: AttemptItemCreate[];
}

export interface AttemptItemResponse {
  question_id: number;
  is_correct: boolean;
  correct_answer: string[] | null;
  explanation: string | null;
}

export interface AttemptFinish {
  score: number;
  total_questions: number;
  section_scores: Record<string, {
    correct: number;
    total: number;
    percentage: number;
  }>;
  is_passed: boolean | null;
}

export interface Attempt {
  id: number;
  exam_id: number;
  user_id: number | null;
  started_at: string;
  ended_at: string | null;
  score: number | null;
  total_score: number | null;
  is_passed: boolean | null;
  raw_result: Record<string, any> | null;
}
