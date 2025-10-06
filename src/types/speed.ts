export interface SpeedData {
  timestamp: string;
  download: number;
  upload: number;
  ping: number;
  jitter: number;
}

export interface Stats {
  avgDownload: number;
  avgUpload: number;
  avgPing: number;
  avgJitter: number;
}

export interface PeakStats {
  maxDownload: number;
  maxDownloadTime: string;
  maxUpload: number;
  maxUploadTime: string;
  minPing: number;
  minPingTime: string;
}

export interface TimeSlotStat {
  slot: string;
  avgDownload: number;
  avgUpload: number;
  avgPing: number;
  avgJitter: number;
  count: number;
}

export interface Config {
  intervalMinutes: number;
}

export type TimeRange = '24h' | '7d' | 'all' | 'custom';
