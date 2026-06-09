import { FILTERS } from "./constants.js";
import { gitDiff } from "./filters/gitDiff.js";
import { gitStatus } from "./filters/gitStatus.js";
import { gitLog } from "./filters/gitLog.js";
import { gitShow } from "./filters/gitShow.js";
import { grep } from "./filters/grep.js";
import { find } from "./filters/find.js";
import { dedupLog } from "./filters/dedupLog.js";
import { ls } from "./filters/ls.js";
import { tree } from "./filters/tree.js";
import { smartTruncate } from "./filters/smartTruncate.js";
import { readNumbered } from "./filters/readNumbered.js";
import { searchList } from "./filters/searchList.js";
import { eslint } from "./filters/eslint.js";
import { tscBuild } from "./filters/tscBuild.js";
import { jestTest } from "./filters/jestTest.js";
import { npmInstall } from "./filters/npmInstall.js";
import { pipInstall } from "./filters/pipInstall.js";
import { dockerLogs } from "./filters/dockerLogs.js";
import { errorStacktrace } from "./filters/errorStacktrace.js";
import { jsonLog } from "./filters/jsonLog.js";

const REGISTRY_MAP = {
  [FILTERS.GIT_DIFF]: { fn: gitDiff, category: "git" },
  [FILTERS.GIT_STATUS]: { fn: gitStatus, category: "git" },
  [FILTERS.GIT_LOG]: { fn: gitLog, category: "git" },
  [FILTERS.GIT_SHOW]: { fn: gitShow, category: "git" },
  [FILTERS.GREP]: { fn: grep, category: "shell" },
  [FILTERS.FIND]: { fn: find, category: "shell" },
  [FILTERS.DEDUP_LOG]: { fn: dedupLog, category: "log" },
  [FILTERS.LS]: { fn: ls, category: "shell" },
  [FILTERS.TREE]: { fn: tree, category: "shell" },
  [FILTERS.SMART_TRUNCATE]: { fn: smartTruncate, category: "log" },
  [FILTERS.READ_NUMBERED]: { fn: readNumbered, category: "generic" },
  [FILTERS.SEARCH_LIST]: { fn: searchList, category: "shell" },
  [FILTERS.ESLINT]: { fn: eslint, category: "build" },
  [FILTERS.TSC_BUILD]: { fn: tscBuild, category: "build" },
  [FILTERS.JEST_TEST]: { fn: jestTest, category: "test" },
  [FILTERS.NPM_INSTALL]: { fn: npmInstall, category: "build" },
  [FILTERS.PIP_INSTALL]: { fn: pipInstall, category: "build" },
  [FILTERS.DOCKER_LOGS]: { fn: dockerLogs, category: "docker" },
  [FILTERS.ERROR_STACKTRACE]: { fn: errorStacktrace, category: "log" },
  [FILTERS.JSON_LOG]: { fn: jsonLog, category: "log" },
};

// Aliases
const ALIASES = {
  rg: grep,
  fd: find
};

// Build metadata for all filters
function buildFilterMetadata() {
  const filters = [];
  
  // Add from registry map
  for (const [id, { fn, category }] of Object.entries(REGISTRY_MAP)) {
    if (fn) {
      filters.push({
        id,
        name: id.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        category,
        description: getFilterDescription(id),
        fn
      });
    }
  }
  
  return filters;
}

function getFilterDescription(id) {
  const descriptions = {
    "git-diff": "Compress git diff output: file headers, hunk truncation, +/- counting",
    "git-status": "Compact git status output: summarize changes by file",
    "git-log": "Collapse git log: keep first/last commits, truncate middle",
    "git-show": "Git show: keep diff + first line of commit message",
    "grep": "Collapse grep output: keep matches + counts, drop file headers",
    "find": "Collapse find output: show found files count, truncate long paths",
    "dedup-log": "Remove consecutive duplicate lines with count",
    "ls": "Collapse ls output: summarize by file type, truncate long listings",
    "tree": "Collapse tree output: keep structure, truncate deep branches",
    "smart-truncate": "Truncate very long output: keep head/tail, replace middle",
    "read-numbered": "Compact numbered file lists: show header + first/last items",
    "search-list": "Collapse search results: show match counts, truncate paths",
    "eslint": "Group ESLint errors by file: show counts + first violations per file",
    "tsc-build": "Group TypeScript errors by file: show locations + messages",
    "jest-test": "Summarize Jest results: show pass/fail counts, keep failure details",
    "npm-install": "Collapse npm install: keep errors/warnings, summarize installed",
    "pip-install": "Collapse pip install: keep errors/warnings, summarize packages",
    "docker-logs": "Docker logs: collapse timestamps, dedup lines, truncate long entries",
    "error-stacktrace": "Stack traces: keep top/bottom frames, omit middle repeats",
    "json-log": "JSON logs: extract timestamp, level, message from each line",
  };
  
  return descriptions[id] || "Compress tool output";
}

export function allFilters() {
  return buildFilterMetadata();
}

// Keep existing resolver for backward compatibility
export function resolveFilter(name) {
  const mapEntry = REGISTRY_MAP[name];
  if (mapEntry) return mapEntry.fn;
  return ALIASES[name] || null;
}