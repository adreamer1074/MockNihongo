import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { examAPI, attemptAPI } from '../api';
import { Exam, Question, Section, AttemptItemCreate } from '../types';

interface QuestionAnswer {
  question_id: number;
  selected: string[];
}

const TakeExam: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const attemptId = searchParams.get('attempt');
  const [exam, setExam] = useState<Exam | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, string[]>>(new Map());
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Map<number, any>>(new Map());

  useEffect(() => {
    if (examId) {
      fetchExam();
    }
  }, [examId]);

  useEffect(() => {
    if (!exam || exam.mode !== 'formal' || !exam.sections[currentSectionIndex]?.time_limit_seconds) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(timer);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [exam, currentSectionIndex]);

  const fetchExam = async () => {
    try {
      const data = await examAPI.getExam(Number(examId));
      setExam(data);
      
      // 時間制限を設定
      const firstSection = data.sections[0];
      if (data.mode === 'formal' && firstSection?.time_limit_seconds) {
        setTimeLeft(firstSection.time_limit_seconds);
      }
    } catch (error) {
      console.error('Failed to fetch exam:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentSection = exam?.sections[currentSectionIndex];
  const currentQuestion = currentSection?.questions[currentQuestionIndex];
  const totalQuestions = exam?.sections.reduce((sum, s) => sum + s.questions.length, 0) || 0;
  const answeredCount = answers.size;

  const handleAnswerChange = (value: string) => {
    if (!currentQuestion) return;

    const currentAnswers = answers.get(currentQuestion.id) || [];
    let newAnswers: string[];

    if (currentQuestion.type === 'multiple_choice_single') {
      newAnswers = [value];
    } else {
      if (currentAnswers.includes(value)) {
        newAnswers = currentAnswers.filter(v => v !== value);
      } else {
        newAnswers = [...currentAnswers, value];
      }
    }

    setAnswers(new Map(answers.set(currentQuestion.id, newAnswers)));

    // 模擬モードの場合は即座にフィードバックを取得
    if (exam?.mode === 'practice' && !feedback.has(currentQuestion.id)) {
      submitAnswer(currentQuestion.id, newAnswers);
    }
  };

  const submitAnswer = async (questionId: number, selected: string[]) => {
    if (!attemptId) return;

    try {
      const result = await attemptAPI.submitAnswers(Number(attemptId), {
        answers: [{ question_id: questionId, selected }]
      });
      
      if (result.length > 0) {
        setFeedback(new Map(feedback.set(questionId, result[0])));
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  };

  const goToNextQuestion = () => {
    if (!currentSection) return;

    if (currentQuestionIndex < currentSection.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (currentSectionIndex < (exam?.sections.length || 0) - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      setCurrentQuestionIndex(0);
      
      // 次のセクションの時間制限を設定
      const nextSection = exam?.sections[currentSectionIndex + 1];
      if (exam?.mode === 'formal' && nextSection?.time_limit_seconds) {
        setTimeLeft(nextSection.time_limit_seconds);
      }
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (currentSectionIndex > 0) {
      const prevSection = exam?.sections[currentSectionIndex - 1];
      setCurrentSectionIndex(currentSectionIndex - 1);
      setCurrentQuestionIndex((prevSection?.questions.length || 1) - 1);
    }
  };

  const handleFinish = async () => {
    if (!attemptId || submitting) return;

    setSubmitting(true);
    try {
      // 未提出の回答を送信
      const unansweredQuestions: AttemptItemCreate[] = [];
      exam?.sections.forEach(section => {
        section.questions.forEach(question => {
          const answer = answers.get(question.id);
          if (answer && !feedback.has(question.id)) {
            unansweredQuestions.push({
              question_id: question.id,
              selected: answer
            });
          }
        });
      });

      if (unansweredQuestions.length > 0) {
        await attemptAPI.submitAnswers(Number(attemptId), {
          answers: unansweredQuestions
        });
      }

      // 試験を終了
      await attemptAPI.finishAttempt(Number(attemptId));
      navigate(`/results/${attemptId}`);
    } catch (error) {
      console.error('Failed to finish exam:', error);
      alert('試験の終了に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!exam || !currentQuestion) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">試験データが見つかりません</p>
      </div>
    );
  }

  const questionFeedback = feedback.get(currentQuestion.id);
  const isLastQuestion = currentSectionIndex === exam.sections.length - 1 && 
                         currentQuestionIndex === currentSection.questions.length - 1;

  return (
    <div className="max-w-4xl mx-auto">
      {/* ヘッダー */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">{exam.title}</h2>
            <p className="text-sm text-gray-600">
              {currentSection.title} - 問題 {currentQuestionIndex + 1} / {currentSection.questions.length}
            </p>
          </div>
          
          <div className="text-right">
            {timeLeft !== null && (
              <div className={`text-2xl font-bold ${timeLeft < 60 ? 'text-red-600' : 'text-primary-600'}`}>
                ⏱️ {formatTime(timeLeft)}
              </div>
            )}
            <p className="text-sm text-gray-600">
              回答済み: {answeredCount} / {totalQuestions}
            </p>
          </div>
        </div>
      </div>

      {/* 問題カード */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-4">
        <div className="mb-6">
          <span className="inline-block px-3 py-1 text-sm font-semibold text-primary-700 bg-primary-100 rounded-full mb-4">
            問 {currentQuestionIndex + 1}
          </span>
          <p className="text-lg whitespace-pre-wrap">{currentQuestion.prompt_text}</p>
        </div>

        {/* 選択肢 */}
        {currentQuestion.choices && currentQuestion.choices.length > 0 && (
          <div className="space-y-3">
            {currentQuestion.choices.map((choice, index) => {
              const isSelected = answers.get(currentQuestion.id)?.includes(choice) || false;
              const isCorrect = questionFeedback?.correct_answer?.includes(choice);
              const showFeedback = exam.mode === 'practice' && questionFeedback;

              return (
                <label
                  key={index}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? showFeedback
                        ? isCorrect
                          ? 'border-green-500 bg-green-50'
                          : 'border-red-500 bg-red-50'
                        : 'border-primary-500 bg-primary-50'
                      : 'border-gray-300 hover:border-primary-300'
                  }`}
                >
                  <input
                    type={currentQuestion.type === 'multiple_choice_single' ? 'radio' : 'checkbox'}
                    name={`question-${currentQuestion.id}`}
                    value={choice}
                    checked={isSelected}
                    onChange={() => handleAnswerChange(choice)}
                    className="mr-3"
                  />
                  <span className="text-lg">{choice}</span>
                  {showFeedback && isCorrect && (
                    <span className="ml-auto text-green-600">✓ 正解</span>
                  )}
                </label>
              );
            })}
          </div>
        )}

        {/* フィードバック（模擬モード） */}
        {exam.mode === 'practice' && questionFeedback && (
          <div className={`mt-6 p-4 rounded-lg ${
            questionFeedback.is_correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <p className="font-semibold mb-2">
              {questionFeedback.is_correct ? '✓ 正解です！' : '✗ 不正解です'}
            </p>
            {questionFeedback.explanation && (
              <p className="text-sm">{questionFeedback.explanation}</p>
            )}
          </div>
        )}
      </div>

      {/* ナビゲーション */}
      <div className="flex justify-between items-center">
        <button
          onClick={goToPreviousQuestion}
          disabled={currentSectionIndex === 0 && currentQuestionIndex === 0}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← 前の問題
        </button>

        <div className="flex gap-2">
          {isLastQuestion ? (
            <button
              onClick={handleFinish}
              disabled={submitting}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? '処理中...' : '試験を終了'}
            </button>
          ) : (
            <button
              onClick={goToNextQuestion}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              次の問題 →
            </button>
          )}
        </div>
      </div>

      {/* 進行状況 */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-4">
        <h3 className="font-semibold mb-3">問題一覧</h3>
        <div className="grid grid-cols-10 gap-2">
          {exam.sections.map((section, sIdx) =>
            section.questions.map((question, qIdx) => {
              const globalIndex = exam.sections
                .slice(0, sIdx)
                .reduce((sum, s) => sum + s.questions.length, 0) + qIdx;
              const isAnswered = answers.has(question.id);
              const isCurrent = sIdx === currentSectionIndex && qIdx === currentQuestionIndex;

              return (
                <button
                  key={question.id}
                  onClick={() => {
                    setCurrentSectionIndex(sIdx);
                    setCurrentQuestionIndex(qIdx);
                  }}
                  className={`w-10 h-10 rounded-md text-sm font-semibold ${
                    isCurrent
                      ? 'bg-primary-600 text-white'
                      : isAnswered
                      ? 'bg-green-200 text-green-800'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {globalIndex + 1}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default TakeExam;
