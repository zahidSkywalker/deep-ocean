import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
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

    const contentType = request.headers.get('content-type') || '';
    let message: string;
    let imageFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      // Handle multipart form-data with potential image
      const formData = await request.formData();
      message = (formData.get('message') as string) || '';
      imageFile = formData.get('file') as File | null;
    } else {
      // Handle JSON
      const body = await request.json();
      message = body.message || '';
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    const headers: HeadersInit = {
      Authorization: token,
    };

    let discordRes: Response;

    if (imageFile && imageFile.size > 0) {
      // Send as multipart/form-data to Discord with attachment
      const discordFormData = new FormData();
      discordFormData.append(
        'payload_json',
        JSON.stringify({
          content: `<@${echoUserId}> ${message.trim()}`,
        })
      );
      discordFormData.append('files[0]', imageFile, imageFile.name || 'image.png');

      discordRes = await fetch(`${apiBase}/channels/${channelId}/messages`, {
        method: 'POST',
        headers,
        body: discordFormData,
      });
    } else {
      // Send as JSON
      headers['Content-Type'] = 'application/json';
      discordRes = await fetch(`${apiBase}/channels/${channelId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: `<@${echoUserId}> ${message.trim()}`,
        }),
      });
    }

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