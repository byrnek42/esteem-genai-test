import { type ReactNode } from 'react';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { AlertTriangle, ArrowUpRight, Check, CheckCircle2, CircleHelp, FileText, Info, ListChecks, MessageCircleQuestion, Pencil, ShieldCheck, Sparkles, X } from 'lucide-react';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

type ItemKind = 'fact' | 'finding' | 'question';
type ReviewItem = {
  id: string;
  kind: ItemKind;
  label: string;
  text: string;
  evidence: string;
  tag: 'Stated in report' | 'Information to confirm';
  status: 'open' | 'kept' | 'dismissed';
  relatedId?: string;
};

const samples = {
  Detailed: `On March 14, 2025, at approximately 10:35 a.m., I was shopping at Greenway Market on 8th Street. I slipped on a puddle near the dairy coolers in aisle 6. The floor was wet from a leaking refrigerator case, and there was no warning sign nearby. I bruised my left knee and reported the incident to the service desk. An employee called an ambulance, and I was examined at Northside Urgent Care that afternoon. A customer named Lila Chen saw me fall and gave her contact information to the manager. The ceiling camera above aisle 6 should have recorded the incident.`,
  'Missing information': `A shopper slipped near the produce department at our Greenway Market yesterday afternoon. They said the floor felt slick and their wrist hurt afterward. A cashier helped them sit down, but they left before the manager could finish the incident form.`,
  'Unclear / conflicting': `On April 6, 2025, I fell by the bakery at Greenway Market around 2:15 p.m. I think it was closer to 4:00 p.m., though I am not sure. I possibly slipped on water, but the floor may have been dry. I hurt my shoulder and did not need treatment. Later I went to the clinic because my shoulder was painful. A wet floor sign was there; I did not see any warning sign before the fall.`
} as const;

const categories: { key: string; label: string; test: RegExp; describe: (sentence: string) => string }[] = [
  { key: 'date', label: 'Date', test: /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,?\s+\d{4})?|yesterday|today|last\s+(?:night|monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i, describe: () => 'Incident date recorded' },
  { key: 'time', label: 'Time', test: /\b\d{1,2}:\d{2}(?:\s*[ap]\.?m\.?)?|\b\d{1,2}\s*[ap]\.?m\.?|\b(?:morning|afternoon|evening|noon|midnight)\b/i, describe: () => 'Time of incident recorded' },
  { key: 'store', label: 'Store', test: /\b(?:at|inside|in)\s+(?:the\s+)?[A-Z][\w'&-]*(?:\s+[A-Z][\w'&-]*){0,3}\s+(?:Market|Grocery|Foods|Store|Supermarket)\b|\bstore\s*#?\s*\d+\b|\b(?:our|the)\s+(?:store|market|grocery)\b|\b(?:Greenway Market|grocery store|supermarket)\b/i, describe: () => 'Store identified' },
  { key: 'location', label: 'Location in store', test: /\baisle\s*\d+\b|\b(?:near|by|beside|inside|at|in)\s+(?:the\s+)?(?:produce|bakery|dairy|freezer|entrance|checkout|register|restroom|cooler|coolers|shelf|stockroom|meat|seafood|deli|pharmacy|[a-z]+\s+department)\b|\b(?:produce|bakery|dairy|checkout|entrance|register)\s+(?:department|area)\b/i, describe: (s) => `Area described: ${s.match(/(?:aisle\s*\d*|produce|bakery|dairy|freezer|entrance|checkout|register|restroom|coolers?|deli|pharmacy|seafood|meat)(?:\s+\d+)?/i)?.[0] ?? 'Store area mentioned'}` },
  { key: 'cause', label: 'Cause', test: /\b(?:puddle|water|spill(?:ed)?|leak(?:ing|ed)?|wet|slick|slippery|obstacle|uneven|loose mat|collision|hit by|struck by|object fell|tripped over)\b/i, describe: (s) => `Reported condition: ${s.match(/\b(?:puddle|water|spill(?:ed)?|leak(?:ing|ed)?|wet|slick|slippery|obstacle|uneven|loose mat|collision|hit by|struck by|object fell|tripped over)\b/i)?.[0] ?? 'Condition described'}` },
  { key: 'injury', label: 'Injury', test: /\b(?:injur(?:y|ed|ies)|hurt|pain(?:ful)?|sore|bruise[ds]?|cut|swel(?:ling|led)|fracture[ds]?|sprain(?:ed)?|wound|no injury|not injured|unhurt)\b/i, describe: () => 'Injury or condition noted' },
  { key: 'treatment', label: 'Medical treatment', test: /\b(?:doctor|physician|hospital|urgent care|clinic|ambulance|paramedic|medical treatment|treated|treatment|emergency room|er\b|first aid|did not need treatment|no treatment)\b/i, describe: () => 'Treatment or care mentioned' },
  { key: 'witnesses', label: 'Witnesses', test: /\b(?:witness(?:ed|es)?|saw me|saw the (?:incident|fall|customer)|watched me|contact information)\b/i, describe: () => 'Witness or potential witness mentioned' },
  { key: 'video', label: 'Video', test: /\b(?:camera|cctv|video|footage|record(?:ed|ing)|surveillance)\b/i, describe: () => 'Video or recording mentioned' },
  { key: 'warning', label: 'Warning signs', test: /\b(?:warning sign|wet floor sign|caution sign|cone|signage|no sign|without a sign|did not see any warning|warning was|sign was)\b/i, describe: () => 'Warning sign or notice mentioned' }
];

function sentencesOf(report: string) {
  // Protect time abbreviations so the evidence remains a complete source sentence.
  const protectedReport = report.replace(/\b[ap]\.m\./gi, (time) => time.replace(/\./g, '∯'));
  return protectedReport.match(/[^.!?\n]+(?:[.!?]+|$)/g)?.map((s) => s.replace(/∯/g, '.').trim()).filter(Boolean) ?? [];
}

function analyzeReport(report: string): ReviewItem[] {
  const sentences = sentencesOf(report);
  const items: ReviewItem[] = [];
  const makeId = (base: string, index: number) => `${base}-${index}`;
  const findings: ReviewItem[] = [];

  categories.forEach((category) => {
    const evidence = sentences.find((sentence) => category.test.test(sentence));
    if (evidence) {
      const text = ['date', 'time', 'store'].includes(category.key)
        ? evidence.match(category.test)?.[0] ?? category.describe(evidence)
        : category.describe(evidence);
      items.push({ id: makeId(category.key, items.length), kind: 'fact', label: category.label, text, evidence, tag: 'Stated in report', status: 'open' });
    } else {
      const finding: ReviewItem = {
        id: makeId(`missing-${category.key}`, findings.length), kind: 'finding', label: `${category.label} not specified`,
        text: `The report does not identify the ${category.label.toLowerCase()}.`, evidence: '', tag: 'Information to confirm', status: 'open'
      };
      findings.push(finding);
    }
  });

  const comparisons: { label: string; first: RegExp; second: RegExp; prompt: string }[] = [
    { label: 'Conflicting incident time', first: /\b(?:\d{1,2}(?::\d{2})?\s*a\.?m\.?|morning)\b/i, second: /\b(?:\d{1,2}(?::\d{2})?\s*p\.?m\.?|afternoon|evening)\b/i, prompt: 'Which time is correct, and can it be verified from a receipt, schedule, or camera record?' },
    { label: 'Conflicting floor condition', first: /\b(?:wet|water|puddle|slick|spill|leak)\b/i, second: /\b(?:dry|not wet|no water)\b/i, prompt: 'Was the floor wet or dry at the time of the incident?' },
    { label: 'Conflicting injury or treatment details', first: /\b(?:no injury|not injured|did not need treatment|no treatment)\b/i, second: /\b(?:hurt|pain|injur|clinic|doctor|hospital|treated)\b/i, prompt: 'Could you clarify the injury and whether any medical care was received?' },
    { label: 'Conflicting warning-sign details', first: /\b(?:no sign|without a sign|did not see any warning|no warning)\b/i, second: /\b(?:sign was there|warning sign was|wet floor sign was|caution sign)\b/i, prompt: 'Was a warning sign present before the incident, and where was it placed?' }
  ];
  comparisons.forEach((comparison) => {
    if (comparison.label === 'Conflicting incident time') {
      const timeSentences = sentences.filter((sentence) => /\b(?:incident|slipped|fell|fall|around|closer to|not sure)\b/i.test(sentence));
      const times = timeSentences.flatMap((sentence) => sentence.match(/\b\d{1,2}(?::\d{2})?\s*[ap]\.?m\.?/gi) ?? []);
      if (new Set(times.map((time) => time.replace(/[.\s]/g, '').toLowerCase())).size > 1) {
        findings.push({ id: makeId('conflict', findings.length), kind: 'finding', label: comparison.label, text: 'Different possible incident times are stated. Confirm which time refers to the incident.', evidence: timeSentences.filter((sentence) => /\d{1,2}(?::\d{2})?\s*[ap]\.?m\.?/i.test(sentence)).join(' '), tag: 'Information to confirm', status: 'open' });
      }
      return;
    }
    const first = sentences.find((s) => comparison.first.test(s));
    const second = sentences.find((s) => comparison.second.test(s) && (s !== first || comparison.label === 'Conflicting warning-sign details'));
    if (first && second) {
      findings.push({ id: makeId('conflict', findings.length), kind: 'finding', label: comparison.label, text: 'These statements may need clarification; they are not treated as a decision.', evidence: first === second ? first : `${first} ${second}`, tag: 'Information to confirm', status: 'open' });
    }
  });

  sentences.forEach((sentence, index) => {
    if (/\b(?:possibly|maybe|perhaps|not sure|unsure|I think|I believe|might have|may have|could have|should have|seems like|around\s+(?:then|that time))\b/i.test(sentence)) {
      findings.push({ id: makeId('vague', index), kind: 'finding', label: 'Uncertain or vague wording', text: 'This detail is expressed as uncertain and needs confirmation.', evidence: sentence, tag: 'Information to confirm', status: 'open' });
    }
  });
  findings.forEach((finding) => items.push(finding));
  findings.forEach((finding, index) => {
    const associated = categories.find((category) => finding.id.includes(category.key));
    const question = associated
      ? `Can you confirm the ${associated.label.toLowerCase()} for this incident?`
      : finding.label === 'Conflicting incident time' ? comparisons[0].prompt
      : finding.label === 'Conflicting floor condition' ? comparisons[1].prompt
      : finding.label === 'Conflicting injury or treatment details' ? comparisons[2].prompt
      : finding.label === 'Conflicting warning-sign details' ? comparisons[3].prompt
      : `Could you clarify what you mean by “${finding.evidence.match(/\b(?:possibly|maybe|perhaps|not sure|unsure|I think|I believe|might have|may have|could have)\b/i)?.[0] ?? 'this detail'}” and what you observed directly?`;
    items.push({ id: makeId('question', index), kind: 'question', label: `Follow-up · ${finding.label}`, text: question, evidence: finding.evidence, tag: finding.tag, status: 'open', relatedId: finding.id });
  });
  return items;
}

function Home() {
  const [report, setReport] = useState('');
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');

  const review = () => {
    setError('');
    setNotice('');
    setEditingId(null);
    if (!report.trim()) {
      setItems(null);
      setError('Add an incident report before starting a review.');
      return;
    }
    const eventSignals = /\b(?:slip(?:ped|ping)?|trip(?:ped|ping)?|fell|injur(?:y|ed|ies)|hurt|collision|struck)\b/i;
    const fallWithContext = /\bfall\b/i.test(report) && /\b(?:incident|customer|shopper|employee|person|suffered|experienced)\b/i.test(report);
    if ((!eventSignals.test(report) && !fallWithContext) || report.trim().split(/\s+/).length < 4) {
      setItems(null);
      setError('This does not look like a grocery-store incident report. Include what happened and where it happened in the store.');
      return;
    }
    setItems(analyzeReport(report));
    setNotice('Report review ready. Findings are based only on the text provided.');
  };
  const loadSample = (name: keyof typeof samples) => {
    setReport(samples[name]);
    setItems(null);
    setError('');
    setNotice('');
    setEditingId(null);
  };
  const changeStatus = (id: string, status: ReviewItem['status']) => {
    setItems((current) => current?.map((item) => item.id === id ? { ...item, status } : item) ?? null);
    if (status === 'kept') setNotice('Item marked as kept.');
    if (status === 'dismissed') setNotice('Item dismissed from this review.');
  };
  const startEdit = (item: ReviewItem) => {
    setEditingId(item.id);
    setDraft(item.text);
  };
  const saveEdit = (id: string) => {
    if (!draft.trim()) return;
    setItems((current) => current?.map((item) => item.id === id ? { ...item, text: draft.trim() } : item) ?? null);
    setEditingId(null);
    setNotice('Edit saved for this review.');
  };
  const shownItems = (kind: ItemKind) => items?.filter((item) => item.kind === kind && item.status !== 'dismissed') ?? [];

  const renderItem = (item: ReviewItem) => (
    <article className="result-item" key={item.id} data-testid={`result-item-${item.id}`}>
      <div className="item-topline">
        <span className="item-label" data-testid={`text-item-label-${item.id}`}>{item.label}</span>
        <span className={`item-badge ${item.tag === 'Stated in report' ? 'badge-stated' : item.tag === 'Information to confirm' ? 'badge-confirm' : 'badge-unclear'}`} data-testid={`status-item-tag-${item.id}`}>{item.tag}</span>
      </div>
      {editingId === item.id ? (
        <div>
          <label className="hidden-status" htmlFor={`edit-${item.id}`}>Edit {item.kind} text</label>
          <textarea id={`edit-${item.id}`} className="edit-area" value={draft} onChange={(event) => setDraft(event.target.value)} data-testid={`input-edit-${item.id}`} autoFocus />
          <div className="edit-controls">
            <button type="button" className="small-button primary" disabled={!draft.trim()} onClick={() => saveEdit(item.id)} data-testid={`button-save-${item.id}`}><Check size={12} /> Save</button>
            <button type="button" className="small-button" onClick={() => setEditingId(null)} data-testid={`button-cancel-${item.id}`}><X size={12} /> Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <p className="evidence" data-testid={`text-item-body-${item.id}`}><span>{item.text}</span></p>
          {item.evidence && <p className="evidence" style={{ marginTop: 7 }} data-testid={`text-source-${item.id}`}><span className="evidence-label">Source</span>“{item.evidence}”</p>}
        </>
      )}
      <div className="item-actions" aria-label={`Actions for ${item.label}`}>
        <button type="button" className={`action-button ${item.status === 'kept' ? 'keep-active' : ''}`} onClick={() => changeStatus(item.id, item.status === 'kept' ? 'open' : 'kept')} aria-pressed={item.status === 'kept'} data-testid={`button-keep-${item.id}`}><Check size={12} /> {item.status === 'kept' ? 'Kept' : 'Keep'}</button>
        <button type="button" className="action-button" onClick={() => startEdit(item)} data-testid={`button-edit-${item.id}`}><Pencil size={11} /> Edit</button>
        <button type="button" className="action-button dismiss-action" onClick={() => changeStatus(item.id, 'dismissed')} data-testid={`button-dismiss-${item.id}`}><X size={12} /> Dismiss</button>
        {item.status === 'kept' && <span className="kept-note" data-testid={`status-kept-${item.id}`}>Saved to this review</span>}
      </div>
    </article>
  );

  const section = (kind: ItemKind, title: string, icon: ReactNode, count: number, className = '') => (
    <section className="panel result-section" aria-labelledby={`section-${kind}`} data-testid={`section-${kind}`}>
      <div className="section-head">
        <div className="section-title-wrap"><span className={`section-icon ${className}`}>{icon}</span><h3 className="section-title" id={`section-${kind}`}>{title}</h3></div>
        <span className="count-pill" data-testid={`count-${kind}`}>{items ? count : '—'}</span>
      </div>
      <div className="section-body">
        {!items ? <div className="empty-section">Results will appear here after a report is reviewed.</div>
          : shownItems(kind).length ? shownItems(kind).map(renderItem)
          : <div className="empty-section" data-testid={`empty-${kind}`}>{kind === 'finding' ? 'No unclear or missing information was identified.' : kind === 'question' ? 'No follow-up questions are needed yet.' : 'No facts to show.'}</div>}
      </div>
    </section>
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup"><span className="brand-mark"><ShieldCheck size={19} strokeWidth={1.8} /></span><div><div className="brand-name">ClaimLens</div><div className="brand-caption">Incident review workbench</div></div></div>
        <div className="topbar-meta"><span className="live-dot" /> Client-side prototype</div>
      </header>
      <div className="prototype-banner" role="note" data-testid="banner-prototype"><Info size={14} /> Prototype: AI review is simulated. Does not score risk or make decisions.</div>
      <main className="page-wrap">
        <div className="page-intro">
          <div><div className="eyebrow">Claims desk / New report</div><h1 className="page-title">Read the report.<br />See what’s missing.</h1><p className="intro-copy">Review the details as written, preserve their source, and separate stated facts from the questions still to ask.</p></div>
          <div className="session-chip"><FileText size={14} /> Single report review <ArrowUpRight size={13} /></div>
        </div>
        <div className="workbench">
          <section className="panel report-panel" aria-labelledby="report-heading">
            <div className="panel-heading"><div><div className="panel-kicker">01 / Source material</div><h2 id="report-heading">Incident report</h2></div><span className="quiet-label">Editable</span></div>
            <label htmlFor="incident-report" className="hidden-status">Incident report text</label>
            <textarea id="incident-report" className="report-input" value={report} onChange={(event) => { setReport(event.target.value); setError(''); setNotice(''); setItems(null); setEditingId(null); }} placeholder="Paste or type the incident report here. Keep the original wording where possible." data-testid="input-incident-report" />
            <div className="sample-wrap">
              <p className="sample-label">Try a sample report</p>
              <div className="sample-buttons">
                {(Object.keys(samples) as (keyof typeof samples)[]).map((name) => <button type="button" key={name} className="sample-button" onClick={() => loadSample(name)} data-testid={`button-sample-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`}>{name}</button>)}
              </div>
            </div>
            <button type="button" className="review-button" onClick={review} data-testid="button-review-report"><Sparkles size={15} /> Review report <ArrowUpRight size={14} /></button>
            {error && <div className="error-message" role="alert" data-testid="error-review">{error}</div>}
            <p className="helper-note"><Info size={13} /> Review is local and deterministic. The report is not sent anywhere.</p>
          </section>
          <div className="results-column">
            <div className="results-header"><div><div className="panel-kicker">02 / Review notes</div><h2>What we found</h2></div><span className="results-meta">{items ? 'Review complete' : 'Awaiting report'}</span></div>
            {!items ? (
              <div className="panel empty-results" data-testid="empty-review">
                <span className="empty-mark"><ListChecks size={19} /></span><strong>Start with the report</strong><p>Facts, gaps, and follow-up questions will be organized here without changing the original account.</p>
              </div>
            ) : (
              <>
                {section('fact', 'Key facts', <CheckCircle2 size={15} />, shownItems('fact').length)}
                {section('finding', 'Missing or unclear information', <AlertTriangle size={15} />, shownItems('finding').length, 'caution')}
                {section('question', 'Suggested follow-up questions', <MessageCircleQuestion size={15} />, shownItems('question').length, 'question')}
              </>
            )}
            <div className="results-footnote"><CircleHelp size={13} /><span>Only details found in the report are shown as stated. Confirm all other information with the people involved.</span></div>
            <div role="status" aria-live="polite" className="hidden-status" data-testid="status-review">{notice}</div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
