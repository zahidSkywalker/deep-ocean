#!/usr/bin/env python3
"""Create slideshow concat file and run ffmpeg to build the video."""
import json, os, subprocess

# Get audio duration
r = subprocess.run(['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration',
                    '-of', 'csv=p=0', 'narration/full_narration.mp3'], capture_output=True, text=True)
total_dur = float(r.stdout.strip())
print(f'Audio: {total_dur:.1f}s ({total_dur/60:.1f} min)')

with open('story.json') as f:
    scenes = json.load(f)['scenes']

per_scene = total_dur / len(scenes)
print(f'Per scene: {per_scene:.2f}s x {len(scenes)} scenes')

# Write concat file
os.makedirs('temp_clips', exist_ok=True)
with open('temp_clips/slideshow.txt', 'w') as f:
    for s in scenes:
        num = s['scene']
        img = os.path.abspath(f'images/scene_{num:02d}.jpg')
        f.write(f"file '{img}'\n")
        f.write(f"duration {per_scene}\n")
    # Repeat last image
    last = os.path.abspath(f"images/scene_{scenes[-1]['scene']:02d}.jpg")
    f.write(f"file '{last}'\n")

print('Concat file ready')

# Run ffmpeg - slideshow + audio, NO re-encoding of video (copy codec)
# Use -c:v libx264 ultrafast for speed, scale images to 1920x1080
print('Building video...')
cmd = [
    'ffmpeg', '-y',
    '-f', 'concat', '-safe', '0', '-i', 'temp_clips/slideshow.txt',
    '-i', 'narration/full_narration.mp3',
    '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '26',
    '-c:a', 'aac', '-b:a', '128k',
    '-shortest',
    '-movflags', '+faststart',
    'output/the_last_signal_v2.mp4'
]

r = subprocess.run(cmd, capture_output=True, text=True, timeout=600)

if os.path.exists('output/the_last_signal_v2.mp4'):
    sz = os.path.getsize('output/the_last_signal_v2.mp4') // (1024*1024)
    r2 = subprocess.run(['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration',
                         '-of', 'csv=p=0', 'output/the_last_signal_v2.mp4'], capture_output=True, text=True)
    dur = float(r2.stdout.strip())
    print(f'\nDONE: the_last_signal_v2.mp4 ({sz}MB, {dur:.1f}s = {dur/60:.1f} min)')
else:
    print('FAILED')
    print(r.stderr[-500:] if r.stderr else 'no error output')
