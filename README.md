# ClaimLens

**ClaimLens helps grocery-store claims managers do a faster, more complete first review of a new general-liability incident report. It pulls out key facts, flags missing, uncertain or conflicting information, and suggests the follow-up question for each gap.**

**Intended user:** a claims manager (or store manager) reviewing a customer incident report such as a slip-and-fall, before deciding what to confirm next. ClaimLens does not score risk or make claim decisions.

## Working prototype

**Replit:** https://claim-lens-incident-review.replit.app

No login is needed. Click a sample report (or paste your own), then click **Review report**. Open **How this review works** under the button to see what is working, simulated and planned.

## Demo Video

**Google Drive (demo):** https://drive.google.com/file/d/1IO5UkEV3c8-DY3Jkglk8Al-JCT4z9m_8/view?usp=sharing

## Milestone documents

| Component | Link |
| --- | --- |
| Revision: priority improvements, peer feedback response, five test cases, before/after, interpretation, risk response, limitations and next priorities | [docs/revision.md](docs/revision.md) |
| Draft AI-use disclosure | [docs/ai-use-disclosure.md](docs/ai-use-disclosure.md) |
| Test inputs, raw before/after outputs, screenshots | [docs/evidence/](docs/evidence/) |
| Demo speaking notes | [docs/demo-script.md](docs/demo-script.md) |

## How it works

1. The user pastes an incident report or loads a sample (Detailed, Missing information, Unclear / conflicting).
2. **Review report** produces:
   - a **review status** banner counting items to confirm before relying on the review
   - **Key facts**, each with the actual detail and its source sentence, tagged *Stated in report*, *Uncertain – confirm* or *Conflicting – confirm*
   - **Missing or unclear information**, each linked to the question that resolves it
   - **Suggested follow-up questions**
3. The user can **Keep, Edit or Dismiss** any item.

### AI: working vs. simulated vs. planned

- **Working:** the full user flow, source sentences, tags, linked questions, status banner, Keep/Edit/Dismiss and input checks.
- **Simulated:** the "AI" is rule-based keyword and pattern matching for 12 claim details (date, time, store, location, cause, injury, treatment, witnesses, video, warning sign, injured person's name, last floor inspection), with negation and conflict handling. Questions come from templates. No AI model or API is connected, and no data is sent or stored.
- **Planned:** a language model that reads reports in any writing style and returns the same structured output with source sentences.

## Code

The running app lives in Replit. This repository holds a copy of the code:

- [`GitHub-upload/artifacts/claimlens/src/lib/analyze.ts`](GitHub-upload/artifacts/claimlens/src/lib/analyze.ts): simulated review engine (revised)
- [`GitHub-upload/artifacts/claimlens/src/App.tsx`](GitHub-upload/artifacts/claimlens/src/App.tsx): user interface
- [`GitHub-upload/artifacts/claimlens/src/index.css`](GitHub-upload/artifacts/claimlens/src/index.css): styles

## Previous milestone

The First Working Slice tests and known limitations are kept in this repository's history ([commit d83bd06](https://github.com/byrnek42/esteem-genai-test/blob/d83bd06/README.md)). The revision addresses all three of its known limitations. See [docs/revision.md](docs/revision.md).

All reports in this repository are synthetic.
