import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'speed_data.json');
const CONFIG_FILE = path.join(__dirname, 'config.json');

// 設定の読み込み
function loadConfig() {
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

// 設定の保存
function saveConfig(config: { intervalMinutes: number }) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// データ取得エンドポイント
app.get('/api/speed-data', (req, res) => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return res.json([]);
    }
    
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    res.json(data);
  } catch (error) {
    console.error('Error reading data:', error);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

// 最新データ取得
app.get('/api/speed-data/latest', (req, res) => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return res.json(null);
    }
    
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    const latest = data[data.length - 1];
    res.json(latest);
  } catch (error) {
    console.error('Error reading latest data:', error);
    res.status(500).json({ error: 'Failed to load latest data' });
  }
});

// 設定取得エンドポイント
app.get('/api/config', (req, res) => {
  try {
    const config = loadConfig();
    res.json(config);
  } catch (error) {
    console.error('Error reading config:', error);
    res.status(500).json({ error: 'Failed to load config' });
  }
});

// 設定更新エンドポイント
app.put('/api/config', (req, res) => {
  try {
    const { intervalMinutes } = req.body;
    
    if (typeof intervalMinutes !== 'number' || intervalMinutes < 1 || intervalMinutes > 1440) {
      return res.status(400).json({ error: 'Invalid interval (must be 1-1440 minutes)' });
    }
    
    saveConfig({ intervalMinutes });
    console.log(`計測間隔を ${intervalMinutes} 分に変更しました`);
    res.json({ success: true, intervalMinutes });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// データ削除エンドポイント（オプション）
app.delete('/api/speed-data', (req, res) => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      fs.unlinkSync(DATA_FILE);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting data:', error);
    res.status(500).json({ error: 'Failed to delete data' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📊 Data endpoint: http://localhost:${PORT}/api/speed-data`);
  console.log(`⚙️  Config endpoint: http://localhost:${PORT}/api/config`);
});
