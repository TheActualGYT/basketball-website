const INBOX = "b20203a3-0634-42b2-86e9-ef5b8ac84a40";
const WEBHOOK = "https://webhook.site/" + INBOX;
const REQUESTS = "https://webhook.site/token/" + INBOX + "/requests?sorting=newest&per_page=100";

function clean(player) {
  return {
    id: String(player.id || ""),
    username: player.username || "",
    name: player.name || player.username || "",
    avatar: player.avatar || "",
    roblox: player.roblox || "",
    robloxId: player.robloxId ? String(player.robloxId) : "",
    build: player.build || "",
    notPlayer: !!player.notPlayer,
    status: player.status || "Free Agent",
    connectedAt: Number(player.connectedAt) || Date.now(),
    createdAt: Number(player.createdAt) || Number(player.connectedAt) || Date.now()
  };
}

function isDiscordId(id) {
  return /^\d{17,20}$/.test(String(id || ""));
}

async function callJson(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, 6000);
  try {
    const res = await fetch(url, Object.assign({}, options, { signal: controller.signal }));
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch (err) { data = null; }
    return { ok: res.ok, status: res.status, data: data, text: text };
  } catch (err) {
    return { ok: false, status: 0, data: null, text: err && err.message ? err.message : "fetch failed" };
  } finally {
    clearTimeout(timer);
  }
}

async function readInbox() {
  const result = await callJson(REQUESTS, { headers: { "Accept": "application/json" } });
  const rows = result.data && Array.isArray(result.data.data) ? result.data.data : [];
  const players = [];
  const seen = {};
  rows.forEach(function (row) {
    let body = null;
    try { body = JSON.parse(row.content || ""); } catch (err) { body = null; }
    if (!body || !isDiscordId(body.id) || seen[String(body.id)]) return;
    seen[String(body.id)] = true;
    players.push(clean(body));
  });
  return players;
}

async function refreshRoblox(players) {
  const active = players.filter(function (player) { return player.roblox && !player.notPlayer; });
  if (!active.length) return players;
  const missing = active.filter(function (player) { return !player.robloxId; });
  if (missing.length) {
    const lookup = await callJson("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: missing.map(function (player) { return player.roblox; }), excludeBannedUsers: false })
    });
    const rows = lookup.data && Array.isArray(lookup.data.data) ? lookup.data.data : [];
    missing.forEach(function (player) {
      const found = rows.find(function (user) {
        return String(user.requestedUsername || user.name || "").toLowerCase() === player.roblox.toLowerCase();
      });
      if (!found || !found.id) return;
      player.robloxId = String(found.id);
      if (found.name) player.roblox = found.name;
      player._robloxChanged = true;
    });
  }
  const ids = active.map(function (player) { return Number(player.robloxId); }).filter(function (id) { return id; });
  if (ids.length) {
    const found = await callJson("https://users.roblox.com/v1/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: ids, excludeBannedUsers: false })
    });
    const rows = found.data && Array.isArray(found.data.data) ? found.data.data : [];
    const names = {};
    rows.forEach(function (user) { names[String(user.id)] = user.name; });
    active.forEach(function (player) {
      const name = names[String(player.robloxId)];
      if (!name || name === player.roblox) return;
      player.roblox = name;
      player._robloxChanged = true;
    });
  }
  const changed = active.filter(function (player) { return player._robloxChanged; });
  await Promise.all(changed.map(function (player) {
    const next = Object.assign({}, player);
    delete next._robloxChanged;
    return callJson(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next)
    });
  }));
  players.forEach(function (player) { delete player._robloxChanged; });
  return players;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method === "GET") {
    try {
      let players = await readInbox();
      try { players = await refreshRoblox(players); } catch (err) {}
      res.status(200).json({ players: players });
    } catch (err) {
      res.status(200).json({ players: [] });
    }
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body = req.body;
  if (!body || typeof body === "string") {
    try { body = JSON.parse(body || "{}"); } catch (err) { body = {}; }
  }
  const next = clean(body);
  if (!isDiscordId(next.id) || !(next.username || next.name) || !((next.roblox && next.build) || next.notPlayer)) {
    res.status(400).json({ error: "A finished login needs Discord plus Roblox and build, or Not a Player." });
    return;
  }

  const saved = await callJson(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(next)
  });
  if (!saved.ok) {
    res.status(500).json({ error: "Could not save that sign-in", detail: saved.text.slice(0, 140) });
    return;
  }
  res.status(200).json({ ok: true, player: next });
}
