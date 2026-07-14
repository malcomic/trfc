# Design Tokens & Component System

Complete reference for styling consistency across the TRFC website.

---

## Color Palette

### Brand Colors (Primary)

| Token | Hex | Usage | CSS Class |
|-------|-----|-------|-----------|
| `fire` | `#FF4500` | Primary CTA, highlights, active states | `text-fire`, `bg-fire`, `border-fire` |
| `ember` | `#FF7A1A` | Secondary accent, hover states | `text-ember`, `bg-ember`, `border-ember` |

### Neutral Palette (Dark Mode Primary - Default)

| Token | Hex | Usage | CSS Classes |
|-------|-----|-------|-------------|
| `night` | `#0A0A0A` | Page backgrounds | `bg-night`, `text-night` |
| `ink` | `#111111` | Deep backgrounds | `bg-ink`, `text-ink` |
| `ash` | `#1C1C1C` | Card backgrounds | `bg-ash`, `border-ash` |
| `smoke` | `#2E2E2E` | Hover backgrounds, dividers | `bg-smoke`, `hover:bg-smoke` |
| `mist` | `#3D3D3D` | Borders, subtle dividers | `border-mist` |
| `fog` | `#6B6B6B` | Secondary text, icons | `text-fog`, `fill-fog` |
| `chalk` | `#F5F2EE` | Primary text, headings | `text-chalk` |

### Light Mode Counterparts

| Token | Hex | Usage | CSS Classes |
|-------|-----|-------|-------------|
| `night-light` | `#FFFFFF` | Page backgrounds | `.light:bg-night-light`, `dark:bg-night` |
| `ink-light` | `#F8F8F8` | Card backgrounds | `.light:bg-ink-light` |
| `ash-light` | `#F0F0F0` | Borders | `.light:border-ash-light` |
| `chalk-light` | `#1A1A1A` | Primary text | `.light:text-chalk-light` |

### Status & Fitness Colors (Fitness-Inspired)

| Token | Hex | Usage |
|-------|-----|-------|
| `success-green` | `#22C55E` | High energy, active, available |
| `warning-amber` | `#F59E0B` | Limited capacity, medium priority |
| `danger-red` | `#EF4444` | Sold out, unavailable, critical |
| `info-blue` | `#3B82F6` | Information, secondary action |

### Premium Color

| Token | Hex | Usage | CSS Classes |
|-------|-----|-------|-------------|
| `gold` | `#C9A84C` | Premium badges, special items | `text-gold`, `border-gold` |

---

## Typography

### Font Families

| Family | Font Stack | Use Case | Weights |
|--------|-----------|----------|---------|
| **Display** | `Bebas Neue` | Hero titles, large H1 | 400 |
| **Heading** | `Barlow Condensed` | H2-H4, buttons, labels, nav | 500, 700, 900 |
| **Body** | `Barlow`, `Bebas Neue` | General UI, content | 400, 600, 700 |
| **Mono** | `Inter` | Code, tech text | 400, 500, 600, 700 |

### Typography Scale

#### Headings

| Level | Class | Size | Weight | Line Height | Usage |
|-------|-------|------|--------|-------------|-------|
| **H1** | `text-6xl md:text-7xl` | 3.75rem / 4.5rem | 400 Bebas | 1 | Hero titles, page titles |
| **H2** | `text-4xl md:text-5xl` | 2.25rem / 3rem | 700 Barlow Condensed | 1.1 | Section headings |
| **H3** | `text-3xl md:text-4xl` | 1.875rem / 2.25rem | 600 Barlow | 1.2 | Subsection headings |
| **H4** | `text-2xl md:text-3xl` | 1.5rem / 1.875rem | 600 Barlow | 1.3 | Card titles, list headings |
| **H5** | `text-xl md:text-2xl` | 1.25rem / 1.5rem | 600 Barlow | 1.3 | Small headings, labels |
| **H6** | `text-lg md:text-xl` | 1.125rem / 1.25rem | 600 Barlow | 1.4 | Captions, badges |

#### Body Text

| Class | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `text-base` | 1rem | 400 | 1.6 | Standard body text |
| `text-sm` | 0.875rem | 400 | 1.5 | Secondary text, metadata |
| `text-xs` | 0.75rem | 400 | 1.4 | Captions, hints, small labels |
| `text-lg` | 1.125rem | 400 | 1.6 | Emphasized body text |

#### Button Text

| Class | Size | Weight | Font Family | Usage |
|-------|------|--------|-------------|-------|
| Button text | `text-sm md:text-base` | 700 | Barlow Condensed | All buttons |
| Label text | `text-xs md:text-sm` | 700 | Barlow Condensed | Form labels, badges |

---

## Spacing Scale

All spacing uses Tailwind's base 4px unit. Use these consistently for predictable layouts.

### Padding (p, px, py, pt, pb, pl, pr)

| Tailwind Class | Pixels | Usage |
|---|---|---|
| `p-4` | 1rem (16px) | Small: padding in buttons, tight cards |
| `p-6` | 1.5rem (24px) | **Medium (default)**: standard padding, card content |
| `p-8` | 2rem (32px) | Large: section padding, main containers |
| `p-12` | 3rem (48px) | XL: hero sections, wide spacing |

### Gaps (gap, gap-x, gap-y)

| Tailwind Class | Pixels | Usage |
|---|---|---|
| `gap-3` | 0.75rem (12px) | Tight: icon + text, adjacent elements |
| `gap-4` | 1rem (16px) | **Small (default)**: list items, form rows |
| `gap-6` | 1.5rem (24px) | **Medium (default)**: form fields, card spacing |
| `gap-8` | 2rem (32px) | **Large**: section separation |
| `gap-12` | 3rem (48px) | XL: major section breaks |

### Margins (m, mx, my, mt, mb, ml, mr)

| Tailwind Class | Pixels | Usage |
|---|---|---|
| `m-4` | 1rem (16px) | Small spacing between elements |
| `m-6` | 1.5rem (24px) | **Standard**: default margin |
| `m-8` | 2rem (32px) | Large spacing |
| `mt-12` / `mb-12` | 3rem (48px) | Section spacing |

### Responsive Padding (Mobile-First)

- **Mobile (< 768px)**: `px-4` horizontal padding
- **Tablet (768px - 1024px)**: `md:px-6` horizontal padding
- **Desktop (> 1024px)**: `lg:px-8` horizontal padding

---

## Sizing Scale

### Button Sizes

| Size | Height | Padding | Font Size | Usage |
|------|--------|---------|-----------|-------|
| **sm** | 36px (h-9) | px-4 py-2 | text-xs | Small buttons, secondary actions |
| **md** (default) | 44px (h-11) | px-6 py-3 | text-sm | Standard buttons, forms |
| **lg** | 52px (h-13) | px-8 py-4 | text-base | Hero CTAs, prominent actions |

### Icon Sizes

| Size | Dimension | Usage |
|------|-----------|-------|
| `icon-sm` | 16px (w-4 h-4) | Form icons, small badges |
| `icon-md` (default) | 24px (w-6 h-6) | Navigation, standard components |
| `icon-lg` | 32px (w-8 h-8) | Hero sections, emphasis |

### Border Radius

| Class | Radius | Usage |
|-------|--------|-------|
| `rounded-lg` | 0.5rem (8px) | Standard cards, buttons |
| `rounded-xl` | 0.75rem (12px) | Emphasized cards, modals |
| `rounded-2xl` | 1rem (16px) | Hero sections, large elements |
| `.clip-angled` | 8px angled corners | Brand-specific buttons |
| `.clip-angled-sm` | 6px angled corners | Small branded elements |
| `.clip-angled-lg` | 12px angled corners | Large branded elements |

---

## Component Specifications

### Button Component

**Variants:**
- **primary**: Background `bg-fire`, text `text-chalk`, hover darkens to `ember`
- **secondary**: Border `border-mist`, text `text-chalk`, hover background `bg-smoke`
- **outline**: Border `border-fire`, text `text-fire`, hover background `bg-fire/10`
- **ghost**: No background, text `text-chalk`, hover text `text-fire`

**Sizes:** sm (h-9), md (h-11, default), lg (h-13)

**States:**
- **Default**: Visible, interactive
- **Hover**: Darker background or text shift to `ember`
- **Active**: Pressed state with slight scale (0.98)
- **Disabled**: Opacity 50%, cursor not-allowed
- **Loading**: Spinner icon, disabled state

**Example Usage:**
```tsx
<Button variant="primary" size="lg">Sign Up</Button>
<Button variant="secondary" size="md">Learn More</Button>
<Button variant="outline">Cancel</Button>
```

### FormInput Component

**Styling:**
- Background: `bg-smoke` with dark border `border-mist`
- Text: `text-chalk`
- Placeholder: `text-fog`
- Focus: Border color shifts to `fire`, shadow glow

**Sizes:** sm (py-2), md (py-3, default), lg (py-4)

**States:**
- **Default**: Visible with `border-mist`
- **Focus**: Border `border-fire`, shadow glow effect
- **Error**: Border `border-danger-red`, error message in red
- **Disabled**: Background `bg-ash`, opacity 60%
- **Success**: Border `border-success-green` (optional)

**Example Usage:**
```tsx
<FormInput type="email" placeholder="Email" />
<FormInput label="Password" type="password" error="Required" />
```

### Badge Component

**Variants:**
- **primary**: Background `bg-fire`, text `text-chalk`
- **secondary**: Background `bg-smoke`, text `text-chalk`
- **success**: Background `bg-success-green`, text `text-chalk`
- **warning**: Background `bg-warning-amber`, text `text-chalk`
- **danger**: Background `bg-danger-red`, text `text-chalk`
- **info**: Background `bg-info-blue`, text `text-chalk`

**Sizes:** sm (px-3 py-1), md (px-4 py-2, default), lg (px-6 py-3)

**Example Usage:**
```tsx
<Badge variant="primary">Active</Badge>
<Badge variant="success">In Stock</Badge>
<Badge variant="warning">Limited</Badge>
```

### Card Component

**Styling:**
- Background: `bg-ash`
- Border: `border border-mist`
- Padding: `p-6` (default)
- Border radius: `rounded-lg`

**Variants:**
- **default**: Standard card with mist border
- **elevated**: Add subtle shadow `shadow-lg`
- **interactive**: Add hover scale (1.02) and shadow lift

**Example Usage:**
```tsx
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>
```

### Modal Component

**Styling:**
- Background: `bg-ash`
- Border: `border border-mist`
- Padding: `p-8`
- Border radius: `rounded-xl`
- Overlay: `bg-black/50` or `bg-night/80`

**Header:**
- Title: H3 font size, `text-chalk`
- Close button: Icon button in top-right

**Example Usage:**
```tsx
<Modal isOpen={true} onClose={handleClose}>
  <Modal.Header>Confirm</Modal.Header>
  <Modal.Body>Are you sure?</Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={handleClose}>Cancel</Button>
    <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
  </Modal.Footer>
</Modal>
```

---

## Micro-Interactions & Animations

All interactions are **subtle** and performance-focused. Standard transition duration: `duration-300`.

### Hover Effects

| Element | Effect | CSS |
|---------|--------|-----|
| Buttons | Color shift + slight scale | `hover:scale-[1.02] hover:shadow-lg transition-all duration-300` |
| Cards | Lift effect | `hover:shadow-lg hover:scale-[1.01] transition-all duration-300` |
| Links | Color shift | `hover:text-fire transition-colors duration-300` |
| Icons | Color shift | `hover:fill-fire transition-colors duration-300` |

### Entrance Animations

Defined in [tailwind.config.js](tailwind.config.js):

| Animation | Duration | Usage |
|-----------|----------|-------|
| `fadeUp` | 0.8s | Page section entrances |
| `slideRight` | 0.8s | List item entrances |
| `scaleIn` | 0.6s | Card/modal entrances |
| `pulse-ring` | Continuous | Active indicators, badges |

### Focus States (Accessibility)

- Buttons: `focus:outline-none focus:ring-2 focus:ring-fire focus:ring-offset-2 focus:ring-offset-night`
- Form inputs: `focus:outline-none focus:border-fire focus:ring-2 focus:ring-fire/30`
- Links: `focus:outline-none focus:underline`

---

## Responsive Design Rules

### Mobile-First Approach

Start with mobile styling, then add larger breakpoints:

```tsx
className="px-4 md:px-6 lg:px-8"  // Mobile, tablet, desktop
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"  // Responsive grids
className="text-lg md:text-xl lg:text-2xl"  // Responsive typography
```

### Breakpoints

| Device | Width | Tailwind | Usage |
|--------|-------|----------|-------|
| Mobile | 375-479px | (default) | Phone screens |
| Tablet | 480-1023px | `md:` (768px) | Tablets, landscape |
| Desktop | 1024px+ | `lg:` (1024px) | Laptops, large screens |

### Common Responsive Patterns

| Pattern | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Grid columns | 1 | 2 | 3-4 |
| Padding | `px-4` | `px-6` | `px-8` |
| Gap | `gap-4` | `gap-6` | `gap-8` |
| Font sizes | base | lg | xl |
| Max-width | 100% | 100% | `max-w-[1200px]` |

---

## Theme System

### Dark Mode (Default)

- HTML class: `dark`
- Strategy: `class` (applied to `<html>` element)
- Colors: Use design tokens as-is (night, ash, chalk, fog, etc.)
- CSS: `bg-night text-chalk`

### Light Mode

- HTML class: None (light is default)
- Colors: Use `.light:` prefix with `-light` tokens
- CSS: `.light:bg-night-light .light:text-chalk-light`
- Selector: `.light .component` or `@media (prefers-color-scheme: light)`

### Theme Toggle

Located in [ThemeToggle.tsx](../components/ThemeToggle.tsx):
- Updates `localStorage` with key `'theme'`
- Toggles `dark` class on `<html>` element
- Syncs across browser tabs

---

## Dark Mode Implementation Example

```tsx
// Component should support both themes
<div className="bg-night dark:bg-night .light:bg-night-light text-chalk dark:text-chalk .light:text-chalk-light">
  <h1 className="text-fire">Title</h1>
  <button className="bg-fire hover:bg-ember text-chalk">Action</button>
</div>
```

**Clarification on `.light:` prefix:**
- `.light:` is a custom utility class prefix used for light mode styles
- It's prefixed to the HTML element when light mode is active
- Alternative: Use `@media (prefers-color-scheme: light)` query if preferred

---

## Common Patterns & Anti-Patterns

### ✅ DO

- Use design tokens (`fire`, `ash`, `chalk`) instead of hardcoded hex values
- Use `dark:` prefix for dark mode variants
- Use spacing scale (px-4, px-6, px-8, gap-4, gap-6, gap-8)
- Use consistent button/form component wrappers
- Use `duration-300` for transitions
- Stack grids to 1 column on mobile with `grid-cols-1 md:grid-cols-2`

### ❌ DON'T

- Hardcode hex colors like `bg-[#1C1C1C]` (use `bg-ash` instead)
- Use generic Tailwind grays like `bg-gray-100` (use `bg-smoke` or `bg-ash` instead)
- Inline `<style>` tags (use Tailwind classes where possible)
- Use `font-['Barlow_Condensed']` quoted syntax (use defined fontFamily config)
- Mix spacing scales (don't use `px-3` or `px-5`, use `px-4` or `px-6`)
- Add heavy animations (keep interactions subtle with `duration-300`)
- Hardcode responsive breakpoints without mobile-first approach

---

## File Structure

```
client/
├── src/
│   ├── components/
│   │   ├── ui/              ← NEW: Reusable component library
│   │   │   ├── Button.tsx
│   │   │   ├── FormInput.tsx
│   │   │   ├── FormSelect.tsx
│   │   │   ├── FormCheckbox.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Card.tsx
│   │   │   └── Modal.tsx
│   │   ├── Navbar.tsx        ← Already consistent
│   │   ├── Footer.tsx        ← Already consistent
│   │   ├── ProductCard.tsx   ← TO FIX: Use design tokens
│   │   ├── EventCard.tsx     ← Already consistent
│   │   ├── MetricCard.tsx    ← TO FIX: Use design tokens
│   │   └── ThemeToggle.tsx   ← TO FIX: Use design tokens
│   ├── pages/               ← TO ENHANCE: 16 non-admin pages
│   ├── DESIGN_TOKENS.md    ← THIS FILE
│   └── index.css
├── tailwind.config.js        ← TO EXTEND: Add spacing/sizing tokens
└── postcss.config.js
```

---

## Usage Examples

### Creating a Consistent Card Grid

```tsx
export function Shop() {
  return (
    <div className="bg-night min-h-screen">
      {/* Hero */}
      <section className="px-[6%] py-12 md:py-16 lg:py-20">
        <h1 className="text-6xl md:text-7xl font-bebas-neue text-chalk mb-12">Shop</h1>
      </section>

      {/* Products Grid */}
      <section className="px-[6%] py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} variant="interactive">
              <img src={product.image} alt={product.name} />
              <Card.Header className="text-chalk">{product.name}</Card.Header>
              <Card.Body className="text-fog">{product.description}</Card.Body>
              <Card.Footer>
                <Button variant="primary" fullWidth>
                  Add to Cart
                </Button>
              </Card.Footer>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
```

### Creating a Form with Design Tokens

```tsx
export function Login() {
  return (
    <div className="bg-night min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <h2 className="text-4xl font-barlow-condensed text-chalk mb-8">Sign In</h2>

        <form className="space-y-6">
          <FormInput
            label="Email"
            type="email"
            placeholder="you@example.com"
            required
          />
          <FormInput
            label="Password"
            type="password"
            placeholder="••••••••"
            required
          />
          <Button variant="primary" type="submit" fullWidth>
            Sign In
          </Button>
        </form>
      </Card>
    </div>
  );
}
```

---

## Maintenance & Updates

When updating this file:
1. Update token values in [tailwind.config.js](tailwind.config.js) first
2. Test all components in light and dark mode
3. Verify responsive behavior on mobile/tablet/desktop
4. Update this documentation with new tokens or patterns
5. Share updates with the team

---

**Last Updated**: May 25, 2026
**Status**: Active & Enforced
**Responsible Team**: Frontend Engineering
