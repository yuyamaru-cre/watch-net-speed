import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { SpeedData, TimeRange, Config } from '../types/speed';

const fetchSpeedData = async (): Promise<SpeedData[]> => {
  const response = await fetch('http://localhost:3001/api/speed-data');
  if (!response.ok) throw new Error('Failed to fetch data');
  return response.json();
};

const fetchConfig = async (): Promise<Config> => {
  const response = await fetch('http://localhost:3001/api/config');
  if (!response.ok) throw new Error('Failed to fetch config');
  return response.json();
};

const updateConfig = async (config: Config): Promise<Config> => {
  const response = await fetch('http://localhost:3001/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!response.ok) throw new Error('Failed to update config');
  return response.json();
};

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [intervalInput, setIntervalInput] = useState('');
  const [showIntervalModal, setShowIntervalModal] = useState(false);
  const queryClient = useQueryClient();

  // TanStack Queryでデータ取得
  const { data = [], isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ['speedData'],
    queryFn: fetchSpeedData,
    refetchInterval: 30000,
  });

  // 設定取得
  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: fetchConfig,
    refetchInterval: 10000,
  });

  // 設定更新
  const mutation = useMutation({
    mutationFn: updateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      setShowIntervalModal(false);
      setIntervalInput('');
    },
  });

  const handleIntervalUpdate = () => {
    const interval = parseInt(intervalInput);
    if (interval >= 1 && interval <= 1440) {
      mutation.mutate({ intervalMinutes: interval });
    }
  };

  // 時間範囲でフィルター
  const filteredData = useMemo(() => {
    const now = new Date();
    let cutoff: Date;

    switch (timeRange) {
      case '24h':
        cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        return data;
    }

    return data.filter(d => new Date(d.timestamp) >= cutoff);
  }, [data, timeRange]);

  // 基本統計
  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        avgDownload: 0,
        avgUpload: 0,
        avgPing: 0,
        avgJitter: 0,
      };
    }

    return {
      avgDownload: Math.round(filteredData.reduce((sum, d) => sum + d.download, 0) / filteredData.length * 100) / 100,
      avgUpload: Math.round(filteredData.reduce((sum, d) => sum + d.upload, 0) / filteredData.length * 100) / 100,
      avgPing: Math.round(filteredData.reduce((sum, d) => sum + d.ping, 0) / filteredData.length * 100) / 100,
      avgJitter: Math.round(filteredData.reduce((sum, d) => sum + d.jitter, 0) / filteredData.length * 100) / 100,
    };
  }, [filteredData]);

  // ピーク記録
  const peakStats = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        maxDownload: 0,
        maxDownloadTime: '',
        maxUpload: 0,
        maxUploadTime: '',
        minPing: 0,
        minPingTime: '',
      };
    }

    const downloads = filteredData.map(d => d.download);
    const uploads = filteredData.map(d => d.upload);
    const pings = filteredData.map(d => d.ping);

    const maxDownloadIndex = downloads.indexOf(Math.max(...downloads));
    const maxUploadIndex = uploads.indexOf(Math.max(...uploads));
    const minPingIndex = pings.indexOf(Math.min(...pings));

    return {
      maxDownload: Math.max(...downloads),
      maxDownloadTime: new Date(filteredData[maxDownloadIndex].timestamp).toLocaleString('ja-JP'),
      maxUpload: Math.max(...uploads),
      maxUploadTime: new Date(filteredData[maxUploadIndex].timestamp).toLocaleString('ja-JP'),
      minPing: Math.min(...pings),
      minPingTime: new Date(filteredData[minPingIndex].timestamp).toLocaleString('ja-JP'),
    };
  }, [filteredData]);

  // 時間帯別統計
  const timeSlotStats = useMemo(() => {
    const timeSlots = [
      { name: '深夜 (00:00-03:00)', start: 0, end: 3 },
      { name: '早朝 (03:00-06:00)', start: 3, end: 6 },
      { name: '朝 (06:00-12:00)', start: 6, end: 12 },
      { name: '昼 (12:00-16:00)', start: 12, end: 16 },
      { name: '夕方 (16:00-20:00)', start: 16, end: 20 },
      { name: '夜 (20:00-24:00)', start: 20, end: 24 },
    ];

    return timeSlots.map(slot => {
      const slotData = filteredData.filter(d => {
        const hour = new Date(d.timestamp).getHours();
        return hour >= slot.start && hour < slot.end;
      });

      if (slotData.length === 0) {
        return {
          slot: slot.name,
          avgDownload: 0,
          avgUpload: 0,
          avgPing: 0,
          avgJitter: 0,
          count: 0,
        };
      }

      return {
        slot: slot.name,
        avgDownload: Math.round(slotData.reduce((sum, d) => sum + d.download, 0) / slotData.length * 100) / 100,
        avgUpload: Math.round(slotData.reduce((sum, d) => sum + d.upload, 0) / slotData.length * 100) / 100,
        avgPing: Math.round(slotData.reduce((sum, d) => sum + d.ping, 0) / slotData.length * 100) / 100,
        avgJitter: Math.round(slotData.reduce((sum, d) => sum + d.jitter, 0) / slotData.length * 100) / 100,
        count: slotData.length,
      };
    });
  }, [filteredData]);

  // グラフ用データ
  const chartData = useMemo(() => {
    return filteredData.map(d => ({
      time: new Date(d.timestamp).toLocaleString('ja-JP', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      下り: d.download,
      上り: d.upload,
      Ping: d.ping,
      Jitter: d.jitter,
    }));
  }, [filteredData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-2xl text-slate-600">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-2xl text-red-600">エラーが発生しました</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 mb-2">
              ネット速度モニター
              <span className="text-lg font-normal text-slate-500 ml-3">powered by TanStack</span>
            </h1>
            <p className="text-slate-600">
              24時間の速度変動をリアルタイム監視 
              {data.length > 0 && <span className="ml-2 text-sm">({data.length}件の測定データ)</span>}
            </p>
          </div>
          <button
            onClick={() => setShowIntervalModal(true)}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition flex items-center gap-2"
          >
            <span>⚙️</span>
            <span>計測間隔: {config?.intervalMinutes || 30}分</span>
          </button>
        </header>

        {/* 計測間隔変更モーダル */}
        {showIntervalModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowIntervalModal(false)}>
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-slate-800 mb-4">計測間隔の変更</h3>
              <p className="text-sm text-slate-600 mb-4">
                現在の設定: <span className="font-semibold">{config?.intervalMinutes || 30}分間隔</span>
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  新しい間隔（分）
                </label>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={intervalInput}
                  onChange={(e) => setIntervalInput(e.target.value)}
                  placeholder="例: 30"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">1〜1440分の範囲で設定できます</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowIntervalModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleIntervalUpdate}
                  disabled={mutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {mutation.isPending ? '更新中...' : '更新'}
                </button>
              </div>
              {mutation.isError && (
                <p className="text-red-600 text-sm mt-3">エラーが発生しました</p>
              )}
              {mutation.isSuccess && (
                <p className="text-green-600 text-sm mt-3">✓ 設定を更新しました（次回計測から反映）</p>
              )}
            </div>
          </div>
        )}

        {/* 統計カード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-slate-600 mb-1">平均下り速度</div>
            <div className="text-3xl font-bold text-blue-600">{stats.avgDownload}</div>
            <div className="text-xs text-slate-500">Mbps</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-slate-600 mb-1">平均上り速度</div>
            <div className="text-3xl font-bold text-green-600">{stats.avgUpload}</div>
            <div className="text-xs text-slate-500">Mbps</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-slate-600 mb-1">平均Ping</div>
            <div className="text-3xl font-bold text-orange-600">{stats.avgPing}</div>
            <div className="text-xs text-slate-500">ms</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-slate-600 mb-1">平均Jitter</div>
            <div className="text-3xl font-bold text-purple-600">{stats.avgJitter}</div>
            <div className="text-xs text-slate-500">ms</div>
          </div>
        </div>

        {/* ピーク記録 */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 mb-8 text-white">
          <h2 className="text-xl font-bold mb-4">🏆 ピーク記録</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
              <div className="text-sm opacity-90 mb-1">最高下り速度</div>
              <div className="text-2xl font-bold">{peakStats.maxDownload} Mbps</div>
              <div className="text-xs opacity-75 mt-1">{peakStats.maxDownloadTime}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
              <div className="text-sm opacity-90 mb-1">最高上り速度</div>
              <div className="text-2xl font-bold">{peakStats.maxUpload} Mbps</div>
              <div className="text-xs opacity-75 mt-1">{peakStats.maxUploadTime}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
              <div className="text-sm opacity-90 mb-1">最低Ping</div>
              <div className="text-2xl font-bold">{peakStats.minPing} ms</div>
              <div className="text-xs opacity-75 mt-1">{peakStats.minPingTime}</div>
            </div>
          </div>
        </div>

        {/* 時間帯別統計 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">⏰ 時間帯別平均速度</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">時間帯</th>
                  <th className="text-right py-3 px-4 font-semibold text-blue-600">下り (Mbps)</th>
                  <th className="text-right py-3 px-4 font-semibold text-green-600">上り (Mbps)</th>
                  <th className="text-right py-3 px-4 font-semibold text-orange-600">Ping (ms)</th>
                  <th className="text-right py-3 px-4 font-semibold text-purple-600">Jitter (ms)</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">測定回数</th>
                </tr>
              </thead>
              <tbody>
                {timeSlotStats.map((slot, index) => (
                  <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-700">{slot.slot}</td>
                    <td className="py-3 px-4 text-right font-semibold text-blue-600">
                      {slot.count > 0 ? slot.avgDownload : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-green-600">
                      {slot.count > 0 ? slot.avgUpload : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-orange-600">
                      {slot.count > 0 ? slot.avgPing : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-purple-600">
                      {slot.count > 0 ? slot.avgJitter : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">{slot.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 時間範囲選択 */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setTimeRange('24h')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                timeRange === '24h'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              24時間
            </button>
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                timeRange === '7d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              7日間
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                timeRange === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              全期間
            </button>
          </div>
        </div>

        {/* 下り・上り速度グラフ */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">通信速度（Mbps）</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="下り" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="上り" stroke="#16a34a" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Ping・Jitterグラフ */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">レイテンシ（ms）</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Ping" stroke="#ea580c" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Jitter" stroke="#9333ea" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-8 text-center text-sm text-slate-500">
          最終更新: {new Date(dataUpdatedAt).toLocaleString('ja-JP')}
        </div>
      </div>
    </div>
  );
}
