import fitz  # PyMuPDF
import re
from typing import List, Dict, Optional

class PDFParser:
    """PDF解析クラス（PyMuPDF使用）"""
    
    @staticmethod
    def extract_text(pdf_path: str) -> str:
        """PDFからテキストを抽出"""
        text = ""
        try:
            # PyMuPDFでPDFを開く
            doc = fitz.open(pdf_path)
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                # テキスト抽出
                page_text = page.get_text()
                text += page_text + "\n"
                
            doc.close()
            
            print(f"合計 {len(text)} 文字を抽出しました")
            
        except Exception as e:
            print(f"PDF読み込みエラー: {e}")
        
        return text
    
    @staticmethod
    def parse_questions(text: str) -> List[Dict]:
        """テキストから問題を抽出"""
        questions = []
        
        # デバッグ用：抽出したテキストの最初の500文字をログ出力
        print("=== PDF抽出テキスト（最初の500文字）===")
        print(text[:500])
        print("=====================================")
        
        # より柔軟な問題番号パターン
        # 問1、問 1、（1）、(1)、1、1.、問１など
        question_patterns = [
            r'(?:問|もん)\s*[（(]?(\d+)[）)]?',  # 問1、問（1）
            r'^[（(](\d+)[）)]',  # （1）
            r'^(\d+)\s*[．.\s]',  # 1. または 1
        ]
        
        lines = text.split('\n')
        current_question = None
        current_text = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # 問題番号を検出
            question_found = False
            for pattern in question_patterns:
                match = re.match(pattern, line)
                if match:
                    # 前の問題を保存
                    if current_question and current_text:
                        questions.append(PDFParser._create_question_dict(
                            current_question,
                            '\n'.join(current_text)
                        ))
                    
                    # 新しい問題を開始
                    question_num = int(match.group(1))
                    current_question = question_num
                    current_text = [line]
                    question_found = True
                    print(f"問題検出: 問{question_num}")
                    break
            
            if not question_found and current_question is not None:
                current_text.append(line)
        
        # 最後の問題を保存
        if current_question and current_text:
            questions.append(PDFParser._create_question_dict(
                current_question,
                '\n'.join(current_text)
            ))
        
        print(f"合計 {len(questions)} 個の問題を抽出しました")
        return questions
    
    @staticmethod
    def _create_question_dict(question_num: int, text: str) -> Dict:
        """問題テキストから辞書を作成"""
        print(f"\n=== 問{question_num}の処理 ===")
        print(f"テキスト: {text[:200]}...")
        
        # 選択肢パターンを試す（より柔軟に）
        choice_patterns = [
            (r'^\s*([1-4])\s+(.+?)(?=\n\s*[1-4]\s+|\n\n|$)', 'numeric'),  # 1 選択肢
            (r'[（(]([ア-エ])[）)]\s*(.+?)(?=\s*[（(][ア-エ][）)]|\n\n|$)', 'katakana'),  # （ア）
            (r'([①-④])\s*(.+?)(?=\s*[①-④]|\n\n|$)', 'circled'),  # ①
            (r'([A-D])\s*[．.\s]\s*(.+?)(?=\s*[A-D]\s*[．.]|\n\n|$)', 'alpha'),  # A.
        ]
        
        choices = []
        prompt_text = text
        
        for pattern, pattern_type in choice_patterns:
            matches = re.findall(pattern, text, re.MULTILINE | re.DOTALL)
            if len(matches) >= 2:
                choices = [match[1].strip() for match in matches if match[1].strip()]
                print(f"選択肢パターン '{pattern_type}' で {len(choices)} 個検出")
                
                # 選択肢部分を本文から削除
                for match in matches:
                    if pattern_type == 'numeric':
                        pattern_to_remove = f"{match[0]} {match[1]}"
                    elif pattern_type == 'katakana':
                        pattern_to_remove = f"({match[0]}){match[1]}" if '（' not in text else f"（{match[0]}）{match[1]}"
                    elif pattern_type == 'circled':
                        pattern_to_remove = f"{match[0]}{match[1]}"
                    else:
                        pattern_to_remove = f"{match[0]}.{match[1]}"
                    
                    prompt_text = prompt_text.replace(pattern_to_remove, '', 1)
                break
        
        # クリーンアップ
        prompt_text = re.sub(r'\n\s*\n+', '\n', prompt_text)
        prompt_text = re.sub(r'^\s*(?:問|もん)\s*[（(]?\d+[）)]?\s*', '', prompt_text)  # 問題番号を削除
        prompt_text = prompt_text.strip()
        
        print(f"本文: {prompt_text[:100]}...")
        print(f"選択肢数: {len(choices)}")
        
        return {
            "order": question_num,
            "type": "kanji_reading",
            "prompt_text": prompt_text,
            "choices": choices if len(choices) >= 2 else ['', '', '', ''],
            "answer": [],
            "explanation_text": "",
            "metadata": {
                "source": "pdf",
                "needs_manual_review": True,
                "raw_text": text[:200]  # デバッグ用
            }
        }
    
    @staticmethod
    def parse_pdf_to_questions(pdf_path: str) -> List[Dict]:
        """PDFファイルを解析して問題リストを返す"""
        text = PDFParser.extract_text(pdf_path)
        questions = PDFParser.parse_questions(text)
        return questions
