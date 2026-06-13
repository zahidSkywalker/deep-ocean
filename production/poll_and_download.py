import json, subprocess, os, sys

BASE = "/home/z/my-project/production"
VIDEOS_DIR = f"{BASE}/videos"
DOWNLOADED = 0
STILL_PROCESSING = 0

for i in range(1, 31):
    num = f"{i:02d}"
    video_file = f"{VIDEOS_DIR}/scene_{num}.mp4"
    status_file = f"{VIDEOS_DIR}/status_{num}.json"
    task_file = f"{VIDEOS_DIR}/task_{num}.json"
    
    if os.path.exists(video_file):
        DOWNLOADED += 1
        continue
    
    if not os.path.exists(status_file):
        if os.path.exists(task_file):
            # Need to re-check status
            with open(task_file) as f:
                task_data = json.load(f)
            task_id = task_data.get('id', '')
            if task_id:
                result = subprocess.run(
                    ['z-ai', 'async-result', '--id', task_id, '--output', status_file],
                    capture_output=True, text=True, timeout=30
                )
            else:
                continue
        else:
            print(f"Scene {num}: NO TASK")
            continue
    
    try:
        with open(status_file) as f:
            data = json.load(f)
    except:
        continue
    
    status = data.get('task_status', '')
    
    if status == 'SUCCESS':
        # Get URL from video_result array
        video_url = ''
        vr = data.get('video_result', [])
        if vr and len(vr) > 0:
            video_url = vr[0].get('url', '')
        elif 'video_url' in data:
            video_url = data['video_url']
        
        if video_url:
            print(f"Scene {num}: Downloading...")
            result = subprocess.run(
                ['curl', '-sL', '-o', video_file, video_url],
                capture_output=True, text=True, timeout=60
            )
            if os.path.exists(video_file) and os.path.getsize(video_file) > 1000:
                size = os.path.getsize(video_file) / (1024*1024)
                print(f"  ✅ Downloaded ({size:.1f}MB)")
                DOWNLOADED += 1
            else:
                print(f"  ❌ Download failed")
        else:
            print(f"Scene {num}: SUCCESS but no URL found")
            print(f"  Keys: {list(data.keys())}")
    elif status == 'FAILED':
        print(f"Scene {num}: FAILED")
    else:
        STILL_PROCESSING += 1

print(f"\n=== RESULTS: {DOWNLOADED}/30 downloaded, {STILL_PROCESSING} still processing ===")
