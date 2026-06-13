#!/usr/bin/env python3
"""
Assemble 76-scene sci-fi video: image per scene + narration audio.
Ken Burns zoom effect + concatenation.
"""
import json, os, subprocess, sys

STORY = "story.json"
IMG_DIR = "images"
AUD_DIR = "narration"
TMP = "temp_clips"
FINAL = "output/the_last_signal.mp4"
FPS = 25

os.makedirs("output", exist_ok=True)
os.makedirs(TMP, exist_ok=True)

with open(STORY) as f:
    scenes = json.load(f)['scenes']

total = len(scenes)
print(f"Assembling {total} scenes...")

clips = []
for i, scene in enumerate(scenes):
    num = scene['scene']
    img = os.path.join(IMG_DIR, f"scene_{num:02d}.jpg")
    aud = os.path.join(AUD_DIR, f"scene_{num:02d}.wav")
    clip = os.path.join(TMP, f"clip_{num:02d}.mp4")

    if not os.path.exists(img) or not os.path.exists(aud):
        print(f"  SKIP scene {num}: missing img/aud")
        continue

    # Get audio duration + 0.8s padding
    r = subprocess.run(['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', aud], capture_output=True, text=True)
    dur = float(r.stdout.strip()) + 0.8

    # Ken Burns: alternate zoom direction per scene
    frames = int(dur * FPS)
    if num % 4 == 0:
        vf = f"zoompan=z='min(zoom+0.0006,1.1)':d={frames}:s=1920x1080:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
    elif num % 4 == 1:
        vf = f"zoompan=z='min(zoom+0.0006,1.1)':d={frames}:s=1920x1080:x='iw/2-(iw/zoom/2)':y=0"
    elif num % 4 == 2:
        vf = f"zoompan=z='min(zoom+0.0006,1.1)':d={frames}:s=1920x1080:x=0:y='ih/2-(ih/zoom/2)'"
    else:
        vf = f"zoompan=z='min(zoom+0.0006,1.1)':d={frames}:s=1920x1080:x='iw-iw/zoom':y='ih/2-(ih/zoom/2)'"

    cmd = ['ffmpeg', '-y', '-loop', '1', '-i', img, '-i', aud,
           '-vf', f'{vf},format=yuv420p',
           '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
           '-c:a', 'aac', '-b:a', '128k', '-pix_fmt', 'yuv420p',
           '-t', str(dur), '-shortest', clip]

    r = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
    if os.path.exists(clip) and os.path.getsize(clip) > 10000:
        clips.append(clip)
        print(f"  [{num}/{total}] OK ({dur:.1f}s)", flush=True)
    else:
        print(f"  [{num}/{total}] FAILED", flush=True)

print(f"\n{len(clips)} clips assembled")

# Concat
concat = os.path.join(TMP, "concat.txt")
with open(concat, 'w') as f:
    for c in clips:
        f.write(f"file '{os.path.abspath(c)}'\n")

print("Concatenating...")
cmd = ['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat,
       '-c:v', 'libx264', '-preset', 'medium', '-crf', '22',
       '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', FINAL]
subprocess.run(cmd, capture_output=True, text=True, timeout=600)

if os.path.exists(FINAL):
    sz = os.path.getsize(FINAL) // (1024*1024)
    r = subprocess.run(['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', FINAL], capture_output=True, text=True)
    dur = float(r.stdout.strip())
    print(f"\nFINAL: {FINAL} ({sz}MB, {dur:.1f}s = {dur/60:.1f}min)")
else:
    print("FAILED to create final video")
