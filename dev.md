# What's Good Here — Dev Notes

This file tracks anything that should be revisited, cleaned up, or removed before production. It is intentionally lightweight and high-level.

## Temporary / Experimental Code

- [ ] None yet — add entries here as we introduce temporary switches, debug code, or shortcuts for the redesign.

## Design Assets

- [ ] Torn / ripped paper receipt edges: confirm final asset source (PNG vs SVG) and ensure we are allowed to ship it (licensing or self-generated).
- [ ] **CF.8:** Add `public/sounds/printer.mp3` and `public/sounds/tear.mp3` for receipt-printing loader. See `public/sounds/README.md`. If missing, loader runs without audio.

## Tech Debt / Follow-ups

- [ ] Consider extracting the receipt card into its own component file once the v3 design settles.
- [ ] Revisit layout logic if we add non-mobile breakpoints beyond the 390px shell.

## Pre-Production Checklist

- [ ] Run through the Security Checklist from the brief and confirm all boxes are checked.
- [ ] Verify that error states (multiple matches, no matches, no reviews) are easy to exercise locally for QA.

