#!/bin/bash
BASE="/home/z/my-project/production"
VIDEOS="$BASE/videos"

# Read config values
CONFIG=$(python3 -c "
import json
d=json.load(open('/etc/.z-ai-config'))
print(f\"{d['apiKey']}|{d['chatId']}|{d['userId']}|{d['token']}\")
")
API_KEY=$(echo "$CONFIG" | cut -d'|' -f1)
CHAT_ID=$(echo "$CONFIG" | cut -d'|' -f2)
USER_ID=$(echo "$CONFIG" | cut -d'|' -f3)
TOKEN=$(echo "$CONFIG" | cut -d'|' -f4)
API="https://internal-api.z.ai/v1"

echo "Polling with SDK-style headers..."
echo "Downloaded: $(ls "$VIDEOS"/scene_*.mp4 2>/dev/null | wc -l)/30"

for i in $(seq 1 27); do
    NUM=$(printf "%02d" $i)
    VIDEO_FILE="$VIDEOS/scene_${NUM}.mp4"
    
    [ -f "$VIDEO_FILE" ] && [ $(stat -c%s "$VIDEO_FILE" 2>/dev/null || echo 0) -gt 1000 ] && continue
    
    TASK_ID=$(python3 -c "import json; d=json.load(open('$VIDEOS/task_${NUM}.json')); print(d.get('id',''))" 2>/dev/null)
    [ -z "$TASK_ID" ] && continue
    
    STATUS_FILE="$VIDEOS/status_${NUM}.json"
    HTTP_CODE=$(curl -s -o "$STATUS_FILE" -w "%{http_code}" --connect-timeout 10 --max-time 20 \
        -H "Authorization: Bearer $API_KEY" \
        -H "X-Z-AI-From: Z" \
        -H "X-Chat-Id: $CHAT_ID" \
        -H "X-User-Id: $USER_ID" \
        -H "X-Token: $TOKEN" \
        "$API/async-result?id=$TASK_ID" 2>/dev/null)
    
    STATUS=$(python3 -c "import json; d=json.load(open('$STATUS_FILE')); print(d.get('task_status','?'))" 2>/dev/null)
    echo -n "Scene $NUM: HTTP=$HTTP_CODE $STATUS"
    
    if [ "$STATUS" = "SUCCESS" ]; then
        URL=$(python3 -c "import json; d=json.load(open('$STATUS_FILE')); vr=d.get('video_result',[]); print(vr[0].get('url','') if vr else d.get('video_url',''))" 2>/dev/null)
        if [ -n "$URL" ]; then
            curl -sL --connect-timeout 10 --max-time 60 -o "$VIDEO_FILE" "$URL"
            echo " -> DOWNLOADED ($(du -h "$VIDEO_FILE" | cut -f1))"
        else
            echo " -> No URL"
        fi
    else
        echo ""
    fi
    sleep 1
done

# Submit 28-30
for i in 28 29 30; do
    NUM=$(printf "%02d" $i)
    TASK_FILE="$VIDEOS/task_${NUM}.json"
    [ -f "$TASK_FILE" ] && TASK_ID=$(python3 -c "import json; d=json.load(open('$TASK_FILE')); print(d.get('id',''))" 2>/dev/null) && [ -n "$TASK_ID" ] && continue
    
    SCENES=$(python3 -c "import json; scenes=json.load(open('$BASE/scenes.json')); print(scenes[$i-1]['video_prompt'])")
    echo "Submitting $NUM..."
    HTTP_CODE=$(curl -s -o "$TASK_FILE" -w "%{http_code}" --connect-timeout 10 --max-time 20 \
        -X POST \
        -H "Authorization: Bearer $API_KEY" \
        -H "X-Z-AI-From: Z" \
        -H "X-Chat-Id: $CHAT_ID" \
        -H "X-User-Id: $USER_ID" \
        -H "X-Token: $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"prompt\":\"$SCENES\",\"duration\":10,\"fps\":30}" \
        "$API/videos/generations" 2>/dev/null)
    echo "  HTTP=$HTTP_CODE"
    sleep 3
done

echo ""
echo "=== RESULT ==="
echo "Downloaded: $(ls "$VIDEOS"/scene_*.mp4 2>/dev/null | wc -l)/30"