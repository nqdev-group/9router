// Port of auto_detect_filter (rtk/src/cmds/system/pipe_cmd.rs:132-188) + JS extras
// Order: git-diff -> git-show -> git-log -> git-status -> build-output (eslint/tsc) -> test (jest) -> install (npm/pip) -> docker -> generic -> find -> tree -> ls -> search-list -> read-numbered -> dedup-log -> smart-truncate -> null
import { DETECT_WINDOW, READ_NUMBERED_MIN_HIT_RATIO, SMART_TRUNCATE_MIN_LINES } from "./constants.js";
import { gitDiff } from "./filters/gitDiff.js";
import { gitStatus } from "./filters/gitStatus.js";
import { gitLog } from "./filters/gitLog.js";
import { gitShow } from "./filters/gitShow.js";
import { buildOutput } from "./filters/buildOutput.js";
import { grep } from "./filters/grep.js";
import { find } from "./filters/find.js";
import { dedupLog } from "./filters/dedupLog.js";
import { ls } from "./filters/ls.js";
import { tree } from "./filters/tree.js";
import { smartTruncate } from "./filters/smartTruncate.js";
import { readNumbered, READ_NUMBERED_LINE_RE } from "./filters/readNumbered.js";
import { searchList, SEARCH_LIST_HEADER_RE } from "./filters/searchList.js";
import { eslint } from "./filters/eslint.js";
import { tscBuild } from "./filters/tscBuild.js";
import { jestTest } from "./filters/jestTest.js";
import { npmInstall } from "./filters/npmInstall.js";
import { pipInstall } from "./filters/pipInstall.js";
import { dockerLogs } from "./filters/dockerLogs.js";
import { errorStacktrace } from "./filters/errorStacktrace.js";
import { jsonLog } from "./filters/jsonLog.js";

const RE_GIT_DIFF = /^diff --git /m;
const RE_GIT_DIFF_HUNK = /^@@ /m;
const RE_GIT_LOG = /^commit [a-f0-9]{7,40}/m;
const RE_GIT_STATUS = /^On branch |^nothing to commit|^Changes (not |to be )|^Untracked files:/m;
const RE_PORCELAIN = /^[ MADRCU?!][ MADRCU?!] \S/m;
const RE_BUILD_OUTPUT = /^(npm (warn|error|ERR!)|yarn (warn|error)|\s*Compiling\s+\S+|\s*Downloading\s+\S+|added \d+ package|\[ERROR\]|BUILD (SUCCESS|FAILED)|\s*Finished\s+|Successfully (installed|built)|ERROR:)/im;
const RE_TREE_GLYPH = /[\u2514\u251C]\u2500\u2500|\u2502  /;
const RE_LS_ROW = /^[-dlbcps][rwx-]{9}/m;
const RE_LS_TOTAL = /^total \d+$/m;
const RE_ESLINT = /^\d+:\d+\s+(error|warning)\s+/m;
const RE_TSC = /^src\/.*: error TS/m;
const RE_JEST = /^(PASS|FAIL)\s/m;
const RE_NPM = /^npm (ERR|WARN)/m;
const RE_PIP = /^Collecting |^Requirement already satisfied/m;
const RE_STACK_FRAME = /\s+at\s+\S+\(/m;

export function autoDetectFilter(text) {
  const head = text.length > DETECT_WINDOW ? text.slice(0, DETECT_WINDOW) : text;

  // Git diff / show (most specific git patterns)
  if (RE_GIT_DIFF.test(head) || RE_GIT_DIFF_HUNK.test(head)) return gitDiff;
  
  // Git log
  if (RE_GIT_LOG.test(head)) return gitLog;
  
  // Git status
  if (RE_GIT_STATUS.test(head)) return gitStatus;

  // Build output BEFORE porcelain check: prevents cargo "Compiling" misdetection as git-status
  if (RE_BUILD_OUTPUT.test(head)) return buildOutput;

  // ESLint
  if (RE_ESLINT.test(head)) return eslint;

  // TypeScript build
  if (RE_TSC.test(head)) return tscBuild;

  // Jest test output
  if (RE_JEST.test(head)) return jestTest;

  if (isMostlyPorcelain(head)) return gitStatus;

  const lines = head.split("\n");
  const nonEmpty = lines.filter(l => l.trim().length > 0);

  // npm install
  if (RE_NPM.test(head)) return npmInstall;

  // pip install
  if (RE_PIP.test(head)) return pipInstall;

  // Docker logs (ISO datetime prefix)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(lines[0])) return dockerLogs;

  // Rust grep rule: first 5 non-empty lines, ANY matches "file:number:content"
  const first5 = nonEmpty.slice(0, 5);
  if (first5.some(isGrepLine)) return grep;

  // Rust find rule: ALL non-empty lines path-like (no ':'), >=3 lines
  if (nonEmpty.length >= 3 && nonEmpty.every(isPathLike)) return find;

  // Tree: contains box-drawing glyphs typical of `tree` command
  if (RE_TREE_GLYPH.test(head)) return tree;

  // ls -la: has "total N" header or >=3 rows starting with perms string
  if (RE_LS_TOTAL.test(head) || countMatches(head, RE_LS_ROW) >= 3) return ls;

  // Cursor Glob search list header
  if (SEARCH_LIST_HEADER_RE.test(head)) return searchList;

  // Stack traces
  if (RE_STACK_FRAME.test(head)) return errorStacktrace;

  // JSON log lines
  if (countMatches(head, /^\{/) >= 3) return jsonLog;

  // Line-numbered file dump ("  N|content") - fire only if many lines match
  if (lines.length >= SMART_TRUNCATE_MIN_LINES && isLineNumbered(lines)) {
    return readNumbered;
  }

  // Fallback: dedupLog for generic multi-line noise with duplicates
  if (nonEmpty.length >= 5) return dedupLog;

  // Last resort: big blob with no structure - smart truncate
  if (text.split("\n").length >= SMART_TRUNCATE_MIN_LINES) return smartTruncate;

  return null;
}

function isGrepLine(line) {
  const first = line.indexOf(":");
  if (first === -1) return false;
  const second = line.indexOf(":", first + 1);
  if (second === -1) return false;
  const lineno = line.slice(first + 1, second);
  return /^\d+$/.test(lineno);
}

function isPathLike(line) {
  const t = line.trim();
  if (t.length === 0) return false;
  if (t.includes(":")) return false;
  return t.startsWith(".") || t.startsWith("/") || t.includes("/");
}

function isMostlyPorcelain(head) {
  const lines = head.split("\n").filter(l => l.trim());
  if (lines.length < 3) return false;
  const hits = lines.filter(l => RE_PORCELAIN.test(l)).length;
  return hits / lines.length >= 0.6;
}

function isLineNumbered(lines) {
  let hits = 0;
  let nonEmpty = 0;
  const sample = lines.slice(0, 100);
  for (const l of sample) {
    if (l.length === 0) continue;
    nonEmpty++;
    if (READ_NUMBERED_LINE_RE.test(l)) hits++;
  }
  if (nonEmpty < 5) return false;
  return hits / nonEmpty >= READ_NUMBERED_MIN_HIT_RATIO;
}

function countMatches(text, re) {
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  return (text.match(g) || []).length;
}
