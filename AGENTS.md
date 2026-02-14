# AGENTS.md - AI Agent Directives for kloa-site

## Project Context
Vsinger FanSite (Angel/Demon Edition) - Chinese Vtuber character fan site with duality theme.

## Communication Guidelines

### Language Requirement
- ALL responses to user requests MUST be in Chinese only
- No English explanations or comments unless explicitly requested
- Code comments can remain in English for technical clarity

## Build, Lint, Test Commands

### Development
- `bun dev` - Start dev server (Astro)
- `bun run build` - Build for production (runs astro check + astro build)
- `bun run preview` - Preview production build

### Testing
- `bun test` - Run unit tests (Vitest) in watch mode
- `bun test:run` - Run all unit tests once
- `bun test:ui` - Run unit tests with UI
- `bun test:coverage` - Run tests with coverage report (90% thresholds)
- `bun test:e2e` - Run Playwright E2E tests
- `bun test:e2e:ui` - Run E2E tests with UI
- `bun test:e2e:debug` - Debug E2E tests
- `bun test:e2e:headed` - Run E2E tests in headed mode
- `bun test:all` - Run all tests (unit + E2E)

### Type Checking
- `bun run type-check` - Run TypeScript type check
- `bun run astro-check` - Run Astro type check

### Running Single Tests
- Unit: `bun test -- SongList.test.tsx` or `bun test -- -t "search"`
- E2E: `bun test:e2e music.spec.ts` or `bun test:e2e -g "theme toggle"`

## Tech Stack
- Runtime: Bun v1.3.6
- Framework: Astro 6.0 Beta (static output)
- UI: React 19 (Server Components enabled)
- Styling: Tailwind CSS v4.0 (CSS-first @theme)
- Animation: Framer Motion
- Icons: Lucide React
- Testing: Vitest + Playwright

## Code Style Guidelines

### Imports & Organization
- Import order: React hooks → third-party → local components → types
- Absolute imports from `src/` preferred
- Use named exports for components, types, utilities
- Separate interface/type definitions from component logic

### TypeScript
- Strict mode enabled in tsconfig
- Explicit return types for public functions
- Use `interface` for object shapes, `type` for unions/aliases
- No `any` - use `unknown` with type guards
- Explicit `isClient` checks for browser APIs

### Naming Conventions
- Components: PascalCase (e.g., `ThemeToggle`, `SongList`)
- Functions: camelCase (e.g., `handleSearch`, `fetchSongs`)
- Constants: SCREAMING_SNAKE_CASE for shared values
- CSS variables: kebab-case (e.g., `--color-pink-500`)
- Files: PascalCase for components, lowercase for utilities

### React Patterns
- Functional components only (no class components)
- Hooks: `useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`
- State management: nanostores for global state
- Event handlers: named functions (not inline) for performance
- Avoid prop drilling - use context/store for shared state

### Styling (Tailwind v4)
- Use @theme for color system (pink/blue duality)
- Prefer utility classes over inline styles
- OKLCH color space for vibrancy
- CSS custom properties (`var(--text-primary)`) for theme-aware values
- Glassmorphism: `.glass` for frosted effects

### Error Handling
- Try/catch for async operations
- User-friendly toast notifications (sonner)
- Fallback UI for data loading
- Type guards for runtime type checking
- Console.error only for debugging - user-facing errors should be silent

### Testing Standards
- Unit tests: `__tests__/unit/components/*.test.tsx`
- E2E tests: `__tests__/e2e/*.spec.ts`
- Test setup: `__tests__/unit/setup.ts`
- Coverage thresholds: 90% statements/branches/functions/lines
- Mock browser APIs in setup (localStorage, matchMedia, clipboard)

### Astro Files
- Use frontmatter for imports and data
- `client:load` for interactive React components
- Separation: `.astro` for layout/pages, `.tsx` for components
- Server-side data fetching in Astro frontmatter

### Performance
- Use `useMemo` for expensive computations
- Use `useCallback` for event handlers passed to children
- Virtualize long lists (VirtualList component)
- Lazy load images and route segments
- Minimize re-renders with proper dependency arrays

## Design System: Duality Theme

### Colors
- Primary Pink: oklch(0.72 0.12 15) - Angel Mode
- Secondary Blue: oklch(0.64 0.10 240) - Demon Mode
- Theme toggle: Light = Angel (Halo), Dark = Demon (Horns)

### Typography
- Headers: Noto Serif SC (Gothic/Fantasy)
- Body: Noto Sans SC
- Chinese text with proper line-height (1.6)

### Components
- ThemeToggle: Halo/Horn icon switch
- GlassCard: Glassmorphism cards
- HeartSpinner: Heart-shaped loader
- SongList: Virtualized list with pinyin search

### Accessibility
- ARIA labels for interactive elements
- Keyboard navigation support
- High contrast colors (OKLCH verified)
- Chinese language for all UI text
