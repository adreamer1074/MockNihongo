from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import os
import io
import tempfile
from app.database import get_db
from app.models import User
from app.auth import get_current_user
from app.pdf_parser import PDFParser
from app.text_parser import TextParser

router = APIRouter()

@router.post("/ocr")
async def ocr_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """PDF/画像をOCR処理してテキスト抽出（編集可能な形式で返す）"""
    
    print(f"\n=== OCR Processing Started ===")
    print(f"Filename: {file.filename}")
    
    # ファイルタイプチェック
    allowed_extensions = ['.pdf', '.png', '.jpg', '.jpeg']
    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400, 
            detail="PDF、PNG、JPEGファイルのみアップロード可能です"
        )
    
    # ファイル内容を読み取り
    content = await file.read()
    file_size_mb = len(content) / (1024 * 1024)
    print(f"File size: {file_size_mb:.2f}MB")
    
    if file_size_mb > 10:
        raise HTTPException(status_code=400, detail="ファイルサイズは10MB以下にしてください")
    
    # 一時ファイルに保存
    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
        tmp_file.write(content)
        tmp_path = tmp_file.name
    
    print(f"Temp file created: {tmp_path}")
    
    try:
        # OCR処理
        try:
            import pytesseract
            from PIL import Image
            import fitz  # PyMuPDF
            import platform
            
            # Windows用のみTesseractのパスを設定（Linux/Dockerでは不要）
            if platform.system() == 'Windows':
                pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        except ImportError as e:
            raise HTTPException(
                status_code=500,
                detail=f"OCR機能が利用できません: {str(e)}"
            )
        
        print("Starting OCR processing...")
        extracted_text = ""
        
        if file.filename.lower().endswith('.pdf'):
            # PDFをPyMuPDFで画像に変換してOCR
            print("Converting PDF to images using PyMuPDF...")
            try:
                pdf_document = fitz.open(tmp_path)
                print(f"PDF has {len(pdf_document)} pages")
                
                for page_num in range(len(pdf_document)):
                    print(f"OCR processing page {page_num+1}/{len(pdf_document)}...")
                    page = pdf_document[page_num]
                    
                    # ページを画像に変換（高解像度）
                    zoom = 2.0  # 解像度を上げる
                    mat = fitz.Matrix(zoom, zoom)
                    pix = page.get_pixmap(matrix=mat)
                    
                    # PILイメージに変換
                    img_data = pix.tobytes("png")
                    image = Image.open(io.BytesIO(img_data))
                    
                    # 日本語OCR（jpn）
                    page_text = pytesseract.image_to_string(image, lang='jpn')
                    extracted_text += page_text + "\n\n"
                
                pdf_document.close()
            except Exception as e:
                print(f"PDF processing error: {e}")
                raise HTTPException(
                    status_code=500,
                    detail=f"PDF処理エラー: {str(e)}"
                )
        else:
            # 画像ファイルを直接OCR
            print("OCR processing image...")
            image = Image.open(tmp_path)
            extracted_text = pytesseract.image_to_string(image, lang='jpn')
        
        print(f"Extracted {len(extracted_text)} characters")
        print("=== OCR Processing Completed ===\n")
        
        return {
            "success": True,
            "extracted_text": extracted_text,
            "message": "OCR処理が完了しました。テキストを確認・編集してください。"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"OCR処理エラー: {error_detail}")
        raise HTTPException(status_code=500, detail=f"OCR処理エラー: {str(e)}")
    
    finally:
        # 一時ファイルを削除
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """PDFアップロード＆解析"""
    
    print(f"\n=== PDF Upload Started ===")
    print(f"Filename: {file.filename}")
    
    # ファイルタイプチェック
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # ファイルサイズチェック（10MB制限）
    content = await file.read()
    file_size_mb = len(content) / (1024 * 1024)
    print(f"File size: {file_size_mb:.2f}MB")
    
    if file_size_mb > 10:
        raise HTTPException(status_code=400, detail="ファイルサイズは10MB以下にしてください")
    
    # 一時ファイルに保存
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
        tmp_file.write(content)
        tmp_path = tmp_file.name
    
    print(f"Temp file created: {tmp_path}")
    
    try:
        # PDFを解析
        print("Starting PDF parsing...")
        parser = PDFParser()
        
        print("Extracting text...")
        extracted_text = parser.extract_text(tmp_path)
        print(f"Extracted {len(extracted_text)} characters")
        
        print("Parsing questions...")
        questions = parser.parse_questions(extracted_text)
        print(f"Found {len(questions)} questions")
        
        print("=== PDF Upload Completed ===\n")
        
        return {
            "success": True,
            "questions": questions,
            "extracted_text_preview": extracted_text[:1000],  # デバッグ用：最初の1000文字
            "message": f"{len(questions)}個の問題を抽出しました。確認・修正してください。"
        }
    
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"PDF解析エラー: {error_detail}")
        raise HTTPException(status_code=500, detail=f"PDF解析エラー: {str(e)}")
    
    finally:
        # 一時ファイルを削除
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@router.post("/upload-text")
async def upload_text(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """テキストファイルアップロード＆解析"""
    
    print(f"\n=== Text Upload Started ===")
    print(f"Filename: {file.filename}")
    
    # ファイルタイプチェック
    if not (file.filename.endswith('.txt') or file.filename.endswith('.md')):
        raise HTTPException(status_code=400, detail="テキストファイル（.txt または .md）のみアップロード可能です")
    
    try:
        # ファイル内容を読み取り
        content = await file.read()
        
        # ファイルサイズチェック（5MB制限）
        file_size_mb = len(content) / (1024 * 1024)
        print(f"File size: {file_size_mb:.2f}MB")
        
        if file_size_mb > 5:
            raise HTTPException(status_code=400, detail="ファイルサイズは5MB以下にしてください")
        
        # テキストをデコード（UTF-8、失敗したらShift-JIS）
        try:
            text = content.decode('utf-8')
            print("Decoded as UTF-8")
        except UnicodeDecodeError:
            try:
                text = content.decode('shift-jis')
                print("Decoded as Shift-JIS")
            except UnicodeDecodeError:
                raise HTTPException(status_code=400, detail="ファイルのエンコーディングを認識できません（UTF-8またはShift-JISを使用してください）")
        
        print(f"Text length: {len(text)} characters")
        
        # テキストを解析
        print("Parsing questions...")
        parser = TextParser()
        questions = parser.parse_questions(text)
        print(f"Found {len(questions)} questions")
        
        print("=== Text Upload Completed ===\n")
        
        return {
            "success": True,
            "questions": questions,
            "extracted_text_preview": text[:1000],  # デバッグ用：最初の1000文字
            "message": f"{len(questions)}個の問題を抽出しました。確認・修正してください。"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"テキスト解析エラー: {error_detail}")
        raise HTTPException(status_code=500, detail=f"テキスト解析エラー: {str(e)}")
