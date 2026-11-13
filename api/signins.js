import { readFileSync } from "fs";
import { join } from "path";

const STORE = "https://crudcrud.com/api/7466a9c4daf84cda937bb941de0af192/signins";

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

function wait(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

async function crud(url, options) {
  const headers = Object.assign({
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0"
  }, (options && options.headers) || {});
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, 2500);
  try {
    const res = await fetch(url, Object.assign({}, options, { headers: headers, signal: controller.signal }));
    if (res.ok) return { ok: true, res: res };
    return { ok: false, res: res, error: "status " + res.status };
  } catch (err) {
    return { ok: false, res: null, error: err && err.message ? err.message : "fetch failed" };
  } finally {
    clearTimeout(timer);
  }
}

function readFilePlayers() {
  try {
    const data = JSON.parse(readFileSync(join(process.cwd(), "signins.json"), "utf8"));
    return Array.isArray(data.players) ? data.players : [];
  } catch (err) {
    return [];
  }
}

async function readAll() {
  const result = await crud(STORE);
  if (!result.ok) return [];
  try {
    const data = await result.res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const remote = await readAll();
      const players = remote.length ? remote : readFilePlayers();
      res.status(200).json({ players: players.map(clean) });
    } catch (err) {
      res.status(200).json({ players: readFilePlayers().map(clean) });
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
  if (!next.id || !(next.username || next.name) || !((next.roblox && next.build) || next.notPlayer)) {
    res.status(400).json({ error: "A finished login needs Discord plus Roblox and build, or Not a Player." });
    return;
  }

  try {
    const players = await readAll();
    const existing = players.find(function (player) { return String(player.id) === next.id; });
    if (existing && existing._id) {
      next.createdAt = Number(existing.createdAt) || next.createdAt;
      next.status = existing.status || next.status;
      const update = await crud(STORE + "/" + existing._id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next)
      });
      if (!update.ok) throw new Error(update.error || "update failed");
    } else {
      const create = await crud(STORE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next)
      });
      if (!create.ok) throw new Error(create.error || "create failed");
    }
    res.status(200).json({ ok: true, player: next });
  } catch (err) {
    res.status(500).json({ error: "Could not save that sign-in", detail: String(err && err.message || err) });
  }
}
