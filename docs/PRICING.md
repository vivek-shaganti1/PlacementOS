# PlacementIQ pricing and unit economics

Colleges pay; students never do. Price = **yearly platform fee per college + a price per student seat per year**, GST (18%) on top.
The numbers below are the single source of truth in `src/lib/pricing.ts`: the landing page, the plan defaults on the
Organizations page and the live **Profit and costs** estimate all read from it.

## Plans

| Plan | Per student / year | Platform fee / year | AI actions / student / month | Seats |
|---|---|---|---|---|
| Trial | ₹0 | none | 15 | up to 150, 30 days |
| Basic | ₹449 | ₹60,000 | 40 | from 500 |
| Pro | ₹749 | ₹60,000 | 80 | from 500 |
| Enterprise | from ₹999 | ₹60,000 | 150 | from 3,000 |

An **AI action** is one assistant reply, resume analysis or job-description match. The cap is enforced in the database
(`public.consume_ai`, append-only `ai_usage` log), so AI cost per student has a hard ceiling. The platform admin can override
the cap per college.

## Cost assumptions

| Cost | Value | Basis |
|---|---|---|
| AI action | ₹0.18 | Groq gpt-oss-120b at $0.15 input / $0.60 output per 1M tokens; ~5,000 in + 1,500 out tokens; +25% for retries and fallbacks; ₹88 per US$ |
| Hosting today | ₹5,300 / month | Supabase Pro + compute, Vercel |
| Hosting on AWS (Mumbai) | ₹19,700 / month | RDS PostgreSQL db.t4g.medium Multi-AZ (~$122), backups, app compute, CloudFront, monitoring, SES |
| Support and onboarding | ₹30,000 / college / year | one support person across ~15 colleges |
| Storage and email | ₹2 / student / year | resumes ~2 MB on S3 at $0.025/GB-month; SES $0.10 per 1,000 emails |
| Payments | 2% of revenue | gateway or bank collection |
| Sales / partners | 10% of revenue | commission |

Hosting is shared across all paying colleges. A typical student uses about 35% of the AI cap; the worst case assumes every
student uses 100% of it every month.

## Projection: one university

| Hosting | Colleges on platform | Plan | Students | Revenue / year | Cost (typical) | Margin (typical) | Profit (typical) | Margin (worst case) |
|---|---|---|---|---|---|---|---|---|
| Current (Supabase + Vercel) | 1 | Basic | 1,000 | ₹5,09,000 | ₹1,87,172 | 63% | ₹3,21,828 | 52% |
| Current (Supabase + Vercel) | 1 | Pro | 1,000 | ₹8,09,000 | ₹2,53,664 | 69% | ₹5,55,336 | 55% |
| Current (Supabase + Vercel) | 1 | Enterprise | 3,000 | ₹30,57,000 | ₹8,09,475 | 74% | ₹22,47,525 | 53% |
| AWS production | 1 | Basic | 1,000 | ₹5,09,000 | ₹3,59,972 | 29% | ₹1,49,028 | 18% |
| AWS production | 1 | Pro | 1,000 | ₹8,09,000 | ₹4,26,464 | 47% | ₹3,82,536 | 33% |
| AWS production | 10 | Basic | 1,000 | ₹5,09,000 | ₹1,47,212 | 71% | ₹3,61,788 | 60% |
| AWS production | 10 | Pro | 1,000 | ₹8,09,000 | ₹2,13,704 | 74% | ₹5,95,296 | 60% |
| AWS production | 10 | Enterprise | 3,000 | ₹30,57,000 | ₹7,69,515 | 75% | ₹22,87,485 | 54% |

## What this means

- **50 to 60% profit per student is reachable on every paid plan**, even if every student uses the full AI quota, as long as
  hosting is shared: stay on the current stack until about 5 paying colleges, then move to AWS (at 10 colleges AWS gives
  60% worst case and 71 to 75% typical).
- **Do not move a single college onto a dedicated AWS stack** at these prices: one 1,000-student Basic college on AWS
  alone earns 18 to 29%. Enterprise customers who want dedicated hosting should pay a higher platform fee.
- **The AI cap is the margin guarantee.** If a college asks for more AI, raise its cap only with a matching price increase
  (each extra 10 actions per student per month costs about ₹22 per student per year).
- The platform fee covers fixed costs (hosting share, support, onboarding), which is why colleges smaller than 500 students
  should still pay the full fee.

Sources: [Groq gpt-oss-120b pricing](https://computeprices.com/providers/groq/models/gpt-oss-120b),
[RDS db.t4g.medium ap-south-1](https://www.bytebase.com/dbcost/rds/instance/db.t4g.medium/),
[Supabase pricing](https://makerkit.dev/blog/saas/supabase-pricing), [Amazon SES pricing](https://aws.amazon.com/en/ses/pricing/).
