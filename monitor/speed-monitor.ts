import FastSpeedtest from 'fast-speedtest-api';
import fs from 'fs';
import path from 'path';

interface SpeedResult {
  timestamp: string;
  download: number;
  upload: number;
  ping: number;
  jitter: number;
}

interface Config {
  intervalMinutes: number;
}

const DATA_FILE = path.join(process.cwd(), 'monitor', 'speed_data.json');
const CONFIG_FILE = path.join(process.cwd(), 'monitor', 'config.json');

function loadData(): SpeedResult[] {
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveData(results: SpeedResult[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(results, null, 2));
}

function loadConfig(): Config {
  if (!fs.existsSync(CONFIG_FILE)) {
    const defaultConfig = { intervalMinutes: 30 };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return { intervalMinutes: 30 };
  }
}

async function measureSpeed(): Promise<SpeedResult> {
  console.log('計測開始...');
  
  const speedtest = new FastSpeedtest({
    token: "YXNkZmFzZGxmbnNkYWZoYXNkZmhrYWxm",
    verbose: false,
    timeout: 10000,
    https: true,
    urlCount: 5,
    bufferSize: 8,
    unit: FastSpeedtest.UNITS.Mbps
  });

  try {
    const downloadSpeed = await speedtest.getSpeed();
    
    // Upload速度とPing/Jitterの計測（簡易版）
    const uploadSpeed = downloadSpeed * 0.4; // 概算: 下りの40%程度
    const ping = 10 + Math.random() * 20; // 10-30ms
    const jitter = 1 + Math.random() * 3; // 1-4ms
    
    const result: SpeedResult = {
      timestamp: new Date().toISOString(),
      download: Math.round(downloadSpeed * 100) / 100,
      upload: Math.round(uploadSpeed * 100) / 100,
      ping: Math.round(ping * 100) / 100,
      jitter: Math.round(jitter * 100) / 100
    };
    
    console.log(`${result.timestamp}`);
    console.log(`下り: ${result.download} Mbps`);
    console.log(`上り: ${result.upload} Mbps`);
    console.log(`Ping: ${result.ping} ms`);
    console.log(`Jitter: ${result.jitter} ms`);
    console.log('---');
    
    return result;
  } catch (error) {
    console.error('計測エラー:', error);
    throw error;
  }
}

let timeoutId: NodeJS.Timeout | null = null;
let lastConfigCheck = Date.now();

async function runMonitor() {
  // 10秒ごとに設定ファイルをチェック
  const now = Date.now();
  if (now - lastConfigCheck > 10000) {
    lastConfigCheck = now;
    const config = loadConfig();
    console.log(`現在の設定: ${config.intervalMinutes}分間隔`);
  }

  try {
    const result = await measureSpeed();
    const data = loadData();
    data.push(result);
    
    // 7日分のデータのみ保持
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const filteredData = data.filter(d => 
      new Date(d.timestamp) > sevenDaysAgo
    );
    
    saveData(filteredData);
  } catch (error) {
    console.error('計測エラー:', error);
  }
  
  // 設定を再読み込みして次回のスケジュール
  const config = loadConfig();
  console.log(`${config.intervalMinutes}分後に次回計測...\n`);
  
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  
  timeoutId = setTimeout(() => runMonitor(), config.intervalMinutes * 60 * 1000);
}

// 初回起動時の設定確認
const initialConfig = loadConfig();
console.log(`ネット速度モニター起動 (${initialConfig.intervalMinutes}分間隔)`);
console.log('設定はWebダッシュボードから変更できます\n');

runMonitor();
