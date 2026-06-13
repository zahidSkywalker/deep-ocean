'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Dice5, Download, Trash2, Image as ImageIcon, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

const RESOLUTIONS = [
  { label: '512 × 512', value: '512x512' },
  { label: '512 × 768', value: '512x768' },
  { label: '768 × 512', value: '768x512' },
  { label: '768 × 768', value: '768x768' },
];

const RANDOM_PROMPTS = [
  "A serene Japanese garden with cherry blossoms and a koi pond at golden hour",
  "A cyberpunk street market in neo-Tokyo, neon signs reflecting in puddles",
  "An ancient library with floating books and magical glowing particles",
  "A cozy cabin in a snowy mountain forest, warm light from windows",
  "An underwater coral city with bioluminescent sea creatures",
  "A steampunk airship flying over a Victorian city at sunset",
  "A mystical forest path with glowing mushrooms and fireflies",
  "A futuristic space station interior with a view of Earth",
  "A medieval castle on a floating island above the clouds",
  "A vibrant street art alley in a tropical city during rainfall",
  "A crystal cave with prismatic light reflections and underground lake",
  "A robot artist painting a masterpiece in a sunlit studio",
];

interface HistoryItem {
  url: string;
  prompt: string;
  resolution: string;
  timestamp: number;
}

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState('768x768');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const triggerGeneration = useCallback(async (promptText: string, res: string) => {
    if (!promptText.trim()) return;

    setIsGenerating(true);
    setCurrentImage(null);
    setError(null);
    setCurrentPrompt(promptText);
    setElapsedTime(0);

    // Timer for elapsed time display
    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      const response = await fetch('/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText.trim(), resolution: res }),
      });

      const data = await response.json();

      if (data.success && data.dataUrl) {
        setCurrentImage(data.dataUrl);
        setHistory(prev => [{
          url: data.dataUrl,
          prompt: promptText.trim(),
          resolution: res,
          timestamp: Date.now(),
        }, ...prev].slice(0, 50));
      } else {
        setError(data.error || 'Generation failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      clearInterval(timer);
      setIsGenerating(false);
    }
  }, []);

  const handleGenerate = () => {
    triggerGeneration(prompt, resolution);
  };

  const handleRandom = () => {
    const randomPrompt = RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];
    setPrompt(randomPrompt);
    triggerGeneration(randomPrompt, resolution);
  };

  const handleDownload = () => {
    if (!currentImage) return;
    const a = document.createElement('a');
    a.href = currentImage;
    a.download = `ai-photo-${Date.now()}.png`;
    a.click();
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const handleHistoryClick = (item: HistoryItem) => {
    setCurrentImage(item.url);
    setCurrentPrompt(item.prompt);
    setPrompt(item.prompt);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleGenerate();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-800/60 bg-neutral-950/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-neutral-100 leading-tight">AI Photo Generator</h1>
              <p className="text-xs text-neutral-500">Powered by Perchance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="text-neutral-400 hover:text-neutral-100"
            >
              Settings
              {showSettings ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="text-neutral-400 hover:text-neutral-100 relative"
            >
              History
              {history.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-violet-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {history.length > 9 ? '9+' : history.length}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Prompt Input */}
        <div className="space-y-3 animate-fade-in">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the image you want to create... (Ctrl+Enter to generate)"
            className="min-h-[100px] bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-600 resize-none text-base focus:ring-violet-500/50 focus:border-violet-500/50 rounded-xl p-4"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-violet-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate'}
            </Button>
            <Button
              onClick={handleRandom}
              disabled={isGenerating}
              variant="outline"
              className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 rounded-xl px-4 py-2.5"
            >
              <Dice5 className="w-4 h-4 mr-2" />
              Surprise Me
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 animate-fade-in">
            <h3 className="text-sm font-semibold text-neutral-300 mb-3">Generation Settings</h3>
            <div className="flex flex-wrap gap-2">
              {RESOLUTIONS.map((res) => (
                <button
                  key={res.value}
                  onClick={() => setResolution(res.value)}
                  className={`px-4 py-2 text-sm rounded-lg border transition-all duration-150 ${
                    resolution === res.value
                      ? 'bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-500/20'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600'
                  }`}
                >
                  {res.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && !isGenerating && (
          <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-red-300 text-sm font-medium">Generation Failed</p>
              <p className="text-red-400/70 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Image Output Area */}
        <div className="relative w-full aspect-square max-w-[768px] mx-auto">
          {/* Placeholder */}
          {!currentImage && !isGenerating && !error && (
            <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-neutral-800 flex flex-col items-center justify-center text-neutral-600">
              <ImageIcon className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">Your masterpiece awaits...</p>
              <p className="text-sm mt-1 opacity-60">Enter a prompt and hit Generate</p>
            </div>
          )}

          {/* Loading State */}
          {isGenerating && (
            <div className="absolute inset-0 rounded-2xl bg-neutral-900 flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-neutral-800 border-t-violet-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-violet-400" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-neutral-300 font-medium">Creating your image...</p>
                <p className="text-sm text-neutral-500 mt-1">
                  Elapsed: {formatTime(elapsedTime)}
                </p>
              </div>
              <div className="w-48 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-500 rounded-full shimmer-bg" style={{ width: '60%' }} />
              </div>
              <p className="text-xs text-neutral-600">AI image generation typically takes 30-90 seconds</p>
            </div>
          )}

          {/* Generated Image */}
          {currentImage && !isGenerating && (
            <div className="animate-fade-in">
              <img
                src={currentImage}
                alt={currentPrompt || 'AI generated image'}
                className="w-full h-full object-contain rounded-2xl shadow-2xl shadow-black/50"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        {currentImage && !isGenerating && (
          <div className="flex justify-center gap-3 animate-fade-in">
            <Button
              onClick={handleDownload}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={handleGenerate}
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium px-6 py-2.5 rounded-xl border border-neutral-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
          </div>
        )}

        {/* Current prompt display */}
        {currentPrompt && !isGenerating && currentImage && (
          <div className="text-center max-w-lg mx-auto">
            <p className="text-sm text-neutral-500 italic">&ldquo;{currentPrompt}&rdquo;</p>
          </div>
        )}

        {/* History Section */}
        {showHistory && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-neutral-300">
                Session History ({history.length})
              </h3>
              {history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearHistory}
                  className="text-neutral-500 hover:text-red-400 text-xs"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            {history.length === 0 ? (
              <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-8 text-center text-neutral-600 text-sm">
                No images generated yet
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {history.map((item, idx) => (
                  <button
                    key={item.timestamp + '-' + idx}
                    onClick={() => handleHistoryClick(item)}
                    className="group relative aspect-square rounded-lg overflow-hidden border border-neutral-800 hover:border-violet-500/50 transition-all duration-150 hover:scale-[1.03] hover:shadow-lg hover:shadow-violet-500/10"
                  >
                    <img
                      src={item.url}
                      alt={item.prompt}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <div className="absolute bottom-0 left-0 right-0 p-1.5">
                        <p className="text-[10px] text-white/80 line-clamp-2 leading-tight">{item.prompt}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="h-8" />
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-neutral-800/40 bg-neutral-950/60">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center text-xs text-neutral-600">
          AI Photo Generator &mdash; Images generated using Perchance AI
        </div>
      </footer>
    </div>
  );
}