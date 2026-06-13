#!/usr/bin/env python3
"""Generate all scene narrations using edge-tts."""
import asyncio, edge_tts, json, os, time

VOICE = "en-US-GuyNeural"

async def generate_all():
    with open('story.json') as f:
        data = json.load(f)
    os.makedirs('narration', exist_ok=True)
    t0 = time.time()
    for s in data['scenes']:
        out = f"narration/scene_{s['scene']:02d}.wav"
        if os.path.exists(out) and os.path.getsize(out) > 5000:
            print(f"[{s['scene']}/{len(data['scenes'])}] EXISTS")
            continue
        t = time.time()
        comm = edge_tts.Communicate(s['narration'], VOICE, rate='-5%')
        await comm.save(out)
        print(f"[{s['scene']}/{len(data['scenes'])}] {out} ({os.path.getsize(out)//1024}KB, {time.time()-t:.1f}s)")
    print(f"\nAll TTS done in {time.time()-t0:.1f}s")

asyncio.run(generate_all())
