const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const { writeFile, readFile, unlink, mkdtemp } = require('fs/promises');
const { tmpdir } = require('os');
const { join } = require('path');
const { existsSync } = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = 3030;

let isGenerating = false;
const queue = [];

function processQueue() {
  if (isGenerating || queue.length === 0) return;
  isGenerating = true;
  const item = queue.shift();
  if (!item) { isGenerating = false; return; }
  const { prompt, resolution, res } = item;

  console.log(`[Gen] Starting: "${prompt.slice(0, 50)}..." (${resolution})`);
  generateImage(prompt, resolution)
    .then(result => {
      console.log(`[Gen] Done: success=${result.success}`);
      if (!res.headersSent) res.json(result);
    })
    .catch(err => {
      console.error(`[Gen] Error: ${err.message}`);
      if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
    })
    .finally(() => {
      isGenerating = false;
      processQueue();
    });
}

app.post('/generate', (req, res) => {
  const { prompt, resolution = '768x768' } = req.body;
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ success: false, error: 'Prompt is required' });
  }
  console.log(`[Gen] Queued: "${prompt.slice(0, 50)}..." (${resolution})`);
  queue.push({ prompt: prompt.trim(), resolution, res });
  processQueue();
  setTimeout(() => {
    if (!res.headersSent) res.status(504).json({ success: false, error: 'Generation timed out (180s)' });
  }, 180000);
});

app.get('/health', (_, res) => {
  res.json({ status: 'ok', queueLength: queue.length, isGenerating });
});

async function generateImage(prompt, resolution) {
  const scriptDir = __dirname;
  const tmpDir = await mkdtemp(join(tmpdir(), 'imggen-'));
  const resultPath = join(tmpDir, 'result.json');

  return new Promise((resolve, reject) => {
    const proc = spawn('python3', [
      join(scriptDir, 'generate.py'),
      prompt,
      resolution,
      resultPath,
    ], {
      env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: '/home/z/.cache/ms-playwright' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); process.stdout.write(d); });
    proc.stderr.on('data', d => { stderr += d.toString(); process.stderr.write(d); });

    const timeout = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('Process timed out'));
    }, 180000);

    proc.on('close', async (code) => {
      clearTimeout(timeout);
      console.log(`[Gen] Process exited with code ${code}`);
      await new Promise(r => setTimeout(r, 500));
      try {
        if (existsSync(resultPath)) {
          const raw = await readFile(resultPath, 'utf-8');
          resolve(JSON.parse(raw));
        } else {
          resolve({ success: false, error: `Process exited code ${code}. ${stdout.slice(-300)}` });
        }
      } catch (e) {
        resolve({ success: false, error: `Result read error: ${e.message}` });
      }
      try { unlink(resultPath); } catch {}
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

app.listen(PORT, () => {
  console.log(`[ImageGen] Service running on port ${PORT}`);
});
