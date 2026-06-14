import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFile, readFile, unlink, mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  const tmpDir = await mkdtemp(join(tmpdir(), 'imggen-'));
  const resultPath = join(tmpDir, 'result.json');

  try {
    const body = await request.json();
    const { prompt, resolution = '768x768' } = body;

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
    }

    const result = await new Promise<{ success: boolean; dataUrl?: string; error?: string }>((resolve) => {
      const proc = spawn('python3', [
        join(process.cwd(), 'mini-services/image-gen-service/generate.py'),
        prompt.trim(),
        resolution,
        resultPath,
      ], {
        env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: '/home/z/.cache/ms-playwright' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });

      const timeout = setTimeout(() => {
        proc.kill('SIGKILL');
        resolve({ success: false, error: 'Generation timed out' });
      }, 180000);

      proc.on('close', async (code) => {
        clearTimeout(timeout);
        console.log(`[ImageGen] Process exited with code ${code}. stdout: ${stdout.slice(-200)}`);

        await new Promise((r) => setTimeout(r, 500));

        try {
          if (existsSync(resultPath)) {
            const raw = await readFile(resultPath, 'utf-8');
            resolve(JSON.parse(raw));
          } else {
            resolve({ success: false, error: `Process exited code ${code}. ${stdout.slice(-300)} ${stderr.slice(-200)}` });
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          resolve({ success: false, error: `Result error: ${msg}` });
        }

        try { unlink(resultPath); } catch {}
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        resolve({ success: false, error: err.message });
      });
    });

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}