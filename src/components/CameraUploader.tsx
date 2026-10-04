import React, { useState, useRef } from 'react';

interface CameraUploaderProps {
  onAnalysisComplete?: (data: any) => void;
}

export const CameraUploader: React.FC<CameraUploaderProps> = ({ onAnalysisComplete }) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setErrorMsg(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) {
      setErrorMsg('請先上傳或拍攝食物照片！');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/analyze-meal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image }),
      });

      // 先讀取純文字，避免 direct .json() 拋出 Unexpected token 錯誤
      const responseText = await response.text();

      // 檢查 HTTP 回應碼
      if (!response.ok) {
        if (responseText.trim().startsWith('<') || responseText.includes('The page')) {
          throw new Error(`伺服器連線異常 (${response.status})。請確認 Vercel / Cloud Run 的 GEMINI_API_KEY 環境變數已設定。`);
        }
        
        try {
          const errData = JSON.parse(responseText);
          throw new Error(errData.error || errData.message || `請求失敗 (${response.status})`);
        } catch {
          throw new Error(`伺服器錯誤 [${response.status}]: ${responseText.slice(0, 80)}`);
        }
      }

      // 解析正常的 JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error('伺服器回傳內容並非有效 JSON 格式。');
      }

      if (onAnalysisComplete) {
        onAnalysisComplete(data);
      }
    } catch (err: any) {
      console.error('分析失敗:', err);
      setErrorMsg(err.message || '分析失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md max-w-xl mx-auto">
      <div className="flex flex-col items-center gap-4">
        {image ? (
          <div className="relative w-full h-64 bg-gray-100 rounded-xl overflow-hidden">
            <img src={image} alt="Food" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full h-48 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400">
            請選擇或拍攝食物照片
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex gap-3 w-full">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
          >
            從裝置上傳圖片
          </button>
          
          <button
            onClick={handleAnalyze}
            disabled={loading || !image}
            className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? '分析中...' : '開始 AI 營養師分析'}
          </button>
        </div>

        {errorMsg && (
          <div className="w-full p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">
            <strong>分析失敗：</strong> {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
};
