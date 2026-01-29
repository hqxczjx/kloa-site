👼👿 Project Genesis: Vsinger FanSite (Angel/Demon Edition) - AI Directive

1. Role & Context (角色与背景)

Your Role: Senior Frontend Architect & UI/UX Designer specialized in ACG/Vtuber aesthetics.
Project Goal: Build a visually immersive Unofficial Fan Site for a specific Vsinger character.
Character Traits:
Archetype: Angel & Demon Hybrid (Duality).
Visuals: Pink hair, Demon horns, Angel halo, White dress with Heart cutout, Demon tail.
Colors: Pink (Primary), Blue (Secondary).
Target Audience: Chinese fans (Mobile-first).
Design Philosophy: "Celestial Duality". The UI must reflect the Angel/Demon split, using Light Mode for "Angel" and Dark Mode for "Demon".

2. The Bleeding-Edge Tech Stack (技术栈锁定)

Strictly enforce the following versions:
Runtime: Bun v1.3.6 (Strictly enforced).
Framework: Astro 6.0 Beta (Output: static with Server Islands).
UI Library: React 19 (React Compiler Enabled, Server Components).
Styling: Tailwind CSS v4.0 (Vite Mode, CSS-first config).
Animation: Motion (Framer Motion).
Icons: Lucide React.
Data Source: Tencent Docs (Smart Sheet) -> Build-time Fetching.
Deploy: Cloudflare Pages.

3. UI/UX Design System (The "Duality" Theme)

3.1 Color Palette (Pink & Blue)
Use Tailwind v4 CSS variables (@theme) with OKLCH for vibrancy.
Primary Pink (Angel/Hair): #ecb8c3
Variable: --color-pink-500
Usage: Primary buttons, active states in Light Mode.
Secondary Blue (Demon/Accent): #AEC6CF (Pastel Blue) or #7CB9E8 (Aero Blue).
Variable: --color-blue-500
Usage: Secondary accents, gradients, active states in Dark Mode.
Surface:
Light (Angel Mode): #fff0f5 (Lavender Blush) or pure white with soft pink glows.
Dark (Demon Mode): #1a1a2e (Deep Navy) or #0f0f12 with blue neon glows.

3.2 Visual Motifs (Based on Character)
The Heart: Use the "Heart Cutout" shape from her dress as the Loading Spinner and Favorite Icon.
Glassmorphism:
Light Mode: "Holy Glass" (White frosted glass, high brightness).
Dark Mode: "Abyssal Glass" (Dark frosted glass, blue/purple tinted).
Typography (Chinese):
Font Stack: Noto Serif SC (Titles - for the Gothic/Fantasy feel) + Noto Sans SC (Body).

3.3 Micro-interactions
Theme Toggle: A custom switch. Toggle ON = Angel (Halo icon), Toggle OFF = Demon (Horn icon).
Hover States:
Light Mode: Soft box-shadow with gold/pink tint.
Dark Mode: Sharp drop-shadow with blue neon glow.

4. Architecture & Data Layer

4.1 Directory Structure
code
Text
src/
├── assets/           # character_fullbody.png, texture_overlays.png
├── components/
│   ├── ui/           # HeartSpinner, ThemeToggle, GlassCard
│   ├── react/        # SongList (Search/Filter), Player
│   └── astro/        # Hero (Parallax), Footer
├── content/          # Astro Content Layer
│   ├── config.ts     # Collection Definitions
│   └── loaders.ts    # Tencent Docs Loader
├── layouts/          # BaseLayout.astro
└── styles/           # global.css (Tailwind v4 Theme)

4.2 Data Schema (Tencent Docs)
Mock Data: Create src/data/songs.json mirroring Tencent Docs Smart Sheet structure.
title, artist, date, url, tags (e.g., "Angel Vibe, Demon Vibe").

5. Implementation Roadmap

Phase 1: Foundation & Duality Theme
Init: Bun 1.3.6 + Astro 6 Beta.
Styling (Tailwind v4):
Define --color-pink (Primary) and --color-blue (Secondary).
Configure dark: variant to handle the Angel/Demon switch.
Set font families (Serif for headers, Sans for body).
Layout: Build BaseLayout.astro with the Theme Toggle (Halo/Horns) in the navbar.

Phase 2: The Music Database
Logic: React 19 SongList with Pinyin Search.
UI:
Song Cards: Glassmorphism cards.
Tags: Pink badges in Light Mode, Blue badges in Dark Mode.

Phase 3: Hero & Character Showcase
Hero Section:
Display the Character Tachie (Standing Art) prominently.
Animation: Use Motion to make her "float" slightly (breathing animation).
Background:
Light Mode: Floating feathers and soft light rays.
Dark Mode: Floating bat wings/particles and deep shadows.
