import { readFileSync } from "fs";
import { join } from "path";

function readJson(name) {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), name), "utf8"));
  } catch (err) {
    return { players: [] };
  }
}

export default function handler(req, res) {
  const signed = readJson("free-agents.json");
  const registry = readJson("registrations.json");
  const taken = new Set();
  (registry.players || []).forEach(function (player) {
    if (!player.team) return;
    if (player.id) taken.add(String(player.id));
    if (player.username) taken.add(String(player.username).toLowerCase());
  });
  const filePlayers = Array.isArray(signed.players) ? signed.players : [];
  const players = filePlayers.filter(function (player) {
    if (player.id && taken.has(String(player.id))) return false;
    if (player.username && taken.has(String(player.username).toLowerCase())) return false;
    return true;
  });
  res.status(200).json({ players: players });
}
