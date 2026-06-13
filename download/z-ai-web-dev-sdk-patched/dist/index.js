import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// ─── PATCHED: Works from anywhere via public Z.ai sandbox relay ───
// Original SDK calls internal-api.z.ai (private network only).
// This patched version calls the sandbox's public URL instead,
// which acts as a transparent proxy to the internal API.
// ───────────────────────────────────────────────────────────────────

const loadConfig = async () => {
    const homeDir = os.homedir();
    const configPaths = [
        path.join(process.cwd(), '.z-ai-config'),
        path.join(homeDir, '.z-ai-config'),
        '/etc/.z-ai-config'
    ];
    for (const filePath of configPaths) {
        try {
            const configStr = await fs.readFile(filePath, 'utf-8');
            const config = JSON.parse(configStr);
            if (config.baseUrl && config.apiKey) {
                return config;
            }
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                console.error(`Error reading config at ${filePath}:`, error);
            }
        }
    }
    throw new Error('Configuration file not found. Place .z-ai-config in your project root.\nGet it from: https://github.com/zahidSkywalker/echo-agent');
};
class ZAI {
    constructor(config) {
        this.config = config;
        this.chat = {
            completions: {
                create: this.createChatCompletion.bind(this),
                createVision: this.createChatCompletionVision.bind(this),
            },
        };
        this.audio = {
            tts: {
                create: this.createAudioTTS.bind(this),
            },
            asr: {
                create: this.createAudioASR.bind(this),
            },
        };
        this.images = {
            generations: {
                create: this.createImageGeneration.bind(this),
                edit: this.createImageEdit.bind(this),
            },
            search: {
                create: this.createImageSearch.bind(this),
            },
        };
        this.video = {
            generations: {
                create: this.createVideoGeneration.bind(this),
            },
        };
        this.async = {
            result: {
                query: this.queryAsyncResult.bind(this),
            },
        };
        this.functions = {
            invoke: this.invokeFunction.bind(this),
        };
    }
    static async create() {
        const config = await loadConfig();
        return new ZAI(config);
    }

    // ─── PATCHED: Build headers for the relay ───
    buildHeaders(extra = {}) {
        const { apiKey, chatId, userId, token } = this.config;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'X-Z-AI-From': 'Z',
            ...extra,
        };
        if (chatId) headers['X-Chat-Id'] = chatId;
        if (userId) headers['X-User-Id'] = userId;
        if (token) headers['X-Token'] = token;
        return headers;
    }

    async createChatCompletion(body) {
        const { baseUrl } = this.config;
        const url = `${baseUrl}/chat/completions`;
        const requestBody = { ...body, thinking: body.thinking || { type: 'disabled' } };
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this.buildHeaders(),
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
            }
            const contentType = response.headers.get('content-type') || '';
            if (requestBody.stream && (contentType.includes('text/event-stream') || contentType.includes('text/plain'))) {
                return response.body;
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to make API request:', error);
            throw error;
        }
    }

    async createChatCompletionVision(body) {
        const { baseUrl } = this.config;
        const url = `${baseUrl}/chat/completions/vision`;
        const requestBody = { ...body, thinking: body.thinking || { type: 'disabled' } };
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this.buildHeaders(),
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
            }
            const contentType = response.headers.get('content-type') || '';
            if (requestBody.stream && (contentType.includes('text/event-stream') || contentType.includes('text/plain'))) {
                return response.body;
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to make vision API request:', error);
            throw error;
        }
    }

    async createAudioTTS(body) {
        const { baseUrl } = this.config;
        const url = `${baseUrl}/audio/tts`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this.buildHeaders(),
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
            }
            return response;
        } catch (error) {
            console.error('Failed to make TTS API request:', error);
            throw error;
        }
    }

    async createAudioASR(body) {
        const { baseUrl } = this.config;
        const url = `${baseUrl}/audio/asr`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this.buildHeaders(),
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to make ASR API request:', error);
            throw error;
        }
    }

    async createImageGeneration(body) {
        const { baseUrl } = this.config;
        const url = `${baseUrl}/images/generations`;
        const requestBody = { ...body };
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this.buildHeaders(),
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
            }
            const result = await response.json();
            const processedData = await Promise.all(result.data.map(async (item) => {
                if (item.url) {
                    const base64 = await this.downloadImageAsBase64(item.url);
                    return { base64, format: "png" };
                }
                return item;
            }));
            return { ...result, data: processedData };
        } catch (error) {
            console.error('Failed to make image generation request:', error);
            throw error;
        }
    }

    async createImageEdit(body) {
        const { baseUrl } = this.config;
        const url = `${baseUrl}/images/generations/edit`;
        const requestBody = { ...body };
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this.buildHeaders(),
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
            }
            const result = await response.json();
            const processedData = await Promise.all(result.data.map(async (item) => {
                if (item.url) {
                    const base64 = await this.downloadImageAsBase64(item.url);
                    return { base64, format: "png" };
                }
                return item;
            }));
            return { ...result, data: processedData };
        } catch (error) {
            console.error('Failed to make image edit request:', error);
            throw error;
        }
    }

    async createImageSearch(body) {
        const { baseUrl } = this.config;
        const url = `${baseUrl}/images/search`;
        if (!body.query || !body.query.trim()) {
            throw new Error('image search requires a non-empty `query`');
        }
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this.buildHeaders(),
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to make image search request:', error);
            throw error;
        }
    }

    async downloadImageAsBase64(imageUrl) {
        try {
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to download image: ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            return buffer.toString('base64');
        } catch (error) {
            console.error('Failed to download and convert image to base64:', error);
            throw error;
        }
    }

    async createVideoGeneration(body) {
        const { baseUrl } = this.config;
        const url = `${baseUrl}/video/generation`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this.buildHeaders(),
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to make video generation request:', error);
            throw error;
        }
    }

    async queryAsyncResult(taskId) {
        const { baseUrl } = this.config;
        const url = `${baseUrl}/async-result?id=${encodeURIComponent(taskId)}`;
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: this.buildHeaders(),
            });
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to query async result:', error);
            throw error;
        }
    }

    async invokeFunction(function_name, args) {
        const { baseUrl } = this.config;
        const url = `${baseUrl}/functions/invoke`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this.buildHeaders(),
                body: JSON.stringify({ function_name, arguments: args }),
            });
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Function invoke failed with status ${response.status}: ${errorBody}`);
            }
            const result = await response.json();
            return result.result;
        } catch (error) {
            console.error('Failed to invoke remote function:', error);
            throw error;
        }
    }
}
export default ZAI;
