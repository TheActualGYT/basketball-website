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

function readRegistry() {
  try {
    const raw = readFileSync(join(process.cwd(), "registrations.json"), "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.players) ? data.players : [];
  } catch (err) {
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Use POST." });
    return;
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const username = String(body.username || "").trim();
  const first = String(body.first || "");
  const second = String(body.second || "");
  const checkOnly = !!body.checkOnly;

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
  }

  const players = readRegistry();
  const taken = players.some(function (player) {
    return String(player.username || "").toLowerCase() === username.toLowerCase();
  });
  if (taken) {
    res.status(200).json({ ok: false, taken: true, error: "That Roblox username is already registered." });
    return;
  }

  let roblox;
  try {
    const response = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
    });
    const payload = await response.json();
    roblox = payload && payload.data && payload.data[0];
  } catch (err) {
    res.status(200).json({ ok: false, error: "Roblox could not be checked right now. Try again." });
    return;
  }

  if (!roblox || !roblox.id) {
    res.status(200).json({ ok: false, error: "That Roblox username was not found." });
    return;
  }

  res.status(200).json({
    ok: true,
    roblox: {
      id: roblox.id,
      name: roblox.name,
      displayName: roblox.displayName || roblox.name
    }
  });
}
