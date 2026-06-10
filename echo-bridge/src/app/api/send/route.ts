import { NextRequest, NextResponse } from 'next/server';
import { config, getDiscordHeaders } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    const token = config.discord.userToken;
    const channelId = config.discord.channelId;
    const echoUserId = config.discord.echoUserId;
    const apiBase = config.discord.apiBase;

    // Validate token is configured
    if (!token || token === 'placeholder_your_discord_user_token_here') {
      return NextResponse.json(
        { success: false, error: 'Discord token is not configured on the server' },
        { status: 500 }
      );
    }

    // Post message to Discord channel, tagging Echo
    const discordRes = await fetch(`${apiBase}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: getDiscordHeaders(),
      body: JSON.stringify({
        content: `<@${echoUserId}> ${message.trim()}`,
      }),
    });

    if (!discordRes.ok) {
      const errorText = await discordRes.text();
      console.error(`Discord API error (${discordRes.status}): ${errorText}`);
      return NextResponse.json(
        { success: false, error: `Discord API returned ${discordRes.status}` },
        { status: 502 }
      );
    }

    const discordData = await discordRes.json();

    return NextResponse.json({
      success: true,
      messageId: discordData.id,
      snowflake: discordData.id,
    });
  } catch (error) {
    console.error('Send API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
