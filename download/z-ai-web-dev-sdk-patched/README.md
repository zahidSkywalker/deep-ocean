# z-ai-web-dev-sdk (Patched for External Use)

This is a patched version of the Z.ai SDK that works from **anywhere on the internet** — 
not just from inside Z.ai's sandbox.

## How it works

The original SDK calls `internal-api.z.ai` which is a private network endpoint.
This patched version redirects all calls through the **Z.ai sandbox's public URL**, 
which acts as a transparent proxy:

```
Your App → patched SDK → Sandbox (space-z.ai) → internal-api.z.ai → AI Response
```

## Quick Start

### 1. Install
```bash
npm install ./z-ai-web-dev-sdk-patched
# or copy the folder into node_modules
```

### 2. Place the config file
Copy `.z-ai-config` to your project root:
```bash
cp .z-ai-config /your-project/.z-ai-config
```

### 3. Use it
```javascript
import ZAI from 'z-ai-web-dev-sdk';

const zai = await ZAI.create();
const completion = await zai.chat.completions.create({
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' }
  ],
  max_tokens: 2048,
  temperature: 0.7,
});

console.log(completion.choices[0].message.content);
```

## Python Usage
```python
import requests

response = requests.post(
    "https://preview-chat-acadc303-8ae6-4875-8ab4-f30b09e70a1e.space-z.ai/api/chat/completions",
    headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer Z.ai",
        "X-Chat-Id": "chat-acadc303-8ae6-4875-8ab4-f30b09e70a1e",
        "X-User-Id": "0abec177-cf05-4841-b837-33d8922c5058",
        "X-Token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "X-Z-AI-From": "Z"
    },
    json={
        "messages": [{"role": "user", "content": "Hello!"}],
        "max_tokens": 100
    }
)
print(response.json()["choices"][0]["message"]["content"])
```

## Important Notes

- The sandbox URL (`preview-chat-*.space-z.ai`) may change if the session resets
- If it stops working, the sandbox needs to be re-activated (just send a message to Echo on Discord)
- This uses Z.ai's internal AI — no external API key or payment needed
- All SDK features work: chat, vision, TTS, ASR, image generation, video, functions

## File Structure
```
z-ai-web-dev-sdk-patched/
├── .z-ai-config     ← Put this in your project root
├── dist/
│   ├── index.js      ← Patched SDK (same API as original)
│   └── index.d.ts    ← TypeScript types
├── README.md         ← This file
└── package.json
```
