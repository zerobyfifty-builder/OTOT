

# Plan: Create PledgeB - Single Page Pledge

## Overview
Create a new `/pledgeb` route with a single-page pledge experience. All 10 pledges are shown as numbered circles on one screen (matching the reference image), with an "I Commit" button and social proof stats.

## Design (based on reference image)
- Full-screen background image (reuse pledge-10.webp)
- Dark overlay for readability
- OTOT logo top-left, refresh icon top-right
- Center card with glass-morphism effect containing:
  - "Please accept all 10 principles to complete your pledge" heading
  - 10 numbered circles in a 5x2 grid (white when unaccepted, green when accepted)
  - Clicking a circle toggles acceptance
- Below the card: "Join thousands of travelers who took the pledge" + stats
- "I Commit" button (enabled only when all 10 accepted)
- When clicked, show the same completion flow (certificate/plant options or email capture)
- Each circle can have a tooltip showing the pledge text on hover

## Files to Create/Edit
1. **Create `src/pages/PledgeB.tsx`** - New single-page pledge component reusing the same `pledgeSlides` data, auth logic, and email capture modal from the original Pledge page
2. **Edit `src/App.tsx`** - Add `/pledgeb` route

## Technical Details
- Reuse existing assets: `ototLogo`, `refreshIcon`, pledge background images
- Reuse `EmailCaptureModal` component
- Same Supabase pledge update logic as original
- Circles: clickable, toggle green (`bg-primary`) when accepted
- Glass card: `bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl`
- "I Commit" button styled similar to reference (rounded, prominent)
- After all accepted and "I Commit" clicked: show certificate/plant tree options (same as current completion slide)

