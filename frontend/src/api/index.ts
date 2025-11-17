import api from './axios';
import { 
  UserCreate, 
  UserLogin, 
  Token, 
  User,
  Exam,
  AttemptCreate,
  AttemptStart,
  AttemptSubmit,
  AttemptItemResponse,
  AttemptFinish,
  Attempt
} from '../types';

// 認証API
export const authAPI = {
  register: async (data: UserCreate): Promise<User> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
  
  login: async (data: UserLogin): Promise<Token> => {
    const formData = new FormData();
    formData.append('username', data.username);
    formData.append('password', data.password);
    
    const response = await api.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },
  
  getMe: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// 試験API
export const examAPI = {
  getExams: async (params?: {
    level?: string;
    type?: string;
    is_public?: boolean;
  }): Promise<Exam[]> => {
    const response = await api.get('/exams', { params });
    return response.data;
  },
  
  getExam: async (examId: number): Promise<Exam> => {
    const response = await api.get(`/exams/${examId}`);
    return response.data;
  },
  
  createExam: async (data: any): Promise<Exam> => {
    const response = await api.post('/exams', data);
    return response.data;
  },
  
  updateExam: async (examId: number, data: any): Promise<Exam> => {
    const response = await api.put(`/exams/${examId}`, data);
    return response.data;
  },
  
  deleteExam: async (examId: number): Promise<void> => {
    await api.delete(`/exams/${examId}`);
  },
};

// 試験受験API
export const attemptAPI = {
  startAttempt: async (data: AttemptCreate): Promise<AttemptStart> => {
    const response = await api.post('/attempts', data);
    return response.data;
  },
  
  submitAnswers: async (
    attemptId: number, 
    data: AttemptSubmit
  ): Promise<AttemptItemResponse[]> => {
    const response = await api.post(`/attempts/${attemptId}/answers`, data);
    return response.data;
  },
  
  finishAttempt: async (attemptId: number): Promise<AttemptFinish> => {
    const response = await api.post(`/attempts/${attemptId}/finish`);
    return response.data;
  },
  
  getAttempt: async (attemptId: number): Promise<Attempt> => {
    const response = await api.get(`/attempts/${attemptId}`);
    return response.data;
  },
};
