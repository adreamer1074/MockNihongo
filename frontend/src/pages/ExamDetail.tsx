import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examAPI, attemptAPI } from '../api';
import { Exam } from '../types';

const ExamDetail: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (examId) {
      fetchExam();
    }
  }, [examId]);

  const fetchExam = async () => {
    try {
      const data = await examAPI.getExam(Number(examId));
      setExam(data);
    } catch (error) {
      console.error('Failed to fetch exam:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async () => {
    if (!exam) return;

    try {
      const attemptData = await attemptAPI.startAttempt({ exam_id: exam.id });
      navigate(`/exams/${exam.id}/take?attempt=${attemptData.attempt_id}`);
    } catch (error) {
      console.error('Failed to start exam:', error);
      alert('試験の開始に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">試験が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <span className="inline-block px-4 py-2 text-lg font-semibold text-primary-700 bg-primary-100 rounded-full">
              {exam.level}
            </span>
            <span className="text-sm text-gray-600">
              {exam.mode === 'formal' ? '本格試験（時間制限あり）' : '模擬試験（時間制限なし）'}
            </span>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {exam.title}
          </h1>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">試験構成</h2>
          <div className="space-y-4">
            {exam.sections.map((section, index) => (
              <div key={section.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {index + 1}. {section.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      問題数: {section.questions.length}問
                    </p>
                  </div>
                  {section.time_limit_seconds && (
                    <span className="text-sm text-gray-600">
                      制限時間: {Math.floor(section.time_limit_seconds / 60)}分
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleStartExam}
            className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-semibold"
          >
            受験する
          </button>
          <button
            onClick={() => navigate('/exams')}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            戻る
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamDetail;
