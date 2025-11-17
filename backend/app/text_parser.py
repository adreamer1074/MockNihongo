import re
from typing import List, Dict

class TextParser:
    """テキストファイルから問題を解析するクラス"""
    
    @staticmethod
    def parse_questions(text: str) -> List[Dict]:
        """
        テキストから問題を解析
        
        フォーマット例:
        問1 次の言葉の読み方として最もよいものを選びなさい。
        経済
        1 けいざい
        2 けいさい
        3 きょうざい
        4 けいたい
        答え：1
        
        または:
        問1: 次の言葉の読み方として最もよいものを選びなさい。
        経済
        1) けいざい
        2) けいさい
        3) きょうざい
        4) けいたい
        答え: 1
        """
        
        questions = []
        
        # 問題ブロックを分割（問X で始まる行で分割）
        # 様々なパターンに対応: 問1, 問1:, 問1., 問1）, （1）, [1], 1., 1)
        question_pattern = r'(?:問|問題|Question|\(|\[|^)(\d+)(?:\)|）|\]|\.|\:|：)?'
        
        # テキストを行に分割
        lines = text.split('\n')
        
        current_question = None
        current_choices = []
        current_prompt = []
        in_choices = False
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
            
            # 問題番号を検出
            q_match = re.match(r'^(?:問|問題|Question)(\d+)[\.:\)）：]?\s*(.*)', line, re.IGNORECASE)
            if q_match:
                # 前の問題を保存
                if current_question is not None:
                    questions.append(current_question)
                
                # 新しい問題を開始
                question_num = int(q_match.group(1))
                prompt_start = q_match.group(2).strip()
                
                current_question = {
                    'order': question_num,
                    'prompt_text': prompt_start,
                    'choices': [],
                    'answer': [],
                    'explanation_text': '',
                    'metadata': {}
                }
                current_choices = []
                current_prompt = [prompt_start] if prompt_start else []
                in_choices = False
                continue
            
            # 選択肢を検出（1, 2, 3, 4 または 1), 2), 3), 4) など）
            choice_match = re.match(r'^([1-4])[\.:\)）\s]+(.+)', line)
            if choice_match and current_question is not None:
                in_choices = True
                choice_text = choice_match.group(2).strip()
                current_choices.append(choice_text)
                continue
            
            # 答えを検出（より柔軟に）
            answer_match = re.match(r'^(?:答え|答|こたえ|正解|Answer)[：:：\.\s]*([1-4])', line, re.IGNORECASE)
            if answer_match and current_question is not None:
                answer_num = answer_match.group(1)
                # 答えを配列形式で保存（選択肢のインデックスではなく番号として）
                current_question['answer'] = [str(answer_num)]
                current_question['choices'] = current_choices
                # プロンプトテキストを更新
                if current_prompt:
                    current_question['prompt_text'] = '\n'.join(current_prompt)
                continue
            
            # 解説を検出
            explanation_match = re.match(r'^(?:解説|説明|Explanation)[：:\.]*\s*(.+)', line, re.IGNORECASE)
            if explanation_match and current_question is not None:
                current_question['explanation_text'] = explanation_match.group(1).strip()
                continue
            
            # 通常のテキスト（問題文の続き）
            if current_question is not None and not in_choices:
                current_prompt.append(line)
        
        # 最後の問題を保存
        if current_question is not None:
            # プロンプトテキストを結合
            if current_prompt:
                current_question['prompt_text'] = '\n'.join(current_prompt)
            # 選択肢がまだ設定されていない場合
            if not current_question['choices'] and current_choices:
                current_question['choices'] = current_choices
            questions.append(current_question)
        
        print(f"=== テキスト抽出結果 ===")
        print(f"合計 {len(questions)} 個の問題を抽出しました")
        for q in questions:
            print(f"問{q['order']}: プロンプト={q['prompt_text'][:80]}... | 選択肢={len(q['choices'])}個 | 答え={q['answer']}")
        
        return questions
