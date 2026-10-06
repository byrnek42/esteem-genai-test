# ClaimLens

**ClaimLens helps grocery-store claims managers do a faster, more complete first review of a new general liability incident report by pulling out key facts, flagging missing or conflicting information and suggesting follow-up questions.**

## What the first working slice does

1. The user pastes an incident report into the text box, or loads one of three sample reports (Detailed, Missing information, Unclear / conflicting).
2. The user clicks **Review report**.
3. The app shows a structured review:
   - **Key facts** (labelled *Stated in report*), each with the source sentence it came from
   - **Missing or unclear information** (labelled *Information to confirm*), including conflicting statements and vague wording
   - **Suggested follow-up questions**
4. The user can **Keep, Edit or Dismiss** each item.

## How to open the prototype

**Replit link:** https://claim-lens-incident-review.replit.app

Open the link and click a sample report, then click **Review report**.

## AI behavior: working vs. simulated

- **Intended future AI:** A language model would read free-text incident reports written in many different styles. It would extract and summarize the key facts, link each one to its supporting wording, identify gaps and contradictions and generate follow-up questions tailored to the incident.
- **Working now:** The full user flow works in the browser: entering a report, the review display, source sentences, Keep/Edit/Dismiss and error handling.
- **Simulated:** The "AI" is rule-based. It uses keyword and pattern matching against a checklist (date, time, store, location, cause, injury, medical treatment, witnesses, video, warning signs) plus simple conflict and vague-wording checks. Follow-up questions come from templates. No AI model or API is connected, and no data is saved or sent anywhere.

## Test results

| Test | Input or action | What happened | Pass, partial, or fail |
| --- | --- | --- | --- |
| Typical case | Detailed slip-and-fall report (aisle 6, leaking cooler, bruised knee, urgent care, witness, camera) → Review report | Found 10 key facts, each linked to its source sentence, and flagged the camera wording as uncertain. However, it said "warning sign mentioned" when the report says there was *no* sign, gave generic labels for the injury and treatment, missed gaps such as the customer's name and last floor inspection, and produced one awkward follow-up question. | Partial |
| Challenge case | Unclear/conflicting sample (two different times, "possibly slipped on water," no treatment and then a clinic visit, sign present vs. not seen) → Review report | Correctly flagged all 3 conflicts (time, injury/treatment, warning sign) and 2 vague statements, with useful follow-up questions. However, the Key facts section still listed disputed details (2:15 p.m., "water," "warning sign mentioned") as *Stated in report*, which contradicts the conflict flags below. | Partial |
| Invalid or empty case | Cleared the text box and clicked Review report | Showed the message "Add an incident report before starting a review." No results were generated, and the user could paste a report or load a sample and continue. | Pass |

**Extra test (missing information sample):** The app found 6 facts and flagged 4 missing items (medical treatment, witnesses, video, warning sign), each with a follow-up question. It treated the vague "yesterday" and "afternoon" as facts and did not flag the missing shopper name. Result: partial.

## Known limitations

1. **Simulated AI mislabels some facts.** Keyword matching can get facts backwards. For example, it reported "warning sign mentioned" when the report said there was *no* sign. Facts also use generic labels ("Injury or condition noted") instead of the actual detail ("bruised left knee").
2. **Conflicting details still appear as facts.** When a report contradicts itself, the app flags the conflict but still lists one version under Key facts as "Stated in report." Next step: mark disputed facts as "Conflicting – confirm."
3. **Gaps and questions are incomplete and generic.** It misses important gaps (such as the injured person's name, store number and last floor inspection), and the follow-up questions come from templates and can read awkwardly. No data is saved between sessions.

