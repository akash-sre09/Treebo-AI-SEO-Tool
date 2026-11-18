# Treebo Club app-wide visual refresh
- [x] Move the login palette and Poppins typography into global design tokens without changing behavior.
- [x] Restyle AppShell, shared UI primitives, findings, drawers, dialogs and all five main screens.
- [x] Verify desktop/mobile layouts, dark mode, build and all tests; generated landing-page HTML remains untouched.

# Treebo-only Google authentication
- [x] Add managed Google login, return-to-page handling and account/sign-out UI.
- [x] Require a valid @treebo.com session on every server function and all database reads.
- [x] Test domain rules, routing, signed-out redirects and anonymous data/action rejection (65 tests passed).
- [ ] Complete an interactive Google sign-in handoff — requires the user to approve Google in the browser; all signed-in screens were verified with a Treebo account session.

# Fact-checking improvements
- [x] Add website verification storage, parser, server actions and review panel.
- [x] Extend pure fact checks with approved inventory, confirmed missing names and amenity synonyms.
- [x] Fetch full seed amenities and add two amenity prompts per city.
- [x] Run rule tests and verify website review flow in the app.

# Wrong-fact visibility
- [x] Add shared presentation helper, grouped Dashboard panel and inline badge details.
- [x] Verify grouping rules and Dashboard-to-answer flow with saved results.

# Full inventory and name matching
- [x] Refresh all 81 Bangalore and 53 Pune listing hotels and their hotel-page facts; preserve original 20 IDs. Kapila was not listed; 41 unavailable rates remain null.
- [x] Normalize short names and suppress unrelated closest-hotel suggestions.
- [x] Run matching tests and verify Dashboard findings (49 tests passed; no browser errors).

# Dashboard area visibility
- [x] Replace inventory panel with full-width share of voice and area table.
- [x] Add pure area counts, competitor rankings, status and ordering tests.
- [x] Verify both cities, row navigation and no-run empty state (10 tests passed; no browser errors).