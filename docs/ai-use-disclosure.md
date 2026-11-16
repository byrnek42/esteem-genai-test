# AI-Use Disclosure

## Tools used

- **Replit Agent:** used once, for the initial prompt that built the first working slice of ClaimLens (React interface, layout, sample reports and the original rule-based review). I did not use any other AI tools in earlier milestones.
- **Claude (Anthropic, Claude Opus 5.5), Nov 16, 2026:** used to plan and implement this revision, run the tests and draft the documentation, including a first draft of this disclosure.

## Development assistance

- **Code:** Claude rewrote the rule-based review engine (`src/lib/analyze.ts`), adding negation handling, conflict and uncertainty tags, specific fact extraction, two new checklist items (injured person's name, last floor inspection) and linked follow-up questions. It also added the review status banner and the "How this review works" panel in `App.tsx`, and fixed a sentence-splitting bug ("p.m. I think…"). I added the revised files to my Replit project and uploaded them to GitHub.
- **Testing:** Claude wrote a script that runs the review engine directly on each test input, before and after the revision, and took screenshots of the built app. It proposed the risk-case report (negated evidence) and the unfamiliar-wording probe.
- **Writing:** Claude drafted `revision.md`, the README update, the demo notes and this disclosure from the test results and my peer feedback. I reviewed and edited this disclosure.
- **Earlier milestones:** Replit Agent generated the original app from a single prompt describing the user, the problem and the features I wanted.

## Representative prompts

1. **Prompt (to Claude):** "need help doing this assignment," with the assignment brief, my Replit and GitHub links, and all of my peer feedback.
   **Produced:** an analysis of my existing code, a "before" test run that found a new failure (a report saying "no witnesses… camera not working… refused treatment" was shown as witness, video and treatment *mentioned*), and four proposed improvements.
   **What I did with it:** I used that failure as my risk test case and made the peer reviewer's top recommendation (consistent negation and uncertainty) my first priority.
2. **Prompt (to Claude, multiple-choice):** choose 2–3 improvements: negation and conflict consistency, specific facts and gaps, clarifying simulated vs. planned AI, or .txt upload.
   **My choice:** the first three. I did not choose .txt upload.
   **What I did with it:** I added the revised files to Replit and uploaded the code and documentation to GitHub.
3. **Prompt (to Replit Agent, earlier milestone):** I could not recover the exact wording from Replit's history. The requirements I gave it are recorded in the `replit.md` file it created: build a one-page prototype for grocery-store claims managers with no backend and no database; simulate the review with keyword matching rather than a real AI API; do not score risk or make decisions; separate statements from the report from information to confirm; and keep source sentences next to each fact.
   **Produced:** the first working slice: report input, three sample reports, the structured review and Keep/Edit/Dismiss.
   **What I changed:** in my First Working Slice tests I found it mislabeled facts (e.g. "warning sign mentioned" when the report said there was none). I documented this as a known limitation, and it became the main fix in this revision.

## Human judgment

- **Rejected suggestion:** Claude offered a plain-text upload feature as a small response to the "upload documents" peer feedback. I deferred it because a claims manager can already paste report text, so upload would save a little time but would not make the review more trustworthy. Real reports usually arrive as PDFs or scanned forms, so a .txt-only upload would not solve the actual need, and proper PDF parsing was too big for this milestone.
- **Choosing priorities:** I picked the three changes that affect whether a claims manager can trust the review. The feedback that worried me most was that "no warning sign" turned into "warning sign mentioned": a manager skimming the review could believe the opposite of what the report says, which could unfairly hurt the injured customer's claim. I added the "how it works" explanation because a reviewer couldn't tell what was simulated, and I don't want users to overestimate what the tool can do.
- **Corrected AI output:** the first version of the new engine flagged "aisle 6" as uncertain because a *different* fact in the same sentence used "should have", and it counted "wet floor sign" as evidence about the floor condition. A new test report also exposed a false time conflict (the inspection time was treated as the incident time). These were caught by reviewing test output and screenshots, then fixed. The first-run failures are kept in the evidence folder rather than hidden.

## Verification

- Ran all five test cases plus two extra cases on the review engine **before and after** the revision, and saved the raw output ([evidence](evidence/)).
- Typechecked (`tsc --noEmit`) and built the app with Vite, with screenshots of the risk, challenge, detailed and invalid cases.
- After adding the revised files in Replit, the editor reported 0 TypeScript errors and 0 warnings.
- **Still needs checking:** the review rules have only been tested on seven synthetic reports. The probe test shows they fail on unfamiliar wording, so none of these results show the approach would work on real reports.

## AI inside the product

| | |
| --- | --- |
| **Task** | Read a grocery-store incident report and produce a structured first review |
| **Input** | Free-text report pasted by the claims manager |
| **Output** | Key facts with source sentences; conflicting, uncertain and missing details; one follow-up question per open issue |
| **Current status** | **Simulated**: deterministic keyword and pattern rules in the browser. No model or API is connected, and no data is sent or stored. |
| **Planned** | A language model returning the same structured output, so reports in any writing style can be reviewed. |
