<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Rules
- Treebo facts come from src/data/seed.ts plus approved verified_hotels, both sourced from treebo.com and never from AI output (keeps fact-checks reproducible).
- All pages render inside components/AppShell (shared sidebar + stepper).
- AI probe runs in createServerFn (src/lib/probe.functions.ts), not edge functions; extraction uses forced tool calling because Gemini ignores JSON-schema output on this gateway.
- Fact-check rules live in src/lib/factcheck.ts as pure code with tests in src/test/factcheck.test.ts.
- Refresh the full seed from website listings plus each hotel's page, leaving unrelated prompts and competitor data unchanged; live facts must remain auditable independently of AI answers.
- Wrong-fact presentation uses src/lib/wrong-fact-display.ts for shared labels, claim/actual wording and answer grouping; presentation never changes checks or stored findings.
- Website verification parses Treebo HTML independently of AI; unreadable or blocked listings never establish absence, and only approved found rows extend inventory.
- Probe results retain extraction for reproducible rechecks after inventory review; legacy rows reclassify name findings only because their original claims were not stored.
- All app routes live under `_authenticated` except `/login` and the `/auth` compatibility redirect. Every server function uses `requireTreeboAuth`; direct table reads require an authenticated @treebo.com JWT, and writes happen only in protected server functions. No roles exist yet; add a separate `user_roles` table when permissions diverge.
- Brief checks live in src/lib/briefcheck.ts as pure code with tests; AI writes briefs only from seed facts passed in the prompt, and each generation is a new briefs row (never overwritten).
- Landing pages: AI writes only copy (src/lib/page.functions.ts); src/lib/landing.ts builds HTML, cards, JSON-LD and runs page checks from seed data, tested in src/test/landing.test.ts. Over-length meta fields are repaired by one AI rewrite then word-boundary trim (brief-repair.server.ts).
- Pages store the AI copy (pages.copy) so the preview rebuilds HTML per style (treebo/generic) in code; rows without copy fall back to stored html.
- Page tracking compares the last probe before pages.published_at with the first after (trackPage in src/lib/probe-data.ts, tested); brief checks re-run live on view so rule fixes apply to saved briefs.
- Dashboard area visibility is calculated in the pure areaVisibility helper from latest per-engine results; opportunity links carry an optional city search parameter to preserve the selected city.
