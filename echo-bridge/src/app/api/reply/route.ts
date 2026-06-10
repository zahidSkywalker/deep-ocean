import { NextRequest, NextResponse } from 'next/server';
import { config, getDiscordHeaders } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const after = searchParams.get('after');

    if (!after || after === '0') {
      // Just a connectivity check — return empty
      return NextResponse.json({ reply: null });
    }

    const token = config.discord.userToken;
    const channelId = config.discord.channelId;
    const echoUserId = config.discord.echoUserId;
    const apiBase = config.discord.apiBase;

    // Validate token is configured
    if (!token || token === 'placeholder_your_discord_user_token_here') {
      return NextResponse.json(
        { reply: null, error: 'Discord token is not configured' },
        { status: 500 }
      );
    }

    // Fetch recent messages from Discord channel after the given message ID
    const discordRes = await fetch(
      `${apiBase}/channels/${channelId}/messages?after=${after}&limit=10`,
      {
        method: 'GET',
        headers: getDiscordHeaders(),
      }
    );

    if (!discordRes.ok) {
      console.error(`Discord API error (${discordRes.status}): ${await discordRes.text()}`);
      return NextResponse.json(
        { reply: null, error: `Discord API returned ${discordRes.status}` },
        { status: 502 }
      );
    }

    const messages: Array<{
      id: string;
      author: { id: string };
      content: string;
      timestamp: string;
    }> = await discordRes.json();

    // Discord returns messages in descending order (newest first).
    // We need to find the earliest message from Echo (oldest first).
    const echoMessages = messages
      .filter((msg) => msg.author.id === echoUserId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (echoMessages.length > 0) {
      return NextResponse.json({
        reply: echoMessages[0].content,
        messageId: echoMessages[0].id,
      });
    }

    return NextResponse.json({ reply: null });
  } catch (error) {
    console.error('Reply API error:', error);
    return NextResponse.json(
      { reply: null, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
