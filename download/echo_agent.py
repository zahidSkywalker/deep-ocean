"""
ECHO AGENT — Python bridge for any chat app → your Vercel API → AI response
Uses z-ai-web-dev-sdk running on Vercel (FREE, no external API key needed)

Requirements: pip install discord.py requests
"""

import os
import requests
import asyncio

# ═════════════════════════════════════════════════════
#  CONFIGURATION
# ═════════════════════════════════════════════════════

# Your Vercel API endpoint (deployed from the workspace)
API_URL = os.getenv("ECHO_API_URL", "https://nctb-physics-lab.vercel.app/api/chat")

# The secret token that authenticates your agent
API_TOKEN = os.getenv("ECHO_AGENT_TOKEN", "echo-agent-ded88850c74e66049b708806b9f9adccaa5879e249033a39")

# Discord bot token (from Discord Developer Portal)
DISCORD_TOKEN = os.getenv("DISCORD_BOT_TOKEN", "")

# Optional: system prompt to define the AI's personality
SYSTEM_PROMPT = os.getenv("ECHO_SYSTEM_PROMPT", 
    "You are Echo, a helpful and knowledgeable AI assistant. "
    "You respond concisely and accurately. You have access to real-time information."
)

# Conversation memory: how many messages to remember per channel/user
MAX_HISTORY = 20


# ═════════════════════════════════════════════════════
#  API COMMUNICATION
# ═════════════════════════════════════════════════════

def call_echo_api(message: str, history: list[dict] = None) -> str:
    """Send a message to the Vercel API and get AI response."""
    payload = {
        "message": message,
        "system_prompt": SYSTEM_PROMPT,
        "conversation_history": history[-MAX_HISTORY:] if history else [],
        "max_tokens": 2048,
        "temperature": 0.7,
    }

    try:
        resp = requests.post(
            API_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {API_TOKEN}",
                "Content-Type": "application/json",
            },
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()

        if data.get("success"):
            return data["response"]
        else:
            return f"⚠ API error: {data.get('error', 'Unknown')}"
    except requests.exceptions.Timeout:
        return "⏱ Request timed out. Try again."
    except requests.exceptions.ConnectionError:
        return "🔌 Cannot reach the API. Check your connection."
    except Exception as e:
        return f"❌ Error: {e}"


# ═════════════════════════════════════════════════════
#  DISCORD BOT
# ═════════════════════════════════════════════════════

# In-memory conversation history per channel
conversations: dict[str, list[dict]] = {}

try:
    import discord
    from discord.ext import commands

    intents = discord.Intents.default()
    intents.message_content = True
    bot = commands.Bot(command_prefix="!", intents=intents)

    @bot.event
    async def on_ready():
        print(f"✅ Echo Agent online as {bot.user}")
        activity = discord.Activity(
            type=discord.ActivityType.listening, 
            name="your messages"
        )
        await bot.change_presence(activity=activity)

    @bot.event
    async def on_message(message: discord.Message):
        # Ignore own messages and bot messages
        if message.author.bot:
            return

        # Only respond if mentioned or in DM
        is_dm = isinstance(message.channel, discord.DMChannel)
        is_mentioned = bot.user in message.mentions

        if not is_dm and not is_mentioned:
            return

        # Show typing indicator
        async with message.channel.typing():
            # Get or create conversation history
            key = str(message.channel.id)
            if key not in conversations:
                conversations[key] = []

            # Add user message to history
            conversations[key].append({
                "role": "user",
                "content": message.content
            })

            # Call the API
            response = call_echo_api(message.content, conversations[key])

            # Add response to history
            conversations[key].append({
                "role": "assistant",
                "content": response
            })

            # Trim history
            if len(conversations[key]) > MAX_HISTORY * 2:
                conversations[key] = conversations[key][-MAX_HISTORY:]

            # Send response (split if too long for Discord's 2000 char limit)
            if len(response) <= 2000:
                await message.reply(response)
            else:
                chunks = [response[i:i+1900] for i in range(0, len(response), 1900)]
                for chunk in chunks:
                    await message.reply(chunk)
                    await asyncio.sleep(0.3)

    # ── Commands ──

    @bot.command()
    async def ping(ctx):
        """Check if the agent is alive."""
        latency = round(bot.latency * 1000)
        await ctx.send(f"🏓 Pong! Latency: {latency}ms")

    @bot.command()
    async def forget(ctx):
        """Clear conversation history for this channel."""
        key = str(ctx.channel.id)
        conversations.pop(key, None)
        await ctx.send("🧠 Memory cleared for this channel.")

    @bot.command()
    async def status(ctx):
        """Check API health."""
        try:
            resp = requests.get(API_URL, timeout=10)
            data = resp.json()
            await ctx.send(f"✅ API Status: {data.get('status', 'unknown')}")
        except Exception as e:
            await ctx.send(f"❌ API unreachable: {e}")

except ImportError:
    print("⚠ discord.py not installed. Install with: pip install discord.py")
    print("   You can still use the call_echo_api() function directly.")
    discord = None


# ═════════════════════════════════════════════════════
#  TELEGRAM BRIDGE (alternative example)
# ═════════════════════════════════════════════════════

def telegram_webhook_handler(update: dict) -> dict:
    """
    Example handler for Telegram Bot API webhook.
    Pass this to your Telegram bot framework.
    """
    chat_id = update["message"]["chat"]["id"]
    user_text = update["message"]["text"]

    # Get history for this chat
    key = f"tg_{chat_id}"
    if key not in conversations:
        conversations[key] = []

    conversations[key].append({"role": "user", "content": user_text})

    response = call_echo_api(user_text, conversations[key])

    conversations[key].append({"role": "assistant", "content": response})

    return {
        "method": "sendMessage",
        "chat_id": chat_id,
        "text": response,
        "parse_mode": "Markdown",
    }


# ═════════════════════════════════════════════════════
#  GENERIC BRIDGE (for WhatsApp, Slack, custom apps)
# ═════════════════════════════════════════════════════

class EchoBridge:
    """
    Generic bridge class for any chat platform.
    Implement send_message() and on_receive() for your platform.
    """

    def __init__(self, name: str = "generic"):
        self.name = name
        self.history: dict[str, list[dict]] = {}

    def process_message(self, chat_id: str, user_message: str) -> str:
        """Process an incoming message and return AI response."""
        if chat_id not in self.history:
            self.history[chat_id] = []

        self.history[chat_id].append({
            "role": "user",
            "content": user_message
        })

        response = call_echo_api(user_message, self.history[chat_id])

        self.history[chat_id].append({
            "role": "assistant",
            "content": response
        })

        return response

    def clear_history(self, chat_id: str):
        """Clear conversation history for a chat."""
        self.history.pop(chat_id, None)

    # Override these in your subclass:
    async def send_message(self, chat_id: str, text: str):
        """Send a message back to the chat platform."""
        raise NotImplementedError("Implement send_message() for your platform")

    async def on_receive(self, chat_id: str, message: str):
        """Handle incoming message from chat platform."""
        response = self.process_message(chat_id, message)
        await self.send_message(chat_id, response)


# ═════════════════════════════════════════════════════
#  MAIN
# ═════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 50)
    print("  ECHO AGENT v1.0")
    print("  API:", API_URL)
    print("=" * 50)

    if DISCORD_TOKEN and discord:
        print("🚀 Starting Discord bot...")
        bot.run(DISCORD_TOKEN)
    else:
        print("⚠ No DISCORD_BOT_TOKEN set. Running in CLI mode.")
        print("   Type messages to test the API (or Ctrl+C to quit)")
        print()

        bridge = EchoBridge("cli")

        while True:
            try:
                user_input = input("You: ").strip()
                if not user_input:
                    continue
                if user_input.lower() in ("quit", "exit", "q"):
                    break

                response = bridge.process_message("cli", user_input)
                print(f"\nEcho: {response}\n")
            except (KeyboardInterrupt, EOFError):
                break
