import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { examAPI, pdfAPI } from '../api';
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
  const { examId } = useParams<{ examId: string }>();
  const isEditMode = !!examId;
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'manual' | 'pdf' | 'text' | 'ocr'>('manual');
  const [loading, setLoading] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [editingQuestions, setEditingQuestions] = useState<Set<number>>(new Set());

  // PDF/テキスト関連
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [textFile, setTextFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [extractedQuestions, setExtractedQuestions] = useState<any[]>([]);
  const [extractedTextPreview, setExtractedTextPreview] = useState<string>('');
  
  // OCR関連
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState<string>('');
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);

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

  // 編集モード時に既存の試験データを読み込む
  useEffect(() => {
    if (isEditMode && examId) {
      loadExamData(parseInt(examId));
    }
  }, [isEditMode, examId]);

  const loadExamData = async (id: number) => {
    setLoading(true);
    try {
      const exam = await examAPI.getExam(id);
      setTitle(exam.title);
      setLevel(exam.level);
      setIsPublic(exam.is_public);
      setPassThreshold(exam.pass_threshold);
      
      // セクションと問題をロード
      if (exam.sections && exam.sections.length > 0) {
        const loadedSections = exam.sections.map((sec: any) => ({
          title: sec.title,
          order: sec.order,
          time_limit_seconds: sec.time_limit_seconds,
          weight: sec.weight,
          questions: sec.questions.map((q: any) => ({
            order: q.order,
            type: q.type,
            prompt_text: q.prompt_text,
            choices: Array.isArray(q.choices) ? q.choices : [],
            answer: Array.isArray(q.answer) ? q.answer : [],
            explanation_text: q.explanation_text || '',
            meta: q.meta || {}
          }))
        }));
        setSections(loadedSections);
      }
    } catch (error) {
      console.error('Failed to load exam:', error);
      alert('試験データの読み込みに失敗しました');
      navigate('/my-page');
    } finally {
      setLoading(false);
    }
  };

  // レベル変更時にJLPT標準セクションを設定（編集モードではスキップ）
  React.useEffect(() => {
    if (isEditMode) return; // 編集モードでは既存データを使用
    
    const standardSections = JLPT_SECTIONS[level].map((sec, idx) => ({
      title: sec.title,
      order: idx + 1,
      time_limit_seconds: sec.time_minutes * 60,
      weight: 1,
      questions: []
    }));
    setSections(standardSections);
    setCurrentSectionIndex(0);
  }, [level, isEditMode]);

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

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf')) {
      alert('PDFファイルのみアップロード可能です');
      return;
    }

    setPdfFile(file);
    setUploadProgress('アップロード中...');
    setLoading(true);

    try {
      const result = await pdfAPI.uploadPDF(file);
      
      if (result.success) {
        setExtractedQuestions(result.questions);
        setExtractedTextPreview(result.extracted_text_preview || '');
        
        if (result.questions.length === 0) {
          setUploadProgress('⚠️ 問題を抽出できませんでした。PDFの形式を確認してください。');
        } else {
          setUploadProgress(`${result.questions.length}個の問題を抽出しました。内容を確認・編集してください。`);
          
          // 抽出した問題を現在のセクションに自動追加
          if (result.questions.length > 0 && sections.length > 0) {
            const updated = [...sections];
            const startIndex = updated[currentSectionIndex].questions.length;
            updated[currentSectionIndex].questions = [
              ...updated[currentSectionIndex].questions,
              ...result.questions.map((q: any, idx: number) => {
                // 答えを番号から選択肢テキストに変換
                let answerTexts: string[] = [];
                if (q.answer && q.answer.length > 0 && q.choices && q.choices.length > 0) {
                  answerTexts = q.answer.map((answerNum: string) => {
                    const index = parseInt(answerNum) - 1; // 1-indexed to 0-indexed
                    return q.choices[index] || '';
                  }).filter((text: string) => text !== '');
                }
                
                return {
                  order: startIndex + idx + 1,
                  type: 'kanji_reading' as QuestionType,
                  prompt_text: q.prompt_text,
                  choices: q.choices || ['', '', '', ''],
                  answer: answerTexts,
                  explanation_text: q.explanation_text || '',
                  meta: q.metadata || {}
                };
              })
            ];
            setSections(updated);
            
            // 全ての問題を展開状態にする
            const allIndices = new Set(
              Array.from({ length: updated[currentSectionIndex].questions.length }, (_, i) => i)
            );
            setExpandedQuestions(allIndices);
            
            // 手動作成タブに切り替える（全問題を確認できるように）
            setActiveTab('manual');
          }
        }
      }
    } catch (error: any) {
      console.error('PDF upload failed:', error);
      setUploadProgress('');
      alert('PDFのアップロードに失敗しました: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleTextUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
      alert('テキストファイル（.txt または .md）のみアップロード可能です');
      return;
    }

    setTextFile(file);
    setUploadProgress('アップロード中...');
    setLoading(true);

    try {
      const result = await pdfAPI.uploadText(file);
      
      if (result.success) {
        setExtractedQuestions(result.questions);
        setExtractedTextPreview(result.extracted_text_preview || '');
        
        if (result.questions.length === 0) {
          setUploadProgress('⚠️ 問題を抽出できませんでした。テキストの形式を確認してください。');
        } else {
          setUploadProgress(`${result.questions.length}個の問題を抽出しました。内容を確認・編集してください。`);
          
          // 抽出した問題を現在のセクションに自動追加
          if (result.questions.length > 0 && sections.length > 0) {
            const updated = [...sections];
            const startIndex = updated[currentSectionIndex].questions.length;
            updated[currentSectionIndex].questions = [
              ...updated[currentSectionIndex].questions,
              ...result.questions.map((q: any, idx: number) => {
                // 答えを番号から選択肢テキストに変換
                let answerTexts: string[] = [];
                if (q.answer && q.answer.length > 0 && q.choices && q.choices.length > 0) {
                  answerTexts = q.answer.map((answerNum: string) => {
                    const index = parseInt(answerNum) - 1; // 1-indexed to 0-indexed
                    return q.choices[index] || '';
                  }).filter((text: string) => text !== '');
                }
                
                return {
                  order: startIndex + idx + 1,
                  type: 'kanji_reading' as QuestionType,
                  prompt_text: q.prompt_text,
                  choices: q.choices || ['', '', '', ''],
                  answer: answerTexts,
                  explanation_text: q.explanation_text || '',
                  meta: q.metadata || {}
                };
              })
            ];
            setSections(updated);
            
            // 全ての問題を展開状態にする
            const allIndices = new Set(
              Array.from({ length: updated[currentSectionIndex].questions.length }, (_, i) => i)
            );
            setExpandedQuestions(allIndices);
            
            // 手動作成タブに切り替える（全問題を確認できるように）
            setActiveTab('manual');
          }
        }
      }
    } catch (error: any) {
      console.error('Text upload failed:', error);
      setUploadProgress('');
      alert('テキストファイルのアップロードに失敗しました: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert('PDF、PNG、JPEGファイルのみアップロード可能です');
      return;
    }

    setOcrFile(file);
    setIsOcrProcessing(true);
    setUploadProgress('OCR処理中...');

    try {
      const result = await pdfAPI.ocrProcess(file);
      
      if (result.success) {
        setOcrText(result.extracted_text);
        setUploadProgress('✅ OCR処理が完了しました。テキストを確認・編集して「このテキストから問題を抽出」をクリックしてください。');
      }
    } catch (error: any) {
      console.error('OCR processing failed:', error);
      setUploadProgress('');
      alert('OCR処理に失敗しました: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const processOcrText = async () => {
    if (!ocrText.trim()) {
      alert('テキストが空です');
      return;
    }

    setLoading(true);
    setUploadProgress('問題を抽出中...');

    try {
      // テキストをBlobに変換してアップロード
      const blob = new Blob([ocrText], { type: 'text/plain;charset=utf-8' });
      const file = new File([blob], 'ocr_extracted.txt', { type: 'text/plain' });
      
      const result = await pdfAPI.uploadText(file);
      
      if (result.success && result.questions.length > 0) {
        // 抽出した問題を現在のセクションに自動追加
        const updated = [...sections];
        const startIndex = updated[currentSectionIndex].questions.length;
        updated[currentSectionIndex].questions = [
          ...updated[currentSectionIndex].questions,
          ...result.questions.map((q: any, idx: number) => {
            let answerTexts: string[] = [];
            if (q.answer && q.answer.length > 0 && q.choices && q.choices.length > 0) {
              answerTexts = q.answer.map((answerNum: string) => {
                const index = parseInt(answerNum) - 1;
                return q.choices[index] || '';
              }).filter((text: string) => text !== '');
            }
            
            return {
              order: startIndex + idx + 1,
              type: 'kanji_reading' as QuestionType,
              prompt_text: q.prompt_text,
              choices: q.choices || ['', '', '', ''],
              answer: answerTexts,
              explanation_text: q.explanation_text || '',
              meta: q.metadata || {}
            };
          })
        ];
        setSections(updated);
        
        const allIndices = new Set(
          Array.from({ length: updated[currentSectionIndex].questions.length }, (_, i) => i)
        );
        setExpandedQuestions(allIndices);
        
        setActiveTab('manual');
        setUploadProgress(`${result.questions.length}個の問題を抽出しました。`);
        
        // OCRテキストをクリア
        setOcrText('');
        setOcrFile(null);
      } else {
        setUploadProgress('⚠️ 問題を抽出できませんでした。テキストの形式を確認してください。');
      }
    } catch (error: any) {
      console.error('Text processing failed:', error);
      alert('問題の抽出に失敗しました: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
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
      if (isEditMode && examId) {
        // 編集モード：試験を更新
        await examAPI.updateExam(parseInt(examId), {
          title,
          level,
          type: 'mock',
          mode: 'practice',
          is_public: isPublic,
          config: { pass_threshold: passThreshold }
        });
        
        // Note: セクションと問題の更新は複雑なため、
        // 現在は基本情報のみ更新。将来的にはセクション/問題の更新APIを追加する必要があります
        
        alert('試験を更新しました！');
        navigate(`/exams/${examId}`);
      } else {
        // 作成モード：新しい試験を作成
        const exam = await examAPI.createExam({
          title,
          level,
          type: 'mock',
          mode: 'practice',
          is_public: isPublic,
          config: { pass_threshold: passThreshold }
        });

        // 各セクションと問題を作成
        for (const section of sections) {
          if (section.questions.length === 0) continue;
          
          const createdSection = await examAPI.createSection(exam.id, {
            title: section.title,
            order: section.order,
            time_limit_seconds: section.time_limit_seconds,
            weight: section.weight
          });

          for (const question of section.questions) {
            await examAPI.createQuestion(exam.id, createdSection.id, {
              order: question.order,
              type: question.type,
              prompt_text: question.prompt_text,
              choices: question.choices.filter(c => c.trim() !== ''),
              answer: question.answer,
              explanation_text: question.explanation_text,
              question_metadata: question.meta
            });
          }
        }
        
        alert('試験を作成しました！');
        navigate(`/exams/${exam.id}`);
      }
    } catch (error: any) {
      console.error('Failed to save exam:', error);
      console.error('Error response:', error.response);
      
      let errorMessage = isEditMode ? '試験の更新に失敗しました' : '試験の作成に失敗しました';
      
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
      <h1 className="text-3xl font-bold mb-6">{isEditMode ? '試験編集' : '試験作成'}</h1>

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
            onClick={() => setActiveTab('text')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'text'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600'
            }`}
          >
            テキストアップロード
          </button>
          <button
            onClick={() => setActiveTab('ocr')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'ocr'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600'
            }`}
          >
            画像/PDF OCR
          </button>
          <button
            onClick={() => setActiveTab('pdf')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'pdf'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600'
            }`}
          >
            PDFアップロード（テキスト）
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {sections[currentSectionIndex]?.title} - 問題一覧
                </h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allIndices = new Set(
                        Array.from({ length: sections[currentSectionIndex].questions.length }, (_, i) => i)
                      );
                      if (editingQuestions.size === sections[currentSectionIndex].questions.length) {
                        // 全て編集モードの場合は全て解除
                        setEditingQuestions(new Set());
                      } else {
                        // そうでない場合は全て編集モードに
                        setEditingQuestions(allIndices);
                        // 編集モードにしたら全て展開
                        setExpandedQuestions(allIndices);
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    {editingQuestions.size === sections[currentSectionIndex].questions.length ? '全て保存' : '全て編集'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const allIndices = new Set(
                        Array.from({ length: sections[currentSectionIndex].questions.length }, (_, i) => i)
                      );
                      if (expandedQuestions.size === sections[currentSectionIndex].questions.length) {
                        // 全て展開されている場合は全て閉じる
                        setExpandedQuestions(new Set());
                      } else {
                        // そうでない場合は全て展開
                        setExpandedQuestions(allIndices);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    {expandedQuestions.size === sections[currentSectionIndex].questions.length ? '全て閉じる' : '全て展開'}
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {sections[currentSectionIndex].questions.map((q, idx) => {
                  const isExpanded = expandedQuestions.has(idx);
                  const isEditing = editingQuestions.has(idx);
                  return (
                  <div key={idx} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const newExpanded = new Set(expandedQuestions);
                              if (isExpanded) {
                                newExpanded.delete(idx);
                              } else {
                                newExpanded.add(idx);
                              }
                              setExpandedQuestions(newExpanded);
                            }}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            {isExpanded ? '▼' : '▶'}
                          </button>
                          <span className="font-semibold text-gray-900">問{q.order}:</span>
                          <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded">
                            {QUESTION_TYPE_INFO[q.type].name}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const newEditing = new Set(editingQuestions);
                            if (isEditing) {
                              newEditing.delete(idx);
                            } else {
                              newEditing.add(idx);
                              // 編集モードにしたら展開する
                              const newExpanded = new Set(expandedQuestions);
                              newExpanded.add(idx);
                              setExpandedQuestions(newExpanded);
                            }
                            setEditingQuestions(newEditing);
                          }}
                          className={`px-3 py-1 text-sm rounded ${
                            isEditing 
                              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          {isEditing ? '保存' : '編集'}
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
                    {isExpanded && (
                    <div className="flex-1">
                      {isEditing ? (
                        // 編集モード
                        <div className="space-y-3 mt-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">問題文</label>
                            <textarea
                              value={q.prompt_text}
                              onChange={(e) => {
                                const updated = [...sections];
                                updated[currentSectionIndex].questions[idx].prompt_text = e.target.value;
                                setSections(updated);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              rows={3}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">選択肢</label>
                            {q.choices.map((choice, cidx) => (
                              <div key={cidx} className="flex items-center gap-2 mb-2">
                                <input
                                  type="checkbox"
                                  checked={q.answer?.includes(choice) || false}
                                  onChange={(e) => {
                                    const updated = [...sections];
                                    const currentAnswer = updated[currentSectionIndex].questions[idx].answer || [];
                                    if (e.target.checked) {
                                      updated[currentSectionIndex].questions[idx].answer = [...currentAnswer, choice];
                                    } else {
                                      updated[currentSectionIndex].questions[idx].answer = currentAnswer.filter(a => a !== choice);
                                    }
                                    setSections(updated);
                                  }}
                                  className="w-4 h-4"
                                />
                                <input
                                  type="text"
                                  value={choice}
                                  onChange={(e) => {
                                    const updated = [...sections];
                                    const oldChoice = choice;
                                    updated[currentSectionIndex].questions[idx].choices[cidx] = e.target.value;
                                    // 答えも更新
                                    const currentAnswer = updated[currentSectionIndex].questions[idx].answer || [];
                                    if (currentAnswer.includes(oldChoice)) {
                                      const answerIdx = currentAnswer.indexOf(oldChoice);
                                      if (answerIdx !== -1) {
                                        updated[currentSectionIndex].questions[idx].answer[answerIdx] = e.target.value;
                                      }
                                    }
                                    setSections(updated);
                                  }}
                                  className="flex-1 px-3 py-1 border border-gray-300 rounded-md"
                                  placeholder={`選択肢 ${cidx + 1}`}
                                />
                              </div>
                            ))}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">解説</label>
                            <textarea
                              value={q.explanation_text}
                              onChange={(e) => {
                                const updated = [...sections];
                                updated[currentSectionIndex].questions[idx].explanation_text = e.target.value;
                                setSections(updated);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              rows={2}
                            />
                          </div>
                        </div>
                      ) : (
                        // 表示モード
                        <div>
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
                                q.answer?.includes(choice)
                                  ? 'text-green-600 font-semibold'
                                  : 'text-gray-600'
                              }`}
                            >
                              {cidx + 1}. {choice} {q.answer?.includes(choice) && '✓'}
                            </div>
                          ))}
                        </div>
                        {q.explanation_text && (
                          <div className="mt-2 text-sm text-gray-500 bg-gray-50 p-2 rounded">
                            解説: {q.explanation_text}
                          </div>
                        )}
                        </div>
                      )}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
              
              {/* 全て保存ボタン（下部） */}
              {editingQuestions.size > 0 && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingQuestions(new Set());
                    }}
                    className="px-8 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 text-lg font-semibold shadow-lg"
                  >
                    全て保存
                  </button>
                </div>
              )}
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
              {loading 
                ? (isEditMode ? '更新中...' : '作成中...') 
                : (isEditMode ? '試験を更新' : '試験を作成')
              }
            </button>
            <button
              type="button"
              onClick={() => navigate(isEditMode ? '/my-page' : '/exams')}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              キャンセル
            </button>
          </div>
        </form>
      ) : activeTab === 'text' ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">テキストファイルアップロード</h2>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              JLPT試験問題をテキストファイル（.txt または .md）でアップロードして、自動的に問題を抽出します。
            </p>

            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-sm text-blue-900 mb-2">📝 推奨フォーマット</h4>
              <pre className="text-xs text-blue-800 bg-white p-3 rounded overflow-x-auto">
{`問1 次の言葉の読み方として最もよいものを選びなさい。
経済
1 けいざい
2 けいさい
3 きょうざい
4 けいたい
答え：1

問2 次の言葉を漢字で書くとき、最もよいものを選びなさい。
しょうらい
1 将来
2 勝来
3 賞来
4 証来
答え：1`}
              </pre>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".txt,.md"
                onChange={handleTextUpload}
                className="hidden"
                id="text-upload"
                disabled={loading}
              />
              <label
                htmlFor="text-upload"
                className="cursor-pointer inline-flex flex-col items-center"
              >
                <svg
                  className="w-12 h-12 text-gray-400 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="text-sm text-gray-600">
                  {textFile ? textFile.name : 'テキストファイルを選択（.txt または .md）'}
                </span>
                {!textFile && (
                  <span className="text-xs text-gray-500 mt-2">
                    例: jlpt_questions.txt
                  </span>
                )}
              </label>
            </div>

            {uploadProgress && (
              <div className={`mt-4 p-4 rounded-lg ${
                extractedQuestions.length === 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-blue-50 border border-blue-200'
              }`}>
                <p className={`text-sm ${
                  extractedQuestions.length === 0 ? 'text-yellow-800' : 'text-blue-800'
                }`}>{uploadProgress}</p>
              </div>
            )}

            {/* デバッグ用：抽出テキストプレビュー */}
            {extractedTextPreview && extractedQuestions.length === 0 && (
              <div className="mt-4">
                <details className="border rounded p-4">
                  <summary className="cursor-pointer font-semibold text-sm text-gray-700">
                    📄 アップロードされたテキストを確認（デバッグ用）
                  </summary>
                  <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded max-h-60 overflow-y-auto">
                    {extractedTextPreview}
                  </pre>
                  <p className="mt-2 text-xs text-gray-500">
                    ※ このテキストから問題番号や選択肢が検出できませんでした。
                    フォーマットを確認してください。
                  </p>
                </details>
              </div>
            )}
          </div>

          {extractedQuestions.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">抽出された問題 ({extractedQuestions.length}個)</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {extractedQuestions.map((q, idx) => (
                  <div key={idx} className="border rounded p-3 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <span className="font-semibold text-sm">問{q.order}</span>
                        <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                          {q.prompt_text}
                        </p>
                        {q.choices && q.choices.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            選択肢: {q.choices.length}個 | 答え: {q.answer?.join(', ')}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        q.answer && q.answer.length > 0 
                          ? 'text-green-600 bg-green-100'
                          : 'text-yellow-600 bg-yellow-100'
                      }`}>
                        {q.answer && q.answer.length > 0 ? '完了' : '要確認'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  ✓ 抽出された問題は「手動作成」タブで確認・編集できます。
                  内容を確認してから保存してください。
                </p>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'ocr' ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">画像OCR処理</h2>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              画像ベースのPDFや画像ファイル（PNG/JPEG）をアップロードして、OCR処理でテキストを抽出します。
              抽出されたテキストを編集してから問題として登録できます。
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ 注意:</strong> この機能はTesseract OCRを使用しております。
              </p>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleOcrUpload}
                className="hidden"
                id="ocr-upload"
                disabled={isOcrProcessing}
              />
              <label
                htmlFor="ocr-upload"
                className="cursor-pointer inline-flex flex-col items-center"
              >
                <svg
                  className="w-12 h-12 text-gray-400 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-sm text-gray-600">
                  {ocrFile ? ocrFile.name : 'ファイルを選択（PDF、PNG、JPEG）'}
                </span>
                {!ocrFile && (
                  <span className="text-xs text-gray-500 mt-2">
                    画像ベースのPDFまたは画像ファイル
                  </span>
                )}
              </label>
            </div>

            {uploadProgress && (
              <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-800">{uploadProgress}</p>
              </div>
            )}

            {ocrText && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  抽出されたテキスト（編集可能）
                </label>
                <textarea
                  value={ocrText}
                  onChange={(e) => setOcrText(e.target.value)}
                  className="w-full h-96 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                  placeholder="OCR処理されたテキストがここに表示されます..."
                />
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={processOcrText}
                    disabled={loading || !ocrText.trim()}
                    className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    このテキストから問題を抽出
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([ocrText], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'ocr_extracted.txt';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    テキストファイルとしてダウンロード
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOcrText('');
                      setOcrFile(null);
                      setUploadProgress('');
                    }}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    クリア
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">PDFアップロード</h2>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              JLPT試験問題のPDFファイルをアップロードして、自動的に問題を抽出します。
              抽出後、内容を確認・編集してから保存できます。
            </p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".pdf"
                onChange={handlePDFUpload}
                className="hidden"
                id="pdf-upload"
                disabled={loading}
              />
              <label
                htmlFor="pdf-upload"
                className="cursor-pointer inline-flex flex-col items-center"
              >
                <svg
                  className="w-12 h-12 text-gray-400 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span className="text-sm text-gray-600">
                  {pdfFile ? pdfFile.name : 'PDFファイルを選択またはドラッグ＆ドロップ'}
                </span>
                {!pdfFile && (
                  <span className="text-xs text-gray-500 mt-2">
                    例: N2 7-2019.pdf
                  </span>
                )}
              </label>
            </div>

            {uploadProgress && (
              <div className={`mt-4 p-4 rounded-lg ${
                extractedQuestions.length === 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-blue-50 border border-blue-200'
              }`}>
                <p className={`text-sm ${
                  extractedQuestions.length === 0 ? 'text-yellow-800' : 'text-blue-800'
                }`}>{uploadProgress}</p>
              </div>
            )}

            {/* デバッグ用：抽出テキストプレビュー */}
            {extractedTextPreview && extractedQuestions.length === 0 && (
              <div className="mt-4">
                <details className="border rounded p-4">
                  <summary className="cursor-pointer font-semibold text-sm text-gray-700">
                    📄 抽出されたテキストを確認（デバッグ用）
                  </summary>
                  <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded max-h-60 overflow-y-auto">
                    {extractedTextPreview}
                  </pre>
                  <p className="mt-2 text-xs text-gray-500">
                    ※ このテキストから問題番号や選択肢が検出できませんでした。
                    PDFの形式が対応していない可能性があります。
                  </p>
                </details>
              </div>
            )}
          </div>

          {extractedQuestions.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">抽出された問題 ({extractedQuestions.length}個)</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {extractedQuestions.map((q, idx) => (
                  <div key={idx} className="border rounded p-3 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <span className="font-semibold text-sm">問{q.order}</span>
                        <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                          {q.prompt_text}
                        </p>
                        {q.choices && q.choices.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            選択肢: {q.choices.length}個
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                        要確認
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  ⚠️ 抽出された問題は「手動作成」タブで確認・編集できます。
                  正解と解説を必ず設定してから保存してください。
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreateExam;
