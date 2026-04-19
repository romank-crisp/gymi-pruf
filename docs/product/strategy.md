# Strategy: The AI Study Buddy for Bilingual Gymi Kids

*Companion to `project-documentation.md` and `Swiss_Gymi_Prep_Goes_Digital__Competitive_Landscape_and_Critical_Market_Gaps.md`.*

---

## Core positioning

**Be the practice companion, not the prep school.**

Every ZAP candidate is already in school. Most also use a ZKM book, a course, or a tutor. We do not try to replace any of that. The job this app does is the one nothing else can: sit in the kid's pocket on the tram, in bed, in the 15 minutes before dinner, and give them infinite, personalized, bilingual practice guided by an AI companion who knows where they are and what they need next.

Internally, we run a complete structured curriculum (`learning-program.md`). Externally, we do not position against LearningCulture's course or Lernstudio's lessons. We complement them. A family using us plus their existing prep is stronger than a family using us alone, and we say so. This is the only defensible positioning given resource constraints.

The positioning is forced by those constraints, and that is a feature. We cannot outproduce LearningCulture's curriculum or Lernstudio's 60-year content library with a small team. We cannot out-fund GoGymi's institutional partnerships. But we do not need to — those players are built around the assumption that learning happens in structured 90-minute blocks with a human teacher. The mobile-AI practice niche is a different shape entirely, and they are not built to occupy it.

## Why AI-native mobile is the only viable wedge

Three things converge.

**GoGymi bolted AI onto a web platform.** Their identity is "the digital Gymi school," so AI will always serve their content rather than being the experience itself.

**Traditional providers cannot go AI-native.** Their economic model depends on CHF 80–100/hour teachers; they would be disrupting themselves.

**Bilingual is the one place AI gives 10× leverage over human experts.** You cannot affordably staff DaZ-trained tutors who speak Ukrainian, Russian, Italian, Portuguese, and English fluently. A well-prompted LLM does this trivially.

The bilingual angle is not a feature. It is the entire reason the product can exist as a small team. A general-purpose Gymi app needs deep curated content to compete with ZKM and Logos. A bilingual-first AI app needs a great mobile experience and good prompts. The first requires twenty Swiss educators on staff; the second requires three engineers and a part-time DaZ advisor.

## The AI-mobile experience

The mental model is not "Khan Academy for Gymi." It is a personal tutor who lives in the phone, knows what the kid needs to learn, and walks them through it. The product has two anchors — a **structured learning program** and an **AI mascot companion** — and three supporting modalities that compose around them.

**Anchor 1 — The program.** A complete, mastery-based ZAP Deutsch curriculum covering ~160 teachables across Sprachbetrachtung, Rechtschreibung, Wortschatz, Textverständnis, and Aufsatz. Aligned to Lehrplan 21 terminology so what the kid practices reinforces what they hear in school. Detailed in `learning-program.md`.

**Anchor 2 — The mascot.** A persistent AI character — working name Leo — that delivers the program conversationally. Leo proposes the next concept, explains it, runs exercises, celebrates progress, and handles off-program questions without losing the plot. The mascot is not a UI layer; it *is* the program from the kid's point of view. Detailed in `ai-companion.md`.

Three supporting modalities compose around these anchors:

**Conversational Q&A ("Frag Leo").** The kid can ask anything at any time — *"Was ist Konjunktiv?"*, *"Warum heißt es *dem Kind*?"*, *"Bin ich schlecht in Grammatik?"* — and Leo answers in natural language, grounded in examples, then offers relevant practice. This is the second core pillar after the program itself, because it turns curiosity into practice reps.

**Bilingual L1 switching on demand.** Default German. When the kid taps "ich verstehe nicht," Leo re-explains in their L1 — not as translation, but as an explanation tuned to that language's learner mental model. Per-L1 explanation templates for the five known DaZ pain points (gender, cases, tenses, word order, separable verbs). No human tutor can match this across five L1s; no other app offers it at all.

**Voice-first conversation.** A 10-year-old types poorly and slowly. They speak fluently. Voice input works for answers, Frag Leo, and Aufsatz oral planning. For Aufsatz specifically, Leo plans the story orally with the kid before any writing — the way good teachers prep weak writers.

Two features compose around these, filling specific jobs rather than anchoring the product:

**Photo homework help.** Kid photographs a school worksheet or textbook page. Leo identifies the task type and offers to explain, hint, or generate similar exercises. Proves the app is additive to school work rather than competing with it. Useful, but not the central reason a kid opens the app — the daily reason is the relationship with Leo and progression through the program.

**Printable mock exams.** Timed, paper, exam-formatted PDFs. Closes the digital–physical loop and gives parents tangible artifacts. Primarily a late-preparation and parent-facing feature.

**Behind the scenes — adaptive practice generation.** The technical bet that makes all of the above scalable with a tiny team. Exercises are generated by AI from expert-audited templates, calibrated to where the kid actually struggles. This turns "thin content library" from a weakness into infinite on-demand practice. The Wortarten generation prototype decides whether this works.

Surrounding all of this: a parent dashboard (because parents are the buyers and they need to see the map the kid doesn't see), and gamification that respects 10–11-year-olds — mastery progress, character relationship, surprise unlocks. No streak anxiety, no leaderboards, no loss-aversion patterns.

## Business model

Subscription. Freemium. Accessible price.

- **~CHF 15–19/month or CHF 99–129/year** for paid tier
- **Freemium** genuinely useful: ~10 AI interactions/day plus all printable worksheets (Edufox set the expectation that meaningful Gymi prep can be free; GoGymi's CHF 250 one-time anchors the high end)
- **Avoid one-time pricing** — it caps LTV, does not fund ongoing AI compute, and signals "tool" rather than "service"
- **Free tier for refugee families** via cantonal social services — aligns with bilingual positioning (many of those families are exactly the target user) and builds the equity narrative GoGymi has used effectively

## Go-to-market wedge

Do not start by chasing the broad Swiss-German family market. We will lose to GoGymi's brand recognition, Edufox's free tier, and Lernstudio's institutional weight. The path is to win the bilingual community first — tight and concentrated — then expand outward.

**Beachhead: Ukrainian-Swiss community in Zurich.** Large post-2022 population, highly motivated about Gymi (academic ambition is strong in the diaspora), tight-knit on Telegram, ignored by every existing provider. Even a rough MVP will get traction.

**Then:** English-speaking expat parents (Internations, international school feeder networks, parent Facebook groups in Zurich/Zug), then Italian and Portuguese communities. Each is a defined channel, not the mass market.

Once we have proof points and Swiss reviews, the brand naturally expands to general Swiss families on the strength of "the most modern Gymi app." Chasing that audience first is suicide.

## Resource allocation philosophy

Every editorial decision defaults to: *can the AI do this with light human supervision, or does it require human authorship?* Default to the former.

- **Team shape:** 2–3 engineers (mobile, backend, AI/ML) + 0.5 designer + **0.2 FTE DaZ/Gymi advisor**
- The advisor does not write items. They review prompt outputs, define quality criteria, audit a weekly sample of generated exercises, and write rubrics and templates
- Source content from public ZAP archives (last 10 years freely available), past worksheet conventions, LMVZ-aligned grammar references
- The AI generates exercises; the advisor approves prompt structures. We never run a manual content production pipeline

This inverts the traditional EdTech cost structure. Logos has expensive teachers and cheap technology; we have expensive technology and cheap content production. The relevant comparison is not "how does our content compare to ZKM" — it is "how does our experience compare to having a private bilingual tutor on call." Against that baseline, we win on price by two orders of magnitude.

## Phased roadmap

**Three risks to validate, in order:**

1. **Does the mascot relationship work?** Can a conversational AI character feel like a genuine companion to a 10–11-year-old over weeks of use? This is the product's core bet. Validate with real kids before anything else.
2. **Does AI-generated exercise quality hold?** Can the AI generate exam-quality Wortarten and Sprachbetrachtung exercises reliably enough that preparation actually improves? The Wortarten prototype decides this.
3. **Does the bilingual L1 explanation quality hold across five languages?** Does a Ukrainian-L1 kid get a meaningfully different (and meaningfully better) explanation than an English-L1 kid?

| Phase | Timeline | Scope |
|---|---|---|
| **Prototype** | Months 0–3 | Private test with 15–25 bilingual families. Thin web wrapper, no app. Focus on the mascot conversation quality (is this a good companion?) and Wortarten generation quality. Qualitative goal: does the kid want to come back tomorrow, and does the parent see real learning. |
| **iOS MVP** | Months 3–9 | ZAP1 (Langgymi), Deutsch only, English + Ukrainian as L1. Zurich only. Full mascot + program delivery. Photo help and Frag Leo both shipping. |
| **Expand core** | Months 9–15 | Add Math, ship Android, add Russian/Italian/Portuguese L1 templates |
| **Broaden market** | Months 15–24 | ZAP2 (Kurzgymi), other cantons (Bern, Aargau). Decide: raise / grow / acqui-hire |

## Risks to watch

**GoGymi adds bilingual support.** They have the funding. → Mitigation: speed (ship before they react), brand (be the bilingual brand from day one), and the compound moat of mobile-native + persistent mascot relationship + structured curriculum. A retrofit of one of these on their web platform is hard; a retrofit of all three is a rebuild.

**LLM quality on German grammar drifts.** The Wortarten prototype tells us how serious. → Mitigation: narrow-domain prompting, human-in-the-loop QA sampling, fallback to curated bank where generation is unreliable.

**Parents distrust AI for kids' education.** Real risk in German-speaking market. → Mitigation: full transparency on what the AI does, sample outputs visible pre-signup, generous free trial, parent dashboard showing exactly what was practiced. Position: "AI handles the patience, humans handle the judgment."

**Apple's kids app rules.** Under-13 review is stricter. → Mitigation: parent accounts as primary payer, COPPA-equivalent design from day one, no behavioral monetization.
