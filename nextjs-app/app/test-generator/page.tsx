import { Wand2 } from 'lucide-react';

export default function TestGeneratorPage() {
  return (
    <div className="space-y-6">
      <header>
        <div className="font-mono text-[11px] uppercase tracking-widest text-ink-secondary">
          Agent
        </div>
        <h1 className="mt-1 font-mono text-2xl font-semibold text-ink-primary">
          Test Generator
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-secondary">
          Write an ADAS feature requirement and the agent drafts structured
          test cases you can approve, edit, or reject.
        </p>
      </header>

      <div className="rounded-card border border-hairline bg-surface-card p-12 shadow-card">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-agent-thinking/15">
            <Wand2 className="h-5 w-5 text-agent-thinking" strokeWidth={2} />
          </div>
          <div className="font-mono text-sm font-semibold text-ink-primary">
            AI-generated test cases with human-in-the-loop approvals
          </div>
          <div className="mt-1 max-w-md text-xs text-ink-secondary">
            Coming in Phase 7 — requirement textarea, generated cards with
            confidence badges, approve/reject controls, CSV/JSON export.
          </div>
        </div>
      </div>
    </div>
  );
}
