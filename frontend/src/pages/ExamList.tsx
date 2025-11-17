import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { examAPI } from '../api';
import { Exam } from '../types';

const ExamList: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<string>(searchParams.get('level') || '');

  useEffect(() => {
    fetchExams();
  }, [selectedLevel]);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const params = selectedLevel ? { level: selectedLevel } : undefined;
      const data = await examAPI.getExams(params);
      setExams(data);
    } catch (error) {
      console.error('Failed to fetch exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">試験一覧</h1>

      {/* レベルフィルター */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setSelectedLevel('')}
          className={`px-4 py-2 rounded-md ${
            selectedLevel === ''
              ? 'bg-primary-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          すべて
        </button>
        {levels.map((level) => (
          <button
            key={level}
            onClick={() => setSelectedLevel(level)}
            className={`px-4 py-2 rounded-md ${
              selectedLevel === level
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {level}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">試験が見つかりません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <div key={exam.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="inline-block px-3 py-1 text-sm font-semibold text-primary-700 bg-primary-100 rounded-full">
                  {exam.level}
                </span>
                <span className="text-xs text-gray-500">
                  {exam.mode === 'formal' ? '本格試験' : '模擬試験'}
                </span>
              </div>
              
              <h3 className="text-lg font-semibold mb-2 text-gray-900">
                {exam.title}
              </h3>
              
              <p className="text-sm text-gray-600 mb-4">
                {exam.sections.length} セクション
              </p>
              
              <Link
                to={`/exams/${exam.id}`}
                className="block w-full text-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                詳細を見る
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExamList;
