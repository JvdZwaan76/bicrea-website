# Pitch deck — build & send checklist

Source of truth: `deck/deck-full.html` (general) and `deck/deck-pitch.html` (prospect build).
Neither is public — `/deck/*` 301s to home. Always send a PDF, never the HTML.

## 1. Fill the placeholders (deck-pitch.html)
Gold-highlighted spans = facts that must be real before sending. Search for `rgba(244,208,63,0.12)`.
Slide 6 Capacity: [N] examiners, [N] days, [STATES], E&O [$ LIMIT], GL [$ LIMIT]
Slide 8 Your Project: [PROSPECT], [BASIN / STATES], [N] days, [TRACT COUNT], [COUNTIES / STATES]
Replace the whole `<span style="...rgba(244,208,63,0.12)...">[X]</span>` with plain text. Zero spans must remain.

## 2. Client line (slide 7 Track Record)
Hidden by default. Show ONLY for confirmed engagements, never prospects:
  sed -i '' 's/class="clients" data-show="0" style="display:none; /class="clients" data-show="1" style="display:block; /' deck/deck-pitch.html

## 3. Rules (do not skip)
- Every named person signed off on their own wording. A colleague's brief is not sign-off.
- No personal names on the pitch deck except the two contacts (Sandra's rule, 2026-09-29).
- Jasper Sr. never appears — site or deck.
- Every claim traceable: "30+ states" not "nationwide" unless substantiated; no "no subcontractors".

## 4. Render (needs fonts: brew install --cask font-inter font-cinzel)
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --no-pdf-header-footer \
    --print-to-pdf="$HOME/Desktop/BICREA-Capabilities-Pitch.pdf" "file://$PWD/deck/deck-pitch.html"

## 5. Scrub metadata (Chrome stamps its user-agent as Author; needs: python3 -m pip install pypdf)
  python3 -c "import pypdf;r=pypdf.PdfReader('$HOME/Desktop/BICREA-Capabilities-Pitch.pdf');w=pypdf.PdfWriter();[w.add_page(p) for p in r.pages];w.add_metadata({'/Title':'BIC REA LLC — Capabilities Overview','/Author':'BIC REA LLC','/Creator':'BIC REA LLC','/Producer':'BIC REA LLC'});w.write('$HOME/Desktop/BICREA-Capabilities-Pitch.pdf')"

## 6. Final check before send
  grep -c 'rgba(244,208,63,0.12)' deck/deck-pitch.html        # want 0
  grep -c 'data-show="1"' deck/deck-pitch.html                 # 1 only if clients confirmed
  python3 -c "import pypdf;print(pypdf.PdfReader('$HOME/Desktop/BICREA-Capabilities-Pitch.pdf').metadata.get('/Author'))"   # BIC REA LLC
  (mdls lags — trust pypdf, not Spotlight.)
Page through all 10 slides in Acrobat. Commit, push, six-way backup, handoff note.
