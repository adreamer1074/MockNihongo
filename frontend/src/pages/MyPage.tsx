import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { examAPI, attemptAPI } from '../api';
import { useAuthStore } from '../store/authStore';
import { Exam, Attempt } from '../types';

const MyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'created' | 'history'>('created');
  
  const [createdExams, setCreatedExams] = useState<Exam[]>([]);
  const [attemptHistory, setAttemptHistory] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [isAuthenticated, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 作成した試験を取得（全試験から自分が作成したものをフィルタ）
      const allExams = await examAPI.getExams();
      const myExams = allExams.filter((exam: Exam) => exam.creator_id === user?.id);
      setCreatedExams(myExams);

      // 受験履歴を取得
      try {
        const history = await attemptAPI.getMyAttempts(3);
        setAttemptHistory(history);
      } catch (error) {
        console.error('Failed to fetch attempt history:', error);
        // エラーが出ても空配列のまま続行
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async (examId: number) => {
    if (!confirm('この試験を削除してもよろしいですか？')) {
      return;
    }

    try {
      await examAPI.deleteExam(examId);
      setCreatedExams(createdExams.filter((exam) => exam.id !== examId));
      alert('試験を削除しました');
    } catch (error: any) {
      console.error('Failed to delete exam:', error);
      const message = error.response?.data?.detail || '試験の削除に失敗しました';
      alert(message);
    }
  };

  const handleEditExam = (examId: number) => {
    navigate(`/edit-exam/${examId}`);
  };

  const handleTogglePublic = async (exam: Exam) => {
    try {
      await examAPI.updateExam(exam.id, {
        ...exam,
        is_public: !exam.is_public
      });
      
      setCreatedExams(
        createdExams.map((e) =>
          e.id === exam.id ? { ...e, is_public: !e.is_public } : e
        )
      );
    } catch (error) {
      console.error('Failed to update exam:', error);
      alert('試験の更新に失敗しました');
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">マイページ</h1>
        <p className="text-gray-600">
          ようこそ、<span className="font-semibold">{user?.username}</span> さん
        </p>
      </div>

      {/* タブ */}
      <div className="mb-6 border-b">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('created')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'created'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600'
            }`}
          >
            作成した試験（{createdExams.length}）
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'history'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600'
            }`}
          >
            受験履歴（{attemptHistory.length}）
          </button>
        </div>
      </div>

      {activeTab === 'created' ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">作成した試験</h2>
            <button
              onClick={() => navigate('/create-exam')}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              + 新規作成
            </button>
          </div>

          {createdExams.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600 mb-4">まだ試験を作成していません</p>
              <button
                onClick={() => navigate('/create-exam')}
                className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                最初の試験を作成する
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {createdExams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold">{exam.title}</h3>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            exam.is_public
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {exam.is_public ? '公開' : '非公開'}
                        </span>
                        <span className="px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded-full">
                          {exam.level}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          モード: {exam.mode === 'formal' ? '本格試験' : '模擬試験'}
                        </p>
                        <p>作成日: {new Date(exam.created_at).toLocaleDateString('ja-JP')}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/exams/${exam.id}`)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        詳細
                      </button>
                      <button
                        onClick={() => handleEditExam(exam.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleTogglePublic(exam)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                      >
                        {exam.is_public ? '非公開にする' : '公開する'}
                      </button>
                      <button
                        onClick={() => handleDeleteExam(exam.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-bold mb-4">受験履歴</h2>
          
          {attemptHistory.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600 mb-4">まだ受験履歴がありません</p>
              <button
                onClick={() => navigate('/exams')}
                className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                試験一覧を見る
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      試験名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      受験日
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      得点
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      結果
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attemptHistory.map((attempt) => (
                    <tr key={attempt.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">
                            {attempt.exam?.title || `試験 #${attempt.exam_id}`}
                          </div>
                          {attempt.exam?.level && (
                            <span className="text-xs text-gray-500 mt-1">
                              {attempt.exam.level}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(attempt.started_at).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold">
                          {attempt.total_score !== null ? `${attempt.total_score}点` : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {attempt.is_passed !== null ? (
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              attempt.is_passed
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {attempt.is_passed ? '合格' : '不合格'}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">未完了</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {attempt.ended_at ? (
                          <button
                            onClick={() => navigate(`/results/${attempt.id}`)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            詳細を見る
                          </button>
                        ) : (
                          <span className="text-gray-400">受験中</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyPage;
