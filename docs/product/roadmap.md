# Product Roadmap — Gymi-Vorbereitung App

*Version 1.0 — April 2026*

---

## 1. Strategic frame

The roadmap is anchored to one external date: the **Zurich Gymi-Prüfung in early March 2027**. Working back from that, the most valuable launch window is **mid-August to mid-September 2026** — the start of the new Swiss school year, when parents of 6th-graders shift from "we should think about Gymi prep" to actively buying materials and booking tutors. A second meaningful window is **early January 2027**, when families enter final-stretch preparation. Missing the August window means missing roughly 70 % of the addressable acquisition demand for this exam cycle.

This gives a build runway of roughly **18 weeks** from late April to mid-August 2026. That is tight but achievable for a focused MVP scoped to **one subject (German), one canton (Zurich), and one exam (Langgymnasium / 6th-grade entry)**. Everything else — math, Kurzgymnasium, Bern/Aargau/Luzern variants — is explicitly deferred.

The roadmap below runs five parallel workstreams (content, technical, operations, marketing, research/feedback) across five phases. Phases are not strictly sequential; the streams overlap and the launch phase begins long before the build phase ends.

---

## 2. Roadmap at a glance

| Phase | Window | Calendar weeks | Strategic goal |
|---|---|---|---|
| **0 — Foundation** | Late Apr – mid May 2026 | Weeks 1–3 | Lock scope, set up legal/tooling, validate problem with families |
| **1 — MVP build** | Mid May – mid Jul 2026 | Weeks 4–12 | Build core loop end-to-end for the Wortarten module |
| **2 — Closed beta** | Mid Jul – mid Aug 2026 | Weeks 13–17 | 30–50 families use the app over summer; iterate |
| **3 — Public launch** | Mid Aug – end Sep 2026 | Weeks 18–22 | App Store release timed to school-year start |
| **4 — Growth & retention** | Oct 2026 – Mar 2027 | Weeks 23–46 | Drive sign-ups through autumn; serve users through exam day |

The single hardest deadline is **App Store submission by ~28 July 2026** to allow 2-week review buffer before the 15 August school-year start. Everything in Phase 1 and 2 traces back to that date.

---

## 3. Phase 0 — Foundation (Weeks 1–3, late April to mid-May 2026)

The goal of this phase is to make sure the next four months don't get spent building the wrong thing or hitting an avoidable legal/operational wall in week 14.

### 3.1 Content

The deliverable is a **content scope document** and a **proof-of-concept exercise set** for the Wortarten module. Concretely:

- Decide the canonical curriculum reference. The Lehrmittelverlag Zürich (LMVZ) "Die Sprachstarken 5/6" is the de facto standard; align exercise difficulty and terminology to it so parents recognise what their child is doing.
- Lock the Wortarten taxonomy for the MVP: Nomen, Verben, Adjektive, Pronomen, Adverbien, Präpositionen, Konjunktionen — eight categories at three difficulty levels each.
- Recruit **one paid German native-speaker reviewer** (ideally a current or recent primary-school teacher in the canton). Budget for ~10 hours/week through the build phase. This person is the single most important external hire of the whole project; their domain authority is what separates a credible product from another EdTech wrapper.
- Run the AI-content-generation spike (Section 5.1) and have the reviewer rate output quality on a 1–5 scale across 50 generated exercises. If average quality is < 4, the content strategy needs rethinking before Phase 1 begins.

### 3.2 Technical

- Final architecture decision and architecture diagram. Open question: **mobile framework** — React Native (single codebase, faster, larger talent pool) vs. native iOS first (better polish, smaller initial scope, but doubles the work for Android later). Recommendation: React Native with Expo, given the team is small and the app is content-heavy rather than animation-heavy.
- Stand up the monorepo: Payload (admin + API), Postgres, mobile app, marketing site. CI/CD on GitHub Actions. Sentry for errors.
- Spike on the riskiest technical assumption: **can Claude reliably generate Wortarten exercises with correct grammatical analysis at 6th-grade difficulty?** Build a generation prompt, run 100 exercises, hand-grade them. This is the moment to discover that the answer is "mostly, with these caveats" or "no, we need a different content strategy" — not in week 10.
- Decide hosting: Swiss data residency is a meaningful trust signal for Swiss parents. Infomaniak (CH-based) or Hetzner Frankfurt (close enough, EU jurisdiction, much cheaper) are the realistic options.

### 3.3 Operations & legal

- Register an **Einzelfirma** (sole proprietorship) in the relevant canton, or a GmbH if liability protection matters from day one. Einzelfirma is cheaper and faster; convert to GmbH later if needed. Apple Developer account requires a legal entity verifiable by Apple — start the D-U-N-S Number application today (it can take 2–3 weeks).
- Apple Developer Program enrolment ($99/year) and Google Play Console ($25 one-time) — both should be initiated in week 1; Apple verification often takes 1–2 weeks.
- Domain registration: secure the brand name as `.ch`, `.com`, and `.app`. Register the corresponding social handles even if unused.
- Engage a Swiss lawyer for a one-off consultation on **child data under the revised Swiss FADP (revDSG, in force since Sept 2023) and GDPR** — specifically: parental consent mechanics for children under 16, what counts as a "high-risk" DPIA-trigger for kids' learning data, and the minimum data set you can collect. Budget CHF 1,500–3,000 for this; it pays for itself by avoiding a rebuild later.
- Bookkeeping: set up a basic accounting tool (Bexio or Banana for Swiss compliance) even if there are no transactions yet. The trail matters once you have customers.

### 3.4 Marketing & research

- Run **8–12 problem-validation interviews** with target families. Focus on bilingual households in Zurich, Winterthur, Zug. Goal: confirm the pain points, hear the actual language they use ("our daughter writes essays like she's translating from English"), and recruit the first beta cohort.
- Working brand name and visual identity sketch. Avoid clever-but-confusing names; "Gymi Vorbereitung" or close variants are exactly what parents type into Google. Don't fight the SEO.
- Reserve the brand name as a trademark in Switzerland (IGE/IPI search, then file if free). Approx. CHF 550 for one class.

**Phase 0 exit criteria:**
- Content reviewer hired
- AI generation spike complete with quantified quality result
- Legal entity in formation
- Apple/Google developer accounts in flight
- 8+ family interviews completed
- Architecture decisions documented in `docs/`

---

## 4. Phase 1 — MVP build (Weeks 4–12, mid-May to mid-July 2026)

This is the longest and most expensive phase. The goal is **one complete user journey** — a parent signs up, creates a child profile, the child does a Wortarten session of 10 exercises, gets feedback, parent sees progress, child earns a streak — working end-to-end on iOS in TestFlight by week 12.

Scope discipline matters more than feature breadth. Every additional module added in Phase 1 trades against polish and stability of the core loop.

### 4.1 Content

The week-by-week target is roughly:

- Weeks 4–6: Wortarten — 200 exercises across 8 word classes × 3 levels, with solutions and 1-sentence explanations. Reviewer signs off batch-by-batch.
- Weeks 6–8: Textverständnis — 25 short passages (150–300 words) at 6th-grade level, each with 5 comprehension questions. Mix of fiction, factual, and instructional texts to mirror the real exam.
- Weeks 8–10: Diktat — 30 dictation texts of 80–120 words. Audio recordings by a native speaker (the reviewer or a hired voice talent). Two reading speeds: normal and slow.
- Weeks 10–12: Aufsatz — 15 writing prompts with rubrics, model answers at three quality levels, and a structured-feedback checklist children can self-apply. Aufsatz is the hardest module to automate because grading is subjective; for MVP, lean on self-assessment + parent review rather than auto-grading.

Style guide locked in week 5: tone (encouraging but not patronising), reading age, terminology consistency with school vocabulary, illustration style for any visual exercises.

### 4.2 Technical

The build sequence that minimises rework:

- Weeks 4–5: Authentication and account model. Parent-first signup; child profiles attached to parent; multi-child households supported from day one (many Swiss families have two kids in the prep window). Email + password and Sign in with Apple.
- Weeks 5–6: Content schema in Payload, admin UI for the reviewer to edit exercises directly. Exercise types as reusable components: multiple-choice, click-to-classify, fill-in-blank, free-text, audio-listen, drag-to-order.
- Weeks 6–8: Mobile shell, navigation, design system. Exercise renderer with the six question types above. Submission, scoring, feedback screens.
- Weeks 8–9: Progress tracking — sessions, streaks, per-topic mastery. Parent dashboard v1: weekly minutes, topics covered, weakest areas.
- Weeks 9–10: PDF generation pipeline. The "printable" promise is a real differentiator and a real engineering item — server-side rendering of exercises as printable A4 PDFs, ideally with a worksheet header (child's name, date, topic) and a separate solutions PDF for the parent. Use Puppeteer or React-PDF; cache aggressively.
- Weeks 10–11: Test module — timed simulated exam, locked navigation, scoring report. This is what differentiates "practice app" from "exam prep" in parents' minds.
- Weeks 11–12: Gamification layer (streaks, weekly XP, three or four meaningful badges — not gacha mechanics; Swiss parents react badly to anything that looks like dark patterns aimed at kids). Final polish, TestFlight build.

Cross-cutting from week 4: analytics (PostHog self-hosted on Hetzner for FADP-friendly behaviour), error tracking (Sentry), feature flags so Phase 2 can ship variants without re-releasing.

### 4.3 Operations & legal

- Privacy policy and terms drafted by week 8 (with the lawyer from Phase 0); German primary, English translation. Cookie banner only if you actually set non-essential cookies — many Swiss apps don't and avoid the legal complexity.
- Data Processing Agreement template ready for the content reviewer and any contractors who touch real user data.
- Decide the **pricing model** by week 10 (even if economics are out of scope for the roadmap, the model affects onboarding UX and store metadata): freemium with paid subscription is the default for this category, but a one-time payment per exam cycle aligns better with parental psychology in Switzerland — they buy a course, not a Netflix.
- Backup strategy for the Postgres database: nightly snapshots, weekly off-site, one quarterly restore drill on a staging environment.

### 4.4 Marketing

Marketing in Phase 1 is largely about building infrastructure and presence so Phase 3 has something to launch from.

- Week 4: Landing page live at the brand domain. Email capture above the fold. Three messages tested in the hero: (a) "Gymi-Vorbereitung für zweisprachige Kinder", (b) "Aufnahmeprüfung üben — auf Deutsch, im eigenen Tempo", (c) a problem-led headline drawn from the family interviews.
- Weeks 4–12: Publish **8–10 long-form articles** in German targeting the SEO terms identified in the competitive research — "Gymi-Prüfung Vorbereitung", "Aufnahmeprüfung Übungen", "Wortarten 6. Klasse", "Textverständnis Tipps Gymi" and similar. These take 90–180 days to rank, which is why they must go live now, not at launch. One article per week is realistic.
- Open the social accounts you registered in Phase 0 — but don't post heavily yet. Reserve handles, post one introductory post, and use the channels primarily for paid media in Phase 3.
- Build a **press list** for Phase 3: NZZ Familie, Tages-Anzeiger Familie, Beobachter, Migros-Magazin, Schweizer Familie, Familienleben.ch, plus expat outlets (Hello Switzerland, English Forum, swissinfo.ch). For the bilingual angle, also Rusinfo.ch, Ukrainische Diaspora Schweiz, the Italian-Swiss expat communities. Goal: 30–40 named contacts.
- Begin **community presence** in the channels where target parents already are: the Familienleben forum's Schule section, Reddit r/Switzerland and r/Zurich, expat Facebook groups, the Schulalltag mailing lists. Do not promote anything yet. Read, learn the language parents use, answer occasional questions helpfully. By Phase 3 you'll have credibility to speak from.
- Identify **10–15 partnership prospects**: small private tutoring companies (Lernstudio Zürich, LearningCulture, smaller independents), Russian/Ukrainian Saturday schools, expat parent associations. Don't pitch yet; just map them.

### 4.5 Research & feedback

- Internal alpha from week 9: the reviewer and 2–3 friendly families try every build. Bug list goes into a single shared Notion or Linear project.
- Recruit the closed-beta cohort during weeks 10–12. Target 50 families, expect 30 to actually engage. Skew the cohort toward bilingual families in Zurich; the feedback you get from outside the target persona will mislead you.

**Phase 1 exit criteria:**
- TestFlight build with full Wortarten module + at least one other module
- 200+ reviewed exercises in production database
- Privacy policy, terms, DPA in place
- Landing page with > 100 email signups
- Beta cohort of 30+ families committed
- 5+ SEO articles published

---

## 5. Phase 2 — Closed beta (Weeks 13–17, mid-July to mid-August 2026)

Five weeks. The summer holidays in Switzerland (mid-July to mid-August in most cantons) are awkward for adoption — kids are away, parents disengaged — but they're ideal for stress-testing a beta because nothing is high-stakes yet.

### 5.1 Content

- Fill the gaps surfaced by beta usage. Expect requests for more exercises in the topics kids find hardest (typically Pronomen and Diktat at this level).
- Add the Aufsatz module if it didn't make Phase 1, or expand it.
- Establish a sustainable content production cadence: how many new exercises per week can the reviewer realistically validate? This number sets the post-launch content velocity, which is a key retention lever.

### 5.2 Technical

- Weekly TestFlight builds. Each one ships at a fixed time (e.g., Friday afternoon) so beta families know when to expect updates.
- Crash reporting and performance monitoring. The 30-family beta will surface device-specific issues impossible to find on a developer's iPhone — old iPads, weird Android OEMs, slow connections.
- Add Android via TestFlight equivalent (Google Play internal testing track). Even if launch is iOS-only, having Android building cleanly avoids a 6-week catch-up later.
- Implement the **parent communication features** the beta will inevitably ask for: weekly progress email, push notification controls, "send my child encouragement" button. None of this is technically hard; all of it requires being chosen and built deliberately.

### 5.3 Operations

- Customer support workflow: a single shared inbox, target response time 24 hours, FAQ as a Notion page that becomes the help centre.
- Status page (statuspage.io free tier or self-hosted) so when something breaks during launch, there is one URL to point parents to.
- Refund / cancellation policy, even if pricing is undecided — the policy text needs to exist before App Store submission.
- Run one **data restore drill**: pretend the database is gone, restore from backup to a fresh server, confirm a beta family's progress is intact. If this hasn't been tested, the backup doesn't exist.

### 5.4 Marketing

This is the phase where pre-launch marketing shifts from foundation-laying to active demand generation.

- Beta family **testimonials and case studies** — collect quotes, get permission, prepare 3–5 short stories for launch use. Bilingual angle is the differentiator; quotes that articulate the "fluent but not academic" gap are gold.
- Continue SEO publishing cadence; aim for 12+ articles indexed by launch.
- **Influencer outreach** to Swiss parenting Instagram and TikTok accounts. The relevant tier is micro-influencers (5k–30k followers) in Swiss family/education niches, not mass-market. Russian- and Ukrainian-language family content creators in Switzerland are an underserved channel and reach the right audience directly.
- Build the **launch waitlist** aggressively. Landing page conversion optimisation, paid pilot on Google Ads (CHF 500–1000 to learn what keywords convert), referral mechanic for existing waitlisters.
- **App Store assets** prepared by week 15: app icon, 6–8 screenshots in German (and English variants for the international keyword pool), 30-second preview video, full description in German + English, keywords research locked.
- Pre-brief the press list with embargoed launch information by week 16. Two weeks of lead time is the minimum for Swiss family/education press to actually run something.
- Confirm 2–3 **partnership pilots** for launch: a tutoring company that recommends the app to its families, a private school's homework support programme, a Saturday school for Russian/Ukrainian-speaking children.

### 5.5 Research & feedback

- Weekly 30-minute calls with 5 rotating beta families.
- One in-person observation session per week if geographically feasible — watching a kid actually use the app reveals more than any survey.
- Net Promoter Score check at week 16. If NPS is below 30, do not launch on schedule; fix the underlying issues first. Launching a mediocre product into a small market is harder to recover from than launching three weeks late.

**Phase 2 exit criteria:**
- App Store and Play Store assets complete
- App submitted by 28 July (App Store review can take 1–7 days; allow buffer)
- Customer support runbook tested
- Backup/restore drill passed
- 30+ active beta families with NPS > 30
- 5+ press contacts pre-briefed
- 2+ partnership pilots committed

---

## 6. Phase 3 — Public launch (Weeks 18–22, mid-August to end September 2026)

The launch isn't a day; it's a five-week window aligned to the school year ramp-up. Most Swiss cantons start school in week 33 or 34 (mid-August). Parental attention to Gymi prep peaks in the first two weeks of school, then again in late September after the first parent-teacher contacts.

### 6.1 Content

- Switch into ongoing-publication mode. Target: 20–30 new exercises per week, distributed across modules based on usage analytics.
- Begin the **content roadmap toward the March exam**: weekly themed practice drops ("Wortarten Woche 1", "Textverständnis: Sachtexte") that give parents a reason to keep the app open.
- Capture content gaps from real users; new themes always emerge once a real user base exists.

### 6.2 Technical

- App Store and Play Store live in week 18.
- Production monitoring 24/7 for the first two weeks; on-call rotation if more than one developer.
- Hotfix release cadence: every 3–5 days for the first month, then weekly.
- Watch for the first wave of **Android-specific issues** — even a competent React Native app will surface 5–10 platform-specific bugs in the first week of real Android use.

### 6.3 Operations

- Customer support staffing: even at low volumes, expect 5–10 questions per day in the first two weeks. Plan for response within 4 working hours, target 1 hour during launch week.
- Track refund requests, cancellations, and support themes weekly; these are the leading indicator of product issues.
- Tax registration if the pricing model triggers it (VAT/MWST registration threshold in Switzerland is CHF 100k turnover, but voluntary earlier registration can make sense — clarify with the accountant).

### 6.4 Marketing

This is the phase where every piece of infrastructure built in Phases 0–2 gets used.

- **Press push** in week 18: embargoed releases lift, follow-up calls with the priority outlets, offer exclusive interviews to one or two who'll commit to feature pieces.
- **Paid acquisition** test budget — start with CHF 2,000–5,000/month split across Google Search ("Gymi Vorbereitung", "Aufnahmeprüfung üben"), Meta (interest-targeted at parents of 10–11 year olds in German-speaking cantons), and one experimental channel (TikTok Swiss parent community, or sponsored newsletter in a parenting publication).
- **Launch event**: a free 60-minute online webinar "Wie bereitet man sich auf die Gymi-Prüfung vor?" hosted with a credible name (the content reviewer if they're a teacher, or a partnered tutoring company). Aim for 100+ registrants. Records as evergreen content.
- **App Store Optimisation**: monitor keyword rankings weekly, A/B test screenshots and the first paragraph of the description, encourage reviews from beta families (Apple guidelines compliant: in-app prompt only after a positive interaction).
- **Partnership announcements**: get the 2–3 launch partners to publish or email about the app to their lists in the first launch week. This is often the single highest-converting channel for category-specific products.
- **Community presence converted to active**: the forums and groups you've been quietly reading since Phase 1 are now where you can helpfully reference the app when relevant. Be the helpful expert, not the spammer; this channel collapses if abused.

### 6.5 Research & feedback

- Daily standup on metrics for the first two weeks: signups, activation (child completes first exercise), week-1 retention.
- In-app feedback widget triggered after the third session.
- One weekly synthesis document: what's working, what's broken, what we're changing. Goes to all stakeholders.

**Phase 3 exit criteria (end September 2026):**
- App live in CH App Store and Play Store
- ≥ 500 paid sign-ups (target placeholder; revise based on funnel data)
- Week-1 retention > 40 %
- Press coverage in at least 2 Swiss outlets
- 4-star average rating with > 20 reviews
- Operational cadence stable: weekly content drop, weekly app update, weekly metrics review

---

## 7. Phase 4 — Growth & retention (Weeks 23–46, October 2026 to March 2027)

Once the launch is past, the rhythm shifts to executing toward the March exam. This phase is mostly out of scope for the roadmap as a planning document, but two things deserve to be flagged early:

- The **January push**: a meaningful share of paying customers will sign up in the last 6–8 weeks before the exam. Plan a January marketing campaign and ensure server capacity scales.
- The **post-exam cliff**: usage and retention drop 80–90 % the week after the exam. Plan for this — either pivot the cohort to the next exam (Kurzgymnasium 9th-grade prep, or younger siblings), or accept it as natural seasonality and use the quiet period for the next phase of content (math) and the next exam cycle.

---

## 8. Critical path

The chain of items where any single delay slips the launch date:

1. **Apple Developer verification** (Weeks 1–3) — gates everything. Start day one.
2. **AI content generation quality validation** (Weeks 1–3) — if this fails, the content strategy needs redesign before Phase 1 begins.
3. **Content reviewer hired** (Week 2) — without this person, exercises can't ship to production.
4. **Core exercise renderer + submission flow** (Weeks 6–8) — gates every module.
5. **PDF generation pipeline** (Weeks 9–10) — gates the printable promise.
6. **App Store submission** (Week 17, by 28 July) — gates the launch date.
7. **First press article published** (Week 18) — gates external credibility for paid channels.

Anything else can slip without moving the launch.

---

## 9. Key risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| AI-generated content quality is too low for trust | Medium | High | Phase 0 spike with quantitative quality bar; if it fails, switch to reviewer-authored content with AI assistance only for variants |
| Reviewer becomes unavailable mid-build | Medium | High | Identify 2 backup reviewers in Phase 0; document content style guide so others can pick up |
| App Store rejection | Medium | Medium | Submit a draft binary by week 14 to learn rejection reasons early; child apps face extra scrutiny under Apple's Kids Category guidelines |
| Slow SEO ramp means launch traffic is paid-only | High | Medium | Start SEO content in week 4, accept paid acquisition as primary launch channel and treat SEO as Q4 compounding |
| Bilingual positioning is too narrow | Low | High | Test in family interviews; if the niche can't sustain 500 paid users, broaden positioning to "exam prep with extra language support" without rebuilding the product |
| Compliance issue with children's data discovered late | Low | Very High | Lawyer consult in Phase 0; minimum-viable data collection from day one; DPIA documented before launch |
| Launch coincides with a competitor launch | Low | Medium | Competitive research already done; monitor monthly; differentiate on the bilingual angle and the specific Swiss curriculum alignment, both of which are hard to copy fast |

---

## 10. Decisions needed in the next two weeks

These are the decisions that gate Phase 0 and cannot be deferred:

1. **Brand name and domains** — final, registered.
2. **Mobile framework** — React Native (recommended) vs native iOS-first.
3. **Hosting** — Infomaniak (CH, premium) vs Hetzner (DE/EU, budget).
4. **Legal entity** — Einzelfirma now, GmbH later, vs GmbH from day one.
5. **Pricing model direction** — subscription vs one-time-per-cycle (final number can wait; the model shape cannot).
6. **Content reviewer** — at least one shortlisted candidate identified.
7. **Whether to launch iOS-only or both stores** — affects Phase 1 scope by ~3 weeks.

Once these seven are settled, Phase 0 can run cleanly and Phase 1 can start on time.

---

*End of roadmap v1.0. Revisit and update at each phase boundary.*
