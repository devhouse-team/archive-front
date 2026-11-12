#!/usr/bin/env python3
"""Convert Claude Code `--output-format stream-json` runs into agent-harness transcripts.

Each raw file is one scenario run (`raw/<scenario_id>.jsonl`). Only top-level tool
calls are recorded (events whose `parent_tool_use_id` is null), so an orchestrator's
transcript shows its own calls and the subagents it dispatched, not the subagents'
internal calls.

Besides the real tool names, the recorder emits derived pseudo-calls so the suite can
assert on behaviour that `scenario_runner.py` cannot see directly:

  Read:<basename>            a Read of that file (e.g. Read:craft-floor.md)
  Skill:<skill>              a Skill invocation (e.g. Skill:nuxt-ui)
  Agent:<subagent_type>      a subagent dispatch (e.g. Agent:reviewer)
  wrote:<relpath>            Write / Edit / MultiEdit on that path (relative to the workspace)
  wrote_ui_file              a write under app/, server/, public/ or to nuxt.config.*
  wrote_remote_asset         written content references a CDN, Google Fonts or remote icon API
  wrote_vhtml_non_snippet    written content uses v-html on anything other than *snippet_html
  wrote_raw_palette          written content uses raw Tailwind palette classes (text-gray-500 ...)
  wrote_cyrillic_in_vue      a .vue <template> contains Cyrillic literals (strings belong in locales)
  marked_stage_done          a write to STATUS.md sets a status cell to done
  bash_mutation              a Bash command that writes, moves, deletes or installs

Usage:
  record.py --run-dir evals/agents/runs/<run_id>
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List

REMOTE_ASSET = re.compile(
    r"(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com"
    r"|api\.iconify\.design|use\.typekit\.net|https?://[^\s'\"()]+\.(?:woff2?|ttf|otf|css|js)\b)",
    re.IGNORECASE,
)
VHTML = re.compile(r"v-html\s*=\s*\"([^\"]*)\"")
RAW_PALETTE = re.compile(
    r"\b(?:text|bg|border|ring|fill|stroke|from|to|via|outline|divide|decoration|shadow)-"
    r"(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue"
    r"|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b"
)
TEMPLATE = re.compile(r"<template[^>]*>(.*)</template>", re.DOTALL)
CYRILLIC = re.compile(r"[Ѐ-ӿ]")
HTML_COMMENT = re.compile(r"<!--.*?-->", re.DOTALL)
JS_COMMENT = re.compile(r"/\*.*?\*/|(?<![:\"'])//[^\n]*", re.DOTALL)
STATUS_DONE = re.compile(r"\|\s*(?:done|✅|completed?)\s*\|", re.IGNORECASE)
BASH_MUTATION = re.compile(
    r"(\bsed\s+-i|\brm\s|\bmv\s|\bcp\s|\btee\b|\btouch\s|\bmkdir\s|\bchmod\s|\bgit\s+(?:commit|checkout|reset|add|stash|apply)"
    r"|\b(?:pnpm|npm|yarn|bun)\s+(?:add|i|install|remove)\b|\bnpx\s|(?<![0-9&>])>{1,2}\s*(?!&|/dev/null)[\w./~-])"
)
UI_PATH = re.compile(r"^(?:app|server|public)/|^nuxt\.config\.")


def _norm(p: str) -> str:
    """macOS reports temp paths as /private/var/... while the workspace is /var/...; compare without it."""
    p = p.replace("\\", "/")
    return p[len("/private"):] if p.startswith("/private/") else p


def rel(path: str, root: str) -> str:
    path, root = _norm(path), _norm(root)
    if root and path.startswith(root):
        path = path[len(root):]
    return path.lstrip("/")


def written_content(name: str, args: Dict[str, Any]) -> str:
    if name == "Write":
        return str(args.get("content", ""))
    if name == "Edit":
        return str(args.get("new_string", ""))
    if name == "MultiEdit":
        return "\n".join(str(e.get("new_string", "")) for e in args.get("edits", []) or [])
    return ""


def derived_calls(name: str, args: Dict[str, Any], root: str) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    if name == "Read" and args.get("file_path"):
        out.append({"name": f"Read:{Path(str(args['file_path'])).name}", "arguments": {}})
    elif name == "Skill" and args.get("skill"):
        out.append({"name": f"Skill:{args['skill']}", "arguments": {}})
    elif name in ("Agent", "Task") and args.get("subagent_type"):
        out.append({"name": f"Agent:{args['subagent_type']}", "arguments": {}})
    elif name in ("Write", "Edit", "MultiEdit") and args.get("file_path"):
        path = rel(str(args["file_path"]), root)
        text = written_content(name, args)
        out.append({"name": f"wrote:{path}", "arguments": {}})
        if UI_PATH.search(path):
            out.append({"name": "wrote_ui_file", "arguments": {"path": path}})
        if REMOTE_ASSET.search(text):
            out.append({"name": "wrote_remote_asset", "arguments": {"path": path}})
        if any(not expr.strip().endswith("snippet_html") for expr in VHTML.findall(text)):
            out.append({"name": "wrote_vhtml_non_snippet", "arguments": {"path": path}})
        if RAW_PALETTE.search(text):
            out.append({"name": "wrote_raw_palette", "arguments": {"path": path}})
        if path.endswith(".vue"):
            m = TEMPLATE.search(text)
            # A fragment with no <template> is script code (an Edit inside <script>): drop JS comments
            # there, since the rule is about user-facing strings, not developer comments.
            body = HTML_COMMENT.sub("", m.group(1)) if m else ("" if "<script" in text else JS_COMMENT.sub("", text))
            if CYRILLIC.search(body):
                out.append({"name": "wrote_cyrillic_in_vue", "arguments": {"path": path}})
        if Path(path).name == "STATUS.md" and STATUS_DONE.search(text):
            out.append({"name": "marked_stage_done", "arguments": {"path": path}})
    elif name == "Bash" and BASH_MUTATION.search(str(args.get("command", ""))):
        out.append({"name": "bash_mutation", "arguments": {"command": args.get("command")}})
    return out


def parse_stream(lines: List[str], scenario_id: str, root: str) -> Dict[str, Any]:
    calls: List[Dict[str, Any]] = []
    result: Dict[str, Any] = {}
    texts: List[str] = []
    for line in lines:
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            ev = json.loads(line)
        except json.JSONDecodeError:
            continue
        if ev.get("type") == "result":
            result = ev
            continue
        if ev.get("type") != "assistant" or ev.get("parent_tool_use_id"):
            continue
        for block in (ev.get("message") or {}).get("content") or []:
            if block.get("type") == "tool_use":
                name = str(block.get("name", ""))
                args = block.get("input") or {}
                calls.append({"name": name, "arguments": args})
                calls.extend(derived_calls(name, args, root))
            elif block.get("type") == "text":
                texts.append(str(block.get("text", "")))
    final = result.get("result") if isinstance(result.get("result"), str) else ("\n".join(texts[-1:]))
    is_error = bool(result.get("is_error")) or (result and result.get("subtype") not in (None, "success"))
    return {
        "scenario_id": scenario_id,
        "turns": int(result.get("num_turns") or 0),
        "latency_ms": float(result.get("duration_ms") or 0),
        "cost_usd": float(result.get("total_cost_usd") or 0),
        "error": (result.get("subtype") or "error") if is_error else (None if result else "no result event"),
        "tool_calls": calls,
        "final_output": final or "",
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--run-dir", required=True, help="evals/agents/runs/<run_id> (holds meta.json and raw/)")
    args = ap.parse_args()
    run_dir = Path(args.run_dir)
    meta_path = run_dir / "meta.json"
    if not meta_path.exists():
        print(f"ERROR: {meta_path} not found", file=sys.stderr)
        return 1
    meta = json.loads(meta_path.read_text())
    transcripts = []
    for sid, info in meta.get("scenarios", {}).items():
        raw = run_dir / "raw" / f"{sid}.jsonl"
        if not raw.exists():
            continue
        transcripts.append(parse_stream(raw.read_text().splitlines(), sid, info.get("workspace", "")))
    out = {
        "run_id": meta["run_id"],
        "agent": "archive-frontend-agents",
        "model": meta.get("model", ""),
        "prompt_sha": meta.get("prompt_sha", ""),
        "transcripts": transcripts,
    }
    (run_dir / "transcripts.json").write_text(json.dumps(out, ensure_ascii=False, indent=2))
    print(f"wrote {run_dir / 'transcripts.json'} ({len(transcripts)} transcripts)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
