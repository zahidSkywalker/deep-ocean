#!/bin/bash
# Master Production Script: The Ant and the Grasshopper
# 30 scenes × 10s = 5-minute video

set -a
BASE="/home/z/my-project/production"
NARRATION_DIR="$BASE/narration"
VIDEO_DIR="$BASE/videos"
OUTPUT_DIR="$BASE/output"
LOG="$BASE/production.log"

mkdir -p "$NARRATION_DIR" "$VIDEO_DIR" "$OUTPUT_DIR"

log() {
    echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG"
}

# ====== PHASE 1: Generate Narration ======
log "=== PHASE 1: GENERATING NARRATION (30 scenes) ==="

for i in $(seq 1 30); do
    NUM=$(printf "%02d" $i)
    NARRATION_FILE="$NARRATION_DIR/scene_${NUM}.mp3"
    if [ -f "$NARRATION_FILE" ]; then
        log "Scene $NUM narration already exists, skipping"
        continue
    fi
    log "Generating narration for Scene $NUM..."
    # Extract narration text from JSON
    NARRATION=$(python3 -c "
import json
with open('$BASE/scenes.json') as f:
    scenes = json.load(f)
print(scenes[$i-1]['narration'])
")
    
    z-ai tts -i "$NARRATION" -o "$NARRATION_FILE" -v tongtong -f mp3 -s 0.9 2>&1 | tee -a "$LOG"
    if [ -f "$NARRATION_FILE" ]; then
        log "Scene $NUM narration DONE ($(du -h "$NARRATION_FILE" | cut -f1))"
    else
        log "Scene $NUM narration FAILED"
    fi
    sleep 1
done

log "=== PHASE 1 COMPLETE: All narrations generated ==="

# ====== PHASE 2: Generate Videos ======
log "=== PHASE 2: GENERATING VIDEOS (30 scenes × 10s) ==="

for i in $(seq 1 30); do
    NUM=$(printf "%02d" $i)
    VIDEO_FILE="$VIDEO_DIR/scene_${NUM}.mp4"
    TASK_FILE="$VIDEO_DIR/task_${NUM}.json"
    
    if [ -f "$VIDEO_FILE" ]; then
        log "Scene $NUM video already exists, skipping"
        continue
    fi
    
    # Get video prompt
    PROMPT=$(python3 -c "
import json
with open('$BASE/scenes.json') as f:
    scenes = json.load(f)
print(scenes[$i-1]['video_prompt'])
")
    
    log "Submitting Scene $NUM video: $PROMPT"
    
    # Submit task
    z-ai video -p "$PROMPT" --duration 10 --fps 30 --output "$TASK_FILE" 2>&1 | tee -a "$LOG"
    
    # Get task ID
    if [ -f "$TASK_FILE" ]; then
        TASK_ID=$(python3 -c "import json; d=json.load(open('$TASK_FILE')); print(d.get('id',''))")
        if [ -n "$TASK_ID" ]; then
            log "Scene $NUM task submitted: $TASK_ID - polling..."
            
            # Poll every 45s, max 20 attempts (15 minutes)
            for poll in $(seq 1 20); do
                sleep 45
                STATUS_FILE="$VIDEO_DIR/status_${NUM}.json"
                z-ai async-result --id "$TASK_ID" --output "$STATUS_FILE" 2>&1 | tail -1 >> "$LOG"
                
                STATUS=$(python3 -c "import json; d=json.load(open('$STATUS_FILE')); print(d.get('task_status',''))" 2>/dev/null)
                log "  Poll $poll: Status=$STATUS"
                
                if [ "$STATUS" = "SUCCESS" ]; then
                    VIDEO_URL=$(python3 -c "import json; d=json.load(open('$STATUS_FILE')); print(d.get('video_url',''))" 2>/dev/null)
                    log "Scene $NUM video READY: $VIDEO_URL"
                    curl -L -o "$VIDEO_FILE" "$VIDEO_URL" 2>&1 | tail -1 >> "$LOG"
                    log "Scene $NUM downloaded ($(du -h "$VIDEO_FILE" | cut -f1))"
                    break
                elif [ "$STATUS" = "FAILED" ]; then
                    log "Scene $NUM video FAILED"
                    break
                fi
            done
        fi
    fi
done

log "=== PHASE 2 COMPLETE: Video generation done ==="

# ====== PHASE 3: Stitch Videos ======
log "=== PHASE 3: STITCHING FINAL VIDEO ==="

# Create concat file for video-only tracks
CONCAT_FILE="$BASE/concat.txt"
> "$CONCAT_FILE"
for i in $(seq 1 30); do
    NUM=$(printf "%02d" $i)
    if [ -f "$VIDEO_DIR/scene_${NUM}.mp4" ]; then
        echo "file '$VIDEO_DIR/scene_${NUM}.mp4'" >> "$CONCAT_FILE"
    else
        log "WARNING: Missing video for scene $NUM"
    fi
done

# Get audio durations and pad them to 10s
for i in $(seq 1 30); do
    NUM=$(printf "%02d" $i)
    NARRATION_FILE="$NARRATION_DIR/scene_${NUM}.mp3"
    PADDED_FILE="$NARRATION_DIR/padded_${NUM}.mp3"
    if [ -f "$NARRATION_FILE" ]; then
        # Get duration and pad to 10 seconds
        DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$NARRATION_FILE" 2>/dev/null)
        log "Scene $NUM narration duration: ${DURATION}s"
        # Add silence at the end to fill 10 seconds, then add 0.5s gap
        ffmpeg -y -i "$NARRATION_FILE" -af "apad=whole_dur=9.5" "$PADDED_FILE" 2>/dev/null
    fi
done

# Concat all padded narrations into one audio track
CONCAT_AUDIO="$BASE/audio_concat.txt"
> "$CONCAT_AUDIO"
for i in $(seq 1 30); do
    NUM=$(printf "%02d" $i)
    PADDED_FILE="$NARRATION_DIR/padded_${NUM}.mp3"
    if [ -f "$PADDED_FILE" ]; then
        echo "file '$PADDED_FILE'" >> "$CONCAT_AUDIO"
    fi
done

FULL_AUDIO="$OUTPUT_DIR/full_narration.mp3"
ffmpeg -y -f concat -safe 0 -i "$CONCAT_AUDIO" -c copy "$FULL_AUDIO" 2>/dev/null
log "Full narration track created ($(du -h "$FULL_AUDIO" | cut -f1))"

# Concat all videos
FULL_VIDEO_NOAUDIO="$OUTPUT_DIR/video_only.mp4"
ffmpeg -y -f concat -safe 0 -i "$CONCAT_FILE" -c copy "$FULL_VIDEO_NOAUDIO" 2>/dev/null
log "Video track created ($(du -h "$FULL_VIDEO_NOAUDIO" | cut -f1))"

# Merge video + audio
FINAL_VIDEO="$OUTPUT_DIR/the_ant_and_the_grasshopper.mp4"
ffmpeg -y -i "$FULL_VIDEO_NOAUDIO" -i "$FULL_AUDIO" -c:v copy -c:a aac -shortest "$FINAL_VIDEO" 2>/dev/null
log "=== FINAL VIDEO: $FINAL_VIDEO ($(du -h "$FINAL_VIDEO" | cut -f1)) ==="

echo "DONE" >> "$LOG"
