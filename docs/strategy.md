# Strategy: The AI Study Buddy for Bilingual Gymi Kids

*Companion to `project-documentation.md` and `Swiss_Gymi_Prep_Goes_Digital__Competitive_Landscape_and_Critical_Market_Gaps.md`.*

---

## Core positioning

**Don't try to be the program — be the companion to whatever program the family is already running.**

Every ZAP candidate is already in school. Most also use a ZKM book, a course, or a tutor. The job this app does is the one nothing else can: sit in the kid's pocket on the tram, in bed, in the 15 minutes before dinner, and give them infinite, personalized, bilingual practice.

The positioning is forced by our constraints, and that is a feature. We cannot outproduce LearningCulture's curriculum or Lernstudio's 60-year content library with a small team. We cannot out-fund GoGymi's institutional partnerships. But we do not need to — those players are built around the assumption that learning happens in structured 90-minute blocks with a defined syllabus. The mobile-AI niche is a different shape entirely, and they are not built to occupy it.

## Why AI-native mobile is the only viable wedge

Three things converge.

**GoGymi bolted AI onto a web platform.** Their identity is "the digital Gymi school," so AI will always serve their content rather than being the experience itself.

**Traditional providers cannot go AI-native.** Their economic model depends on CHF 80–100/hour teachers; they would be disrupting themselves.

**Bilingual is the one place AI gives 10× leverage over human experts.** You cannot affordably staff DaZ-trained tutors who speak Ukrainian, Russian, Italian, Portuguese, and English fluently. A well-prompted LLM does this trivially.

The bilingual angle is not a feature. It is the entire reason the product can exist as a small team. A general-purpose Gymi app needs deep curated content to compete with ZKM and Logos. A bilingual-first AI app needs a great mobile experience and good prompts. The first requires twenty Swiss educators on staff; the second requires three engineers and a part-time DaZ advisor.

## The AI-mobile experience

The mental model is not "Khan Academy for Gymi." It is a personal tutor that lives in the phone and meets the kid where they are. Four interaction modes anchor the product surface.

**Photo-first help.** Kid photographs the school worksheet, the failed Diktat, the Aufsatz draft, the page from the ZKM book. App explains, corrects, generates similar exercises. This turns the dominant offline market (ZKM, school worksheets) into our funnel rather than our competitor.

**Voice-first conversation.** A 10-year-old types poorly and slowly. They speak fluently. Voice input for answers, voice explanations from the AI, conversational practice. For Aufsatz specifically, the AI does oral story-planning with the kid before any writing happens — which is how good teachers prep weak writers.

**Bilingual switching on demand.** Default interface in German. But when the kid taps "ich verstehe nicht," the explanation appears in their declared L1 — Ukrainian, English, Russian, whatever. Not a translation of the German explanation; an explanation written for someone whose mental model is in that language. This is the killer feature no human tutor can match across multiple L1s, and no other app offers at all.

**Adaptive infinite practice.** The model generates fresh exercises calibrated to where the kid actually struggles. This turns "thin content library" from a weakness into "we have infinite content." It is also the riskiest technical bet — the Wortarten generation prototype decides whether this works.

Surrounding these: timed mock-exam mode with printable PDFs (closes the digital–physical loop and gives parents tangible artifacts), a parent dashboard (because parents are the buyers), and basic gamification that does not condescend to 11-year-olds.

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

The riskiest assumption: can the AI generate exam-quality Wortarten and Sprachbetrachtung exercises reliably enough that an 11-year-old's preparation actually improves? Validate this before anything else.

| Phase | Timeline | Scope |
|---|---|---|
| **Prototype** | Months 0–3 | Private test with 15–25 bilingual families. Thin web wrapper, no app. Goal is qualitative: does bilingual essay feedback help, do generated exercises feel right to a DaZ expert, do parents see value |
| **iOS MVP** | Months 3–9 | ZAP1 (Langgymi), Deutsch only, English + Ukrainian as L1. Zurich only |
| **Expand core** | Months 9–15 | Add Math, ship Android, add Russian/Italian/Portuguese L1 |
| **Broaden market** | Months 15–24 | ZAP2 (Kurzgymi), other cantons (Bern, Aargau). Decide: raise / grow / acqui-hire |

## Risks to watch

**GoGymi adds bilingual support.** They have the funding. → Mitigation: speed (ship before they react), brand (be the bilingual brand from day one), mobile-native moat they cannot replicate without a rebuild.

**LLM quality on German grammar drifts.** The Wortarten prototype tells us how serious. → Mitigation: narrow-domain prompting, human-in-the-loop QA sampling, fallback to curated bank where generation is unreliable.

**Parents distrust AI for kids' education.** Real risk in German-speaking market. → Mitigation: full transparency on what the AI does, sample outputs visible pre-signup, generous free trial, parent dashboard showing exactly what was practiced. Position: "AI handles the patience, humans handle the judgment."

**Apple's kids app rules.** Under-13 review is stricter. → Mitigation: parent accounts as primary payer, COPPA-equivalent design from day one, no behavioral monetization.
