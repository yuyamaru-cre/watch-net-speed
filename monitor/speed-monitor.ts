import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execPromise = promisify(exec);

interface SpeedResult {
  timestamp: string;
  download: number;
  upload: number;
  ping: number;
  jitter: number;
  server?: string;
  isp?: string;
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

async function checkSpeedtestCLI(): Promise<boolean> {
  try {
    await execPromise('speedtest --version');
    return true;
  } catch {
    return false;
  }
}

async function measureSpeed(): Promise<SpeedResult> {
  console.log('計測開始... (Ookla Speedtest)');
  
  const hasSpeedtestCLI = await checkSpeedtestCLI();
  
  if (!hasSpeedtestCLI) {
    console.error('\n❌ Ookla Speedtest CLIがインストールされていません\n');
    console.error('以下のコマンドでインストールしてください:\n');
    console.error('【WSL2 (Ubuntu/Debian)】');
    console.error('curl -s https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | sudo bash');
    console.error('sudo apt-get install speedtest\n');
    console.error('【Windows】');
    console.error('winget install Ookla.Speedtest.CLI\n');
    console.error('【macOS】');
    console.error('brew install speedtest-cli\n');
    throw new Error('Speedtest CLI not installed');
  }
  
  try {
    const { stdout } = await execPromise('speedtest --format=json --accept-license --accept-gdpr');
    const result = JSON.parse(stdout);
    
    const speedResult: SpeedResult = {
      timestamp: new Date().toISOString(),
      download: Math.round(result.download.bandwidth * 8 / 1000000 * 100) / 100,
      upload: Math.round(result.upload.bandwidth * 8 / 1000000 * 100) / 100,
      ping: Math.round(result.ping.latency * 100) / 100,
      jitter: Math.round(result.ping.jitter * 100) / 100,
      server: result.server.name || undefined,
      isp: result.isp || undefined
    };
    
    console.log(`${speedResult.timestamp}`);
    console.log(`下り: ${speedResult.download} Mbps`);
    console.log(`上り: ${speedResult.upload} Mbps`);
    console.log(`Ping: ${speedResult.ping} ms`);
    console.log(`Jitter: ${speedResult.jitter} ms`);
    if (speedResult.server) console.log(`サーバー: ${speedResult.server}`);
    console.log('---');
    
    return speedResult;
  } catch (error: any) {
    console.error('計測エラー:', error.message);
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
    console.error('計測スキップ');
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
console.log(`
╔════════════════════════════════════════════╗
║   ネット速度モニター (Ookla Speedtest)   ║
╚════════════════════════════════════════════╝

⚙️  計測間隔: ${initialConfig.intervalMinutes}分
📊 データ保持: 7日間
⚠️  データ使用量: 約${Math.round(24 * 60 / initialConfig.intervalMinutes * 150)}MB/日

💡 ヒント:
  - 計測間隔は30分以上を推奨
  - Webダッシュボードから設定変更可能
`);

runMonitor();
