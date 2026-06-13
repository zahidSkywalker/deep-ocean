#!/bin/bash
BASE="/home/z/my-project/production"
VIDEOS="$BASE/videos"
TOKEN=$(python3 -c "import json; d=json.load(open('/etc/.z-ai-config')); print(d['token'])")
API="https://internal-api.z.ai/v1"

echo "Token length: ${#TOKEN}"
echo "Already downloaded: $(ls "$VIDEOS"/scene_*.mp4 2>/dev/null | wc -l)/30"

for i in $(seq 1 27); do
    NUM=$(printf "%02d" $i)
    VIDEO_FILE="$VIDEOS/scene_${NUM}.mp4"
    
    # Skip if already downloaded
    if [ -f "$VIDEO_FILE" ] && [ $(stat -c%s "$VIDEO_FILE" 2>/dev/null) -gt 1000 ]; then
        continue
    fi
    
    # Get task ID
    TASK_ID=$(python3 -c "import json; d=json.load(open('$VIDEOS/task_${NUM}.json')); print(d.get('id',''))" 2>/dev/null)
    [ -z "$TASK_ID" ] && continue
    
    # Query status via curl
    STATUS_FILE="$VIDEOS/status_${NUM}.json"
    HTTP_CODE=$(curl -s -o "$STATUS_FILE" -w "%{http_code}" --connect-timeout 10 --max-time 20 \
        -H "Authorization: Bearer $TOKEN" \
        "$API/async-result?id=$TASK_ID" 2>/dev/null)
    
    STATUS=$(python3 -c "import json; d=json.load(open('$STATUS_FILE')); print(d.get('task_status','?'))" 2>/dev/null)
    
    echo -n "Scene $NUM: HTTP=$HTTP_CODE Status=$STATUS"
    
    if [ "$STATUS" = "SUCCESS" ]; then
        URL=$(python3 -c "import json; d=json.load(open('$STATUS_FILE')); vr=d.get('video_result',[]); print(vr[0].get('url','') if vr else d.get('video_url',''))" 2>/dev/null)
        if [ -n "$URL" ]; then
            curl -sL --connect-timeout 10 --max-time 60 -o "$VIDEO_FILE" "$URL" 2>/dev/null
            SIZE=$(du -h "$VIDEO_FILE" | cut -f1)
            echo " -> Downloaded ($SIZE)"
        else
            echo " -> No URL"
        fi
    else
        echo ""
    fi
    
    sleep 2
done

echo ""
echo "=== FINAL COUNT ==="
echo "Downloaded: $(ls "$VIDEOS"/scene_*.mp4 2>/dev/null | wc -l)/30"
ls -lh "$VIDEOS"/scene_*.mp4 2>/dev/null