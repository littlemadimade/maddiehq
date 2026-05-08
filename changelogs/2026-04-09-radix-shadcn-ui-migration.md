---
date: 2026-04-09
scope: [node]
category: breaking
files_changed:
  - node/app/globals.css
  - node/components.json
  - node/lib/utils.ts
  - node/lib/cn.ts
  - node/lib/use-toast.ts
  - node/components/ui/dialog.tsx
  - node/components/ui/modal.tsx
  - node/components/ui/dropdown-menu.tsx
  - node/components/ui/tabs.tsx
  - node/components/ui/sonner.tsx
  - node/components/ui/toast.tsx
  - node/components/ui/command.tsx
  - node/components/ui/command-palette.tsx
  - node/components/ui/popover.tsx
  - node/components/ui/tooltip.tsx
  - node/components/ui/select.tsx
  - node/components/ui/alert-dialog.tsx
  - node/content/docs/dev/theming.mdx
requires_migration: false
requires_env_vars: []
breaking: true
---

## Radix/shadcn UI migration with semantic token system

The Node app's UI layer now uses a **semantic token system** built on Tailwind v4 CSS variables, with Radix-backed primitives following shadcn/ui's `new-york` style. This is the biggest UI infrastructure change since the original component library shipped.

### What changed for downstream projects

#### 1. Semantic tokens replace hardcoded `emerald-*` classes

You can now style brand-colored elements using semantic Tailwind utilities that automatically handle light/dark mode:

```tsx
// Before
<button className="bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white">

// After
<button className="bg-primary hover:bg-primary/90 text-primary-foreground">
```

The full token set is documented in `node/content/docs/dev/theming.mdx`. Tokens include `primary`, `secondary`, `muted`, `accent`, `destructive`, `success`, `warning`, `info`, plus `background`, `foreground`, `card`, `popover`, `border`, `input`, `ring`, and the radius scale.

**To swap your brand color**, edit one CSS variable block in `node/app/globals.css` (the `:root` and `.dark` blocks under "Default brand: emerald"). Three reference themes are included (`emerald`, `indigo`, `rose`) — the second two demonstrate the swap mechanism via `[data-theme="..."]` blocks.

#### 2. UI primitives now use Radix under the hood

Existing component APIs are preserved as wrappers — `<Modal>`, `<Tabs>`, `<DropdownMenu>`, `<ToastContainer>`, the `toast.success/.error/.info/.warning` programmatic API, and `<CommandPaletteProvider>`/`useCommandPalette()` all still work exactly as before. You don't need to change consumer code.

The benefit: focus trapping, keyboard navigation (arrow keys, type-ahead, Esc), collision-aware positioning, scroll lock, and proper ARIA semantics now work correctly. The hand-rolled implementations had gaps in all of these.

#### 3. New primitive capabilities (didn't exist before)

| Primitive | Use case |
|---|---|
| `Popover` | Click-triggered overlay with focus management |
| `Tooltip` | Delayed-open hint with proper ARIA |
| `Select` | Native-feel dropdown with typeahead and keyboard nav |
| `AlertDialog` | Destructive confirmation with `alertdialog` role |

See `node/app/admin/ui-showcase/page.tsx` for live examples of each.

#### 4. Toasts now backed by Sonner

`toast.success("Saved")`, `toast.error("Failed")`, etc. all still work — but they now render via Sonner instead of the hand-rolled `ToastContainer`. You get swipe-to-dismiss, stacking, region announcements, and theming integration for free.

If your code destructured `useToast()` to read the `toasts` array directly: that still returns an empty array now (Sonner manages its own state). Use `toast.dismiss()` instead.

### What you need to do in your downstream project

#### Option A — sync just the token system (recommended for projects that don't want to adopt Radix)

1. Pull `node/app/globals.css` from this template
2. Run a find-and-replace on your codebase using the migration table in `node/content/docs/dev/theming.mdx`. Most consumers just need:
   - `bg-emerald-600` → `bg-primary`
   - `bg-emerald-500` → `bg-primary`
   - `text-emerald-600` → `text-primary`
   - `bg-emerald-50` → `bg-accent`
   - `border-emerald-500` → `border-primary`
   - Drop standalone `dark:bg-emerald-*` and `dark:text-emerald-*` (the tokens already encode dark mode)
3. Build, verify visually

#### Option B — full sync (Radix + tokens)

1. Pull all files listed in `files_changed` above
2. Install the new deps: see the package.json diff in this template (15 new packages: 6 base shadcn deps + 8 Radix primitives + slot)
3. Update your barrel `components/ui/index.ts` to re-export the new primitives if you want
4. Build, verify visually

### Internal implementation notes

- **Tailwind v4** — AppSeed is on Tailwind v4, so the semantic tokens are wired via `@theme inline` in `globals.css` (not `tailwind.config.ts`, which doesn't exist)
- **`tw-animate-css`** is the Tailwind v4-native replacement for `tailwindcss-animate` (which is v3-only)
- **`lib/cn.ts` re-exports from `lib/utils.ts`** for backward compat — both import paths work, but new code should use `@/lib/utils` (the shadcn convention)

### Not in scope of this migration

- **Gray/slate/zinc neutral colors** — ~2,000 references across the codebase. They're still hardcoded; migrating them is a follow-up because the semantic mapping is more nuanced (gray-* is used for foreground, muted, card, secondary, border depending on context). The brand-swap mechanism still works without it.

### Rails port decision

The Rails port (`rails/`) **gets the semantic token system** but **does not get Radix primitives**. Rationale:

- **Radix is React-only.** Rails uses ERB views with Stimulus + Hotwire, not React. Radix primitives literally cannot run in ERB. This isn't a tradeoff; it's a hard architectural constraint.
- **The semantic token system is CSS-only** and absolutely applies. Rails has the same Tailwind v4 setup (`rails/app/assets/tailwind/application.css`) and uses `emerald-*` classes throughout ERB views. The same `@theme inline` block and CSS variable definitions can be copy-pasted, and the same find-and-replace migration (`bg-emerald-600` → `bg-primary`, etc.) applies.
- **Tracked as a follow-up.** Issue #242 covers porting the semantic tokens to Rails. This keeps the decision explicit and discoverable rather than silent.

For Rails, the equivalent of "shadcn primitives" would be using stimulus-component or building Hotwire-based components — but that's a different conversation outside the scope of this initiative.
