const GUILD_ID = "951651826418208838";
const INVITE_CODE = "36FHef566k";
const INVITE = "https://discord.gg/36FHef566k";

function userCookie(user) {
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    username: user.username,
    name: user.global_name || user.username
  })).toString("base64");
  return "jba_user=" + payload + "; Path=/; Max-Age=2592000; SameSite=Lax; Secure";
}

function clearCookie() {
  return "jba_user=; Path=/; Max-Age=0; SameSite=Lax; Secure";
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

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
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
  if (!token.access_token) {
    res.status(401).json({ error: "Discord did not accept the login" });
    return;
  }

  const auth = { Authorization: "Bearer " + token.access_token };
  const userRes = await fetch("https://discord.com/api/v10/users/@me", { headers: auth });
  const user = await userRes.json();
  if (!user.id) {
    res.status(401).json({ error: "Could not read the Discord account" });
    return;
  }

  let targetId = GUILD_ID;
  try {
    const inviteRes = await fetch("https://discord.com/api/v10/invites/" + INVITE_CODE);
    const invite = await inviteRes.json();
    if (invite.guild && invite.guild.id) targetId = String(invite.guild.id);
  } catch (err) {}

  const guilds = [];
  let after = "";
  for (let page = 0; page < 10; page += 1) {
    const url = new URL("https://discord.com/api/v10/users/@me/guilds");
    url.searchParams.set("limit", "200");
    if (after) url.searchParams.set("after", after);
    const guildRes = await fetch(url, { headers: auth });
    const batch = await guildRes.json();
    if (!guildRes.ok || !Array.isArray(batch)) {
      const detail = batch && batch.message ? "Discord: " + batch.message : "Discord did not share your server list. Approve login again.";
      res.setHeader("Set-Cookie", clearCookie());
      res.status(401).json({ error: detail });
      return;
    }
    guilds.push(...batch);
    if (batch.length < 200) break;
    after = String(batch[batch.length - 1].id);
  }

  const member = guilds.some(function (guild) {
    const name = guild.name || "";
    return String(guild.id) === targetId || /jba/i.test(name);
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
    avatar: user.avatar
  };
  res.setHeader("Set-Cookie", userCookie(user));
  res.status(200).json(profile);
}
