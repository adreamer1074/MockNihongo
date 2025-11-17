import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { attemptAPI, examAPI } from '../api';
import { Attempt, Exam } from '../types';

const ExamResult: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (attemptId) {
      fetchResults();
    }
  }, [attemptId]);

  const fetchResults = async () => {
    try {
      const attemptData = await attemptAPI.getAttempt(Number(attemptId));
      setAttempt(attemptData);

      const examData = await examAPI.getExam(attemptData.exam_id);
      setExam(examData);
    } catch (error) {
      console.error('Failed to fetch results:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!attempt || !exam) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">結果が見つかりません</p>
      </div>
    );
  }

  const sectionScores = attempt.raw_result?.section_scores || {};
  const totalQuestions = Object.values(sectionScores).reduce(
    (sum: number, section: any) => sum + section.total,
    0
  );
  const correctAnswers = Object.values(sectionScores).reduce(
    (sum: number, section: any) => sum + section.correct,
    0
  );
  const isPassed = attempt.score && attempt.score >= (exam.config?.pass_threshold || 60);

  return (
    <div className="max-w-4xl mx-auto">
      {/* 総合結果 */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-6 text-center">
        <h1 className="text-3xl font-bold mb-4">試験結果</h1>
        <div className="mb-6">
          <div className={`text-6xl font-bold mb-2 ${
            isPassed ? 'text-green-600' : 'text-red-600'
          }`}>
            {attempt.score}点
          </div>
          <p className="text-xl text-gray-600">
            {correctAnswers} / {totalQuestions} 問正解
          </p>
        </div>

        {exam.config?.pass_threshold && (
          <div className={`inline-block px-6 py-3 rounded-full text-lg font-semibold ${
            isPassed
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {isPassed ? '✓ 合格' : '✗ 不合格'} (合格基準: {exam.config.pass_threshold}点)
          </div>
        )}
      </div>

      {/* セクション別スコア */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">セクション別結果</h2>
        <div className="space-y-4">
          {Object.entries(sectionScores).map(([sectionName, scores]: [string, any]) => (
            <div key={sectionName} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">{sectionName}</h3>
                <span className="text-xl font-bold text-primary-600">
                  {scores.percentage}%
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      scores.percentage >= 70 ? 'bg-green-500' :
                      scores.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${scores.percentage}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600 whitespace-nowrap">
                  {scores.correct} / {scores.total} 問
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 試験情報 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">試験情報</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">試験名</p>
            <p className="font-semibold">{exam.title}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">レベル</p>
            <p className="font-semibold">{exam.level}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">試験モード</p>
            <p className="font-semibold">
              {exam.mode === 'formal' ? '本格試験' : '模擬試験'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">受験日時</p>
            <p className="font-semibold">
              {new Date(attempt.started_at).toLocaleString('ja-JP')}
            </p>
          </div>
        </div>
      </div>

      {/* アクション */}
      <div className="flex gap-4">
        <button
          onClick={() => navigate(`/exams/${exam.id}`)}
          className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-semibold"
        >
          もう一度受験する
        </button>
        <button
          onClick={() => navigate('/exams')}
          className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-semibold"
        >
          試験一覧に戻る
        </button>
      </div>

      {/* 分析とアドバイス */}
      <div className="mt-6 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-bold mb-3">📊 結果分析</h3>
        <div className="space-y-2 text-sm">
          {correctAnswers / totalQuestions >= 0.8 ? (
            <p>素晴らしい成績です！この調子で頑張りましょう。</p>
          ) : correctAnswers / totalQuestions >= 0.6 ? (
            <p>良い結果です。弱点を復習することでさらに向上できます。</p>
          ) : (
            <p>もう少し練習が必要です。基礎から復習することをお勧めします。</p>
          )}
          
          {Object.entries(sectionScores).map(([name, scores]: [string, any]) => {
            if (scores.percentage < 60) {
              return (
                <p key={name} className="text-red-700">
                  ⚠️ 「{name}」の強化が必要です（正答率: {scores.percentage}%）
                </p>
              );
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
};

export default ExamResult;
