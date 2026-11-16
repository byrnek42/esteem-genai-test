// ClaimLens simulated review engine (rule-based, runs in the browser).
// This stands in for a planned language-model review. It does NOT call any AI API.
//
// Revision 2 changes:
//  1. Negation-aware: "no warning sign", "no witnesses", "refused treatment" are kept as negatives.
//  2. Consistent uncertainty: a detail that conflicts or is hedged is tagged
//     "Conflicting – confirm" / "Uncertain – confirm" in Key facts, never "Stated in report".
//  3. Every unresolved item links to one specific follow-up question.
//  4. Facts show the actual detail ("bruised left knee") instead of generic labels.
//  5. New gaps: injured person's name, last floor inspection, vague dates/times.

export type ItemKind = 'fact' | 'finding' | 'question';
export type ItemTag = 'Stated in report' | 'Uncertain – confirm' | 'Conflicting – confirm' | 'Missing – ask';
export type ReviewItem = {
  id: string;
  kind: ItemKind;
  label: string;
  text: string;
  evidence: string;
  tag: ItemTag;
  status: 'open' | 'kept' | 'dismissed';
  relatedId?: string; // fact/finding -> its follow-up question; question -> its finding
  linkText?: string;  // short text of the linked item, shown inline
};

export const samples = {
  Detailed: `On March 14, 2025, at approximately 10:35 a.m., I was shopping at Greenway Market on 8th Street. I slipped on a puddle near the dairy coolers in aisle 6. The floor was wet from a leaking refrigerator case, and there was no warning sign nearby. I bruised my left knee and reported the incident to the service desk. An employee called an ambulance, and I was examined at Northside Urgent Care that afternoon. A customer named Lila Chen saw me fall and gave her contact information to the manager. The ceiling camera above aisle 6 should have recorded the incident.`,
  'Missing information': `A shopper slipped near the produce department at our Greenway Market yesterday afternoon. They said the floor felt slick and their wrist hurt afterward. A cashier helped them sit down, but they left before the manager could finish the incident form.`,
  'Unclear / conflicting': `On April 6, 2025, I fell by the bakery at Greenway Market around 2:15 p.m. I think it was closer to 4:00 p.m., though I am not sure. I possibly slipped on water, but the floor may have been dry. I hurt my shoulder and did not need treatment. Later I went to the clinic because my shoulder was painful. A wet floor sign was there; I did not see any warning sign before the fall.`,
} as const;

const HEDGE = /\b(?:possibly|maybe|perhaps|not sure|unsure|I think|I believe|might have|may have|could have|should have|seems like|probably)\b/i;
const CLOCK = /\b\d{1,2}(?::\d{2})?\s*[ap]\.?m\.?/gi;
const ABS_DATE = /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,?\s+\d{4})?)\b/gi;
const REL_DATE = /\b(?:yesterday|today|this morning|last night|last (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|week))\b/i;

type Category = {
  key: string;
  label: string;
  mention: RegExp;
  negation?: RegExp;      // stated absence ("no witnesses")
  positive?: RegExp;      // presence, checked after negation spans are removed
  absentText?: string;    // fact text when only the negation is stated
  extract: (sentences: string[]) => string | null;
  missingQuestion: string;
  confirmQuestion: string; // used for uncertain or conflicting details
};

const uniq = (values: (string | null | undefined)[]) => [...new Set(values.filter(Boolean) as string[])];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const firstMatch = (sentences: string[], re: RegExp, group = 0) => {
  for (const s of sentences) { const m = s.match(re); if (m?.[group]) return clean(m[group]); }
  return null;
};

const categories: Category[] = [
  {
    key: 'person', label: "Injured person's name",
    mention: /(?:[Mm]y name is|I am|I'm)\s+[A-Z][a-z]+|\b(?:[Cc]ustomer|[Ss]hopper|[Cc]laimant|[Gg]uest)\s+(?:named\s+)?[A-Z][a-z]+|\b(?:Mr|Ms|Mrs)\s+[A-Z][a-z]+/,
    extract: (s) => firstMatch(s, /(?:named|name is|I am|I'm|Mr|Ms|Mrs|[Cc]ustomer|[Ss]hopper|[Cc]laimant|[Gg]uest)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/, 1),
    missingQuestion: "What is the injured person's full name and contact information?",
    confirmQuestion: "Can you confirm the injured person's full name and contact information?",
  },
  {
    key: 'date', label: 'Date',
    mention: new RegExp(`${ABS_DATE.source}|${REL_DATE.source}`, 'i'),
    extract: (s) => s.join(' ').match(ABS_DATE)?.[0] ?? null,
    missingQuestion: 'What was the calendar date of the incident?',
    confirmQuestion: 'What was the exact calendar date of the incident?',
  },
  {
    key: 'time', label: 'Time',
    mention: /\b\d{1,2}(?::\d{2})?\s*[ap]\.?m\.?|\b(?:morning|afternoon|evening|noon|midnight)\b/i,
    extract: (s) => s.filter((x) => !/\b(?:inspect(?:ed|ion)?|swept|cleaned|last checked)\b/i.test(x)).join(' ').match(CLOCK)?.[0] ?? null,
    missingQuestion: 'What time did the incident happen? Can a receipt or camera timestamp confirm it?',
    confirmQuestion: 'What time did the incident happen? Can a receipt or camera timestamp confirm it?',
  },
  {
    key: 'store', label: 'Store',
    mention: /\b[A-Z][\w'&-]*(?:\s+[A-Z][\w'&-]*){0,3}\s+(?:Market|Grocery|Foods|Supermarket)\b|\bstore\s*#?\s*\d+\b|\b(?:our|the)\s+(?:store|market|grocery)\b/,
    extract: (s) => {
      const name = firstMatch(s, /\b((?:[A-Z][\w'&-]*\s+){1,3}(?:Market|Grocery|Foods|Supermarket))\b/, 1)?.replace(/^(?:On|At|In|Our|The)\s+/, '');
      const num = firstMatch(s, /\bstore\s*(#?\s*\d+)/i, 1);
      const street = firstMatch(s, /\bon\s+(\d*\w*\s+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?))/, 1);
      return uniq([name, num && `store ${num.replace(/\s/g, '')}`, street]).join(', ') || null;
    },
    missingQuestion: 'Which store (name and store number) did this happen in?',
    confirmQuestion: 'Which store (name and store number) did this happen in?',
  },
  {
    key: 'location', label: 'Location in store',
    mention: /\baisle\s*\d+\b|\b(?:near|by|beside|inside|at|in)\s+(?:the\s+)?(?:produce|bakery|dairy|freezer|entrance|checkout|register|restroom|cooler|deli|pharmacy|meat|seafood|[a-z]+\s+(?:department|section|area))\b/i,
    extract: (s) => uniq([
      firstMatch(s, /\baisle\s*\d+\b/i),
      firstMatch(s, /\b(?:near|by|beside|at)\s+(?:the\s+)?(?:[a-z]+\s+){0,2}(?:department|section|area|coolers?|entrance|checkout|registers?|restroom|bakery|produce|deli|pharmacy|freezers?|dairy)\b/i),
    ]).join(', ') || null,
    missingQuestion: 'Where exactly in the store did the incident happen (aisle or department)?',
    confirmQuestion: 'Where exactly in the store did the incident happen (aisle or department)?',
  },
  {
    key: 'cause', label: 'Cause / floor condition',
    mention: /\b(?:puddle|water|spill(?:ed)?|leak(?:ing|ed)?|wet(?!\s+floor\s+signs?)|slick|slippery|liquid|dry|tripped over|uneven|loose mat|object fell)\b/i,
    negation: /\b(?:floor (?:may have been|might have been|was|looked) dry|dry floor|not wet|no water|nothing on the floor)\b/i,
    positive: /\b(?:puddle|water|spill(?:ed)?|leak(?:ing|ed)?|wet(?!\s+floor\s+signs?)|slick|slippery|liquid|tripped over|uneven|loose mat|object fell)\b/i,
    absentText: 'Floor reported dry',
    extract: (s) => {
      const parts = uniq([
        firstMatch(s, /\b(?:slipped|tripped|fell)\s+(?:on|over|in)\s+((?:a|an|the|some)\s+)?([\w-]+(?:\s+[\w-]+)?)(?=[,.;]|\s+(?:near|in|at|by|and|but)\b|$)/i),
        firstMatch(s, /\bfloor was wet from\s+[\w\s-]+?(?=[,.;]|\s+and\b)/i),
      ]);
      if (!parts.length) parts.push(firstMatch(s, /\bfloor\s+(?:felt|was|looked)\s+(?:slick|slippery|wet)/i) ?? '');
      return parts.filter(Boolean).map(cap).join('; ') || null;
    },
    missingQuestion: 'What caused the incident (for example, what was on the floor)?',
    confirmQuestion: 'Was the floor wet or dry at the time, and what was on it?',
  },
  {
    key: 'injury', label: 'Injury',
    mention: /\b(?:injur(?:y|ed|ies)|hurt|pain(?:ful)?|sore|bruise[ds]?|cut|scraped|twisted|swel(?:ling|led)|fracture[ds]?|broke|sprain(?:ed)?|wound|unhurt)\b/i,
    negation: /\b(?:no injur(?:y|ies)|not injured|unhurt|(?:was|were) not hurt|wasn't hurt|did not get hurt)\b/i,
    positive: /\b(?:injur(?:y|ed|ies)|hurt|pain(?:ful)?|sore|bruise[ds]?|cut|scraped|twisted|swel(?:ling|led)|fracture[ds]?|broke|sprain(?:ed)?|wound)\b/i,
    absentText: 'No injury reported',
    extract: (s) => {
      const a = firstMatch(s, /\b(bruised|hurt|injured|sprained|cut|fractured|broke|twisted|scraped)\s+(?:my|her|his|their)\s+((?:left|right)\s+)?(\w+)/i);
      const b = firstMatch(s, /\b(?:my|her|his|their)\s+((?:left|right)\s+)?(\w+)\s+(?:hurt|was painful|was sore|swelled|was swollen)/i);
      return uniq([a, b].map((v) => v?.replace(/\b(?:my|her|his|their)\s+/i, ''))).map(cap).join('; ') || null;
    },
    missingQuestion: 'Was anyone injured, and if so, what was the injury?',
    confirmQuestion: 'What injury did the person have, and has it been described consistently?',
  },
  {
    key: 'treatment', label: 'Medical treatment',
    mention: /\b(?:doctor|physician|hospital|urgent care|clinic|ambulance|paramedic|medical|treated|treatment|emergency room|first aid|examined)\b/i,
    negation: /\b(?:(?:did not|didn't|does not|doesn't) need (?:any )?(?:medical )?(?:treatment|care|help)|no (?:medical )?(?:treatment|care)|(?:refused|declined) (?:any )?(?:medical )?(?:treatment|care|help|an ambulance))\b/i,
    positive: /\b(?:doctor|physician|hospital|urgent care|clinic|ambulance|paramedic|treated|emergency room|first aid|examined)\b/i,
    absentText: 'No medical treatment (as reported)',
    extract: (s) => uniq([
      /\bambulance\b/i.test(s.join(' ')) ? 'Ambulance called' : null,
      firstMatch(s, /\b(?:at|to)\s+((?:[A-Z][\w'-]*\s+){1,3}(?:Urgent Care|Hospital|Clinic|Medical Center))/, 1)?.replace(/^/, 'Seen at '),
      firstMatch(s, /\bwent to the (?:clinic|hospital|doctor|emergency room)/i),
      firstMatch(s, /\bfirst aid\b/i),
    ]).map(cap).join('; ') || null,
    missingQuestion: 'Did the person receive any medical care? If so, where and when?',
    confirmQuestion: 'What medical care was received, where, and when?',
  },
  {
    key: 'witnesses', label: 'Witnesses',
    mention: /\b(?:witness(?:ed|es)?|saw (?:me|her|him|them|the|it)|watched|nobody saw|no one saw|contact information)\b/i,
    negation: /\b(?:no (?:witness(?:es)?|one (?:else )?saw)|nobody (?:saw|witnessed)|not witnessed)\b/i,
    positive: /\b(?:witness(?:ed|es)?|saw|watched|contact information)\b/i,
    absentText: 'No witnesses (as reported)',
    extract: (s) => {
      const name = firstMatch(s, /\b(?:named\s+)?([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:saw|witnessed|watched)/, 1);
      const contact = /contact information/i.test(s.join(' '));
      return name ? `${name}${contact ? ' (contact info given to manager)' : ''}` : 'Witness mentioned (name not given)';
    },
    missingQuestion: 'Did anyone see the incident? If so, record their names and contact details.',
    confirmQuestion: 'Who saw the incident, and have their names and contact details been recorded?',
  },
  {
    key: 'video', label: 'Video',
    mention: /\b(?:camera|cctv|video|footage|surveillance|recorded|recording)\b/i,
    negation: /(?:\b(?:camera|video|cctv|footage)\b[^.;]{0,40}?\b(?:not working|wasn't working|was not working|broken|not recording|unavailable|did not record|was off)\b|\bno (?:camera|video|footage|cctv)\b)/i,
    positive: /\b(?:camera|cctv|video|footage|surveillance|recorded)\b/i,
    absentText: 'No usable video (as reported)',
    extract: (s) => (/\bfootage\s+(?:has been|was)\s+(?:saved|preserved|kept)\b/i.test(s.join(' ')) ? 'Camera footage saved' : null) ?? firstMatch(s, /\b(?:the\s+)?(?:\w+\s+)?camera\s+(?:above|in|near|at)\s+[\w\s]+?(?=\s+(?:should|may|might|was|is|recorded)\b)/i) ?.replace(/^the\s+/i, '').replace(/^\w/, (ch) => ch.toUpperCase()) ?? 'Camera or recording mentioned',
    missingQuestion: 'Is there camera coverage of this area, and has the footage been saved?',
    confirmQuestion: 'Has the camera footage been checked and saved?',
  },
  {
    key: 'warning', label: 'Warning sign',
    mention: /\b(?:warning|wet floor|caution)\s+signs?\b|\bcones?\b|\bsignage\b|\bno signs?\b|\bwithout a sign\b/i,
    negation: /(?:\b(?:no|without (?:a|any)|did not see (?:a|any)|didn't see (?:a|any))\s+(?:\w+\s+){0,2}(?:signs?|cones?)\b|\b(?:signs?|cones?)\s+(?:was|were)\s+not\s+(?:placed|there|present|out)\b)/i,
    positive: /\b(?:(?:warning|wet floor|caution)\s+signs?|cones?|signage)\b/i,
    absentText: 'No warning sign before the incident (as reported)',
    extract: (s) => firstMatch(s, /\b(?:a\s+)?(?:wet floor|warning|caution)\s+sign\s+was\s+(?:there|in place|present|placed)[^.;,]*/i) ?? 'Warning sign present (as reported)',
    missingQuestion: 'Was a warning sign or cone in place before the incident? Where?',
    confirmQuestion: 'Was a warning sign in place before the incident, and where was it?',
  },
  {
    key: 'inspection', label: 'Last floor inspection',
    mention: /\b(?:inspect(?:ed|ion)?|swept|sweep|floor (?:check|walk)|last checked|cleaned)\b/i,
    extract: (s) => firstMatch(s, /\b(?:last\s+)?(?:inspect(?:ed|ion)?|swept|cleaned|checked)\b.*?(?:\d{1,2}(?::\d{2})?\s*[ap]\.m\.|(?=[;]|$))/i)?.replace(/^\w/, (ch) => ch.toUpperCase()) ?? null,
    missingQuestion: 'When was this area last inspected or cleaned before the incident? Check the floor-walk log.',
    confirmQuestion: 'When was this area last inspected or cleaned before the incident?',
  },
];

export function sentencesOf(report: string) {
  // Protect a.m./p.m. dots, but keep the final dot as a sentence end when a new sentence follows ("2:15 p.m. I think…").
  const protectedReport = report
    .replace(/\b([aApP])\.([mM])\.(?=\s+[A-Z])/g, '$1∯$2.')
    .replace(/\b([ap])\.m\./gi, '$1∯m∯');
  return protectedReport.match(/[^.!?\n]+(?:[.!?]+|$)/g)?.map((s) => s.replace(/∯/g, '.').trim()).filter(Boolean) ?? [];
}

const normTime = (t: string) => t.replace(/[.\s]/g, '').toLowerCase().replace(/^(\d{1,2})([ap]m)$/, '$1:00$2');

export function isLikelyIncidentReport(report: string) {
  const eventSignals = /\b(?:slip(?:ped|ping)?|trip(?:ped|ping)?|fell|injur(?:y|ed|ies)|hurt|collision|struck)\b/i;
  const fallWithContext = /\bfall\b/i.test(report) && /\b(?:incident|customer|shopper|employee|person|suffered|experienced)\b/i.test(report);
  return (eventSignals.test(report) || fallWithContext) && report.trim().split(/\s+/).length >= 4;
}

export function analyzeReport(report: string): ReviewItem[] {
  const sentences = sentencesOf(report);
  const facts: ReviewItem[] = [];
  const findings: { finding: ReviewItem; question: string; factId?: string }[] = [];
  const usedHedgeSentences = new Set<string>();

  for (const c of categories) {
    let evidence = sentences.filter((s) => c.mention.test(s));
    // Witness names are not the injured person.
    if (c.key === 'person') evidence = evidence.filter((s) => !/\b(?:saw|witness|watched)\b/i.test(s));
    const factId = `fact-${c.key}`;

    if (!evidence.length) {
      findings.push({
        finding: { id: `missing-${c.key}`, kind: 'finding', label: `${c.label} not in report`, text: 'Not mentioned in the report. Ask before relying on this review.', evidence: '', tag: 'Missing – ask', status: 'open' },
        question: c.missingQuestion,
      });
      continue;
    }

    // Presence vs. stated absence (negation-aware).
    const negSents = c.negation ? evidence.filter((s) => c.negation!.test(s)) : [];
    const posSents = c.negation
      ? evidence.filter((s) => (c.positive ?? c.mention).test(s.replace(new RegExp(c.negation!.source, 'gi'), ' ')))
      : evidence;

    // Category-specific conflicts.
    let conflict: string | null = null;
    if (c.key === 'time') {
      // Ignore times that belong to an inspection/cleaning log, not the incident.
      const incidentText = sentences.filter((s) => !/\b(?:inspect(?:ed|ion)?|swept|cleaned|last checked|floor-walk)\b/i.test(s)).join(' ');
      const times = uniq((incidentText.match(CLOCK) ?? []).map((t) => t.trim()));
      if (new Set(times.map(normTime)).size > 1) conflict = times.join(' vs. ');
    } else if (c.key === 'date') {
      const dates = uniq(report.match(ABS_DATE) ?? []);
      if (dates.length > 1) conflict = dates.join(' vs. ');
    } else if (negSents.length && posSents.length) {
      conflict = `${c.extract(posSents) ?? 'Mentioned'} vs. ${c.absentText?.replace(/ \(as reported\)/, '') ?? 'stated absent'}`;
    }

    // Vague values (relative date, time of day only).
    let vague: string | null = null;
    if (c.key === 'date' && !c.extract(evidence)) vague = report.match(REL_DATE)?.[0] ?? null;
    if (c.key === 'time' && !c.extract(evidence)) vague = report.match(/\b(?:morning|afternoon|evening|noon|midnight)\b/i)?.[0] ?? null;
    if (c.key === 'store' && !/\b[A-Z][\w'&-]*\s+(?:Market|Grocery|Foods|Supermarket)\b|\bstore\s*#?\s*\d+/.test(evidence.join(' '))) vague = 'store not named';

    // Uncertain only if every sentence supporting this detail is hedged.
    const hedged = evidence.every((s) => HEDGE.test(s)) ? evidence[0] : undefined;
    const evidenceText = conflict
      ? uniq([...posSents, ...negSents, ...(c.key === 'time' || c.key === 'date' ? evidence : [])]).join(' ')
      : evidence[0];

    if (conflict) {
      evidence.forEach((s) => usedHedgeSentences.add(s));
      facts.push({ id: factId, kind: 'fact', label: c.label, text: `Conflicting: ${conflict}`, evidence: evidenceText, tag: 'Conflicting – confirm', status: 'open' });
      findings.push({
        finding: { id: `conflict-${c.key}`, kind: 'finding', label: `Conflicting ${c.label.toLowerCase()}`, text: `The report gives conflicting details (${conflict}). Confirm which is correct before relying on either.`, evidence: evidenceText, tag: 'Conflicting – confirm', status: 'open' },
        question: c.key === 'time' ? `The report gives two times (${conflict}). Which is correct? Can a receipt or camera timestamp confirm it?` : c.confirmQuestion,
        factId,
      });
      continue;
    }

    const onlyNegated = negSents.length > 0 && posSents.length === 0;
    const value = onlyNegated ? c.absentText! : (c.extract(posSents.length ? posSents : evidence) ?? clean(evidence[0]));

    if (vague || hedged) {
      if (hedged) usedHedgeSentences.add(hedged);
      const why = vague
        ? (vague === 'store not named' ? 'Store is referred to but not named' : `Only “${vague}” is given`)
        : `Report says “${hedged!.match(HEDGE)![0]}”`;
      facts.push({ id: factId, kind: 'fact', label: c.label, text: vague && vague !== 'store not named' ? cap(vague) : value, evidence: hedged ?? evidence[0], tag: 'Uncertain – confirm', status: 'open' });
      findings.push({
        finding: { id: `uncertain-${c.key}`, kind: 'finding', label: `Uncertain ${c.label.toLowerCase()}`, text: `${why}. Treat as unconfirmed.`, evidence: hedged ?? evidence[0], tag: 'Uncertain – confirm', status: 'open' },
        question: c.confirmQuestion,
        factId,
      });
      continue;
    }

    facts.push({ id: factId, kind: 'fact', label: c.label, text: value, evidence: (onlyNegated ? negSents[0] : posSents[0]) ?? evidence[0], tag: 'Stated in report', status: 'open' });
  }

  // Hedged sentences not already tied to a category.
  sentences.forEach((s, i) => {
    const hedge = s.match(HEDGE)?.[0];
    if (hedge && !usedHedgeSentences.has(s)) {
      findings.push({
        finding: { id: `vague-${i}`, kind: 'finding', label: 'Uncertain wording', text: `The report says “${hedge}”. Treat this detail as unconfirmed.`, evidence: s, tag: 'Uncertain – confirm', status: 'open' },
        question: `The report says “${hedge}” here. What did the person observe directly?`,
      });
    }
  });

  // Link: fact -> finding, finding <-> question.
  const items: ReviewItem[] = [...facts];
  findings.forEach(({ finding, question, factId }) => {
    const qId = `question-${finding.id}`;
    items.push({ ...finding, relatedId: qId, linkText: question });
    const fact = facts.find((f) => f.id === factId);
    if (fact) { fact.relatedId = qId; fact.linkText = question; }
  });
  findings.forEach(({ finding, question }) => {
    items.push({ id: `question-${finding.id}`, kind: 'question', label: `Follow-up · ${finding.label}`, text: question, evidence: finding.evidence, tag: finding.tag, status: 'open', relatedId: finding.id, linkText: finding.label });
  });
  return items;
}
