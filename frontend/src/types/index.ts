export interface User {
  id: number;
  email: string;
  name: string;
  is_verified: boolean;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface UserCreate {
  email: string;
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
export type QuestionType = 'multiple_choice_single' | 'multiple_choice_multiple' | 'fill_blank';

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
  metadata: Record<string, any>;
}

export interface QuestionWithAnswer extends Question {
  answer: string[];
}

export interface AttemptCreate {
  exam_id: number;
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
  raw_result: Record<string, any> | null;
}
