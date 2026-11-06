# BUNYAN — Design System

## 1. Brand

**Name:** BUNYAN — بُنيان
**Tagline:** نبني المعرفة، ونبني الإنسان.
**Idea:** Structure, craft and permanence. The visual language borrows from paper, ink, stone and
architectural geometry — not generic SaaS gradients.

Traits: intellectual, calm, trustworthy, warm, precise, accessible.

## 2. Color tokens

All tokens are CSS custom properties, consumed by Tailwind via `@theme inline`. Components use
semantic tokens only (`bg-background`, `text-muted-foreground`), never raw palette values.

| Token                  | Light     | Dark      | Use                                 |
| ---------------------- | --------- | --------- | ----------------------------------- |
| `--background`         | `#FAF8F3` | `#0D1413` | page canvas (warm paper / deep ink) |
| `--foreground`         | `#17201F` | `#ECF1EF` | primary text                        |
| `--surface`            | `#FFFFFF` | `#141D1C` | cards, sheets                       |
| `--surface-muted`      | `#F1EDE4` | `#1B2625` | secondary panels                    |
| `--muted-foreground`   | `#5C6663` | `#9AA8A4` | secondary text                      |
| `--primary`            | `#0E5C57` | `#6FBFB4` | actions, links, focus               |
| `--primary-foreground` | `#F7FBFA` | `#06201D` | text on primary                     |
| `--accent`             | `#B98A4B` | `#D3A96B` | highlights, achievements            |
| `--accent-foreground`  | `#241A0D` | `#23190B` | text on accent                      |
| `--border`             | `#DCD6C9` | `#2A3735` | hairlines                           |
| `--ring`               | `#0E5C57` | `#6FBFB4` | focus ring                          |
| `--danger`             | `#A63A34` | `#E07A72` | destructive/errors                  |
| `--success`            | `#2F6B4F` | `#7CC49B` | success                             |
| `--warning`            | `#B07A2A` | `#E0B36A` | caution                             |

Contrast: body text ≥ 4.5:1, large text ≥ 3:1, focus indicators ≥ 3:1 against adjacent colors.

## 3. Typography

- **UI / body:** IBM Plex Sans Arabic (fallback: "Segoe UI", system-ui, sans-serif).
- **Editorial / reading:** Amiri for long-form Arabic (fallback: "Noto Naskh Arabic", serif).
- **Latin within UI:** IBM Plex Sans Arabic includes Latin; code uses `ui-monospace`.

| Role    | Size / line-height  | Weight |
| ------- | ------------------- | ------ |
| Display | 48/1.15 (mobile 36) | 600    |
| H1      | 36/1.2              | 600    |
| H2      | 28/1.3              | 600    |
| H3      | 22/1.4              | 600    |
| Body    | 16/1.75             | 400    |
| Small   | 14/1.6              | 400    |
| Caption | 12/1.5              | 500    |

Arabic text uses slightly looser line-height (1.75–1.9). Never letter-space Arabic. Numbers and
Latin fragments inside Arabic are wrapped in `dir="ltr"` spans when direction could be ambiguous.

## 4. Spacing and layout

- Base unit: 4px. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96.
- Container: `max-w-6xl` (72rem) with 16px mobile / 24px desktop gutters.
- Content measure: 68ch for reading; 42rem for forms.
- Grid: 4 columns mobile, 8 tablet, 12 desktop.
- Sticky header: 64px. Sidebar (dashboard): 264px, collapses under `lg`.

## 5. Shape, elevation, motion

- Radius: `sm 6px`, `md 10px`, `lg 16px`, `xl 24px`, `full 9999px`.
- Shadows: low-contrast, warm black.
  - `sm: 0 1px 2px rgb(23 32 31 / 0.06)`
  - `md: 0 8px 24px -12px rgb(23 32 31 / 0.18)`
- Borders are preferred over heavy shadows.
- Motion: 150–200ms ease-out for state, 250ms for panels. Respect
  `prefers-reduced-motion`. No decorative loops, parallax or gradient animation.

## 6. Components

Hand-maintained primitives in `src/components/ui`, shadcn-compatible API:

| Component                     | Variants / notes                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| `Button`                      | `primary`, `secondary`, `outline`, `ghost`, `danger`; sizes `sm/md/lg/icon`; loading state; `asChild` |
| `Input`, `Textarea`, `Select` | label, hint, error; `aria-invalid`; logical padding                                                   |
| `Label`                       | required indicator via text, not color only                                                           |
| `Card`                        | header/content/footer, `surface` default                                                              |
| `Badge`                       | `neutral`, `primary`, `accent`, `success`, `danger`                                                   |
| `Avatar`                      | initials fallback, deterministic hue                                                                  |
| `Alert`                       | `info`, `success`, `warning`, `danger`                                                                |
| `EmptyState`                  | icon, title, description, action                                                                      |
| `Tabs` (Phase 2)              | keyboard accessible                                                                                   |
| `Dialog` (Phase 2)            | focus trap, ESC, labelled                                                                             |

Rules: every interactive element has visible focus, hover and disabled states; icon-only buttons
require an accessible label; server errors are announced with `role="alert"`.

## 7. RTL and internationalization

- `<html lang>` and `dir` are set from the active locale; Arabic and French are RTL/LTR
  respectively (`ar` → rtl, `en`/`fr` → ltr).
- Use CSS logical properties: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`,
  `text-start`, `border-s`. Never `ml-*`/`mr-*` for layout.
- Directional icons (arrows, chevrons) mirror in RTL via `rtl:rotate-180` or `rtl:-scale-x-100`.
- Numbers: `Intl.NumberFormat(locale)`; default Arabic uses Western digits for technical clarity,
  configurable later.
- Dates: `Intl.DateTimeFormat(locale, …)`; relative dates use `Intl.RelativeTimeFormat`.
- Code, emails, URLs and usernames are wrapped with `dir="ltr"`.
- Mixed content: prefer bidi isolation (`<bdi>`) around user names in sentences.
- All strings live in `src/i18n/messages/*.json`; no literal UI text in components.

## 8. Accessibility

- WCAG 2.2 AA target.
- Semantic landmarks: `header`, `nav`, `main`, `footer`; one `h1` per page.
- Skip-to-content link.
- Keyboard reachable menus; focus visible on all controls.
- Form errors linked with `aria-describedby`; success announced politely.
- Reduced motion honored; no content conveyed by color alone.
- Touch targets ≥ 44×44px on mobile.

## 9. Layout patterns

- **Public:** top navigation (logo, discover, communities, library, sign-in), hero, feature
  sections, footer. Warm paper background, generous whitespace.
- **Auth:** centered card on a quiet patterned background, one primary action.
- **Dashboard:** sidebar + top bar, page title, stat cards, content panels.
- **Community:** header with name/visibility/member count, tabs (feed, members, about), composer,
  post list.
- **Reading (Phase 2):** narrow measure, serif Arabic, sticky progress rail.

## 10. Content tone

- Arabic: clear Modern Standard Arabic, no machine-translated stiffness, no exaggerated hype.
- English/French: calm and concrete.
- Buttons are verbs ("أنشئ مجتمعًا", "Create community").
- Empty states teach the next action.
- Error messages say what happened and what to do next, without blaming the user.
