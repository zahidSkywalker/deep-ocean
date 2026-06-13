#!/bin/bash
# Lightweight bash poller - uses curl with timeouts
BASE="/home/z/my-project/production"
VIDEOS="$BASE/videos"
TOKEN=$(python3 -c "
import json
lines = open('/etc/.z-ai-config').read().strip().split('\n')
c = {}
for l in lines:
    k,v = l.split(': ',1) if ': ' in l else (l,'')
    if k: c[k.strip()] = v.strip()
print(c.get('token',''))
")
API="https://internal-api.z.ai/v1"

download_if_success() {
    local NUM=$1
    local STATUS_FILE="$VIDEOS/status_${NUM}.json"
    local VIDEO_FILE="$VIDEOS/scene_${NUM}.mp4"
    
    [ -f "$VIDEO_FILE" ] && [ $(stat -c%s "$VIDEO_FILE") -gt 1000 ] && return 0
    
    if [ -f "$STATUS_FILE" ]; then
        local STATUS=$(python3 -c "import json; d=json.load(open('$STATUS_FILE')); print(d.get('task_status',''))" 2>/dev/null)
        if [ "$STATUS" = "SUCCESS" ]; then
            local URL=$(python3 -c "import json; d=json.load(open('$STATUS_FILE')); vr=d.get('video_result',[]); print(vr[0].get('url','') if vr else d.get('video_url',''))" 2>/dev/null)
            if [ -n "$URL" ]; then
                curl -sL --connect-timeout 10 --max-time 30 -o "$VIDEO_FILE" "$URL"
                echo "  Downloaded scene $NUM ($(du -h "$VIDEO_FILE" | cut -f1))"
                return 0
            fi
        fi
    fi
    return 1
}

check_status() {
    local NUM=$1
    local TASK_ID=$2
    
    curl -s --connect-timeout 10 --max-time 15 \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        "$API/async/result/$TASK_ID" > "$VIDEOS/status_${NUM}.json" 2>/dev/null
}

# Poll scenes that aren't downloaded yet, one at a time with delays
for i in $(seq 1 27); do
    NUM=$(printf "%02d" $i)
    [ -f "$VIDEOS/scene_${NUM}.mp4" ] && [ $(stat -c%s "$VIDEOS/scene_${NUM}.mp4") -gt 1000 ] && continue
    
    TASK_ID=$(python3 -c "import json; d=json.load(open('$VIDEOS/task_${NUM}.json')); print(d.get('id',''))" 2>/dev/null)
    [ -z "$TASK_ID" ] && continue
    
    echo -n "Scene $NUM: "
    RESPONSE=$(check_status "$NUM" "$TASK_ID")
    
    if [ -f "$VIDEOS/status_${NUM}.json" ]; then
        STATUS=$(python3 -c "import json; d=json.load(open('$VIDEOS/status_${NUM}.json')); print(d.get('task_status',''))" 2>/dev/null)
        echo "$STATUS"
        download_if_success "$NUM"
    else
        echo "No response"
    fi
    
    sleep 5
done

echo "=== DONE ==="
echo "Downloaded: $(ls "$VIDEOS"/scene_*.mp4 2>/dev/null | wc -l)/30"
