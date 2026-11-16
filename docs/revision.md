# ClaimLens: Prototype Revision

**Intended user:** a grocery-store claims manager doing the first review of a new general-liability incident report (for example, a customer slip-and-fall).
**Central task:** paste a report, click **Review report**, then use the structured review (key facts, missing or unclear information, follow-up questions) to decide what to confirm next.

---

## 1. Priority improvements

I chose three improvements based on the earlier tests, my known-limitations list and peer review. All three focus on the central task: making the review trustworthy and specific enough to act on.

| # | Improvement | Evidence behind it | What changed |
| --- | --- | --- | --- |
| 1 | **Negation and conflict consistency** | Peer review: "no warning sign" became "Warning sign or notice mentioned", and the conflicting report listed 2:15 p.m. and "water" as *Stated in report* while also flagging them as conflicts. My own earlier tests showed the same. | The review engine now recognizes stated absence ("no witnesses", "camera … not working", "refused medical treatment", "no warning sign"). Any detail that conflicts or is hedged is tagged **Conflicting – confirm** or **Uncertain – confirm** *inside Key facts*, so it never appears as *Stated in report*. Every flagged item shows the specific follow-up question that resolves it (**Ask: …**), and every question shows which item it resolves. |
| 2 | **Specific facts and better gaps** | Peer review: "yesterday afternoon" treated as sufficient, shopper's name missed. Earlier test: generic labels ("Injury or condition noted"), last floor inspection missed, awkward questions such as "Can you confirm the video for this incident?" | Facts now show the actual detail ("Bruised left knee", "Ambulance called; Seen at Northside Urgent Care", "Lila Chen (contact info given to manager)"). Relative dates and time-of-day words are flagged as uncertain. Two new checklist items were added: **injured person's name** and **last floor inspection**. Each gap has its own specific question (e.g. "Is there camera coverage of this area, and has the footage been saved?"). |
| 3 | **Clarify what is simulated vs. planned** | Peer review: "It's not so clear to me what is simulated, why do we need a more powerful AI if this website seems to do it." | A **How this review works** panel under the Review button explains what is working, what is simulated and what is planned. The banner now says that no AI model is connected. A test with unfamiliar wording (below) shows concretely why a language model is needed. |

Supporting changes: the review logic moved out of `App.tsx` into `src/lib/analyze.ts` so it can be tested directly. A sentence-splitting bug was fixed: "…2:15 p.m. I think…" had been merged into one sentence, which caused facts to be mislabeled. The invalid-input message now points users to the sample reports.

**Code:** [`analyze.ts`](../GitHub-upload/artifacts/claimlens/src/lib/analyze.ts) · [`App.tsx`](../GitHub-upload/artifacts/claimlens/src/App.tsx) · [`index.css`](../GitHub-upload/artifacts/claimlens/src/index.css)

---

## 2. Response to peer feedback

I received four peer reviews (one was blank). Names are omitted.

| Feedback or observed issue | Decision | What changed, or why it was deferred |
| --- | --- | --- |
| Top recommendation: make uncertainty and negation consistent. Keep "no warning sign", label disputed details "Conflicting – confirm", and connect each unresolved issue to a specific follow-up question. | **Acted on** | Improvement #1. Disputed details now carry a *Conflicting – confirm* tag in Key facts, negatives are preserved, and every flag shows its linked question. This was the most important trust problem, because a summary that sounds more certain than the report can mislead a claims decision. |
| The detailed report's "no warning sign" became "Warning sign or notice mentioned". | **Acted on** | Now reads "No warning sign before the incident (as reported)". See the before/after below. |
| The incomplete report treats "yesterday afternoon" as sufficient and misses the shopper's name. | **Acted on** | Improvement #2. "Yesterday" and "Afternoon" are tagged *Uncertain – confirm*, and "Injured person's name not in report" is flagged with a question. |
| Unclear what is simulated, and why a more powerful AI is needed if the site already works. | **Adapted** | Improvement #3. I didn't connect a model yet. Instead I explained the difference in the app and tested where the rules break. The probe test shows that the rules miss a fall described as "went down hard" and an injury described as "hip was bothering him". |
| "blah blah blah" was rejected, and the reviewer said they "could not complete the main task". | **Adapted** | Rejecting non-reports is intended behavior. The reviewer still wasn't sure what to do next, so the error message now tells users what to include and suggests loading a sample report. |
| Add a way to upload documents instead of typing. | **Deferred** | This is a real need, because claims managers often receive reports as PDFs or scanned forms. However, it doesn't improve the quality of the review itself, and reliable PDF/scan parsing is a separate piece of work. With limited time, I prioritized trust in the review over input format. Plan: plain-text/PDF upload in the final milestone if time allows. |
| "Very useful and makes an incident report much easier." | **No change needed** | Confirms the core flow is understandable. |

---

## 3. Evaluation

The AI review is **simulated with rules**, so these tests evaluate whether the experience and outputs are useful and understandable. They do **not** measure the accuracy of a language model. Each success criterion was written before the test was run. All inputs are synthetic ([test-inputs.md](evidence/test-inputs.md)). Raw outputs: [before](evidence/results-before.md) · [after](evidence/results-after.md).

| Case | Input or action | Expected result / success criterion | Actual result | Pass, partial, or fail | Implication or next step |
| --- | --- | --- | --- | --- | --- |
| Typical 1 | **Detailed** sample → Review report | All checklist details found, with the actual detail. "No warning sign" kept as a negative. Camera "should have recorded" flagged as uncertain. Gaps flagged for injured person's name and last inspection. | 10 facts with specific details ("Bruised left knee", "Lila Chen (contact info given to manager)"). Warning sign: "No warning sign before the incident (as reported)". Video tagged *Uncertain – confirm* ("should have"). Name and last inspection flagged as missing, each with a question. | **Pass** | The earlier partial result is resolved for this report. |
| Typical 2 | New manager-written report (store #4, loose mat, first aid, witness, inspection log, saved footage) | All details found, including name and inspection time. The inspection time (6:15) is **not** confused with the incident time (6:40). Only the warning sign is flagged as missing. | **First run: partial.** False time conflict "6:40 p.m. vs. 6:15 p.m.", "scraped her right hand" not recognized as an injury, and the name and location facts showed the whole sentence. **After fixes:** 11 facts correct, only the warning sign flagged as missing. | **Partial → Pass** | A new, realistic report exposed rule gaps right away. Because I fixed these after seeing this report, this case is no longer an unseen test. The same weakness shows up in the probe below. |
| Challenge | **Unclear / conflicting** sample | All four conflicts (time, floor condition, treatment, warning sign) shown as *Conflicting – confirm* in Key facts. No disputed detail shown as *Stated in report*. Each conflict linked to one question. | All four conflicts found and tagged in Key facts and in Missing/unclear, each with a linked question. Before the revision, the floor-condition conflict was **missed** (both claims were in one sentence) and 2:15 p.m. / "water" / "warning sign mentioned" appeared as *Stated*. | **Pass** | The injury fact repeats itself ("Hurt shoulder; Shoulder was painful"). This is minor wording to tidy. |
| Invalid or empty | (a) Empty box → Review. (b) `blah blah blah` → Review | No review generated. A clear message says what to do next. | (a) "Add an incident report before starting a review." (b) Message asks for what happened and where, and suggests loading a sample. No results shown. | **Pass** | – |
| Risk | Report with **negated evidence**: no witnesses, camera not working, refused treatment, sign placed only after the fall | Nothing implies that a witness, footage, treatment or a sign existed. Negatives appear as stated absences. | **Before: fail.** Key facts said "Witness or potential witness mentioned", "Video or recording mentioned", "Treatment or care mentioned" and "Warning sign or notice mentioned", all as *Stated in report*, with **0** follow-up questions. **After:** "No witnesses (as reported)", "No usable video (as reported)", "No medical treatment (as reported)", "No warning sign before the incident (as reported)". | **Fail → Pass** | This was the most serious failure (see Risk response). It only holds for phrasings the rules know. |

**Extra cases**

- **Missing information sample: partial.** "Yesterday" and "afternoon" are now flagged as uncertain, and the name gap is caught. However, "a cashier helped them sit down" is not suggested as a possible witness, and "left before the form was finished" is not highlighted.
- **Probe with unfamiliar wording: fail (documents a limitation).** "An older gentleman went down hard … Nobody else was around. His hip was bothering him … oily residue on the tile." The app rejected it as not an incident report because "went down" isn't in its vocabulary. When "slipped" was added, it said cause and injury were "not in report", even though both are in the report.

### Before and after: same input, same task

**Issue:** the summary appears more certain than the report (peer review's top recommendation).

| Input | Before | After |
| --- | --- | --- |
| Detailed sample: "there was no warning sign nearby" | Warning signs: *Warning sign or notice mentioned* (Stated in report) | Warning sign: *No warning sign before the incident (as reported)* |
| Unclear sample: "around 2:15 p.m. I think it was closer to 4:00 p.m." | Key facts → Time: *2:15 p.m.* (**Stated in report**) | Key facts → Time: *Conflicting: 2:15 p.m. vs. 4:00 p.m.* (**Conflicting – confirm**), with Ask: "Which is correct? Can a receipt or camera timestamp confirm it?" |
| Unclear sample: "possibly slipped on water, but the floor may have been dry" | Cause: *Reported condition: water* (Stated). Conflict not detected. | Cause: *Conflicting: Slipped on water vs. Floor reported dry* (Conflicting – confirm) |
| Risk report (negations) | 4 absent items shown as "mentioned", 0 questions | 4 absences preserved. 2 real gaps flagged with questions. |

Screenshots: [before – risk](evidence/screenshots/before-risk-negation.png) · [after – risk](evidence/screenshots/after-risk-negation.png) · [before – conflicting](evidence/screenshots/before-conflicting.png) · [after – conflicting](evidence/screenshots/after-conflicting.png) · [before – detailed](evidence/screenshots/before-detailed.png) · [after – detailed](evidence/screenshots/after-detailed.png)

**Did the revision help?** Yes, for the reports and phrasings it was designed around. Disputed and negated details no longer show up as plain facts, and every flag now leads to a concrete question. It did not make the engine understand language in general. The probe shows it still fails on wording it has never seen.

### What does the evidence tell me?

The central flow now works well on the three sample reports and two new structured reports. Facts are specific, negatives and conflicts are labeled consistently, every open issue links to a question, and invalid input is handled. What remains unreliable is anything written in unexpected words. The probe report was rejected outright, and when forced through, the app wrongly said details were missing. Typical 2 also needed fixes after its first run. That pattern (each new report reveals new rule gaps) suggests the rule-based approach will not scale to real reports. The results support the *experience* I claim for the user: a structured first review with sources and targeted questions is quick to read and act on. They do not show that the analysis is accurate enough to rely on without reading the report. That still needs a real language model, tested on a larger and more varied set of reports. Next I would connect a model that returns the same structured output (fact, tag, source sentence, question), run these same cases plus the probe, and repeat inputs three times to check that the output is consistent.

---

## 4. Risk response: over-reliance on a review that sounds more certain than the report

**Who could be affected.** The injured customer, the claims manager, and the store. A claims manager skimming the review could believe that a witness, camera footage, medical treatment or a warning sign exists when the report says the opposite. They might then skip preserving footage before it's overwritten or skip finding a witness. If they believed a warning sign was present, they could treat the customer's claim unfairly. In the earlier version this really happened: the risk-case report produced four false "mentioned" facts and no follow-up questions.

**What I changed (implemented, not simulated).** The safeguard runs in the real interface. Only the AI analysis is simulated.
1. Stated absences are preserved as negatives ("No witnesses (as reported)").
2. A detail that conflicts or is hedged can't appear as *Stated in report*. It is tagged *Conflicting – confirm* or *Uncertain – confirm* right in Key facts.
3. A **review status banner** at the top counts open conflicting, uncertain and missing items and says "N items to confirm before relying on this review". The user sees how much is unresolved before reading the facts.
4. Each flagged item shows the source sentence and the specific question that resolves it. The user can check the original wording and has a next step, rather than just a disclaimer.

**What risk remains.** The safeguard only works when the rules recognize the wording. "Nobody else was around" was not recognized as "no witnesses", and the probe report's injury and cause were wrongly listed as missing. Also, a user can **Dismiss** a conflicting item, which removes it from the banner's count with no reason recorded. That keeps the user in control, but it could hide a real conflict. Next step: require a short reviewer note when a conflicting item is dismissed.

**Course theme.** This addresses **over-reliance on AI** (a confident-looking summary replacing reading the report) and **fairness** (a misread "no warning sign" could unfairly weaken an injured customer's claim). The design keeps the human reviewer responsible for the decision. ClaimLens does not score risk or make claim decisions.

---

## 5. AI role and implementation status

| Part | Status | How it works now |
| --- | --- | --- |
| Report input, samples, input checks | **Working** | Browser-only React app. Nothing is sent or stored. |
| Review display, source sentences, tags, linked questions, status banner, Keep/Edit/Dismiss | **Working** | Implemented in `App.tsx` |
| Extracting facts, gaps, conflicts and questions ("the AI") | **Simulated** | Keyword and pattern rules for 12 claim details in `src/lib/analyze.ts`. Questions are templates. |
| Reading reports in any writing style; incident-specific questions | **Planned** | A language model would receive the report text and return structured items (fact, tag, source sentence, follow-up question). The UI would stay the same. |

**AI task:** read a free-text incident report and produce a structured first review. **Input:** report text. **Output:** key facts with source sentences, flagged conflicting/uncertain/missing details, and follow-up questions. **Value:** a claims manager sees in seconds what is known, what is disputed and what to ask, with the original wording beside each item to check.

---

## 6. Remaining limitations and next priorities

Ranked by their effect on the central task:

1. **Rules fail on unfamiliar wording** (probe test, Typical 2 first run). *Next:* connect a real language model with structured output and source sentences, then rerun all cases and the probe, repeating each three times.
2. **Dismissing a conflict leaves no trace.** *Next:* require a short reviewer note to dismiss a *Conflicting – confirm* item.
3. **Input is paste-only.** *Next:* plain-text and PDF upload (deferred peer request).

Smaller issues: occasional repetitive wording in facts; possible witnesses implied by staff actions ("a cashier helped them") are not suggested; edits and decisions are lost on refresh.
