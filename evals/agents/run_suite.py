#!/usr/bin/env python3
"""Run the agent eval suite live with `claude -p`, record each run, then score it.

Every scenario runs in its own throwaway workspace (a copy of CLAUDE.md, the handoff,
.claude/agents, .claude/skills, .impeccable and the scenario fixture), so agents can
never touch the real project. Runs cost real tokens: use --dry-run to see the plan.

  python3 evals/agents/run_suite.py --dry-run
  python3 evals/agents/run_suite.py --skip-holdout                 # while iterating on prompts
  python3 evals/agents/run_suite.py --agent reviewer               # one agent's scenarios
  python3 evals/agents/run_suite.py --scenario rev-injection --scenario rev-cdn-font
  python3 evals/agents/run_suite.py --promote                      # full run, then make it the baseline

Then (done automatically at the end of a run):
  scenario_runner.py --suite suite.json --transcripts runs/<id>/transcripts.json --strict-critical
  eval_diff.py --baseline baseline.report.json --candidate runs/<id>/report.json --fail-on-regression
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
HARNESS = ROOT / ".claude" / "skills" / "agent-harness" / "scripts"
FIXTURES = HERE / "fixtures"

READ_ONLY_BASH = [
    "Bash(rg:*)", "Bash(grep:*)", "Bash(ls:*)", "Bash(cat:*)", "Bash(head:*)", "Bash(tail:*)",
    "Bash(find:*)", "Bash(wc:*)", "Bash(sed -n:*)", "Bash(git diff:*)", "Bash(git status:*)",
    "Bash(git log:*)", "Bash(.claude/skills/impeccable/scripts/impeccable:*)",
]
BASE_TOOLS = ["Read", "Glob", "Grep", "Skill"] + READ_ONLY_BASH


def prompt_sha() -> str:
    h = hashlib.sha256()
    for name in ("orchestrator.md", "designer.md", "reviewer.md"):
        h.update((ROOT / ".claude" / "agents" / name).read_bytes())
    return h.hexdigest()[:10]


def build_workspace(scenario: dict, base: Path) -> Path:
    ws = base / scenario["id"]
    ws.mkdir(parents=True)
    shutil.copy2(ROOT / "CLAUDE.md", ws / "CLAUDE.md")
    (ws / "docs").mkdir()
    shutil.copy2(ROOT / "docs" / "FRONTEND_HANDOFF.md", ws / "docs" / "FRONTEND_HANDOFF.md")
    (ws / ".claude").mkdir()
    shutil.copytree(ROOT / ".claude" / "agents", ws / ".claude" / "agents")
    shutil.copytree(ROOT / ".claude" / "skills", ws / ".claude" / "skills", symlinks=True)
    for extra in (".claude/settings.local.json",):
        if (ROOT / extra).exists():
            shutil.copy2(ROOT / extra, ws / extra)
    if (ROOT / ".impeccable").exists():
        shutil.copytree(ROOT / ".impeccable", ws / ".impeccable")
    shutil.copytree(FIXTURES / "_shared", ws, dirs_exist_ok=True)
    if scenario.get("fixture"):
        shutil.copytree(FIXTURES / scenario["fixture"], ws, dirs_exist_ok=True)
    subprocess.run(["git", "init", "-q"], cwd=ws, check=True)
    subprocess.run(["git", "add", "-A"], cwd=ws, check=True)
    subprocess.run(["git", "-c", "user.name=eval", "-c", "user.email=eval@localhost",
                    "commit", "-qm", "fixture"], cwd=ws, check=True)
    return ws


def command(scenario: dict, model: str) -> list:
    agent = scenario["agent"]
    tools = list(BASE_TOOLS)
    if agent in ("designer", "orchestrator"):
        tools += ["Write", "Edit"]
    if agent == "orchestrator":
        tools += ["Agent"]
    return [
        "claude", "-p", scenario["prompt"],
        "--agent", agent, "--model", model,
        "--output-format", "stream-json", "--verbose",
        "--permission-mode", "acceptEdits",
        "--allowedTools", *tools,
        "--no-session-persistence",
    ]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--suite", default=str(HERE / "suite.json"))
    ap.add_argument("--agent", action="append", help="only scenarios for this agent (repeatable)")
    ap.add_argument("--scenario", action="append", help="only this scenario id (repeatable)")
    ap.add_argument("--skip-holdout", action="store_true", help="skip holdout scenarios (use while iterating)")
    ap.add_argument("--model", default="opus")
    ap.add_argument("--timeout", type=int, default=2700, help="seconds per scenario")
    ap.add_argument("--run-id", default=dt.datetime.now().strftime("%Y%m%d-%H%M%S"))
    ap.add_argument("--keep-workspaces", action="store_true")
    ap.add_argument("--promote", action="store_true", help="after a full, gate-passing run, copy its report to baseline.report.json")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    suite = json.loads(Path(args.suite).read_text())
    scenarios = [s for s in suite["scenarios"]
                 if (not args.agent or s["agent"] in args.agent)
                 and (not args.scenario or s["id"] in args.scenario)
                 and not (args.skip_holdout and s.get("holdout"))]
    if not scenarios:
        print("no scenarios selected", file=sys.stderr)
        return 1
    full_run = len(scenarios) == len(suite["scenarios"])

    if args.dry_run:
        for s in scenarios:
            print(f"{s['id']:<30} {s['agent']:<13} {s['bucket']:<17} {'holdout' if s.get('holdout') else ''}")
        print(f"\n{len(scenarios)} scenarios, model={args.model}, prompt_sha={prompt_sha()}")
        return 0

    run_dir = HERE / "runs" / args.run_id
    (run_dir / "raw").mkdir(parents=True, exist_ok=True)
    base = Path(tempfile.mkdtemp(prefix=f"agent-eval-{args.run_id}-"))
    meta = {"run_id": args.run_id, "model": args.model, "prompt_sha": prompt_sha(), "scenarios": {}}

    for i, s in enumerate(scenarios, 1):
        ws = build_workspace(s, base)
        print(f"[{i}/{len(scenarios)}] {s['id']} ({s['agent']}) …", flush=True)
        raw = run_dir / "raw" / f"{s['id']}.jsonl"
        try:
            with raw.open("w") as fh:
                proc = subprocess.run(command(s, args.model), cwd=ws, stdout=fh,
                                      stderr=subprocess.PIPE, text=True, timeout=args.timeout)
            if proc.returncode != 0:
                print(f"    claude exited {proc.returncode}: {proc.stderr.strip()[:300]}", flush=True)
        except subprocess.TimeoutExpired:
            print(f"    timed out after {args.timeout}s", flush=True)
        meta["scenarios"][s["id"]] = {"workspace": str(ws) + "/", "agent": s["agent"]}
        (run_dir / "meta.json").write_text(json.dumps(meta, indent=2))

    if not args.keep_workspaces:
        shutil.rmtree(base, ignore_errors=True)

    subprocess.run([sys.executable, str(HERE / "record.py"), "--run-dir", str(run_dir)], check=True)
    report = run_dir / "report.json"
    with report.open("w") as fh:
        subprocess.run([sys.executable, str(HARNESS / "scenario_runner.py"), "--suite", args.suite,
                        "--transcripts", str(run_dir / "transcripts.json"), "--format", "json"], stdout=fh)
    gate = subprocess.run([sys.executable, str(HARNESS / "scenario_runner.py"), "--suite", args.suite,
                           "--transcripts", str(run_dir / "transcripts.json"), "--strict-critical"])
    baseline = HERE / "baseline.report.json"
    diff_rc = 0
    if baseline.exists():
        diff_rc = subprocess.run([sys.executable, str(HARNESS / "eval_diff.py"), "--baseline", str(baseline),
                                  "--candidate", str(report), "--fail-on-regression",
                                  "--drift-threshold", "0.25"]).returncode
    if args.promote:
        if not full_run:
            print("not promoting: --promote needs a full run (no filters, holdouts included)", file=sys.stderr)
        elif gate.returncode != 0:
            print("not promoting: gate failed", file=sys.stderr)
        elif diff_rc != 0:
            print("not promoting: regression against the baseline (eval_diff --fail-on-regression)", file=sys.stderr)
        else:
            shutil.copy2(report, baseline)
            print(f"promoted {report} -> {baseline}")
    return gate.returncode or diff_rc


if __name__ == "__main__":
    sys.exit(main())
