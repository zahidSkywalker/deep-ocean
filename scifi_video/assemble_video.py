#!/usr/bin/env python3
"""
Assemble sci-fi video from images + narrations using ffmpeg.
Each scene: image with Ken Burns zoom + narration audio.
Creates per-scene clips then concatenates.
"""

import json
import os
import subprocess
import json

STORY_FILE = "story.json"
IMAGE_DIR = "images"
NARRATION_DIR = "narration"
OUTPUT_DIR = "output"
TEMP_DIR = "temp_clips"
FINAL_OUTPUT = "output/the_last_signal.mp4"
RESOLUTION = "1920x1080"
FPS = 30

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

with open(STORY_FILE) as f:
    story = json.load(f)

scenes = story['scenes']
total = len(scenes)

print(f"Assembling {total} scenes into video...")

clips = []
for i, scene in enumerate(scenes):
    num = scene['scene']
    img = os.path.join(IMAGE_DIR, f"scene_{num:02d}.jpg")
    audio = os.path.join(NARRATION_DIR, f"scene_{num:02d}.wav")
    clip = os.path.join(TEMP_DIR, f"clip_{num:02d}.mp4")
    
    if not os.path.exists(img):
        print(f"  [{num}/{total}] SKIP: {img} not found")
        continue
    if not os.path.exists(audio):
        print(f"  [{num}/{total}] SKIP: {audio} not found")
        continue
    
    # Get audio duration
    dur_cmd = [
        'ffprobe', '-v', 'quiet', '-show_entries', 'format=duration',
        '-of', 'csv=p=0', audio
    ]
    result = subprocess.run(dur_cmd, capture_output=True, text=True)
    duration = float(result.stdout.strip())
    
    # Add 1 second padding for natural transitions
    duration += 1.0
    
    print(f"  [{num}/{total}] scene_{num:02d} ({duration:.1f}s)", end="", flush=True)
    
    # Ken Burns effect: slow zoom from 100% to 110% + slight pan
    # Alternate direction per scene for variety
    if num % 4 == 0:
        zoom = "zoompan=z='min(zoom+0.0008,1.12)':d={int(duration*FPS)}:s={RESOLUTION}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
    elif num % 4 == 1:
        zoom = f"zoompan=z='min(zoom+0.0008,1.12)':d={int(duration*FPS)}:s={RESOLUTION}:x='iw/2-(iw/zoom/2)':y='0'"
    elif num % 4 == 2:
        zoom = f"zoompan=z='min(zoom+0.0008,1.12)':d={int(duration*FPS)}:s={RESOLUTION}:x='0':y='ih/2-(ih/zoom/2)'"
    else:
        zoom = f"zoompan=z='min(zoom+0.0008,1.12)':d={int(duration*FPS)}:s={RESOLUTION}:x='iw-iw/zoom':y='ih/2-(ih/zoom/2)'"
    
    # Build ffmpeg command
    cmd = [
        'ffmpeg', '-y',
        '-loop', '1', '-i', img,
        '-i', audio,
        '-vf', f'{zoom},format=yuv420p',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-c:a', 'aac', '-b:a', '192k',
        '-pix_fmt', 'yuv420p',
        '-t', str(duration),
        '-shortest',
        clip
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    
    if os.path.exists(clip) and os.path.getsize(clip) > 10000:
        clips.append(clip)
        sz = os.path.getsize(clip) // 1024
        print(f" OK ({sz}KB)")
    else:
        print(f" FAILED")
        if result.stderr:
            print(f"    Error: {result.stderr[-200:]}")

print(f"\nAssembled {len(clips)} clips")

# Create concat list
concat_file = os.path.join(TEMP_DIR, "concat.txt")
with open(concat_file, 'w') as f:
    for clip in clips:
        f.write(f"file '{os.path.abspath(clip)}'\n")

print("Concatenating clips...")

# Concatenate all clips
cmd = [
    'ffmpeg', '-y',
    '-f', 'concat', '-safe', '0',
    '-i', concat_file,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '22',
    '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    FINAL_OUTPUT
]

result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)

if os.path.exists(FINAL_OUTPUT):
    sz = os.path.getsize(FINAL_OUTPUT) // (1024*1024)
    print(f"\nFINAL VIDEO: {FINAL_OUTPUT} ({sz}MB)")
    
    # Get duration
    dur_cmd = [
        'ffprobe', '-v', 'quiet', '-show_entries', 'format=duration',
        '-of', 'csv=p=0', FINAL_OUTPUT
    ]
    result = subprocess.run(dur_cmd, capture_output=True, text=True)
    dur = float(result.stdout.strip())
    print(f"Duration: {dur:.1f}s ({dur/60:.1f} min)")
else:
    print(f"FAILED to create final video")
    print(result.stderr[-500:])
