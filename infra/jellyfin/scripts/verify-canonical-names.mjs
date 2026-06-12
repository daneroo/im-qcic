#!/usr/bin/env node

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const candidateRoots = ["/Volumes/Space", "/volume1"];
const defaultRelativeRoots = ["Watching/Movies", "Volatile/Movies"];
const probeableExtensions = new Set([".m4v", ".mp4"]);

await main();

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const files = await findMediaFiles(options.roots);
  const fileSet = new Set(files);
  const rows = (
    await Promise.all(files.map((file) => buildRow(file, options, fileSet)))
  ).sort((a, b) => a.file.localeCompare(b.file));

  const failed = rows.filter((row) => row.status !== "OK").length;

  writeRows(rows, options);

  if (options.format === "bash") {
    console.log("");
    console.log(`# Checked ${rows.length} files; ${failed} need attention.`);
  } else {
    console.error(`Checked ${rows.length} files; ${failed} need attention.`);
  }
  process.exitCode = shouldExitWithFailure(rows, options) ? 1 : 0;
}

function parseArgs(args) {
  let root;
  let format = "markdown";
  let verbose = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "-h" || arg === "--help") usage(0);
    if (arg === "-v" || arg === "--verbose") {
      verbose = true;
      continue;
    }
    if (arg === "-f" || arg === "--format") {
      if (!args[index + 1]) {
        console.error(`${arg} requires a value.`);
        usage();
      }
      format = normalizeFormat(args[index + 1]);
      index += 1;
      continue;
    }
    if (arg.startsWith("--format=")) {
      format = normalizeFormat(arg.slice("--format=".length));
      continue;
    }
    if (arg === "-r" || arg === "--root") {
      if (!args[index + 1]) {
        console.error(`${arg} requires a value.`);
        usage();
      }
      root = args[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith("--root=")) {
      root = arg.slice("--root=".length);
      if (!root) {
        console.error("--root requires a value.");
        usage();
      }
      continue;
    }

    console.error(`Unknown option: ${arg}`);
    usage();
  }

  root ??= detectMediaRoot();

  return {
    roots: defaultRoots(root),
    root,
    verbose,
    format,
  };
}

async function findMediaFiles(roots) {
  const groups = await Promise.all(roots.map(findMedia));
  return groups.flat();
}

async function buildRow(file, options, fileSet) {
  const ext = path.extname(file).toLowerCase();
  const canProbe = probeableExtensions.has(ext);
  const allowed = isAllowedExtension(ext);
  const sidecarMatch =
    ext === ".srt" ? findMatchingMp4ForSrt(file, fileSet) : "";
  const tags = canProbe ? await probeTags(file) : {};
  const title = tags.title ?? "";
  const date = tags.date ?? tags.creation_time ?? "";
  const year = yearFromDate(date);
  const expectedName =
    canProbe && title && year
      ? `${safeFilenameTitle(title)} (${year}).mp4`
      : "";
  const actualName = path.basename(file);
  const issues = [];

  if (ext === ".srt" && !sidecarMatch) {
    issues.push("missing_matching_mp4");
  }
  if (!allowed) {
    issues.push(canProbe ? "extension_not_mp4" : "unsupported_extension");
  }
  if (canProbe && !title) issues.push("missing_title");
  if (canProbe && !year) issues.push("missing_year");
  if (expectedName && actualName !== expectedName) issues.push("name_mismatch");
  if (tags.__probe_error) issues.push("probe_error");

  return {
    status: issues.length ? "FAIL" : "OK",
    check: issues.length ? "[ ]" : "[x]",
    issues,
    actualName,
    expectedName,
    title,
    year,
    date,
    extension: ext,
    file,
    probeError: tags.__probe_error ?? "",
  };
}

function writeRows(rows, options) {
  const visibleRows = options.verbose
    ? rows
    : rows.filter((row) => row.status !== "OK");

  if (options.format === "jsonl") {
    writeJson(visibleRows);
    return;
  }

  if (options.format === "bash") {
    writeBash(visibleRows, options);
    return;
  }

  writeMarkdown(visibleRows);
}

async function findMedia(root) {
  try {
    const { stdout } = await execFileAsync(
      "find",
      [root, "-type", "f", "-print"],
      { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
    );
    return stdout.split("\n").filter(Boolean);
  } catch (error) {
    console.error(
      `Cannot scan ${root}: ${String(error.stderr ?? error.message).trim()}`,
    );
    process.exit(2);
  }
}

async function probeTags(file) {
  try {
    const { stdout } = await execFileAsync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format_tags=title,date,creation_time",
        "-of",
        "json",
        file,
      ],
      { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
    );
    return JSON.parse(stdout).format?.tags ?? {};
  } catch (error) {
    return { __probe_error: error.message };
  }
}

function writeMarkdown(rows) {
  for (const row of rows) {
    const issueText = row.issues.length ? ` ${row.issues.join(", ")}` : "";
    const expectedText = row.expectedName ? ` -> \`${row.expectedName}\`` : "";
    console.log(
      `- ${row.check}${issueText} \`${row.actualName}\`${expectedText} ${row.file}`,
    );
  }
}

function writeJson(rows) {
  for (const row of rows) {
    console.log(JSON.stringify(row));
  }
}

function writeBash(rows, options) {
  const renames = rows
    .filter((row) => row.expectedName && row.actualName !== row.expectedName)
    .map((row) => ({
      from: bashPath(row.file, options),
      to: bashPath(
        path.join(path.dirname(row.file), row.expectedName),
        options,
      ),
    }));

  console.log("#!/usr/bin/env bash");
  console.log("set -euo pipefail");
  console.log("");
  console.log(`# Generated by ${commandName()} --format bash`);
  console.log(
    "# Review before running. mv preserves file mtime; ctime will change.",
  );
  console.log("");
  console.log(`required_dirs=(${defaultRelativeRoots.map(sh).join(" ")})`);
  console.log("");
  console.log("valid_root() {");
  console.log("  local root=$1 dir");
  console.log('  for dir in "${required_dirs[@]}"; do');
  console.log('    [[ -d "$root/$dir" ]] || return 1');
  console.log("  done");
  console.log("}");
  console.log("");
  console.log('if [[ $# -gt 1 ]]; then');
  console.log('  echo "usage: $0 [MEDIA_ROOT]" >&2');
  console.log("  exit 2");
  console.log('elif [[ $# -eq 1 ]]; then');
  console.log("  ROOT=$1");
  console.log("else");
  console.log("  roots=()");
  console.log(`  for candidate in ${candidateRoots.map(sh).join(" ")}; do`);
  console.log('    valid_root "$candidate" && roots+=("$candidate")');
  console.log("  done");
  console.log('  if [[ ${#roots[@]} -ne 1 ]]; then');
  console.log('    echo "could not uniquely detect media root; pass it explicitly" >&2');
  console.log("    exit 1");
  console.log("  fi");
  console.log("  ROOT=${roots[0]}");
  console.log("fi");
  console.log("");
  console.log('if ! valid_root "$ROOT"; then');
  console.log('  echo "invalid media root: $ROOT" >&2');
  console.log("  exit 1");
  console.log("fi");
  console.log("");
  console.log('for dir in "${required_dirs[@]}"; do');
  console.log('  echo "using $ROOT/$dir"');
  console.log("done");
  console.log("");
  console.log('cd "$ROOT"');
  console.log("");
  console.log("rename_one() {");
  console.log("  local source=$1 target=$2");
  console.log("");
  console.log('  if [[ -e "$source" && -e "$target" ]]; then');
  console.log(
    '    echo "both source and target exist: $source -> $target" >&2',
  );
  console.log("    return 1");
  console.log('  elif [[ -e "$target" ]]; then');
  console.log('    echo "already renamed: $source -> $target"');
  console.log('  elif [[ ! -e "$source" ]]; then');
  console.log('    echo "source and target missing: $source -> $target" >&2');
  console.log("    return 1");
  console.log("  else");
  console.log('    mv -- "$source" "$target"');
  console.log("  fi");
  console.log("}");
  console.log("");

  for (const rename of renames) {
    console.log(`rename_one ${sh(rename.from)} ${sh(rename.to)}`);
  }
}

function shouldExitWithFailure(rows, options) {
  if (options.format !== "bash") {
    return rows.some((row) => row.status !== "OK");
  }

  return rows.some(
    (row) =>
      row.issues.includes("unsupported_extension") ||
      row.issues.includes("missing_matching_mp4") ||
      row.issues.includes("missing_title") ||
      row.issues.includes("missing_year") ||
      row.issues.includes("probe_error"),
  );
}

function usage(exitCode = 2) {
  const command = commandName();

  console.error(`Usage: ${command} [options]

Validates canonical MP4 filenames, embedded title/year metadata, and SRT sidecars.
Markdown failures are printed by default.

Options:
  -r, --root      Media root; otherwise auto-detect ${candidateRoots.join(" or ")}
  -v, --verbose   Print OK rows as well as failures
  -f, --format    Output format: markdown|md, json, bash
  -h, --help      Show this help

Default relative roots:
  ${defaultRelativeRoots.join("\n  ")}

Examples:
  ${command}
  ${command} -f bash > rename-movies.sh
  bash rename-movies.sh
  ssh syno bash -s < rename-movies.sh
`);
  process.exit(exitCode);
}

function commandName() {
  const script =
    path.relative(process.cwd(), process.argv[1]) ||
    path.basename(process.argv[1]);
  return `node ${script}`;
}

function defaultRoots(mediaRoot) {
  return defaultRelativeRoots.map((root) => path.join(mediaRoot, root));
}

function detectMediaRoot() {
  const roots = candidateRoots.filter((root) =>
    defaultRelativeRoots.every((relative) => existsSync(path.join(root, relative))),
  );

  if (roots.length !== 1) {
    console.error("Could not uniquely detect media root; use --root.");
    process.exit(2);
  }

  return roots[0];
}

function normalizeFormat(value) {
  const normalized = String(value).toLowerCase();
  if (normalized === "md") return "markdown";
  if (normalized === "json") return "jsonl";
  if (["markdown", "bash"].includes(normalized)) return normalized;

  console.error(`Unknown format: ${value}`);
  usage();
}

function yearFromDate(value) {
  return String(value ?? "").match(/\b(19|20)\d{2}\b/)?.[0] ?? "";
}

function isAllowedExtension(ext) {
  return ext === ".mp4" || ext === ".srt";
}

function findMatchingMp4ForSrt(file, fileSet) {
  const parsed = path.parse(file);
  const basename = parsed.name.replace(
    /\.(en|eng|fr|fre|fra|es|spa|de|ger|deu)$/i,
    "",
  );
  const candidate = path.join(parsed.dir, `${basename}.mp4`);
  return fileSet.has(candidate) || existsSync(candidate) ? candidate : "";
}

function safeFilenameTitle(title) {
  return String(title)
    .replace(/['’‘`]/g, "")
    .replace(/[:"<>?*]/g, " ")
    .replace(/[\\/|]/g, " - ")
    .replaceAll("\0", "")
    .replace(/\s+/g, " ")
    .trim();
}

function sh(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function bashPath(file, options) {
  const relative = path.relative(options.root, file);
  return relative.startsWith("..") || path.isAbsolute(relative)
    ? file
    : relative;
}
