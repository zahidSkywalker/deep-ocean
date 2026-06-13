#!/usr/bin/env python3
"""Auto-poller: checks video tasks, downloads completed ones, stitches when ready, uploads to Cloudinary"""
import json, subprocess, os, time, sys

BASE = "/home/z/my-project/production"
VIDEOS = f"{BASE}/videos"
NARRATION = f"{BASE}/narration"
OUTPUT = f"{BASE}/output"
LOG = f"{BASE}/auto_poll.log"

# Cloudinary config
CLOUD_NAME = "dbi2rwlso"
API_KEY = "975947371117363"
API_SECRET = "Y-CEk6WYx-uDd_R7L7gByjk5Fdg"

def log(msg):
    ts = time.strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    with open(LOG, "a") as f:
        f.write(line + "\n")

def get_scene_count():
    count = len([f for f in os.listdir(VIDEOS) if f.startswith("scene_") and f.endswith(".mp4")])
    return count

def poll_and_download():
    """Poll pending tasks and download completed ones"""
    downloaded_new = 0
    
    for i in range(1, 31):
        num = f"{i:02d}"
        video_file = f"{VIDEOS}/scene_{num}.mp4"
        
        # Skip if already downloaded
        if os.path.exists(video_file) and os.path.getsize(video_file) > 1000:
            continue
        
        task_file = f"{VIDEOS}/task_{num}.json"
        if not os.path.exists(task_file):
            continue
            
        try:
            task_data = json.load(open(task_file))
            task_id = task_data.get("id", "")
            if not task_id:
                continue
        except:
            continue
        
        # Poll using z-ai CLI
        status_file = f"{VIDEOS}/status_{num}.json"
        try:
            result = subprocess.run(
                ["z-ai", "async-result", "--id", task_id, "--output", status_file],
                capture_output=True, text=True, timeout=30
            )
        except:
            continue
        
        if not os.path.exists(status_file):
            continue
        
        try:
            status_data = json.load(open(status_file))
        except:
            continue
        
        status = status_data.get("task_status", "")
        
        if status == "SUCCESS":
            # Get video URL
            vr = status_data.get("video_result", [])
            url = ""
            if vr and len(vr) > 0:
                url = vr[0].get("url", "")
            if not url:
                url = status_data.get("video_url", "")
            
            if url:
                try:
                    subprocess.run(["curl", "-sL", "--connect-timeout", "10", "--max-time", "60", "-o", video_file, url], timeout=90)
                    if os.path.exists(video_file) and os.path.getsize(video_file) > 1000:
                        size_mb = os.path.getsize(video_file) / (1024*1024)
                        log(f"  Scene {num}: Downloaded ({size_mb:.1f}MB)")
                        downloaded_new += 1
                except Exception as e:
                    log(f"  Scene {num}: Download error: {e}")
        elif status == "FAILED":
            log(f"  Scene {num}: FAILED")
        
        time.sleep(2)  # Stagger requests
    
    return downloaded_new

def submit_pending():
    """Submit video tasks for scenes that don't have one yet"""
    for i in range(28, 31):
        num = f"{i:02d}"
        task_file = f"{VIDEOS}/task_{num}.json"
        
        if os.path.exists(task_file):
            try:
                d = json.load(open(task_file))
                if d.get("id"):
                    continue
            except:
                pass
        
        scenes = json.load(open(f"{BASE}/scenes.json"))
        prompt = scenes[i-1]["video_prompt"]
        
        try:
            result = subprocess.run(
                ["z-ai", "video", "-p", prompt, "--duration", "10", "--fps", "30", "--output", task_file],
                capture_output=True, text=True, timeout=30
            )
            if os.path.exists(task_file):
                d = json.load(open(task_file))
                if d.get("id"):
                    log(f"  Scene {num}: Submitted ({d['id']})")
        except Exception as e:
            log(f"  Scene {num}: Submit error: {e}")
        
        time.sleep(5)

def stitch_video():
    """Stitch all scenes into final video"""
    count = get_scene_count()
    if count < 30:
        log(f"Only {count}/30 videos available, can't stitch full video yet")
        return False
    
    log("Stitching final video...")
    
    # 1. Pad narrations to 10s each
    for i in range(1, 31):
        num = f"{i:02d}"
        nar_file = f"{NARRATION}/scene_{num}.wav"
        padded_file = f"{NARRATION}/padded_{num}.wav"
        
        if not os.path.exists(nar_file):
            continue
        
        subprocess.run([
            "ffmpeg", "-y", "-i", nar_file, 
            "-af", "apad=whole_dur=9.5", padded_file
        ], capture_output=True, timeout=30)
    
    # 2. Concat padded narrations
    concat_audio = f"{BASE}/audio_concat.txt"
    with open(concat_audio, "w") as f:
        for i in range(1, 31):
            num = f"{i:02d}"
            padded = f"{NARRATION}/padded_{num}.wav"
            if os.path.exists(padded):
                f.write(f"file '{padded}'\n")
    
    full_audio = f"{OUTPUT}/full_narration.mp3"
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_audio,
        "-c", "copy", full_audio
    ], capture_output=True, timeout=60)
    
    # 3. Concat videos
    concat_video = f"{BASE}/concat.txt"
    with open(concat_video, "w") as f:
        for i in range(1, 31):
            num = f"{i:02d}"
            video = f"{VIDEOS}/scene_{num}.mp4"
            if os.path.exists(video):
                f.write(f"file '{video}'\n")
    
    video_only = f"{OUTPUT}/video_only.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_video,
        "-c", "copy", video_only
    ], capture_output=True, timeout=120)
    
    # 4. Merge video + audio
    final = f"{OUTPUT}/the_ant_and_the_grasshopper.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-i", video_only, "-i", full_audio,
        "-c:v", "copy", "-c:a", "aac", "-shortest", final
    ], capture_output=True, timeout=120)
    
    if os.path.exists(final) and os.path.getsize(final) > 1000000:
        size_mb = os.path.getsize(final) / (1024*1024)
        log(f"Final video created: {final} ({size_mb:.1f}MB)")
        return True
    
    log("Final video creation failed")
    return False

def upload_to_cloudinary(filepath):
    """Upload video to Cloudinary"""
    try:
        result = subprocess.run([
            "curl", "-s", "-X", "POST",
            f"https://api.cloudinary.com/v1_1/{CLOUD_NAME}/video/upload",
            "-F", f"file=@{filepath}",
            "-F", f"api_key={API_KEY}",
            "-F", f"timestamp={int(time.time())}",
            "-F", f"signature=$(python3 -c \"import hashlib, hmac; print(hmac.new(b'{API_SECRET}', b'timestamp={int(time.time())}', hashlib.sha1).hexdigest())\")"
        ], capture_output=True, text=True, timeout=300)
        
        resp = json.loads(result.stdout)
        url = resp.get("secure_url", "")
        public_id = resp.get("public_id", "")
        
        if url:
            log(f"Uploaded to Cloudinary: {url}")
            return url
        else:
            log(f"Upload response: {result.stdout[:200]}")
    except Exception as e:
        log(f"Upload error: {e}")
    return ""

def main():
    log(f"=== AUTO POLL START (already have {get_scene_count()}/30) ===")
    
    # Submit pending scenes
    log("Submitting any pending scenes...")
    submit_pending()
    time.sleep(3)
    
    # Poll and download
    log("Polling for completed videos...")
    new_downloads = poll_and_download()
    log(f"New downloads: {new_downloads}")
    
    total = get_scene_count()
    log(f"Total videos: {total}/30")
    
    # Try to stitch if all ready
    if total >= 30:
        success = stitch_video()
        if success:
            final = f"{OUTPUT}/the_ant_and_the_grasshopper.mp4"
            url = upload_to_cloudinary(final)
            if url:
                log(f"CLOUDINARY URL: {url}")
    
    return total

if __name__ == "__main__":
    total = main()
    print(f"TOTAL:{total}")
