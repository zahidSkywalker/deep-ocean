// Poll and download videos with rate limit handling
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE = '/home/z/my-project/production';
const VIDEOS_DIR = `${BASE}/videos`;

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function checkAndDownload(sceneNum) {
    const num = String(sceneNum).padStart(2, '0');
    const videoFile = `${VIDEOS_DIR}/scene_${num}.mp4`;
    const statusFile = `${VIDEOS_DIR}/status_${num}.json`;
    const taskFile = `${VIDEOS_DIR}/task_${num}.json`;
    
    // Already downloaded?
    if (fs.existsSync(videoFile) && fs.statSync(videoFile).size > 1000) {
        return 'done';
    }
    
    if (!fs.existsSync(taskFile)) {
        return 'no_task';
    }
    
    const taskData = JSON.parse(fs.readFileSync(taskFile, 'utf8'));
    const taskId = taskData.id;
    if (!taskId) return 'no_task';
    
    // Check status
    try {
        execSync(`z-ai async-result --id "${taskId}" --output "${statusFile}"`, {
            timeout: 15000,
            stdio: ['pipe', 'pipe', 'pipe']
        });
    } catch (e) {
        const stderr = e.stderr ? e.stderr.toString() : '';
        if (stderr.includes('429')) return 'rate_limited';
        return 'error';
    }
    
    if (!fs.existsSync(statusFile)) return 'no_status';
    
    const statusData = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
    const status = statusData.task_status;
    
    if (status === 'SUCCESS') {
        const videoUrl = (statusData.video_result && statusData.video_result[0] && statusData.video_result[0].url) 
                         || statusData.video_url;
        if (videoUrl) {
            execSync(`curl -sL -o "${videoFile}" "${videoUrl}"`, { timeout: 60000 });
            const size = fs.existsSync(videoFile) ? fs.statSync(videoFile).size : 0;
            if (size > 1000) {
                console.log(`✅ Scene ${num}: ${(size/1024/1024).toFixed(1)}MB`);
                return 'downloaded';
            }
            return 'download_failed';
        }
        return 'no_url';
    } else if (status === 'FAILED') {
        return 'failed';
    }
    
    return 'processing';
}

async function main() {
    console.log('=== POLLING ALL 30 SCENES ===');
    let total = 0, done = 0, processing = 0, pending = 0, failed = 0;
    
    // Process scenes 1-27, then 28-30
    for (let i = 1; i <= 30; i++) {
        total++;
        const result = await checkAndDownload(i);
        
        if (result === 'done' || result === 'downloaded') {
            done++;
        } else if (result === 'processing') {
            processing++;
        } else if (result === 'no_task' || result === 'pending') {
            pending++;
        } else if (result === 'rate_limited') {
            console.log(`⚠️ Rate limited at scene ${i}, waiting 60s...`);
            await sleep(60000);
            i--; // retry this scene
            continue;
        } else if (result === 'failed') {
            failed++;
        } else {
            pending++;
        }
        
        // Stagger requests to avoid rate limits
        await sleep(3000);
    }
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Downloaded: ${done}/30`);
    console.log(`Processing: ${processing}`);
    console.log(`Pending: ${pending}`);
    console.log(`Failed: ${failed}`);
    
    // List downloaded
    const files = fs.readdirSync(VIDEOS_DIR).filter(f => f.startsWith('scene_') && f.endsWith('.mp4'));
    console.log(`\nFiles: ${files.join(', ')}`);
}

main().catch(console.error);
