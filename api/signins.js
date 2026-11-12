const STORE = "https://crudcrud.com/api/b29e66e7e94d4f3e8d0977131f5bbdd6/signins";

function clean(player) {
  return {
    id: String(player.id || ""),
    username: player.username || "",
    name: player.name || player.username || "",
    avatar: player.avatar || "",
    roblox: player.roblox || "",
    build: player.build || "",
    notPlayer: !!player.notPlayer,
    status: player.status || "Free Agent",
    connectedAt: Number(player.connectedAt) || Date.now(),
    createdAt: Number(player.createdAt) || Number(player.connectedAt) || Date.now()
  };
}

async function readAll() {
  const res = await fetch(STORE);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const players = await readAll();
      res.status(200).json({ players: players.map(clean) });
    } catch (err) {
      res.status(200).json({ players: [] });
    }
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const next = clean(body);
  if (!next.id || !(next.username || next.name) || !((next.roblox && next.build) || next.notPlayer)) {
    res.status(400).json({ error: "A finished login needs Discord plus Roblox and build, or Not a Player." });
    return;
  }

  try {
    const players = await readAll();
    const existing = players.find(function (player) { return String(player.id) === next.id; });
    if (existing) {
      next.createdAt = Number(existing.createdAt) || next.createdAt;
      next.status = existing.status || next.status;
      const update = await fetch(STORE + "/" + existing._id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next)
      });
      if (!update.ok) throw new Error("Could not update that sign-in");
    } else {
      const create = await fetch(STORE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next)
      });
      if (!create.ok) throw new Error("Could not save that sign-in");
    }
    res.status(200).json({ ok: true, player: next });
  } catch (err) {
    res.status(500).json({ error: "Could not save that sign-in" });
  }
}
