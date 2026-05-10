# BICREA Florida — Claim Substantiation Register

**Status:** Working document. **Maintained by:** BICREA principals + counsel.
**Effective from:** May 10, 2026.
**Review cadence:** Quarterly (and any time site copy changes).

---

## Why this document exists

Every factual claim on `florida.bicrea.com` should be traceable to specific
substantiating evidence held in BICREA's files. The Federal Trade Commission's
"reasonable basis" standard, the Florida Deceptive and Unfair Trade Practices Act
(FDUTPA), and the FTC Endorsement Guides all assume that if a claim is made
publicly, the maker can substantiate it on request. Maintaining this register
is the difference between a firm that can produce evidence in 24 hours and a
firm that scrambles.

This file lives in the repository, but the **substantiating evidence itself**
should be kept in BICREA's secure document management system — not committed
to GitHub.

---

## How to use this document

1. **Before any site copy change ships,** verify the claim against this register.
   If it isn't here, add it before publishing.
2. **Quarterly,** walk every line. If anything has shifted (a license expired, a
   number is no longer accurate), update the site and the register together.
3. **On any regulator inquiry, plaintiff's letter, or counsel question,** this
   register is the first document to produce.

---

## Substantiation register

### Aggregate experience claims

| Claim on site | Where it appears | Substantiation required | Source/file location | Status |
|---|---|---|---|---|
| "30+ Years Combined Experience" | index.html, mineral-title.html, about.html | CV/resume of each BICREA principal showing role, employer, dates; sum to verify "30+" | _BICREA principal CVs, internal HR file_ | ☐ Verify before launch |
| "30+ States Researched" | index.html, mineral-title.html | Internal project log listing all states where BICREA has produced any mineral title work product across all principals' careers | _Internal project log; cumulative_ | ☐ Verify before launch |
| Specific personal credentials shown on team page (e.g., "Florida Real Estate") | about.html | License document, certification, or comparable evidence | _Per-principal credentials file_ | ☐ Verify before launch — REMOVE any credential not currently held |

### Service-delivery claims

| Claim on site | Where it appears | Substantiation required | Source/file location | Status |
|---|---|---|---|---|
| "Typical 7–14 business day turnaround" for standard reports | mineral-title.html, methodology.html | Sample of 10–20 recent standard-report engagements showing actual delivery times; calculate median + range | _Engagement log; quarterly review_ | ☐ Verify quarterly |
| "Fees typically $1,500–$5,000 for single-tract reports of normal complexity" | disclosures.html, mineral-title.html | Sample of recent engagement letters showing fee distribution | _Engagement letter archive_ | ☐ Verify quarterly |
| "Typical 72-hour offer window" for distressed property | distressed-properties.html, process.html | Sample of recent distressed property offers showing actual time from walkthrough to written offer | _Acquisition log; quarterly review_ | ☐ Verify quarterly |
| "Most uncomplicated cash closings typically happen 14–30 days from contract" | process.html, distressed-properties.html | Sample of recent closings (excluding probate, QT, code cases) showing actual contract-to-close time | _Closing records; quarterly review_ | ☐ Verify quarterly |
| "Four-eyes review on every report" | methodology.html | Internal QA log showing which principal reviewed which report | _QA log_ | ☐ Verify ongoing |

### Case study figures

Each case study on `case-studies.html` is a generalized representation of
actual prior work. Per the page disclaimer and the disclosures policy, identifying
details are anonymized. The underlying source documents (engagement letter, work
product, closing statement) should be archived and retrievable.

| Case study | Underlying file reference | Status |
|---|---|---|
| "12-tract drilling unit assembly, Permian Basin" | _Engagement file ref:_ | ☐ Add reference |
| "Severed mineral estate research, Polk County, FL" | _Engagement file ref:_ | ☐ Add reference |
| "Missing-heir curative for an Oklahoma royalty interest" | _Engagement file ref:_ | ☐ Add reference |
| "Sarasota County property with $87,000 in code liens" | _Engagement file ref:_ | ☐ Add reference |
| "Inherited Hillsborough County property with deferred maintenance" | _Engagement file ref:_ | ☐ Add reference |
| "Vacant Manatee County property with clouded title" | _Engagement file ref:_ | ☐ Add reference |

If any of these is fictional/composite or no longer represents real engagements:
**remove the case study from the site.**

### Testimonials

Every testimonial on the site needs:
1. The verifiable source (named or anonymized but documented internally).
2. Confirmation that the source consents to the use.
3. Disclosure of any material connection (FTC Endorsement Guide compliance).
4. The text of the testimonial as approved by the source.

| Testimonial | Source on file | Consent on file | Material connection | Status |
|---|---|---|---|---|
| Senior Landman, Independent Energy Operator (mineral-title.html) | _:_ | _:_ | _:_ | ☐ Verify before launch |

### Regulatory position statements

These are not "claims" in the marketing sense, but statements of legal/regulatory
position. They should be reviewed by counsel before launch and re-reviewed
annually.

| Statement | Where it appears | Counsel review status |
|---|---|---|
| "BICREA's transactions are clean cash purchases — no sale-leasebacks, no repurchase options" | disclosures.html, distressed-properties.html, footer of every page | ☐ Counsel review required before launch |
| "Such transactions, by definition, fall outside the scope of 'foreclosure-rescue transaction' under §501.1377(1)(d)" | disclosures.html | ☐ Counsel review required before launch |
| "BICREA does not provide mortgage assistance relief services... and does not act as a 'foreclosure-rescue consultant' under Fla. Stat. §501.1377(1)(e)" | disclosures.html | ☐ Counsel review required before launch |
| Florida real estate license law principal-buyer position | disclosures.html | ☐ Counsel review required before launch |

---

## Pre-launch counsel review checklist

Before this site sees any meaningful traffic or marketing spend, the
following have been reviewed and approved by Florida real estate counsel:

- [ ] **`disclosures.html` in full** — particularly Section 3 (the §501.1377 / MARS Rule / Chapter 475 position)
- [ ] **`distressed-properties.html`** — the consumer-protection panel, the FAQ answers, and the footer disclosure
- [ ] **`mineral-title.html`** — the testimonial, the FAQ answers regarding scope/limits
- [ ] **`methodology.html`** — the limits-of-work section
- [ ] **`privacy.html`** — particularly the FDBR rights language
- [ ] **The lead form's consent language** — particularly the SMS/TCPA opt-in wording
- [ ] **Every quantitative claim above** verified or revised

Sign-off recommended before launch:

```
Counsel review by:           ____________________________
Date:                        ____________________________
Sign-off comments:           ____________________________
```

---

## When site copy changes

Any time site copy changes, update this register. The change-control rule:

1. Open a PR / branch with the copy change.
2. Update this `SUBSTANTIATION-CHECKLIST.md` in the same PR.
3. If the change touches a regulatory statement, request counsel re-review
   before merging.

---

## Quarterly review template

```
Review date: ________________
Reviewed by: ________________

For each claim in this register:
[ ] Still accurate as written?
[ ] Source/evidence still on file?
[ ] Site copy still matches the substantiation?

Items requiring update:
1.
2.
3.

Completed updates (with commit refs):
1.
2.
3.

Next review scheduled: ________________
```

---

## When in doubt

Remove the claim. A site that says less but says it accurately is more
defensible than a site that says more and stretches.

Defensibility is a feature, not a tax.
