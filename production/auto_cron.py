#!/usr/bin/env python3
"""Auto-poll and stitch - designed to run as cron job"""
import json, subprocess, os, time, sys, glob

BASE = "/home/z/my-project/production"
VIDEOS = f"{BASE}/videos"
NARRATION = f"{BASE}/narration"
OUTPUT = f"{BASE}/output"
LOG = f"{BASE}/auto_poll.log"

def log(msg):
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    with open(LOG, "a") as f:
        f.write(line + "\n")

def count_videos():
    return len(glob.glob(f"{VIDEOS}/scene_*.mp4"))

def poll_and_download():
    new = 0
    for i in range(1, 31):
        num = f"{i:02d}"
        vf = f"{VIDEOS}/scene_{num}.mp4"
        if os.path.exists(vf) and os.path.getsize(vf) > 1000:
            continue
        tf = f"{VIDEOS}/task_{num}.json"
        if not os.path.exists(tf):
            # Try submitting
            scenes = json.load(open(f"{BASE}/scenes.json"))
            prompt = scenes[i-1]["video_prompt"]
            try:
                r = subprocess.run(["z-ai","video","-p",prompt,"--duration","10","--fps","30","--output",tf],
                    capture_output=True, text=True, timeout=30)
                if os.path.exists(tf):
                    try:
                        d = json.load(open(tf))
                        if d.get("id"): log(f"  Scene {num}: submitted {d['id']}")
                    except: pass
            except: pass
            time.sleep(3)
            continue
        
        try:
            d = json.load(open(tf))
            tid = d.get("id","")
            if not tid: continue
        except: continue
        
        sf = f"{VIDEOS}/status_{num}.json"
        try:
            subprocess.run(["z-ai","async-result","--id",tid,"--output",sf], capture_output=True, text=True, timeout=30)
        except: continue
        
        if not os.path.exists(sf): continue
        try:
            sd = json.load(open(sf))
        except: continue
        
        if sd.get("task_status") == "SUCCESS":
            vr = sd.get("video_result",[])
            url = vr[0].get("url","") if vr else sd.get("video_url","")
            if url:
                try:
                    subprocess.run(["curl","-sL","--max-time","60","-o",vf,url], timeout=90)
                    if os.path.exists(vf) and os.path.getsize(vf) > 1000:
                        log(f"  Scene {num}: downloaded ({os.path.getsize(vf)//1024//1024}MB)")
                        new += 1
                except: pass
        time.sleep(2)
    return new

def stitch_and_upload():
    count = count_videos()
    if count < 30:
        log(f"Only {count}/30, skipping stitch")
        return False
    
    log("All 30 videos ready! Stitching...")
    
    # Pad narrations
    for i in range(1,31):
        num = f"{i:02d}"
        src = f"{NARRATION}/scene_{num}.wav"
        dst = f"{NARRATION}/padded_{num}.wav"
        if os.path.exists(src):
            subprocess.run(["ffmpeg","-y","-i",src,"-af","apad=whole_dur=9.5",dst], capture_output=True, timeout=30)
    
    # Build filter for audio concat
    inputs = []
    filter_parts = []
    for idx, i in enumerate(range(1,31)):
        num = f"{i:02d}"
        padded = f"{NARRATION}/padded_{num}.wav"
        if os.path.exists(padded):
            inputs.extend(["-i", padded])
            filter_parts.append(f"[{idx}:a]")
    
    filter_str = "".join(filter_parts) + f"concat=n={len(filter_parts)}:v=0:a=1[out]"
    full_audio = f"{OUTPUT}/full_narration.m4a"
    cmd = ["ffmpeg","-y"] + inputs + ["-filter_complex",filter_str,"-map","[out]","-c:a","aac","-b:a","128k",full_audio]
    subprocess.run(cmd, capture_output=True, timeout=120)
    
    # Video concat
    concat_v = f"{BASE}/concat_full.txt"
    with open(concat_v,"w") as f:
        for i in range(1,31):
            num = f"{i:02d}"
            if os.path.exists(f"{VIDEOS}/scene_{num}.mp4"):
                f.write(f"file '{VIDEOS}/scene_{num}.mp4'\n")
    
    video_only = f"{OUTPUT}/video_only.mp4"
    subprocess.run(["ffmpeg","-y","-f","concat","-safe","0","-i",concat_v,"-c","copy",video_only], capture_output=True, timeout=120)
    
    # Merge
    final = f"{OUTPUT}/the_ant_and_the_grasshopper.mp4"
    subprocess.run(["ffmpeg","-y","-i",video_only,"-i",full_audio,"-c:v","copy","-c:a","aac","-shortest",final], capture_output=True, timeout=120)
    
    if os.path.exists(final) and os.path.getsize(final) > 1000000:
        log(f"Final video: {os.path.getsize(final)//1024//1024}MB")
        
        # Upload to Cloudinary
        try:
            import cloudinary
            import cloudinary.uploader
            cloudinary.config(cloud_name="dbi2rwlso", api_key="975947371117363", api_secret="Y-CEk6WYx-uDd_R7L7gByjk5Fdg")
            result = cloudinary.uploader.upload(final, resource_type="video", public_id="ant_and_the_grasshopper", chunk_size=10*1024*1024)
            url = result.get("secure_url","")
            log(f"UPLOADED: {url}")
        except Exception as e:
            log(f"Upload failed: {e}")
        return True
    return False

if __name__ == "__main__":
    count = count_videos()
    log(f"=== POLL START ({count}/30) ===")
    
    try:
        new = poll_and_download()
        log(f"New downloads: {new}, Total: {count_videos()}/30")
    except Exception as e:
        log(f"Poll error: {e}")
    
    try:
        stitch_and_upload()
    except Exception as e:
        log(f"Stitch error: {e}")
