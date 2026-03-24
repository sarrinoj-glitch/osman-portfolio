# Workflow: Build Webpage

## Objective
Build a high-quality, on-brand webpage as a single `index.html` file with all styles inline.

## Required Inputs
- **Reference image** (optional): `ref1.jpeg` or any `ref*.jpeg` in the project root
- **Brand assets**: check `brand_assets/` before starting — use any logos, color guides, or style guides found there
- **User brief**: what the page is, who it's for, what it needs to do

## Steps

### 1. Pre-design (always do this first)
- Invoke the `ui-ux-pro-max` skill for design decisions
- Read brand assets: `brand_assets/brand_guideline.jpeg` (and any other files in that folder)
- If a reference image is provided, study it carefully — match layout, spacing, typography, color exactly

### 2. Design decisions
- Pick a custom brand color (never default Tailwind palette)
- Choose font pairing: display/serif for headings + clean sans for body
- Define spacing tokens (don't use random Tailwind steps)
- Plan the layering system: base → elevated → floating

### 3. Build
- Output: single `index.html`, all styles inline
- Use Tailwind CSS via CDN: `<script src="https://cdn.tailwindcss.com"></script>`
- Placeholder images: `https://placehold.co/WIDTHxHEIGHT`
- Mobile-first responsive
- Every interactive element must have hover, focus-visible, and active states

### 4. Serve & screenshot
- Start server: `node serve.mjs` (background, port 3000)
- Screenshot: `node screenshot.mjs http://localhost:3000`
- Read the screenshot PNG from `temporary screenshots/` with the Read tool
- Compare against reference if one was provided

### 5. Iteration loop
- Do at least 2 comparison rounds
- Be specific about mismatches: "heading is 32px but reference shows ~24px"
- Check: spacing/padding, font sizes/weights, colors (exact hex), alignment, border-radius, shadows
- Stop only when no visible differences remain or user says so

## Anti-Generic Guardrails
- Never use default Tailwind blue/indigo as primary
- Never use flat `shadow-md` — use layered color-tinted shadows
- Never use `transition-all` — only animate `transform` and `opacity`
- Layer multiple radial gradients, add SVG noise for depth
- Images need gradient overlay (`bg-gradient-to-t from-black/60`) + color treatment layer

## Edge Cases
- If server is already running on port 3000, do not start a second instance
- If brand assets contain a defined color palette, use those exact values — never invent brand colors
- If no reference image: design from scratch with high craft per the guardrails above

## Output
- `index.html` in the project root
- Screenshots saved to `temporary screenshots/`
