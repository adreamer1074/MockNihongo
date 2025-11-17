# Mock Nihongo - JLPT模擬試験プラットフォーム

日本語能力試験（JLPT）のN5〜N1レベルに対応した模擬試験プラットフォームです。

## 機能

- **試験一覧・受験**: レベル別の試験を検索・受験
- **2つの試験モード**:
- **試験モード**（時間制限あり、終了後に解説表示）
- **演習モード**（時間制限なし、即時フィードバック）
- **ユーザー認証**: JWT認証によるログイン・新規登録
- **試験作成機能**: 4つの作成方法
  - 手動入力
  - テキストファイルアップロード
  - PDFアップロード（テキストベース）
  - OCR機能（画像PDF対応）
- **試験管理**: 作成した試験の編集・削除、公開/非公開設定
- **試験履歴**: 過去の受験記録表示（最近3件）
- **詳細な結果分析**: セクション別スコアと解説表示
- **ゲスト受験**: ログインなしでも試験を受験可能

## 技術スタック

### バックエンド
- Python 3.11+
- FastAPI
- SQLAlchemy (ORM)
- SQLite (開発環境) / PostgreSQL (本番環境)
- JWT認証
- PyPDF2 (PDF解析)
- Tesseract OCR (画像からテキスト抽出、日本語サポート)

### フロントエンド
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Zustand (状態管理)
- Axios

## セットアップ

### 前提条件
- Python 3.11以上
- Node.js 18以上
- **Tesseract OCR** (OCR機能を使用する場合)
- Docker & Docker Compose (オプション)

### 0. Tesseract OCRのインストール（OCR機能を使用する場合）

#### Windows
1. [Tesseract GitHub Releases](https://github.com/UB-Mannheim/tesseract/wiki) からインストーラーをダウンロード
2. インストール時に **Japanese language data (jpn)** を必ず選択
3. インストール完了後、パスが自動的に設定されます

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr tesseract-ocr-jpn libtesseract-dev

# インストール確認
tesseract --version
tesseract --list-langs  # jpn が表示されることを確認
```

#### macOS
```bash
brew install tesseract tesseract-lang

# インストール確認
tesseract --version
tesseract --list-langs  # jpn が表示されることを確認
```

### 1. リポジトリのクローン

\`\`\`bash
git clone https://github.com/adreamer1074/MockNihongo.git
cd MockNihongo
\`\`\`

### 2. バックエンドのセットアップ

\`\`\`bash
cd backend

# 仮想環境を作成
python -m venv venv

# 仮想環境をアクティブ化 (Windows)
venv\Scripts\activate
# 仮想環境をアクティブ化 (Mac/Linux)
source venv/bin/activate

# 依存関係をインストール
pip install -r requirements.txt

# 環境変数を設定
copy .env.example .env
# .envファイルを編集してSECRET_KEYなどを設定

# サーバーを起動
uvicorn main:app --reload
\`\`\`

バックエンドは http://localhost:8000 で起動します。
APIドキュメント: http://localhost:8000/docs

### 3. フロントエンドのセットアップ

\`\`\`bash
cd frontend

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
\`\`\`

フロントエンドは http://localhost:3000 で起動します。

### 4. Dockerを使用する場合

\`\`\`bash
# プロジェクトルートで実行
docker-compose up -d

# ログを確認
docker-compose logs -f
\`\`\`

- フロントエンド: http://localhost:3000
- バックエンド: http://localhost:8000

## プロジェクト構造

\`\`\`
MockNihongo/
├── backend/               # FastAPI バックエンド
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/       # APIエンドポイント
│   │   ├── models.py     # データベースモデル
│   │   ├── schemas.py    # Pydanticスキーマ
│   │   ├── auth.py       # 認証ロジック
│   │   ├── database.py   # データベース設定
│   │   └── pdf_parser.py # PDF解析
│   ├── main.py           # アプリケーションエントリーポイント
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/             # React フロントエンド
│   ├── src/
│   │   ├── api/         # API クライアント
│   │   ├── components/  # Reactコンポーネント
│   │   ├── pages/       # ページコンポーネント
│   │   ├── store/       # 状態管理 (Zustand)
│   │   ├── types/       # TypeScript型定義
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── 設計書.md             # 詳細設計書
\`\`\`

## API エンドポイント

### 認証
- `POST /api/v1/auth/register` - ユーザー登録
- `POST /api/v1/auth/login` - ログイン
- `GET /api/v1/auth/me` - 現在のユーザー情報

### 試験
- `GET /api/v1/exams` - 試験一覧取得
- `GET /api/v1/exams/{exam_id}` - 試験詳細取得
- `POST /api/v1/exams` - 試験作成（認証必要）
- `PUT /api/v1/exams/{exam_id}` - 試験更新（認証必要）
- `DELETE /api/v1/exams/{exam_id}` - 試験削除（認証必要）

### 受験
- `POST /api/v1/attempts` - 試験開始
- `POST /api/v1/attempts/{attempt_id}/answers` - 回答送信
- `POST /api/v1/attempts/{attempt_id}/finish` - 試験終了・採点
- `GET /api/v1/attempts/{attempt_id}` - 結果取得

### PDF
- `POST /api/v1/pdf/upload` - PDF アップロード・解析（テキストベース、認証必要）
- `POST /api/v1/pdf/ocr` - PDF/画像 OCR処理（画像ベース、認証必要）

### テキスト
- `POST /api/v1/pdf/upload-text` - テキストファイルアップロード・解析（認証必要）

## 開発

### バックエンド開発

\`\`\`bash
cd backend

# 開発サーバー起動（ホットリロード有効）
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# データベースをリセット
rm mock_nihongo.db
\`\`\`

### フロントエンド開発

\`\`\`bash
cd frontend

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# ビルドをプレビュー
npm run preview
\`\`\`

## ライセンス

### プロジェクトライセンス
MIT License

詳細は[ARCHITECTURE.md](./ARCHITECTURE.md)を参照してください。