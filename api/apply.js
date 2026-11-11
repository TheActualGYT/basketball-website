import { readFileSync } from "fs";
import { join } from "path";

const TEAMS = [
  "Arizona Wildcats",
  "Baylor Bears",
  "Duke Blue Devils",
  "Florida Gators",
  "Georgia Bulldogs",
  "Houston Cougars",
  "Kansas Jayhawks",
  "Kentucky Wildcats",
  "LSU Tigers",
  "Miami Hurricanes",
  "Michigan Wolverines",
  "North Carolina Tar Heels",
  "Ohio State Buckeyes",
  "Oregon Ducks",
  "UCLA Bruins",
  "Virginia Cavaliers",
  "Random"
];

const lookupCache = new Map();

function readRegistry() {
  try {
    const raw = readFileSync(join(process.cwd(), "registrations.json"), "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.players) ? data.players : [];
  } catch (err) {
    return [];
  }
}

function takenTeams(players) {
  return players.map(function (player) { return player.team; }).filter(Boolean);
}

async function lookupRoblox(username) {
  const key = username.toLowerCase();
  const cached = lookupCache.get(key);
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.user;
  const response = await fetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
  });
  const payload = await response.json();
  const user = payload && payload.data && payload.data[0] ? payload.data[0] : null;
  lookupCache.set(key, { at: Date.now(), user: user });
  return user;
}

export default async function handler(req, res) {
  const players = readRegistry();

  if (req.method === "GET") {
    res.status(200).json({ takenTeams: takenTeams(players) });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Use POST." });
    return;
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const username = String(body.username || "").trim();
  const first = String(body.first || "");
  const second = String(body.second || "");
  const checkOnly = !!body.checkOnly;
  const claimed = takenTeams(players);

  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    res.status(200).json({ ok: false, error: "Enter a real Roblox username. 3 to 20 letters, numbers, or underscores." });
    return;
  }

  if (!checkOnly) {
    if (!TEAMS.includes(first) || !TEAMS.includes(second)) {
      res.status(200).json({ ok: false, error: "Pick a first choice and a backup team." });
      return;
    }
    if (first !== "Random" && first === second) {
      res.status(200).json({ ok: false, error: "The backup team has to be different from the first choice." });
      return;
    }
    if ((first !== "Random" && claimed.indexOf(first) !== -1) || (second !== "Random" && claimed.indexOf(second) !== -1)) {
      res.status(200).json({ ok: false, error: "One of those teams was just taken. Pick another." });
      return;
    }
  }

  const unique = !players.some(function (player) {
    return String(player.username || "").toLowerCase() === username.toLowerCase();
  });

  let roblox;
  try {
    roblox = await lookupRoblox(username);
  } catch (err) {
    res.status(200).json({ ok: false, error: "Roblox could not be checked right now. Try again." });
    return;
  }

  if (!roblox || !roblox.id) {
    res.status(200).json({ ok: false, unique: false, error: "That Roblox username was not found." });
    return;
  }

  const profile = {
    id: roblox.id,
    name: roblox.name,
    displayName: roblox.displayName || roblox.name
  };

  if (!unique) {
    res.status(200).json({
      ok: false,
      unique: false,
      taken: true,
      roblox: profile,
      error: "That Roblox username is already registered."
    });
    return;
  }

  res.status(200).json({ ok: true, unique: true, roblox: profile });
}
