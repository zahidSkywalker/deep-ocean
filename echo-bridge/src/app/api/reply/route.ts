import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

interface DiscordMessage {
  id: string;
  author: { id: string };
  content: string;
  timestamp: string;
  attachments: Array<{ url: string; filename: string; id: string; size: number }>;
  mentions: Array<{ id: string }>;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const after = searchParams.get('after');

    const token = config.discord.userToken;
    const channelId = config.discord.channelId;
    const echoUserId = config.discord.echoUserId;
    const apiBase = config.discord.apiBase;

    // Validate token is configured
    if (!token || token === 'placeholder_your_discord_user_token_here') {
      return NextResponse.json(
        { messages: [], error: 'Discord token is not configured' },
        { status: 500 }
      );
    }

    // Connectivity check
    if (!after || after === '0') {
      return NextResponse.json({ messages: [] });
    }

    // Fetch recent messages from Discord channel after the given message ID
    const discordRes = await fetch(
      `${apiBase}/channels/${channelId}/messages?after=${after}&limit=50`,
      {
        method: 'GET',
        headers: {
          Authorization: token,
        },
      }
    );

    if (!discordRes.ok) {
      console.error(`Discord API error (${discordRes.status}): ${await discordRes.text()}`);
      return NextResponse.json(
        { messages: [], error: `Discord API returned ${discordRes.status}` },
        { status: 502 }
      );
    }

    const messages: DiscordMessage[] = await discordRes.json();

    // Filter: messages from Echo user OR messages that mention Echo
    const relevantMessages = messages.filter((msg) => {
      const isFromEcho = msg.author.id === echoUserId;
      const mentionsEcho = msg.mentions?.some((m) => m.id === echoUserId);
      return isFromEcho || mentionsEcho;
    });

    // Sort by timestamp ascending (oldest first)
    relevantMessages.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Map to response format
    const mapped = relevantMessages.map((msg) => ({
      id: msg.id,
      authorId: msg.author.id,
      content: msg.content,
      timestamp: msg.timestamp,
      attachments: msg.attachments?.map((a) => ({
        url: a.url,
        filename: a.filename,
      })) || [],
    }));

    return NextResponse.json({ messages: mapped });
  } catch (error) {
    console.error('Reply API error:', error);
    return NextResponse.json(
      { messages: [], error: 'Internal server error' },
      { status: 500 }
    );
  }
}