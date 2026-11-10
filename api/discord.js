const GUILD_ID = "951651826418208838";
const INVITE = "https://discord.gg/36FHef566k";

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

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri
    })
  });
  const token = await tokenRes.json();
  if (!token.access_token) {
    res.status(401).json({ error: "Discord did not accept the login" });
    return;
  }

  const auth = { Authorization: "Bearer " + token.access_token };
  const userRes = await fetch("https://discord.com/api/users/@me", { headers: auth });
  const user = await userRes.json();
  if (!user.id) {
    res.status(401).json({ error: "Could not read the Discord account" });
    return;
  }

  const guilds = [];
  let after = "";
  for (let page = 0; page < 10; page += 1) {
    const url = new URL("https://discord.com/api/v10/users/@me/guilds");
    url.searchParams.set("limit", "200");
    if (after) url.searchParams.set("after", after);
    const guildRes = await fetch(url, { headers: auth });
    const batch = await guildRes.json();
    if (!guildRes.ok || !Array.isArray(batch)) {
      res.status(401).json({ error: "Discord did not share your server list. Approve login again." });
      return;
    }
    guilds.push(...batch);
    if (batch.length < 200) break;
    after = String(batch[batch.length - 1].id);
  }

  const member = guilds.some((guild) => String(guild.id) === GUILD_ID);
  if (!member) {
    res.status(200).json({
      needsJoin: true,
      invite: INVITE,
      name: user.global_name || user.username
    });
    return;
  }

  res.status(200).json({
    needsJoin: false,
    id: user.id,
    username: user.username,
    name: user.global_name || user.username,
    avatar: user.avatar
  });
}
