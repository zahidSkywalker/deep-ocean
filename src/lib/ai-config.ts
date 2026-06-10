export const AI_CONFIG = {
  baseUrl: 'https://api.routeway.ai/v1',
  apiKey: 'sk-YaEYDUgSqgx6Ggo6mpWA2OCEQCSjoWgXE-RNJ6K82HGvQUCpMZzCWhE',
  defaultModel: 'gemma-4-31b-it:free',
  models: [
    { id: 'gemma-4-31b-it:free', name: 'Gemma 4 31B IT', description: "Google's latest Gemma instruction-tuned model" },
    { id: 'gpt-4o-mini:free', name: 'GPT-4o Mini', description: "OpenAI's efficient and fast model" },
    { id: 'llama-3.3-70b:free', name: 'Llama 3.3 70B', description: "Meta's powerful open-source model" },
    { id: 'deepseek-chat:free', name: 'DeepSeek Chat', description: "DeepSeek's intelligent chat model" },
    { id: 'mistral-small-24b:free', name: 'Mistral Small 24B', description: "Mistral's compact yet capable model" },
  ],
};

export const EXAMPLE_PROMPTS = [
  {
    icon: '💡',
    title: 'Explain a concept',
    text: 'Explain quantum computing in simple terms',
  },
  {
    icon: '💻',
    title: 'Write some code',
    text: 'Write a Python function that sorts a list using merge sort',
  },
  {
    icon: '📐',
    title: 'Best practices',
    text: 'What are the best practices for designing REST APIs?',
  },
  {
    icon: '🚀',
    title: 'Brainstorm ideas',
    text: 'Help me brainstorm a startup idea in the AI space',
  },
];
