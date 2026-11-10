function avatarUrl(id, hash) {
  if (!hash) {
    try {
      const index = Number((BigInt(id) >> 22n) % 6n);
      return "https://cdn.discordapp.com/embed/avatars/" + index + ".png";
    } catch (err) {
      return "https://cdn.discordapp.com/embed/avatars/0.png";
    }
  }
  const ext = String(hash).indexOf("a_") === 0 ? "gif" : "png";
  return "https://cdn.discordapp.com/avatars/" + id + "/" + hash + "." + ext + "?size=128";
}

async function lookup(id) {
  const response = await fetch("https://japi.rest/discord/v1/user/" + id);
  if (!response.ok) return "";
  const body = await response.json();
  const user = body && body.data ? body.data : body;
  if (!user || String(user.id) !== id) return "";
  return avatarUrl(id, user.avatar || "");
}

export default async function handler(req, res) {
  const ids = String(req.query.ids || "")
    .split(",")
    .map(function (id) { return id.trim(); })
    .filter(function (id) { return /^\d{15,22}$/.test(id); })
    .slice(0, 25);

  const avatars = {};
  await Promise.all(ids.map(async function (id) {
    try {
      const url = await lookup(id);
      if (url) avatars[id] = url;
    } catch (err) {}
  }));

  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=120");
  res.status(200).json({ avatars: avatars });
}
