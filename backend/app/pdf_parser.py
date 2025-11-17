import pdfplumber
import re
from typing import List, Dict, Optional

class PDFParser:
    """PDF解析クラス"""
    
    @staticmethod
    def extract_text(pdf_path: str) -> str:
        """PDFからテキストを抽出"""
        text = ""
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() + "\n"
        return text
    
    @staticmethod
    def parse_questions(text: str) -> List[Dict]:
        """テキストから問題を抽出"""
        questions = []
        
        # 問題番号パターン（例：問1、Q1、1.など）
        question_pattern = r'(?:問|Q)\s*(\d+)|^(\d+)\.'
        
        # テキストを行に分割
        lines = text.split('\n')
        
        current_question = None
        current_text = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # 問題番号を検出
            match = re.match(question_pattern, line)
            if match:
                # 前の問題を保存
                if current_question:
                    questions.append(PDFParser._create_question_dict(
                        current_question,
                        '\n'.join(current_text)
                    ))
                
                # 新しい問題を開始
                question_num = match.group(1) or match.group(2)
                current_question = int(question_num)
                current_text = [line]
            elif current_question is not None:
                current_text.append(line)
        
        # 最後の問題を保存
        if current_question:
            questions.append(PDFParser._create_question_dict(
                current_question,
                '\n'.join(current_text)
            ))
        
        return questions
    
    @staticmethod
    def _create_question_dict(question_num: int, text: str) -> Dict:
        """問題テキストから辞書を作成"""
        # 選択肢パターン（例：（ア）、（イ）、A. B. など）
        choice_patterns = [
            r'[（(]([ア-エ])[）)]',  # （ア）（イ）
            r'([A-D])\.',            # A. B.
            r'(\d+)\.',              # 1. 2.
        ]
        
        choices = []
        for pattern in choice_patterns:
            matches = re.findall(pattern + r'\s*([^\n（(A-D\d]+)', text)
            if matches:
                choices = [match[1].strip() for match in matches]
                break
        
        # 選択肢を除いた本文を取得
        prompt_text = text
        for pattern in choice_patterns:
            prompt_text = re.sub(pattern + r'\s*[^\n]+', '', prompt_text)
        
        return {
            "order": question_num,
            "type": "multiple_choice_single",
            "prompt_text": prompt_text.strip(),
            "choices": choices if choices else None,
            "answer": [],  # 手動で設定が必要
            "explanation_text": "",  # 手動で設定が必要
            "metadata": {
                "source": "pdf",
                "needs_manual_review": True
            }
        }
    
    @staticmethod
    def parse_pdf_to_questions(pdf_path: str) -> List[Dict]:
        """PDFファイルを解析して問題リストを返す"""
        text = PDFParser.extract_text(pdf_path)
        questions = PDFParser.parse_questions(text)
        return questions
