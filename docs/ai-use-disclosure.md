# AI-Use Disclosure (draft)

> **Draft note:** sections marked ✏️ need to be completed or confirmed by me in my own words before submission.

## Tools used

- **Replit Agent:** ✏️ *confirm: used to build the first working slice (React app, layout, rule-based review) in Problem Framing / First Working Slice.*
- **Claude (Anthropic, Claude Opus 5.5), Nov 16, 2026:** used to plan and implement this revision, run the tests and draft the documentation.
- ✏️ *Add any other tools (ChatGPT, Copilot, etc.) from earlier milestones.*

## Development assistance

- **Code:** Claude rewrote the rule-based review engine (`src/lib/analyze.ts`), adding negation handling, conflict and uncertainty tags, specific fact extraction, two new checklist items and linked follow-up questions. It also added the review status banner and the "How this review works" panel in `App.tsx`. It fixed a sentence-splitting bug ("p.m. I think…").
- **Testing:** Claude wrote a small script that runs the review engine directly on each test input, before and after the revision. It also built the app and took screenshots in a headless browser. It proposed the risk-case report (negated evidence) and the unfamiliar-wording probe.
- **Writing:** Claude drafted `revision.md`, this disclosure, the README update and the demo notes from the test results and peer feedback.
- ✏️ *Earlier milestones: describe how AI helped build the original prototype.*

## Representative prompts

1. **Prompt (to Claude):** shared the assignment, my Replit and GitHub links, and the full peer feedback, and asked for help completing the milestone.
   **Produced:** an analysis of the existing code, a "before" test run that found the negated-evidence failure, and four proposed priorities.
   **What I changed:** ✏️ *I chose three of the four priorities and deferred document upload because…*
2. **Prompt (to Claude, via a multiple-choice question):** choose 2–3 improvements: negation and conflict consistency, specific facts and gaps, clarifying simulated vs. planned AI, or .txt upload.
   **Produced:** the implementation of the three I selected.
   **What I changed:** ✏️
3. ✏️ *Add one prompt from an earlier milestone (e.g. the Replit Agent prompt that created the app) and what you changed.*

## Human judgment

- **Rejected suggestion:** a plain-text upload feature was offered as a small way to act on the "upload documents" feedback. I deferred it because ✏️ *(in your words: e.g. trust in the review mattered more to a claims manager than input format, and real reports arrive as PDFs, so .txt upload would not solve the real need).*
- **Corrected AI output:** the first version of the new engine flagged "aisle 6" as uncertain because a *different* fact in the same sentence used "should have", and it counted "wet floor sign" as evidence about the floor condition. Both were caught by reviewing test output and screenshots, then fixed.
- ✏️ *Add at least one decision that was yours: e.g. a wording you changed, a test case you added, a priority you ranked differently, or a claim in the docs you softened or corrected.*

## Verification

- Ran all five test cases plus two extra cases on the review engine **before and after** the revision, and saved the raw output ([evidence](evidence/)).
- Typechecked (`tsc --noEmit`) and built the app with Vite. Checked screenshots of the risk, challenge, detailed and invalid cases.
- A new report (Typical 2) exposed four bugs on its first run. These were fixed, and the first-run output is kept in [results-after-first-run.md](evidence/results-after-first-run.md).
- **Still to check:** ✏️ run all five cases myself in the **published Replit** after updating it; read through `analyze.ts`; confirm every number in `revision.md` matches what I see on screen.

## AI inside the product

| | |
| --- | --- |
| **Task** | Read a grocery-store incident report and produce a structured first review |
| **Input** | Free-text report pasted by the claims manager |
| **Output** | Key facts with source sentences; conflicting, uncertain and missing details; one follow-up question per open issue |
| **Current status** | **Simulated**: deterministic keyword and pattern rules in the browser. No model or API is connected, and no data is sent or stored. |
| **Planned** | A language model returning the same structured output, so reports in any writing style can be reviewed. |
