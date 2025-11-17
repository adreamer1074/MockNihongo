import { JLPTLevel, QuestionType } from '../types';

// JLPT標準セクション構成
export const JLPT_SECTIONS: Record<JLPTLevel, Array<{ title: string; time_minutes: number }>> = {
  N5: [
    { title: '言語知識（文字・語彙）', time_minutes: 20 },
    { title: '言語知識（文法）・読解', time_minutes: 40 },
    { title: '聴解', time_minutes: 30 }
  ],
  N4: [
    { title: '言語知識（文字・語彙）', time_minutes: 25 },
    { title: '言語知識（文法）・読解', time_minutes: 55 },
    { title: '聴解', time_minutes: 35 }
  ],
  N3: [
    { title: '言語知識（文字・語彙）', time_minutes: 30 },
    { title: '言語知識（文法）・読解', time_minutes: 70 },
    { title: '聴解', time_minutes: 40 }
  ],
  N2: [
    { title: '言語知識（文字・語彙・文法）・読解', time_minutes: 105 },
    { title: '聴解', time_minutes: 50 }
  ],
  N1: [
    { title: '言語知識（文字・語彙・文法）・読解', time_minutes: 110 },
    { title: '聴解', time_minutes: 60 }
  ]
};

// 問題タイプの表示名と説明
export const QUESTION_TYPE_INFO: Record<QuestionType, { name: string; description: string; example: string }> = {
  // 文字・語彙
  kanji_reading: {
    name: '漢字読み',
    description: '下線部の読み方を選ぶ',
    example: '彼は____を食べた。'
  },
  orthography: {
    name: '表記',
    description: '正しい書き方を選ぶ',
    example: 'きのうえいがを___。'
  },
  word_formation: {
    name: '語形成',
    description: '語の成り立ちを理解する（N1のみ）',
    example: '___的な考え方'
  },
  contextual_definition: {
    name: '文脈規定',
    description: '文脈に合う意味を選ぶ',
    example: '＿＿＿はどういう意味か。'
  },
  paraphrase: {
    name: '言い換え類義',
    description: '同じ意味の表現を選ぶ',
    example: '＿＿＿と同じ意味の言葉は？'
  },
  usage: {
    name: '用法',
    description: '正しい使い方を選ぶ',
    example: '＿＿＿の使い方で正しいものは？'
  },
  // 文法
  grammar_form: {
    name: '文の文法1（文法形式の判断）',
    description: '正しい文法形式を選ぶ',
    example: '彼は学生＿＿＿。'
  },
  sentence_composition: {
    name: '文の文法2（文の組み立て）',
    description: '★に入る語を選ぶ',
    example: 'あそこ＿＿＿★＿＿＿いる。'
  },
  text_grammar: {
    name: '文章の文法',
    description: '文章全体の文法的つながり',
    example: '（　）に入る適切な接続詞は？'
  },
  // 読解
  short_comprehension: {
    name: '内容理解（短文）',
    description: '200字程度の短い文章',
    example: 'この文章で筆者が言いたいことは？'
  },
  medium_comprehension: {
    name: '内容理解（中文）',
    description: '500字程度の文章',
    example: '＿＿＿について正しいものは？'
  },
  long_comprehension: {
    name: '内容理解（長文）',
    description: '1000字程度の長い文章',
    example: '筆者の考えに合うものは？'
  },
  integrated_comprehension: {
    name: '統合理解',
    description: '複数の文章を読み比べる',
    example: '２つの文章に共通する内容は？'
  },
  assertion_comprehension: {
    name: '主張理解（長文）',
    description: '筆者の主張を理解する',
    example: '筆者の主張として最も適当なものは？'
  },
  information_retrieval: {
    name: '情報検索',
    description: '必要な情報を素早く見つける',
    example: '条件に合うものを探しなさい。'
  },
  // 聴解
  task_comprehension: {
    name: '課題理解',
    description: '話を聞いて適切な行動を選ぶ',
    example: '男の人はこのあと何をしますか。'
  },
  point_comprehension: {
    name: 'ポイント理解',
    description: '話の要点を理解する',
    example: '男の人が一番言いたいことは何ですか。'
  },
  outline_comprehension: {
    name: '概要理解',
    description: '話の全体的な内容を理解する',
    example: '話の内容と合っているものはどれですか。'
  },
  utterance_expression: {
    name: '発話表現',
    description: '適切な応答を選ぶ',
    example: 'このときどう言いますか。'
  },
  immediate_response: {
    name: '即時応答',
    description: '質問に対する適切な応答',
    example: '（質問に対する即答）'
  },
  integrated_listening: {
    name: '統合理解（聴解）',
    description: '複数の情報を統合して理解',
    example: '２人の話を聞いて答えなさい。'
  }
};

// レベル別で使用可能な問題タイプ
export const AVAILABLE_QUESTION_TYPES: Record<JLPTLevel, QuestionType[]> = {
  N5: [
    'kanji_reading',
    'orthography',
    'contextual_definition',
    'paraphrase',
    'grammar_form',
    'sentence_composition',
    'text_grammar',
    'short_comprehension',
    'medium_comprehension',
    'information_retrieval',
    'task_comprehension',
    'point_comprehension',
    'utterance_expression',
    'immediate_response'
  ],
  N4: [
    'kanji_reading',
    'orthography',
    'contextual_definition',
    'paraphrase',
    'grammar_form',
    'sentence_composition',
    'text_grammar',
    'short_comprehension',
    'medium_comprehension',
    'information_retrieval',
    'task_comprehension',
    'point_comprehension',
    'utterance_expression',
    'immediate_response'
  ],
  N3: [
    'kanji_reading',
    'orthography',
    'contextual_definition',
    'paraphrase',
    'grammar_form',
    'sentence_composition',
    'text_grammar',
    'short_comprehension',
    'medium_comprehension',
    'long_comprehension',
    'information_retrieval',
    'task_comprehension',
    'point_comprehension',
    'outline_comprehension',
    'utterance_expression',
    'immediate_response'
  ],
  N2: [
    'kanji_reading',
    'orthography',
    'contextual_definition',
    'paraphrase',
    'usage',
    'grammar_form',
    'sentence_composition',
    'text_grammar',
    'short_comprehension',
    'medium_comprehension',
    'integrated_comprehension',
    'assertion_comprehension',
    'information_retrieval',
    'task_comprehension',
    'point_comprehension',
    'outline_comprehension',
    'immediate_response',
    'integrated_listening'
  ],
  N1: [
    'kanji_reading',
    'orthography',
    'word_formation',
    'contextual_definition',
    'paraphrase',
    'usage',
    'grammar_form',
    'sentence_composition',
    'text_grammar',
    'short_comprehension',
    'medium_comprehension',
    'long_comprehension',
    'integrated_comprehension',
    'assertion_comprehension',
    'information_retrieval',
    'task_comprehension',
    'point_comprehension',
    'outline_comprehension',
    'immediate_response',
    'integrated_listening'
  ]
};

// セクションタイトルから問題タイプをフィルタリング
export const getQuestionTypesForSection = (sectionTitle: string, level: JLPTLevel): QuestionType[] => {
  const allTypes = AVAILABLE_QUESTION_TYPES[level];
  
  // 文字・語彙セクション
  if (sectionTitle.includes('文字・語彙')) {
    return allTypes.filter(type => 
      ['kanji_reading', 'orthography', 'word_formation', 'contextual_definition', 'paraphrase', 'usage'].includes(type)
    );
  }
  
  // 文法セクション（文法・読解の場合は文法＋読解タイプ）
  if (sectionTitle.includes('文法')) {
    const grammarTypes = allTypes.filter(type => 
      ['grammar_form', 'sentence_composition', 'text_grammar'].includes(type)
    );
    
    // 読解も含む場合
    if (sectionTitle.includes('読解')) {
      const readingTypes = allTypes.filter(type => 
        type.includes('comprehension') || type === 'information_retrieval'
      );
      return [...grammarTypes, ...readingTypes];
    }
    
    return grammarTypes;
  }
  
  // 読解セクション
  if (sectionTitle.includes('読解')) {
    return allTypes.filter(type => 
      type.includes('comprehension') || type === 'information_retrieval'
    );
  }
  
  // 聴解セクション
  if (sectionTitle.includes('聴解')) {
    return allTypes.filter(type => 
      ['task_comprehension', 'point_comprehension', 'outline_comprehension', 
       'utterance_expression', 'immediate_response', 'integrated_listening'].includes(type)
    );
  }
  
  // カスタムセクションの場合は全タイプを表示
  return allTypes;
};
