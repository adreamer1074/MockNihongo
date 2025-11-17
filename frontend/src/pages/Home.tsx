import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        JLPT模擬試験プラットフォーム
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        N5からN1まで、本格的な日本語能力試験の練習ができます
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-3xl mb-4">📝</div>
          <h3 className="text-xl font-semibold mb-2">本格試験モード</h3>
          <p className="text-gray-600">
            時間制限付きで実際の試験に近い環境で練習
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-3xl mb-4">📚</div>
          <h3 className="text-xl font-semibold mb-2">模擬試験モード</h3>
          <p className="text-gray-600">
            時間制限なしで即時フィードバックを確認
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-3xl mb-4">📊</div>
          <h3 className="text-xl font-semibold mb-2">詳細な結果分析</h3>
          <p className="text-gray-600">
            セクション別のスコアで弱点を把握
          </p>
        </div>
      </div>
      
      <div className="mt-12">
        <Link
          to="/exams"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
        >
          試験を始める
        </Link>
      </div>
      
      <div className="mt-16 bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6">レベル別試験</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {['N5', 'N4', 'N3', 'N2', 'N1'].map((level) => (
            <Link
              key={level}
              to={`/exams?level=${level}`}
              className="px-6 py-4 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors font-semibold"
            >
              {level}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
