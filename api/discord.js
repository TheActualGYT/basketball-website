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

  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: "Bearer " + token.access_token }
  });
  const user = await userRes.json();
  if (!user.id) {
    res.status(401).json({ error: "Could not read the Discord account" });
    return;
  }

  res.status(200).json({
    id: user.id,
    username: user.username,
    name: user.global_name || user.username,
    avatar: user.avatar
  });
}
