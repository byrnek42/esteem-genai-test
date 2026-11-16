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
import { analyzeReport, isLikelyIncidentReport, samples, type ItemKind, type ReviewItem } from '@/lib/analyze';

const queryClient = new QueryClient();

const badgeClass: Record<ReviewItem['tag'], string> = {
  'Stated in report': 'badge-stated',
  'Uncertain – confirm': 'badge-confirm',
  'Conflicting – confirm': 'badge-unclear',
  'Missing – ask': 'badge-missing',
};


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
    if (!isLikelyIncidentReport(report)) {
      setItems(null);
      setError('This does not look like a grocery-store incident report. Describe what happened (for example, a slip or fall) and where in the store, or load a sample report above to see how a review works.');
      return;
    }
    setItems(analyzeReport(report));
    setNotice('Report review ready. Findings are based only on the text provided. Confirm flagged items before relying on this review.');
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
        <span className={`item-badge ${badgeClass[item.tag]}`} data-testid={`status-item-tag-${item.id}`}>{item.tag}</span>
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
          {item.linkText && (
            <p className="link-note" data-testid={`text-link-${item.id}`}>
              <span className="evidence-label">{item.kind === 'question' ? 'Resolves' : 'Ask'}</span>{item.linkText}
            </p>
          )}
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
      <div className="prototype-banner" role="note" data-testid="banner-prototype"><Info size={14} /> Prototype: the AI review is simulated with rules (no AI model is connected). It does not score risk or make claim decisions.</div>
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
            <details className="how-panel" data-testid="panel-how-it-works">
              <summary>How this review works: working, simulated, planned</summary>
              <dl>
                <dt>Working now</dt>
                <dd>Entering a report, the structured review, source sentences, links between gaps and follow-up questions, Keep / Edit / Dismiss, and input checks.</dd>
                <dt>Simulated</dt>
                <dd>The “AI” is a set of keyword and pattern rules for 12 claim details (date, time, store, location, cause, injury, treatment, witnesses, video, warning sign, injured person, last inspection). It handles wording it was written for, such as “no warning sign”, but it can miss facts written in unexpected ways.</dd>
                <dt>Planned</dt>
                <dd>A language model would read reports in any writing style, catch details the rules miss, and write follow-up questions for the specific incident. Every output would still link to its source sentence for you to check.</dd>
              </dl>
            </details>
          </section>
          <div className="results-column">
            <div className="results-header"><div><div className="panel-kicker">02 / Review notes</div><h2>What we found</h2></div><span className="results-meta">{items ? 'Review complete' : 'Awaiting report'}</span></div>
            {!items ? (
              <div className="panel empty-results" data-testid="empty-review">
                <span className="empty-mark"><ListChecks size={19} /></span><strong>Start with the report</strong><p>Facts, gaps, and follow-up questions will be organized here without changing the original account.</p>
              </div>
            ) : (
              <>
                {(() => {
                  const open = (tag: ReviewItem['tag']) => items.filter((item) => item.kind === 'finding' && item.tag === tag && item.status !== 'dismissed').length;
                  const conflicts = open('Conflicting – confirm');
                  const uncertain = open('Uncertain – confirm');
                  const missing = open('Missing – ask');
                  const total = conflicts + uncertain + missing;
                  return (
                    <div className={`review-status ${total ? 'needs-check' : 'clear'}`} role="status" data-testid="status-review-summary">
                      {total ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
                      <div>
                        <strong>{total ? `${total} item${total === 1 ? '' : 's'} to confirm before relying on this review` : 'No open items flagged'}</strong>
                        <span>{conflicts} conflicting · {uncertain} uncertain · {missing} missing{total ? '. Only details tagged “Stated in report” appear without a warning.' : '. The rules can still miss details. Check the source report.'}</span>
                      </div>
                    </div>
                  );
                })()}
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
