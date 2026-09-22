import path from "node:path";
import { DB_DIR } from "@/lib/db/paths.js";

// Deliberately separate from data.sqlite (the app DB) — isolates the write-heavy
// error-log path from app query load. Same DATA_DIR volume, just a different
// filename, so no new Docker mount is needed.
export const ERROR_LOG_DB_FILE = path.join(DB_DIR, "error-log.sqlite");
