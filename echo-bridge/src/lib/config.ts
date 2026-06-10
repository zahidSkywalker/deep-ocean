export const config = {
  discord: {
    userToken: process.env.DISCORD_USER_TOKEN || "",
    channelId: process.env.DISCORD_CHANNEL_ID || "1511044432873656412",
    echoUserId: process.env.ECHO_USER_ID || "1503694342634606682",
    apiBase: "https://discord.com/api/v10",
  },
} as const;

export function getDiscordHeaders(): HeadersInit {
  const token = config.discord.userToken;
  if (!token || token === "placeholder_your_discord_user_token_here") {
    throw new Error("DISCORD_USER_TOKEN is not configured");
  }
  return {
    Authorization: token,
    "Content-Type": "application/json",
  };
}
