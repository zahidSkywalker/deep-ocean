// Single-session video poller using SDK directly
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const BASE = '/home/z/my-project/production';
const VIDEOS = `${BASE}/videos`;

const TASK_IDS = {};
for (let i = 1; i <= 30; i++) {
    const num = String(i).padStart(2, '0');
    const tf = `${VIDEOS}/task_${num}.json`;
    if (fs.existsSync(tf)) {
        try {
            const d = JSON.parse(fs.readFileSync(tf));
            if (d.id) TASK_IDS[i] = d.id;
        } catch {}
    }
}

console.log(`Loaded ${Object.keys(TASK_IDS).length} task IDs`);
console.log(`Already downloaded: ${fs.readdirSync(VIDEOS).filter(f=>f.match(/scene_\d+\.mp4/)).length}`);

// Check scene 2 directly via curl to internal API
const task2 = TASK_IDS[2];
if (task2) {
    console.log(`\nTesting Scene 2 (task: ${task2}) via fetch...`);
}

// Read config
const configLines = fs.readFileSync('/etc/.z-ai-config', 'utf8').split('\n');
const config = {};
for (const line of configLines) {
    const [k, ...v] = line.split(': ');
    if (k && v.length) config[k.trim()] = v.join(': ').trim();
}

const baseUrl = config.baseUrl || 'https://internal-api.z.ai/v1';
const apiKey = config.apiKey || 'Z.ai';
const token = config.token || '';
const chatId = config.chatId || '';

console.log(`Config loaded: baseUrl=${baseUrl}`);

async function checkStatus(taskId) {
    try {
        const resp = await fetch(`${baseUrl}/async/result/${taskId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (resp.status === 429) return { status: 'rate_limited' };
        if (!resp.ok) return { status: 'error', code: resp.status };
        return await resp.json();
    } catch (e) {
        return { status: 'error', message: e.message };
    }
}

async function main() {
    // Check a few one by one
    const toCheck = [2, 3, 5, 6, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27];
    
    for (const i of toCheck) {
        const num = String(i).padStart(2, '0');
        const vf = `${VIDEOS}/scene_${num}.mp4`;
        if (fs.existsSync(vf) && fs.statSync(vf).size > 1000) continue;
        
        const taskId = TASK_IDS[i];
        if (!taskId) continue;
        
        console.log(`Scene ${num}...`);
        const result = await checkStatus(taskId);
        
        if (result.status === 'rate_limited') {
            console.log('  Rate limited, waiting 60s...');
            await new Promise(r => setTimeout(r, 60000));
            // Retry
            const retry = await checkStatus(taskId);
            if (retry.task_status === 'SUCCESS') {
                const url = (retry.video_result && retry.video_result[0] && retry.video_result[0].url) || '';
                if (url) {
                    execSync(`curl -sL -o "${vf}" "${url}"`, {timeout: 60000});
                    console.log(`  Downloaded!`);
                }
            } else {
                console.log(`  Still: ${retry.task_status || JSON.stringify(retry)}`);
            }
        } else if (result.task_status === 'SUCCESS') {
            const url = (result.video_result && result.video_result[0] && result.video_result[0].url) || '';
            if (url) {
                execSync(`curl -sL -o "${vf}" "${url}"`, {timeout: 60000});
                console.log(`  Downloaded!`);
            }
        } else {
            console.log(`  Status: ${result.task_status || JSON.stringify(result).substring(0,100)}`);
        }
        
        await new Promise(r => setTimeout(r, 5000));
    }
    
    // Also try submitting 28-30
    console.log('\nSubmitting scenes 28-30...');
    for (const i of [28, 29, 30]) {
        const num = String(i).padStart(2, '0');
        const tf = `${VIDEOS}/task_${num}.json`;
        if (fs.existsSync(tf)) {
            try {
                const d = JSON.parse(fs.readFileSync(tf));
                if (d.id) { console.log(`Scene ${num} already has task: ${d.id}`); continue; }
            } catch {}
        }
        const scenes = JSON.parse(fs.readFileSync(`${BASE}/scenes.json`));
        const prompt = scenes[i-1].video_prompt;
        
        try {
            const resp = await fetch(`${baseUrl}/videos/generations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt, duration: 10, fps: 30 })
            });
            if (resp.status === 429) {
                console.log(`Scene ${num}: rate limited`);
            } else {
                const data = await resp.json();
                console.log(`Scene ${num}: ${JSON.stringify(data).substring(0, 200)}`);
                if (data.id) fs.writeFileSync(tf, JSON.stringify(data));
            }
        } catch (e) {
            console.log(`Scene ${num}: error ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 5000));
    }
    
    const total = fs.readdirSync(VIDEOS).filter(f=>f.match(/scene_\d+\.mp4/)).length;
    console.log(`\nTotal downloaded: ${total}/30`);
}

main().catch(console.error);
