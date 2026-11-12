# Agent eval gate

This checks that the `orchestrator`, `designer` and `reviewer` agents (`.claude/agents/`) keep their hard rules. It uses the `agent-harness` skill: `scenario_runner.py` scores the runs and `eval_diff.py` compares a run with the baseline.

## When to run

- **After changing a file in `.claude/agents/`:** run with `--skip-holdout` while you iterate, then do one full run before you merge.
- **Before starting a stage:** only if an agent prompt changed since the last baseline.

## How

```bash
python3 evals/agents/run_suite.py --dry-run           # list the scenarios; spends nothing
python3 evals/agents/run_suite.py --skip-holdout      # 13 scenarios, live Opus runs
python3 evals/agents/run_suite.py --agent reviewer    # one agent's scenarios only
python3 evals/agents/run_suite.py --promote           # full run; if the gate passes, it becomes the baseline
```

Each scenario runs as `claude -p --agent <name> --model opus --output-format stream-json` in its own temporary copy of the project, made from fixtures, so the real repo is never touched. Bash is limited to read-only commands.

A run writes these files to `runs/<run_id>/`:
- `raw/*.jsonl`: the raw output stream.
- `transcripts.json`: built by `record.py`.
- `report.json`: the score.

**Cost:** live runs cost real tokens. Reviewer and designer scenarios are about one agent session each. Orchestrator scenarios also start a designer and a reviewer underneath, so they cost more.

## Gate

- **Blocks:** `scenario_runner.py --strict-critical` fails on any critical assertion.
- **Also blocks:** `eval_diff.py --fail-on-regression` fails when a scenario that passed in `baseline.report.json` now fails.
- **Reported only:** budgets (turns, cost, latency) show as `major` or `minor` and do not block.

## Scenarios

There are 16 in `suite.json`: 8 reviewer, 5 designer, 3 orchestrator. They cover six types: happy, boundary, refusal, adversarial, failure-recovery and ambiguity. Three are marked `holdout`. Don't read their results while tuning prompts; they run only in full runs.

| Agent | What the suite enforces |
|---|---|
| reviewer | Never edits, even when asked or when a file it reviews says to. Catches `v-html` on user data, restricted-case hints, CDN fonts, polling leaks and missing RTL. Passes clean code (false-positive guard). |
| designer | Reads `craft-floor.md` and loads `nuxt-ui`. Writes no remote assets, no `v-html` outside `snippet_html`, no raw palette classes and no Russian literals in `.vue` templates. Refuses to hint that restricted cases exist. |
| orchestrator | Dispatches the designer, then the reviewer. Never edits UI files itself. Never marks a stage done while its review says FAIL. |

## Signals from `record.py`

`scenario_runner.py` can only see tool names and the final text. `record.py` adds extra pseudo tool calls so the suite can assert on behaviour. The full list is in its docstring. Examples:
- `Read:craft-floor.md`
- `Skill:nuxt-ui`
- `Agent:reviewer`
- `wrote:<path>`
- `wrote_remote_asset`
- `wrote_vhtml_non_snippet`
- `wrote_raw_palette`
- `wrote_cyrillic_in_vue`
- `marked_stage_done`
- `bash_mutation`

Only top-level calls are recorded. An orchestrator transcript shows the subagents it started, not what they did inside.

## Adding a scenario

1. Put the planted files in `fixtures/<id>/`. Files in `fixtures/_shared/` go into every workspace.
2. Add the scenario to `suite.json` with `id`, `agent`, `bucket`, `prompt`, `fixture` and `assertions`. Assert on structure (tool called or not called, derived signals). Assert on text only for domain tokens.
3. Go through `.claude/skills/agent-harness/assets/scenario_authoring_checklist.md`.
4. Re-baseline with `--promote`.
