const GUILD_ID = "951651826418208838";
const INVITE = "https://discord.gg/36FHef566k";

function userCookie(user) {
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    username: user.username,
    name: user.global_name || user.username,
    avatar: user.avatar || "",
    serverChecked: true,
    checkedAt: Date.now()
  })).toString("base64");
  return "jba_user=" + encodeURIComponent(payload) + "; Path=/; Max-Age=2592000; SameSite=Lax; Secure";
}

function clearCookie() {
  return "jba_user=; Path=/; Max-Age=0; SameSite=Lax; Secure";
}

function wait(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

async function discordFetch(url, options) {
  let res = await fetch(url, options);
  if (res.status !== 429) return res;
  let body = {};
  try { body = await res.json(); } catch (err) {}
  const retry = Math.min(Number(body.retry_after) || 1, 2);
  await wait(retry * 1000);
  res = await fetch(url, options);
  return res;
}

export default async function handler(req, res) {
  const code = req.query.code;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!code) {
    res.status(400).json({ error: "Missing Discord code" });
    return;
  }
  if (!clientId || !clientSecret || !redirectUri) {
    res.status(500).json({ error: "Discord app credentials are not set" });
    return;
  }

  const tokenRes = await discordFetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code: String(code),
      redirect_uri: redirectUri
    })
  });
  const token = await tokenRes.json();
  if (tokenRes.status === 429 || (token && /rate limited/i.test(token.message || ""))) {
    res.status(429).json({ error: "Discord is rate limiting logins. Wait a minute, then try again." });
    return;
  }
  if (!token.access_token) {
    res.status(401).json({ error: "Discord did not accept the login" });
    return;
  }

  const auth = { Authorization: "Bearer " + token.access_token };
  const userRes = await discordFetch("https://discord.com/api/v10/users/@me", { headers: auth });
  const user = await userRes.json();
  if (userRes.status === 429 || (user && /rate limited/i.test(user.message || ""))) {
    res.status(429).json({ error: "Discord is rate limiting logins. Wait a minute, then try again." });
    return;
  }
  if (!user.id) {
    res.status(401).json({ error: "Could not read the Discord account" });
    return;
  }

  const guildRes = await discordFetch("https://discord.com/api/v10/users/@me/guilds?limit=200", { headers: auth });
  let guilds = [];
  try { guilds = await guildRes.json(); } catch (err) {}
  if (guildRes.status === 429 || (guilds && /rate limited/i.test(guilds.message || ""))) {
    res.status(429).json({ error: "Discord is rate limiting logins. Wait a minute, then try again." });
    return;
  }
  if (!guildRes.ok || !Array.isArray(guilds)) {
    res.status(401).json({ error: "Discord did not share your server list. Try again in a minute." });
    return;
  }

  const member = guilds.some(function (guild) {
    return String(guild.id) === GUILD_ID;
  });
  if (!member) {
    res.setHeader("Set-Cookie", clearCookie());
    res.status(200).json({
      needsJoin: true,
      invite: INVITE,
      name: user.global_name || user.username
    });
    return;
  }

  const profile = {
    needsJoin: false,
    id: user.id,
    username: user.username,
    name: user.global_name || user.username,
    avatar: user.avatar,
    serverChecked: true,
    checkedAt: Date.now()
  };
  res.setHeader("Set-Cookie", userCookie(user));
  res.status(200).json(profile);
}