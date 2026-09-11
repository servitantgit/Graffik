HowToCreateAgentCommand.md
Purpose
Guide for writing precise task specifications for AI coding agents (Cline in VS Code with DeepSeek/Sonnet/Claude models). Result of trial-and-error over ~15 patches on a real project.

Target audience: humans planning tasks + AI models (like Opus/Claude) writing tasks for execution agents.

Core principle
The specification is more important than the model.

A well-written task can be executed by cheap fast models (DeepSeek Flash) reliably. A poorly-written task confuses even powerful models (Sonnet 4.5).

Your job: write the specification so precise that any competent model can execute it without creative interpretation.

Task template
Every task must follow this structure:

READ AGENT.md COMPLETELY BEFORE MAKING ANY CHANGE.

# TASK: <short imperative title>

## GOAL

<1-3 sentences: what user-visible outcome we want>

## CURRENT VERIFIED BEHAVIOR

<what code currently does — describe existing state>
<include relevant code snippets from the actual file>

## EXACT FAILURE (only for bug fixes)

<specific scenario that breaks, with reproduction steps>

## FILES TO MODIFY

<explicit list, one file per line>

## FILES NOT TO MODIFY

<explicit list — this prevents scope creep>

## EXACT OPERATIONS

### OPERATION 1: <what and where>

<LOCATE block with exact code>
<REPLACE_WITH block with exact new code>

### OPERATION 2: <...>

<...>

## PRESERVED BEHAVIOR

<what MUST continue working after changes>

## MANUAL TEST

<step-by-step verification, expected output>

## STOP CONDITIONS

<when NOT to make changes — explicit conditions>

## DEFINITION OF DONE

<checklist of completion criteria>
Key rules
Rule 1: Use LOCATE + REPLACE_WITH blocks
Bad:

"Change the function categorizeOvertime to remove Sunday special case"

Good:

LOCATE:

```javascript
  if (isSunday) return { h50: 0, h100: dayH + nightH, h200: 0 };
  return { h50: dayH, h100: nightH, h200: 0 };
REPLACE_WITH:

  // For 4-brigade 24/7 schedule, Sunday is a regular workday
  return { h50: dayH, h100: nightH, h200: 0 };

Why: models can search-and-replace bytes exactly. Descriptions of what to change leave room for creative interpretation.

### Rule 2: LOCATE must be unique in file

If your LOCATE snippet appears multiple times in the target file, the agent will either fail or replace the wrong one.

**Solution:** add surrounding context lines to make it unique.

### Rule 3: LOCATE must match byte-for-byte

Whitespace, quotes, comments — all matter. Copy directly from the source file, do not re-type.

Common failures:
- Tabs vs spaces
- Single quotes vs double quotes
- Trailing whitespace
- Different line endings (CRLF vs LF)

### Rule 4: Explicit "FILES NOT TO MODIFY" list

Without this, agents interpret "clean up nearby code" as helpful. It's not — it introduces regressions.

FILES NOT TO MODIFY
All CSS files
index.html
All other JS files
All i18n files
Docs (CHANGELOG, PROJECT_DOCS, AGENT.md)

### Rule 5: STOP CONDITIONS prevent hallucination

Tell the agent when to give up rather than improvise:

STOP CONDITIONS
Do not make changes if:

LOCATE block doesn't match exactly (means file was modified since spec was written)
Function signature is different than described (means different code version)
Feature already exists (means patch was already applied)
If STOP condition triggered — report which file and what line differs, do not proceed.


### Rule 6: MANUAL TEST is mandatory

Every task must include verifiable manual test. Without it, "done" is ambiguous.

MANUAL TEST
Open browser, hard reload
Click day 15 in Month view
Info panel should show: "Zmiana" (not "infoWorking")
Check console: no warnings or errors
Run: node --test "tests/*.test.js" → all pass

### Rule 7: One task = one logical change

**Bad:** "Fix note double-save AND add tests AND update docs"

**Good:** three separate tasks, each with own MANUAL TEST.

Small tasks are easier to:
- Review before applying
- Rollback if broken
- Test in isolation
- Understand from git log later

**Limit:** 1-2 production files per task. Exceptions require justification.

### Rule 8: Preserve existing exports

If you're refactoring `moduleX.js` that other files use — keep `window.moduleX = moduleX` exports even if you split the file. Otherwise dependent files break silently.

### Rule 9: Never allow scope creep

Add explicit "do not" list to prevent well-meaning improvements:

Do NOT:

Refactor neighboring code
Add comments explaining "why"
Optimize performance
Rename variables
Update related documentation (that's separate task)
Delete unused code (separate task)

### Rule 10: Include DEFINITION OF DONE

Explicit completion checklist prevents "I think it's done" ambiguity:

DEFINITION OF DONE
 File js/foo.js contains new function bar()
 node --check js/foo.js passes
 All 76 existing tests still pass
 Browser F5 → feature X works as described in MANUAL TEST
 git status shows only expected changed files
 No new files created outside expected paths

---

## Anti-patterns

### Anti-pattern 1: Vague descriptions

**Bad:**
> "Improve error handling in sync.js"

**Good:**
> "In `syncWithDrive()`, wrap the `fetchDriveRemotePayload()` call in try-catch. On error, show toast with translated message `t('driveConnectionError')`. Do not modify success path."

### Anti-pattern 2: Multiple related changes

**Bad:**
> "Add feature X, refactor module Y for better structure, and update tests"

**Good:** three tasks:
1. Add feature X
2. Add tests for X
3. Refactor Y (separate session, after feature stable)

### Anti-pattern 3: Assumed context

**Bad:**
> "Update the sync logic to handle the case we discussed"

**Good:** Restate the case explicitly. Model doesn't have your conversation history.

### Anti-pattern 4: "Best judgment" instructions

**Bad:**
> "Add error handling where appropriate"

**Good:**
> "Add try-catch around lines 45-52. On error, log with `console.warn('[sync]', 'download failed', error)`. Return null."

### Anti-pattern 5: Missing rollback plan

**Bad:** task without STOP CONDITIONS or verification steps

**Good:** task where "I know it works" is provable by MANUAL TEST or automated tests

### Anti-pattern 6: Copying pattern without verification

**Bad:**
> "Do the same thing you did for module X, but for module Y"

**Good:** Explicit spec for module Y even if similar. Small differences matter.

---

## Multi-model workflow

Use different models for different phases:

### Planning phase — smart model (Claude Opus, Sonnet 4.5)
- Understand the problem
- Design solution
- Write specification
- Think about edge cases

### Skeptical review — different model (Grok, ChatGPT)
- "What could go wrong?"
- "Is this really needed?"
- "Are these estimates realistic?"
- Catches blind spots of planner

### Execution — reliable model (DeepSeek Flash, Sonnet)
- Follows specification precisely
- Reports deviations before making them
- Verifies against actual code

### Verification — human
- Reads diff
- Runs MANUAL TEST
- Approves commit
- Real-world validation

### When to use zip + chat model instead of VS Code agent

Use chat-based Sonnet/Claude with full project zip when:
- Refactoring multiple files with cross-dependencies
- Architectural changes that need holistic view
- Task requires reading many files to make decisions
- VS Code agent kept asking clarifying questions

Otherwise VS Code agent with precise task is faster and cheaper.

---

## Specification quality checklist

Before sending task to agent, verify:

- [ ] Task has clear GOAL (user-visible outcome, not just "improve code")
- [ ] LOCATE blocks copied byte-for-byte from source
- [ ] All FILES TO MODIFY listed explicitly
- [ ] All FILES NOT TO MODIFY listed explicitly
- [ ] PRESERVED BEHAVIOR describes what must not break
- [ ] MANUAL TEST has verifiable steps
- [ ] STOP CONDITIONS cover "already applied" and "different code" cases
- [ ] DEFINITION OF DONE is objective checklist
- [ ] No "improve", "clean up", "refactor while you're there"
- [ ] No assumed context from prior conversations
- [ ] Total scope: 1-2 files, one logical change

If any checkbox unchecked → revise before sending.

---

## When agent deviates from specification

Agents sometimes make small deviations. Not all are bad.

### Good deviations (accept)
- Fixed a typo in your LOCATE block
- Chose better variable name that follows project conventions
- Corrected wrong assumption in spec (e.g. wrong key format)
- Wrapped code in existing helper instead of duplicating

**Signal:** agent reports deviation with reasoning before applying.

### Bad deviations (reject, rewrite spec)
- Refactored surrounding code "for consistency"
- Added new dependencies
- Changed variable/function names other files use
- Added features not in spec
- Removed comments/code marked as "keep as-is"

**Signal:** agent did more than asked without explanation.

If you get bad deviation: git reset, rewrite spec with stricter STOP CONDITIONS.

---

## When something breaks after agent's work

Standard recovery:

1. **Don't debug immediately.** First read agent's summary of what changed.
2. **Compare to spec.** Did agent do more/less than asked?
3. **Run automated tests.** Did they pass at commit time?
4. **Reproduce in browser.** Can you trigger the break manually?
5. **Read git diff.** Look for surprises.
6. **If diff has surprise changes:** git reset, rewrite spec, retry.
7. **If diff matches spec but breaks anyway:** spec was wrong, revise plan.

Don't try to fix agent's output by writing more code. Fix the spec and re-run.

---

## When to give up on agent and code manually

Sometimes it's faster to write code yourself:

- Task is < 5 lines and highly contextual
- You keep rewriting spec because agent keeps misunderstanding
- Task requires deep runtime knowledge (browser dev tools, network)
- Task is one-shot cleanup you'll never repeat

Rule of thumb: if writing spec takes longer than writing code — write code.

Exception: even for small tasks, use agent if the change is repetitive (e.g. "add this check to 20 similar functions"). Agent scales, you don't.

---

## Common project-specific rules to reference

Every task should reference project rules (AGENT.md in this project):

- No ES modules — use `window.myFunc = myFunc` pattern
- No npm dependencies at runtime
- UTF-8 without BOM, preserve Polish/Ukrainian characters literally
- No inline event handlers (`onclick="..."`) in generated HTML
- Console prefixes: `console.warn('[module]', ...)`
- One owner per event domain
- i18n keys must exist in all 3 language files

Agent reads AGENT.md first, but explicit reminders in task help.

---

## Example task (real, worked first time)

READ AGENT.md COMPLETELY BEFORE MAKING ANY CHANGE.

TASK: Fix note double-save in day info panel
GOAL
Note in day info panel saves once per real change instead of twice
(change event + blur event fire in sequence, both trigger save).

CURRENT VERIFIED BEHAVIOR
In js/calendar.js, function renderInfo() binds noteInput 'change' event.
When user types then blurs, change fires. Then blur may fire same handler.

EXACT FAILURE
Click day 15 in Month view
Type "test" in note field
Click outside field → toast "Notatka zapisana" (correct)
Sometimes second toast fires ~100ms later (bug — should be silent)
FILES TO MODIFY
js/calendar.js
FILES NOT TO MODIFY
All CSS files
All other JS files
All i18n files
index.html
EXACT OPERATIONS
OPERATION 1: Add saveInProgress flag and blur handler
Find:

if (noteInput) {
  let savedNoteValue = String(notes[noteKey] || '').trim();

  noteInput.addEventListener('change', () => {
    const noteValue = noteInput.value.trim();
    if (noteValue === savedNoteValue) return;
    // ...
    saveNotes(notes);
    showToast('success', t('infoNoteSaved'));
  });
}
Replace with:

if (noteInput) {
  let savedNoteValue = String(notes[noteKey] || '').trim();
  let saveInProgress = false;

  const commitNote = () => {
    if (saveInProgress) return;
    const noteValue = noteInput.value.trim();
    if (noteValue === savedNoteValue) return;

    saveInProgress = true;
    // ...
    saveNotes(notes);
    showToast('success', t('infoNoteSaved'));

    setTimeout(() => { saveInProgress = false; }, 100);
  };

  noteInput.addEventListener('change', commitNote);
  noteInput.addEventListener('blur', commitNote);
  noteInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      noteInput.blur();
    }
  });
}
PRESERVED BEHAVIOR
Note saves on change (as before)
Note saves on blur (new guarantee)
Enter triggers save via blur
Empty value deletes note (as before)
No double toast
MANUAL TEST
Open day 15
Type "test" → click outside → toast appears once
Click outside again → no toast
Change value → click outside → one toast
Console: no duplicate save calls
STOP CONDITIONS
Do not make changes if:

noteInput.addEventListener already has saveInProgress flag
LOCATE block doesn't match exactly
Other listeners exist on noteInput that we don't know about
DEFINITION OF DONE
 js/calendar.js has commitNote() named function
 Both change and blur listeners bound
 Enter key handler with preventDefault
 node --check js/calendar.js passes
 All existing tests (76) still pass
 Manual test 1-5 pass in browser

This spec worked on first try, produced clean code, no regressions.

---

## Final wisdom

1. **Specifications are code.** Write them with same care as production code.
2. **Precise spec > smart model.** Cheap models with precise specs beat smart models with vague specs.
3. **Small patches > big refactors.** Ten small verified patches < one big broken refactor.
4. **STOP CONDITIONS save time.** Failed early is better than "success" that broke something.
5. **MANUAL TEST is the contract.** Without it, "done" means nothing.
6. **Trust but verify.** Even good agents make mistakes. Always test.
7. **Multi-model review catches blind spots.** Different models have different failure modes.
8. **When in doubt, split the task.** Two clear specs beat one confusing spec.

---

## Version history

- v1.0 — 2026-09-08 — Initial version based on session with ~15 patches on Grafik Gillette PWA project
```
