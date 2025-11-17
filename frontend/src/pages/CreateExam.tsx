import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { examAPI } from '../api';
import { useAuthStore } from '../store/authStore';
import { JLPTLevel, ExamType, ExamMode, QuestionType } from '../types';
import { JLPT_SECTIONS, QUESTION_TYPE_INFO, AVAILABLE_QUESTION_TYPES, getQuestionTypesForSection } from '../constants/jlpt';

interface Section {
  title: string;
  order: number;
  time_limit_seconds: number | null;
  weight: number;
  questions: Question[];
}

interface Question {
  order: number;
  type: QuestionType;
  prompt_text: string;
  choices: string[];
  answer: string[];
  explanation_text: string;
  meta?: {
    underline_word?: string;      // 漢字読み問題のアンダーバー付き単語
    star_position?: number;        // ★入れ問題の★の位置
    passage?: string;              // 読解問題の本文
    audio_url?: string;            // 聴解問題の音声URL
  };
}

const CreateExam: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'manual' | 'pdf'>('manual');
  const [loading, setLoading] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);

  // 試験基本情報
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState<JLPTLevel>('N5');
  const [isPublic, setIsPublic] = useState(false);
  const [passThreshold, setPassThreshold] = useState(60);

  // セクション（レベル変更時に自動設定）
  const [sections, setSections] = useState<Section[]>([]);

  // 現在編集中のセクション
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  // 問題編集
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    order: 1,
    type: 'kanji_reading',
    prompt_text: '',
    choices: ['', '', '', ''],
    answer: [],
    explanation_text: '',
    meta: {}
  });

  // レベル変更時にJLPT標準セクションを設定
  React.useEffect(() => {
    const standardSections = JLPT_SECTIONS[level].map((sec, idx) => ({
      title: sec.title,
      order: idx + 1,
      time_limit_seconds: sec.time_minutes * 60,
      weight: 1,
      questions: []
    }));
    setSections(standardSections);
    setCurrentSectionIndex(0);
  }, [level]);

  // セクション変更時に問題タイプを適切なものに変更
  React.useEffect(() => {
    if (sections[currentSectionIndex]) {
      const availableTypes = getQuestionTypesForSection(sections[currentSectionIndex].title, level);
      // 現在の問題タイプが利用可能でない場合、最初の利用可能なタイプに変更
      if (!availableTypes.includes(currentQuestion.type)) {
        setCurrentQuestion({
          ...currentQuestion,
          type: availableTypes[0]
        });
      }
    }
  }, [currentSectionIndex, sections, level]);

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">試験を作成するにはログインが必要です</p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          ログイン
        </button>
      </div>
    );
  }

  const addSection = () => {
    setSections([
      ...sections,
      {
        title: `カスタムセクション ${sections.length + 1}`,
        order: sections.length + 1,
        time_limit_seconds: 1800, // 30分
        weight: 1,
        questions: []
      }
    ]);
  };

  const deleteSection = (index: number) => {
    if (sections.length <= 1) {
      alert('最低1つのセクションが必要です');
      return;
    }
    const updated = sections.filter((_, i) => i !== index);
    setSections(updated);
    if (currentSectionIndex >= updated.length) {
      setCurrentSectionIndex(updated.length - 1);
    }
  };

  const updateSection = (index: number, field: keyof Section, value: any) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    setSections(updated);
  };

  const addQuestionToSection = () => {
    if (!currentQuestion.prompt_text || currentQuestion.answer.length === 0) {
      alert('問題文と正解を入力してください');
      return;
    }

    // 問題文からメタデータを自動抽出
    let processedQuestion = { ...currentQuestion };
    let processedPromptText = currentQuestion.prompt_text;

    // 漢字読み問題: [単語] を抽出
    if (currentQuestion.type === 'kanji_reading') {
      const match = currentQuestion.prompt_text.match(/\[(.*?)\]/);
      if (match) {
        processedQuestion.meta = {
          ...processedQuestion.meta,
          underline_word: match[1]
        };
        // プレビュー用に元のテキストを保持（実際の試験では下線表示）
      }
    }

    // ★入れ問題: [_]の位置を計算
    if (currentQuestion.type === 'sentence_composition') {
      const parts = currentQuestion.prompt_text.split(/(\[\]|\[_\])/);
      let starPosition = 0;
      let boxCount = 0;
      
      for (const part of parts) {
        if (part === '[]') {
          boxCount++;
        } else if (part === '[_]') {
          starPosition = boxCount + 1; // ★の位置は現在のボックス数 + 1
          break;
        }
      }
      
      if (starPosition > 0) {
        processedQuestion.meta = {
          ...processedQuestion.meta,
          star_position: starPosition
        };
      }
    }

    const updated = [...sections];
    
    if (editingQuestionIndex !== null) {
      // 編集モード
      updated[currentSectionIndex].questions[editingQuestionIndex] = {
        ...processedQuestion,
        order: editingQuestionIndex + 1
      };
      setEditingQuestionIndex(null);
    } else {
      // 新規追加
      updated[currentSectionIndex].questions.push({
        ...processedQuestion,
        order: updated[currentSectionIndex].questions.length + 1
      });
    }
    
    setSections(updated);

    // フォームをリセット
    setCurrentQuestion({
      order: updated[currentSectionIndex].questions.length + 1,
      type: 'kanji_reading',
      prompt_text: '',
      choices: ['', '', '', ''],
      answer: [],
      explanation_text: '',
      meta: {}
    });
  };

  const editQuestion = (index: number) => {
    const question = sections[currentSectionIndex].questions[index];
    setCurrentQuestion({ ...question });
    setEditingQuestionIndex(index);
    // スクロールして問題フォームへ
    document.getElementById('question-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const deleteQuestion = (index: number) => {
    if (!confirm('この問題を削除しますか？')) return;
    
    const updated = [...sections];
    updated[currentSectionIndex].questions = updated[currentSectionIndex].questions.filter((_, i) => i !== index);
    // order を再設定
    updated[currentSectionIndex].questions.forEach((q, i) => {
      q.order = i + 1;
    });
    setSections(updated);
  };

  const cancelEdit = () => {
    setEditingQuestionIndex(null);
    setCurrentQuestion({
      order: sections[currentSectionIndex].questions.length + 1,
      type: 'kanji_reading',
      prompt_text: '',
      choices: ['', '', '', ''],
      answer: [],
      explanation_text: '',
      meta: {}
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (sections.every(s => s.questions.length === 0)) {
      alert('少なくとも1つの問題を追加してください');
      return;
    }

    setLoading(true);
    try {
      // 試験を作成
      const exam = await examAPI.createExam({
        title,
        level,
        type: 'mock', // 常に模擬試験として作成
        mode: 'practice', // デフォルトは練習モード（受験時に選択）
        is_public: isPublic,
        config: { pass_threshold: passThreshold }
      });

      // 各セクションと問題を作成
      for (const section of sections) {
        if (section.questions.length === 0) continue; // 問題がないセクションはスキップ
        
        // セクションを作成
        const createdSection = await examAPI.createSection(exam.id, {
          title: section.title,
          order: section.order,
          time_limit_seconds: section.time_limit_seconds,
          weight: section.weight
        });

        // セクションの各問題を作成
        for (const question of section.questions) {
          await examAPI.createQuestion(exam.id, createdSection.id, {
            order: question.order,
            type: question.type,
            prompt_text: question.prompt_text,
            choices: question.choices.filter(c => c.trim() !== ''), // 空の選択肢を除外
            answer: question.answer,
            explanation_text: question.explanation_text,
            question_metadata: question.meta // question_metadataに変更
          });
        }
      }
      
      alert('試験を作成しました！');
      navigate(`/exams/${exam.id}`);
    } catch (error: any) {
      console.error('Failed to create exam:', error);
      console.error('Error response:', error.response);
      
      let errorMessage = '試験の作成に失敗しました';
      
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage += ': ' + error.response.data.detail;
        } else {
          errorMessage += ': ' + JSON.stringify(error.response.data.detail);
        }
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">試験作成</h1>

      {/* タブ */}
      <div className="mb-6 border-b">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'manual'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600'
            }`}
          >
            手動作成
          </button>
          <button
            onClick={() => setActiveTab('pdf')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'pdf'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600'
            }`}
          >
            PDFアップロード
          </button>
        </div>
      </div>

      {activeTab === 'manual' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本情報 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">基本情報</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  試験名 *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="例: JLPT N5 模擬試験 第1回"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  レベル *
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as JLPTLevel)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="N5">N5</option>
                  <option value="N4">N4</option>
                  <option value="N3">N3</option>
                  <option value="N2">N2</option>
                  <option value="N1">N1</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  合格基準（%）
                </label>
                <input
                  type="number"
                  value={passThreshold}
                  onChange={(e) => setPassThreshold(Number(e.target.value))}
                  min={0}
                  max={100}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    この試験を公開する
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* セクション管理 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">セクション構成</h2>
              <button
                type="button"
                onClick={addSection}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                + カスタムセクション追加
              </button>
            </div>

            <div className="mb-4 text-sm text-gray-600">
              JLPT {level} の標準構成で自動設定されています
            </div>

            <div className="space-y-2">
              {sections.map((section, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    currentSectionIndex === index
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setCurrentSectionIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {section.title}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        問題数: {section.questions.length} 問 | 
                        制限時間: {section.time_limit_seconds ? `${Math.floor(section.time_limit_seconds / 60)}分` : '設定なし'}
                      </div>
                    </div>
                    {sections.length > 1 && index >= JLPT_SECTIONS[level].length && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSection(index);
                        }}
                        className="ml-4 text-red-600 hover:text-red-700"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 問題一覧 */}
          {sections[currentSectionIndex]?.questions.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">
                {sections[currentSectionIndex]?.title} - 問題一覧
              </h2>
              <div className="space-y-3">
                {sections[currentSectionIndex].questions.map((q, idx) => (
                  <div key={idx} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-gray-900">問{q.order}:</span>
                          <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded">
                            {QUESTION_TYPE_INFO[q.type].name}
                          </span>
                        </div>
                        <div className="text-gray-900 mb-2 leading-relaxed">
                          {q.type === 'kanji_reading' ? (
                            // 漢字読み: [単語] を下線付きで表示
                            q.prompt_text.split(/(\[.*?\])/).map((part, i) => {
                              if (part.match(/\[.*?\]/)) {
                                const word = part.slice(1, -1);
                                return (
                                  <span key={i} className="border-b-2 border-blue-600 font-semibold px-1">
                                    {word}
                                  </span>
                                );
                              }
                              return <span key={i}>{part}</span>;
                            })
                          ) : (q.type === 'paraphrase' || 
                                q.type === 'contextual_definition' || 
                                q.type === 'usage' ||
                                q.type === 'grammar_form') ? (
                            // 語彙・文法: [] を下線（_____）で表示
                            q.prompt_text.split(/(\[\]|\[.*?\])/).map((part, i) => {
                              if (part === '[]') {
                                return (
                                  <span key={i} className="border-b-2 border-blue-600 px-3 inline-block mx-1">
                                    _____
                                  </span>
                                );
                              }
                              if (part.match(/\[.*?\]/)) {
                                const word = part.slice(1, -1);
                                return (
                                  <span key={i} className="border-b-2 border-blue-600 font-semibold px-1">
                                    {word}
                                  </span>
                                );
                              }
                              return <span key={i}>{part}</span>;
                            })
                          ) : q.type === 'sentence_composition' ? (
                            // ★入れ: [] をボックスに、[_] を★に変換
                            (() => {
                              let boxNumber = 1;
                              return q.prompt_text.split(/(\[\]|\[_\])/).map((part, i) => {
                                if (part === '[]') {
                                  const num = boxNumber++;
                                  return (
                                    <span key={i} className="inline-block w-6 h-6 border border-gray-400 text-center leading-6 mx-0.5 text-xs">
                                      {num}
                                    </span>
                                  );
                                }
                                if (part === '[_]') {
                                  const currentNum = boxNumber++;
                                  return (
                                    <span key={i} className="inline-block w-6 h-6 bg-purple-200 border-2 border-purple-600 text-center leading-6 mx-0.5 font-bold text-xs">
                                      ★
                                    </span>
                                  );
                                }
                                return <span key={i}>{part}</span>;
                              });
                            })()
                          ) : (
                            q.prompt_text
                          )}
                        </div>
                        {q.meta?.underline_word && (
                          <div className="text-sm text-blue-600 mb-1">
                            下線部: {q.meta.underline_word}
                          </div>
                        )}
                        {q.meta?.star_position && (
                          <div className="text-sm text-purple-600 mb-1">
                            ★位置: {q.meta.star_position}
                          </div>
                        )}
                        {q.meta?.passage && (
                          <div className="text-sm text-green-600 mb-1">
                            本文: {q.meta.passage.substring(0, 50)}...
                          </div>
                        )}
                        <div className="text-sm space-y-1">
                          {q.choices.map((choice, cidx) => (
                            <div
                              key={cidx}
                              className={`pl-4 ${
                                q.answer.includes(choice)
                                  ? 'text-green-600 font-semibold'
                                  : 'text-gray-600'
                              }`}
                            >
                              {cidx + 1}. {choice} {q.answer.includes(choice) && '✓'}
                            </div>
                          ))}
                        </div>
                        {q.explanation_text && (
                          <div className="mt-2 text-sm text-gray-500 bg-gray-50 p-2 rounded">
                            解説: {q.explanation_text}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          type="button"
                          onClick={() => editQuestion(idx)}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteQuestion(idx)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 問題追加/編集 */}
          <div id="question-form" className="bg-white rounded-lg shadow-md p-6 border-2 border-dashed border-gray-300">
            <h2 className="text-xl font-bold mb-4 text-primary-600">
              {editingQuestionIndex !== null ? '問題を編集' : '新しい問題を追加'} - {sections[currentSectionIndex]?.title}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  問題タイプ *
                </label>
                <select
                  value={currentQuestion.type}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, type: e.target.value as QuestionType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                >
                  {getQuestionTypesForSection(sections[currentSectionIndex]?.title || '', level).map((type) => (
                    <option key={type} value={type}>
                      {QUESTION_TYPE_INFO[type].name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  {QUESTION_TYPE_INFO[currentQuestion.type].description}
                </p>
                <p className="mt-1 text-xs text-gray-400 italic">
                  例: {QUESTION_TYPE_INFO[currentQuestion.type].example}
                </p>
              </div>

              {/* 漢字読み問題用：入力ガイド */}
              {currentQuestion.type === 'kanji_reading' && (
                <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    📝 漢字読み問題の入力方法
                  </label>
                  <div className="space-y-2 text-sm text-blue-900">
                    <p>問題文で読みを問いたい単語を <code className="bg-blue-200 px-2 py-1 rounded">[単語]</code> のように角括弧で囲んでください。</p>
                    <p className="font-semibold">例:</p>
                    <div className="bg-white p-3 rounded border border-blue-300">
                      <p className="mb-1">入力: 私は<code className="bg-blue-200 px-1">[昨日]</code>東京へ行きました。</p>
                      <p className="text-blue-700">表示: 私は<span className="border-b-2 border-blue-600 px-1 font-semibold">昨日</span>東京へ行きました。</p>
                      <p className="text-green-700 mt-2">答え: 私は<span className="bg-green-100 px-1 font-semibold">きのう</span>東京へ行きました。</p>
                    </div>
                    <p className="text-xs text-blue-700 mt-2">
                      ✓ 角括弧内の単語が下線付きで表示されます<br/>
                      ✓ 受験者は選択肢から正しい読みを選びます<br/>
                      ✓ 答えを表示する時、選択した読みが下線部分に表示されます
                    </p>
                  </div>
                </div>
              )}

              {/* 語彙・文法問題用：入力ガイド */}
              {(currentQuestion.type === 'paraphrase' || 
                currentQuestion.type === 'contextual_definition' || 
                currentQuestion.type === 'usage' ||
                currentQuestion.type === 'grammar_form') && (
                <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    📝 語彙・文法問題の入力方法
                  </label>
                  <div className="space-y-2 text-sm text-blue-900">
                    <p>問題文で選択肢に置き換える部分を <code className="bg-blue-200 px-2 py-1 rounded">[]</code> で囲んでください。</p>
                    <p className="font-semibold">例:</p>
                    <div className="bg-white p-3 rounded border border-blue-300">
                      <p className="mb-1">入力: <code className="bg-blue-200 px-1">[]</code>と同じ意味の言葉は？</p>
                      <p className="text-blue-700">表示: <span className="border-b-2 border-blue-600 px-3">_____</span>と同じ意味の言葉は？</p>
                      <p className="text-green-700 mt-2">答え: <span className="bg-green-100 px-1 font-semibold">美しい</span>と同じ意味の言葉は？</p>
                    </div>
                    <p className="text-xs text-blue-700 mt-2">
                      ✓ 空の角括弧 [] が下線（_____）として表示されます<br/>
                      ✓ 受験者は選択肢から適切な語を選びます<br/>
                      ✓ 答えを表示する時、正解が下線部分に表示されます
                    </p>
                  </div>
                </div>
              )}

              {/* ★入れ問題用：入力ガイド */}
              {currentQuestion.type === 'sentence_composition' && (
                <div className="bg-purple-50 p-4 rounded-md border border-purple-200">
                  <label className="block text-sm font-medium text-purple-900 mb-2">
                    ⭐ 文の組み立て（★入れ）問題の入力方法
                  </label>
                  <div className="space-y-2 text-sm text-purple-900">
                    <p>空欄は <code className="bg-purple-200 px-2 py-1 rounded">[]</code>、★の位置は <code className="bg-purple-200 px-2 py-1 rounded">[_]</code> で入力してください。</p>
                    <p className="font-semibold">例:</p>
                    <div className="bg-white p-3 rounded border border-purple-300">
                      <p className="mb-1">入力: あそこは<code className="bg-purple-200 px-1">[]</code><code className="bg-purple-200 px-1">[]</code><code className="bg-purple-200 px-1">[_]</code><code className="bg-purple-200 px-1">[]</code>います。</p>
                      <p className="text-purple-700">表示: あそこは <span className="inline-block w-8 h-8 border-2 border-gray-400 text-center leading-8 mx-1">1</span> <span className="inline-block w-8 h-8 border-2 border-gray-400 text-center leading-8 mx-1">2</span> <span className="inline-block w-8 h-8 bg-purple-200 border-2 border-purple-600 text-center leading-8 mx-1">★</span> <span className="inline-block w-8 h-8 border-2 border-gray-400 text-center leading-8 mx-1">4</span> います。</p>
                    </div>
                    <p className="text-xs text-purple-700 mt-2">
                      ✓ [] が番号付きの空欄ボックスになります<br/>
                      ✓ [_] が★（正解の位置）になります<br/>
                      ✓ 選択肢で単語を並べ替えて正しい文を作ります
                    </p>
                  </div>
                </div>
              )}

              {/* 読解問題用：本文 */}
              {(currentQuestion.type.includes('comprehension') || currentQuestion.type === 'information_retrieval') && (
                <div className="bg-green-50 p-4 rounded-md border border-green-200">
                  <label className="block text-sm font-medium text-green-900 mb-1">
                    読解本文
                  </label>
                  <textarea
                    value={currentQuestion.meta?.passage || ''}
                    onChange={(e) => setCurrentQuestion({
                      ...currentQuestion,
                      meta: { ...currentQuestion.meta, passage: e.target.value }
                    })}
                    rows={6}
                    className="w-full px-3 py-2 border border-green-300 rounded-md"
                    placeholder="本文を入力してください"
                  />
                </div>
              )}

              {/* 聴解問題用：音声URL */}
              {currentQuestion.type.includes('listening') || 
               ['task_comprehension', 'point_comprehension', 'outline_comprehension', 'utterance_expression', 'immediate_response'].includes(currentQuestion.type) && (
                <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                  <label className="block text-sm font-medium text-yellow-900 mb-1">
                    音声ファイルURL（任意）
                  </label>
                  <input
                    type="text"
                    value={currentQuestion.meta?.audio_url || ''}
                    onChange={(e) => setCurrentQuestion({
                      ...currentQuestion,
                      meta: { ...currentQuestion.meta, audio_url: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-yellow-300 rounded-md"
                    placeholder="https://example.com/audio.mp3"
                  />
                  <p className="mt-1 text-xs text-yellow-700">
                    音声ファイルのURLを入力してください（S3などのストレージ）
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  問題文 *
                  {currentQuestion.type === 'kanji_reading' && (
                    <span className="ml-2 text-xs text-blue-600">（読みを問う単語を [単語] で囲む）</span>
                  )}
                  {(currentQuestion.type === 'paraphrase' || 
                    currentQuestion.type === 'contextual_definition' || 
                    currentQuestion.type === 'usage' ||
                    currentQuestion.type === 'grammar_form') && (
                    <span className="ml-2 text-xs text-blue-600">（空欄は [] で表す）</span>
                  )}
                  {currentQuestion.type === 'sentence_composition' && (
                    <span className="ml-2 text-xs text-purple-600">（空欄は []、★の位置は [_]）</span>
                  )}
                </label>
                <textarea
                  value={currentQuestion.prompt_text}
                  onChange={(e) =>
                    setCurrentQuestion({ ...currentQuestion, prompt_text: e.target.value })
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder={
                    currentQuestion.type === 'kanji_reading' 
                      ? "例: 私は[昨日]東京へ行きました。" 
                      : (currentQuestion.type === 'paraphrase' || 
                         currentQuestion.type === 'contextual_definition' || 
                         currentQuestion.type === 'usage' ||
                         currentQuestion.type === 'grammar_form')
                      ? "例: []と同じ意味の言葉は？"
                      : currentQuestion.type === 'sentence_composition'
                      ? "例: あそこは[][][_][]います。"
                      : "問題文を入力してください"
                  }
                />
                
                {/* プレビュー */}
                {currentQuestion.prompt_text && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-1">プレビュー:</p>
                    <div className="text-gray-900">
                      {currentQuestion.type === 'kanji_reading' ? (
                        // [単語] を下線付きに変換
                        currentQuestion.prompt_text.split(/(\[.*?\])/).map((part, idx) => {
                          if (part.match(/\[.*?\]/)) {
                            const word = part.slice(1, -1);
                            return (
                              <span key={idx} className="border-b-2 border-blue-600 font-semibold px-1">
                                {word}
                              </span>
                            );
                          }
                          return part;
                        })
                      ) : (currentQuestion.type === 'paraphrase' || 
                            currentQuestion.type === 'contextual_definition' || 
                            currentQuestion.type === 'usage' ||
                            currentQuestion.type === 'grammar_form') ? (
                        // [] を下線に変換
                        currentQuestion.prompt_text.split(/(\[\]|\[.*?\])/).map((part, idx) => {
                          if (part === '[]') {
                            return (
                              <span key={idx} className="border-b-2 border-blue-600 px-3 inline-block mx-1">
                                _____
                              </span>
                            );
                          }
                          if (part.match(/\[.*?\]/)) {
                            const word = part.slice(1, -1);
                            return (
                              <span key={idx} className="border-b-2 border-blue-600 font-semibold px-1">
                                {word}
                              </span>
                            );
                          }
                          return part;
                        })
                      ) : currentQuestion.type === 'sentence_composition' ? (
                        // [] をボックスに、[_] を★に変換
                        (() => {
                          let boxNumber = 1;
                          return currentQuestion.prompt_text.split(/(\[\]|\[_\])/).map((part, idx) => {
                            if (part === '[]') {
                              const num = boxNumber++;
                              return (
                                <span key={idx} className="inline-block w-8 h-8 border-2 border-gray-400 text-center leading-8 mx-1 text-sm">
                                  {num}
                                </span>
                              );
                            }
                            if (part === '[_]') {
                              const currentNum = boxNumber++;
                              return (
                                <span key={idx} className="inline-block w-8 h-8 bg-purple-200 border-2 border-purple-600 text-center leading-8 mx-1 font-bold text-sm">
                                  ★
                                </span>
                              );
                            }
                            return <span key={idx}>{part}</span>;
                          });
                        })()
                      ) : (
                        currentQuestion.prompt_text
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  選択肢（正解にチェックを入れてください） *
                </label>
                {currentQuestion.choices.map((choice, index) => (
                  <div key={index} className="flex gap-2 mb-3">
                    <span className="flex items-center justify-center w-8 h-10 text-gray-500 font-semibold">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={choice}
                      onChange={(e) => {
                        const updated = [...currentQuestion.choices];
                        updated[index] = e.target.value;
                        setCurrentQuestion({ ...currentQuestion, choices: updated });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder={`選択肢 ${index + 1}`}
                    />
                    <label className="flex items-center px-3 py-2 border-2 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                      style={{
                        borderColor: currentQuestion.answer.includes(choice) && choice ? '#10b981' : '#d1d5db',
                        backgroundColor: currentQuestion.answer.includes(choice) && choice ? '#d1fae5' : 'white'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={currentQuestion.answer.includes(choice)}
                        onChange={(e) => {
                          if (!choice) {
                            alert('選択肢を入力してください');
                            return;
                          }
                          const updated = e.target.checked
                            ? [...currentQuestion.answer, choice]
                            : currentQuestion.answer.filter((a) => a !== choice);
                          setCurrentQuestion({ ...currentQuestion, answer: updated });
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium">正解</span>
                    </label>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentQuestion({
                      ...currentQuestion,
                      choices: [...currentQuestion.choices, '']
                    });
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  + 選択肢を追加
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  解説（任意）
                </label>
                <textarea
                  value={currentQuestion.explanation_text}
                  onChange={(e) =>
                    setCurrentQuestion({ ...currentQuestion, explanation_text: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="解説を入力してください（任意）"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={addQuestionToSection}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-semibold transition-colors"
                >
                  {editingQuestionIndex !== null ? '問題を更新' : 'この問題を追加'}
                </button>
                {editingQuestionIndex !== null && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    キャンセル
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 送信 */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-semibold disabled:opacity-50"
            >
              {loading ? '作成中...' : '試験を作成'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/exams')}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              キャンセル
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">PDFアップロード</h2>
          <p className="text-gray-600 mb-4">
            この機能は現在開発中です。PDFファイルから自動的に問題を抽出し、編集後に保存できるようになります。
          </p>
        </div>
      )}
    </div>
  );
};

export default CreateExam;
