import { useState } from 'react';
import Bar from '@/components/Bar';
import { rulesService, type DecodeSegment } from '@/services/rules';
import { ApiError } from '@/lib/api';

export default function SingleDecodePage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<DecodeSegment[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDecode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await rulesService.decode(code.trim());
      setResult(response.data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('解碼失敗，請檢查代碼是否正確或符合規則。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <Bar />
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">單一解碼 (Single Decode)</h1>

        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <form onSubmit={handleDecode} className="flex gap-4">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="請輸入料號代碼 (例如: 102101U0J1010HFT)"
              className="flex-1 border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-lg"
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading || !code.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {isLoading ? '解碼中...' : '解碼'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 border border-red-100 rounded-lg">
              ❌ {error}
            </div>
          )}
        </div>

        {result && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden animate-fade-in-up">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h2 className="font-bold text-slate-700">解碼結果</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-sm">
                    <th className="p-4 border-b font-medium">規則名稱 (Node)</th>
                    <th className="p-4 border-b font-medium">代碼值 (Value)</th>
                    <th className="p-4 border-b font-medium">意義 (Meaning)</th>
                    <th className="p-4 border-b font-medium">類型 (Type)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.map((segment, index) => (
                    <tr key={index} className="hover:bg-slate-50 border-b last:border-b-0">
                      <td className="p-4 text-slate-800 font-medium">{segment.node_name}</td>
                      <td className="p-4 font-mono text-indigo-600 bg-indigo-50/50">{segment.value}</td>
                      <td className="p-4 text-slate-700">{segment.meaning}</td>
                      <td className="p-4 text-xs text-slate-500">
                        <span className="bg-slate-100 px-2 py-1 rounded">{segment.type}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}