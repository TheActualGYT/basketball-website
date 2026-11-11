import { readFileSync } from "fs";
import { join } from "path";

export default function handler(req, res) {
  try {
    const data = JSON.parse(readFileSync(join(process.cwd(), "signed-in.json"), "utf8"));
    res.status(200).json({ players: Array.isArray(data.players) ? data.players : [] });
  } catch (err) {
    res.status(200).json({ players: [] });
  }
}
