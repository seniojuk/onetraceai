# Align Product with Stakeholder Pricing

Make the four tiers on the pricing page (Starter / Team / Growth / Enterprise) the real plans the product knows about, and close the gaps that let users exceed their plan.

## 1. New plan structure


| Plan       | Price   | Seats     | Projects  | AI runs/mo | Storage   |
| ---------- | ------- | --------- | --------- | ---------- | --------- |
| Starter    | Free    | 1         | 1         | 10         | 100 MB    |
| Team       | $149/mo | 10        | unlimited | 500        | 10 GB     |
| Growth     | $399/mo | 25        | unlimited | unlimited  | 50 GB     |
| Enterprise | Custom  | unlimited | unlimited | unlimited  | unlimited |


## 2. Database migration

- Add `max_users` column to `plan_limits`.
- Replace the 3 existing rows (`free` / `pro` / `enterprise`) with 4 (`starter` / `team` / `growth` / `enterprise`), using the table above. `NULL` = unlimited.
- Backfill: any existing `subscriptions.plan_id = 'pro'` → `'team'`, `'free'` → `'starter'`.

## 3. Stripe products

Create two new Stripe products + monthly recurring prices:

- **Team** — $149/month
- **Growth** — $399/month

Starter has no Stripe product (free). Enterprise stays contact-sales.

I will need approval to call `create_stripe_product_and_price` for each — they create real prices in your Stripe account.

## 4. Code changes

- `src/config/stripe.ts` — rewrite `STRIPE_CONFIG` with `starter / team / growth / enterprise`; update helpers.
- `supabase/functions/check-subscription/index.ts` — map new product IDs → new plan IDs.
- `supabase/functions/stripe-webhook/index.ts` — same mapping.
- `supabase/functions/create-checkout/index.ts` — accept new plan IDs.
- `src/components/billing/PlanCards.tsx`, `BillingPage.tsx`, `UpgradeConfirmDialog.tsx` — render the 4 new tiers.
- `src/hooks/useIntegrationPermissions.ts` — remap feature gates (Jira/GitHub available from Starter; SSO/SCIM only Enterprise).
- `src/hooks/useUsageMetrics.ts` + `useUsageLimits.ts` — add `users.used / users.limit`, expose `canInviteMember`.
- `MemberManagement.tsx` — disable Invite button + show upgrade prompt when seat limit hit.

## 5. Server-side enforcement (the real gap)

Client-side gating is bypassable. Add server-side checks to the edge functions that cost money or seats:

- `invoke-agent` and `generate-*` functions — before running, query `plan_limits` + current month's AI run count for the workspace; reject with 402 if at limit.
- `workspace-invite` — check seat count vs `max_users`; reject if exceeded.
- Storage upload path — check `max_storage_mb` before writing.

## 6. Validation

- Manually confirm: free Starter user blocked at 10 AI runs; Team workspace blocked from inviting 11th user; webhook flips a workspace from Starter → Team on test checkout.

## Out of scope (call out, don't build now)

- Annual pricing toggle.
- Per-seat overage billing.
- Proration UI when changing plans (Stripe portal handles it).
- Grandfathering existing paying customers (need your call — there's only the test "Pro" plan today, so likely no real customers to migrate).

## Open questions before I start

1. Confirm the limit numbers in section 1 — I inferred them from the pricing page copy, but you may want different caps (e.g., Starter "25 artifacts" was in the marketing copy — keep or drop?).
2. OK to create the two Stripe products at $149 and $399, USD, monthly?
3. Any current paying users on the existing "Pro" plan to grandfather, or treat as test data?  
  
here is a document from a stakheholder:  
**OneTrace AI — 30-Day Sprint to Launch**
  ## **From Rough Onboarding → Polished Product → 10 Paying Customers**
  &nbsp;
  ---
  &nbsp;
  ## **The Strategic Situation in Plain English**
  Here's what your answers actually tell me:
  **The product isn't the problem. The first impression is.**
  You have a deep, sophisticated product targeting a buyer — the early-stage startup engineering team — who makes purchase decisions **fast, emotionally, and based on whether the demo blows them away in the first 5 minutes.** A rough first-run experience is a conversion killer for exactly this buyer. They'll bounce before they ever see the Artifact Graph light up.
  The good news: this is a **UX and onboarding problem, not a product problem.** You don't need to build features. You need to ruthlessly engineer the path from signup to "holy shit, this is exactly what we need" — and you need to do it in under 8 minutes.
  The other critical signal: **1-3 informal beta users is a hidden asset you're underusing.** Those people are your first paying customers if you handle the next 30 days correctly.
  &nbsp;
  ---
  &nbsp;
  ## **Part 1 — Ideal Customer Profile: Lock This In Now**
  Before touching the product, you need a razor-sharp ICP definition, because it determines every onboarding decision you make.
  **Your ICP: The Overwhelmed Technical Co-Founder**

  |                      |                                                                                                                                                             |
  | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | **Attribute**        | **Definition**                                                                                                                                              |
  | **Role**             | CTO, VP Eng, or Lead Engineer at a seed/Series A startup                                                                                                    |
  | **Team size**        | 5–20 engineers                                                                                                                                              |
  | **Stage**            | Post-MVP, actively shipping features, starting to feel the chaos                                                                                            |
  | **Pain state**       | Requirements living in Notion/Google Docs, Jira tickets disconnected from PRDs, no one knows what's tested vs. untested, PRs merging without traceability   |
  | **Tech stack**       | Uses GitHub + Jira (or Linear), has tried Notion/Confluence and found them insufficient                                                                     |
  | **Budget authority** | Decides tools purchases under $500/month without approval                                                                                                   |
  | **Trigger moment**   | Just shipped a feature that broke something because a requirement wasn't tested, OR just hired their 10th engineer and realized their process doesn't scale |

  This person is not looking for a requirements management system. They don't know they need traceability. They're looking for **relief from chaos** — and your product needs to speak that language from the first screen they see.
  **What this means for messaging:**
  - ❌ "AI-powered requirements traceability platform"
  - ✅ "Stop losing requirements between Notion, Jira, and GitHub. OneTrace connects everything your team is building into one living map — automatically."
  &nbsp;
  ---
  &nbsp;
  ## **Part 2 — The Onboarding Redesign**
  This is your entire company's focus for the next 30 days. Everything else waits.
  ### **The Core Problem with Most SaaS Onboarding**
  Most products onboard users into **the product's mental model** — workspaces, projects, artifact types, edge relationships. Your ICP doesn't care about your mental model. They care about their pain. The redesign principle is simple:
  **Onboard users into their problem, not your product.**
  ### **The Target: The "8-Minute Graph Moment"**
  Every onboarding decision should be evaluated against one question: *does this get the user to the Artifact Graph with real content in under 8 minutes?*
  That graph — fully populated, showing their PRD connected to Epics connected to Stories connected to ACs with a coverage score — is your conversion event. Everything before it is overhead. Minimize the overhead ruthlessly.
  &nbsp;
  ---
  &nbsp;
  ### **The Redesigned Onboarding Flow**
  **Step 0: Pre-Signup Landing (60 seconds)**
  Before a user even signs up, they should see the graph in motion. Not a screenshot — an **animated demo artifact graph** on your landing page/signup page showing a real PRD-to-test-case chain. This sets the expectation and creates desire before they've typed their email.
  **Step 1: Signup → Instant Value Promise (30 seconds)**
  Current flow gets users to workspace creation. New flow adds one critical screen immediately after email verification:
  "What are you building right now?"
  [Text field: describe your product or current feature in 1-2 sentences]
    

  "We'll set up your first requirement trace in under 5 minutes."
  [Continue →]
  This single input becomes the seed for their entire demo experience. It makes onboarding feel personal and immediately relevant.
  **Step 2: Choose Your Path (30 seconds)**
  Two options, not a feature tour:
  🚀 "Show me what OneTrace can do"
     → Loads a pre-built demo project in their workspace
     → They see a fully populated graph immediately
     → "This is what your project will look like"
    

  ✍️ "Start with my real project"
     → Guided creation flow (Steps 3-6 below)
  The demo path is critical. Most users will choose it, and it means they see the full product value in 60 seconds with zero effort.
  **Step 3: The Guided "First Trace" (4 minutes)**
  For users on the real project path, a progress-tracked wizard with five micro-steps:
  [1/5] ✅ Name your project          → Done (10 seconds)
  [2/5] ⏳ Describe what you're building → AI generates a PRD draft (90 seconds)
  [3/5] ○  Review your PRD            → Edit or accept (60 seconds)
  [4/5] ○  Generate your first Epics  → One click, AI generates 3 epics (30 seconds)
  [5/5] ○  See your Artifact Graph    → THE MOMENT (10 seconds)
  Each completed step should feel like a small win. Progress bar visible throughout. No decisions about artifact types, edge types, or workspace configuration — those come later.
  **Step 4: The Graph Moment (The Conversion Event)**
  When the graph loads for the first time, it shouldn't just appear — it should **animate in**. Nodes appearing sequentially: PRD node first, then Epic nodes branching out, with edge lines drawing between them. This is a 3-second animation that makes the product feel alive and powerful.
  Overlay a single callout tooltip:
  💡 "This is your Artifact Graph — a live map of everything your 
      team is building and why. It updates automatically as you add 
      requirements, link GitHub commits, and run tests."
    

  [Explore the Graph →]  [Generate Stories from your Epics →]
  **Step 5: The Sticky Hook (First 24 Hours)**
  The user has seen the graph. Now you need to bring them back tomorrow. Three mechanisms:
  First — An **immediate email** (sent within 2 minutes of graph view):
  *"Your first requirement trace is live. Here's what to do next to connect it to your GitHub repo and start tracking real commits against your requirements."*
  Second — A **dashboard checklist** (visible every login until complete):
  Your OneTrace Setup                          2/5 complete
  ✅ Created your first PRD
  ✅ Generated Epics
  ○  Generate Stories from your Epics          → Do this (2 min)
  ○  Connect your GitHub repo                  → Do this (3 min)
  ○  Push your first Epic to Jira              → Do this (2 min)
  Third — A **"Your project health" email** sent 48 hours after signup showing their current coverage score, even if it's 0%, with a specific prompt: *"Your project has 0% test coverage traced. Here's how to fix that in 10 minutes."*
  &nbsp;
  ---
  &nbsp;
  ## **Part 3 — Your Beta Users Are Your First Sales Calls**
  You have 1-3 people giving informal feedback. This is your most valuable asset right now and you need to formalize it immediately.
  **This week: Convert informal to structured**
  Reach out to each of them with this exact framing:
  *"I'm formalizing our design partner program and I want you to be one of our founding partners. That means: free Pro access for 6 months, a direct line to me for product requests, and your name/logo on our website as a design partner. In exchange, I need one 30-minute call every two weeks and honest answers about what's broken. Would you be in?"*
  Almost everyone says yes to this. It costs you nothing (you're pre-revenue), it locks in your early advocates, and it structures the feedback you're already getting.
  **The 30-Minute Design Partner Call Structure**
  Every two weeks, run this exact agenda:
  Minutes 1-5:   "Walk me through what you've done in OneTrace 
                  since we last spoke" (you observe, don't lead)
                  
  Minutes 5-15:  "Where did you get stuck or frustrated?" 
                  (this is your product roadmap)
                  
  Minutes 15-20: "What would have to be true for your whole team 
                  to use this every day?" 
                  (this is your ICP validation)
                  
  Minutes 20-25: "Who else do you know who has this problem?" 
                  (this is your sales pipeline)
                  
  Minutes 25-30: "If I charged you $X/month starting today, 
                  would you pay it?" 
                  (this is your pricing validation)
  That last question is uncomfortable. Ask it anyway. The answer — and the hesitation before the answer — is the most valuable data you'll collect in the next 30 days.
  **Your goal from these calls:** Get to your first paid commitment before you've fixed a single onboarding issue. Sell the vision, give them free access now, commit to a paid conversion in 30 days after the onboarding improvements ship. This is how you validate that the product is actually sellable before you spend engineering time optimizing it.
  &nbsp;
  ---
  &nbsp;
  ## **Part 4 — Parallel Track: Your Next 7 Beta Users**
  While you're fixing onboarding over the next 30 days, you need to be building a pipeline of 7 more design partners simultaneously. Here's exactly how:
  **Where to find your ICP right now:**
  - **X/Twitter:** Search "we're hiring engineers" from founders with 5-20 person teams. These are people whose product process is about to be tested by growth.
  - **LinkedIn:** CTOs at Series A companies announced in the last 6 months (they just got funded and are scaling fast — maximum pain, maximum budget)
  - **YC company directory:** W24/S24/W25 batches — these are exactly your ICP and they're reachable
  - **Indie Hackers / Hacker News:** "Ask HN: How do you manage requirements?" threads — these are your early adopters self-identifying
  **The outreach message that works for your ICP:**
  Subject: Quick question about how [Company] manages requirements
    

  Hey [Name],
    

  Saw [Company] is scaling fast — congrats on the Series A / 
  recent launch.
    

  Quick question: as your team grows past 10 engineers, how 
  are you keeping PRDs, Jira tickets, and GitHub commits from 
  becoming completely disconnected from each other?
    

  I'm building OneTrace AI — it automatically traces requirements 
  from PRD to code commit and tells you what's tested vs. untested 
  in real time. Takes about 8 minutes to see your first graph.
    

  Would a 15-minute demo be worth your time this week?
    

  [Your name]
  Short. Specific. Names their exact pain. Doesn't oversell. Gets a yes/no fast.
  **Target: 5 demo calls booked before your onboarding redesign ships.** Run those demos with the product as-is. Narrate over the rough edges. The goal isn't to close — it's to learn what objections come up and whether the core value proposition lands.
  &nbsp;
  ---
  &nbsp;
  ## **Part 5 — The 90-Day Milestone Map**
  Here's exactly how the next 90 days should look:
  **Days 1–3: Foundation**
  - Formalize your 1-3 beta users as design partners
  - Book your first 5 outreach demo calls
  - Map the current onboarding flow in detail — every click, every screen, every decision point
  - Write the new onboarding copy (your problem-first messaging)
  **Days 4–7: Build the Onboarding Redesign**
  - Build the demo project template (pre-populated with a realistic SaaS product PRD chain)
  - Build the "Choose Your Path" screen
  - Build the 5-step guided first trace wizard
  - Build the dashboard checklist widget
  - Set up the 3-email onboarding sequence (graph moment, 24hr next steps, 48hr health report)
  **Days 8–10: Test & Validate**
  - Run your redesigned onboarding with all current beta users
  - Run 5 cold demo calls — observe where attention peaks and drops
  - Collect: time-to-graph-moment, drop-off points, first questions asked
  - Target: onboarding time-to-graph-moment under 8 minutes
  **Days 11–15: First Revenue Push**
  - Convert minimum 2 design partners to paid ($99–$149/month — more on pricing below)
  - Launch shareable artifact links (one feature, maximum virality)
  - Build the PRD → Jira one-click push (most-requested feature for your ICP)
  - Post your first piece of thought leadership content (LinkedIn: "Why requirements traceability is broken for fast-moving engineering teams")
  **Days 16–20: Expand the Pipeline**
  - 15 additional outreach conversations
  - 3 more design partners onboarded
  - First case study written from a design partner (even informal quote + metrics)
  - Slack drift alerts shipped
  **Days 21–30: Systematize & Scale**
  - 10 paying customers or clear line-of-sight to 10
  - Pricing page updated with Teams tier
  - First iteration of template library (5 templates)
  - Define Month 4–6 roadmap based on what's blocking deal #11–50
  &nbsp;
  ---
  &nbsp;
  ## **Part 6 — Pricing Recommendation**
  Your current $29/month Pro plan is strategically wrong for your ICP. Here's why and what to do:
  Your target buyer — the CTO of a 10-person startup — has a **team budget**, not a personal budget. "$29/month" sounds like a personal tool. "$149/month for up to 10 users" sounds like an infrastructure investment. Same economics, completely different buying psychology.
  **Recommended pricing structure:**

  |                |                           |                                                                       |                      |
  | -------------- | ------------------------- | --------------------------------------------------------------------- | -------------------- |
  | **Tier**       | **Price**                 | **Limits**                                                            | **Target**           |
  | **Starter**    | Free                      | 1 project, 25 artifacts, 10 AI runs/mo                                | Individual discovery |
  | **Team**       | $149/mo (annual: $119/mo) | 3 projects, unlimited artifacts, 100 AI runs/mo, up to 10 users       | Your ICP sweet spot  |
  | **Growth**     | $399/mo (annual: $319/mo) | Unlimited projects, 500 AI runs/mo, up to 25 users, Slack integration | Series A+ teams      |
  | **Enterprise** | Contact sales             | SSO, audit logs, custom LLM, SLA                                      | Month 12+            |

  The jump from Starter to Team at $149/month for a 10-person team is **$15/person/month** — cheaper than a Figma seat, cheaper than a Linear seat. That's the anchor comparison you make in every sales conversation.
  &nbsp;
  ---
  &nbsp;
  ## **The Single Most Important Thing**
  Everything above is execution detail. The single most important strategic truth for the next 90 days is this:
  **Your first 10 customers will not come from your product. They will come from you — your network, your outreach, your demo calls, your relationships. The product's job is to not get in the way.**
  Right now the product is getting in the way because the onboarding is rough. Fix that, then get out from behind the product and start selling. The succesfull company is built on the other side of your first 10 paying customers — and those 10 are closer than you think.
  What do you want to go deeper on first — the onboarding redesign spec, the outreach strategy, or the pricing implementation?
    
