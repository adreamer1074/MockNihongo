import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import ExamList from './pages/ExamList';
import ExamDetail from './pages/ExamDetail';
import TakeExam from './pages/TakeExam';
import ExamResult from './pages/ExamResult';
import Login from './pages/Login';
import Register from './pages/Register';
import CreateExam from './pages/CreateExam';
import MyPage from './pages/MyPage';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/exams" element={<ExamList />} />
          <Route path="/exams/:examId" element={<ExamDetail />} />
          <Route path="/exams/:examId/take" element={<TakeExam />} />
          <Route path="/results/:attemptId" element={<ExamResult />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/create-exam" element={<CreateExam />} />
          <Route path="/my-page" element={<MyPage />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
