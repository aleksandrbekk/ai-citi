---
description: Generate UI/UX design system for AI CITI project. Creates styles, colors, typography recommendations with AI CITI brand colors.
argument-hint: [description of page/component, e.g. "dashboard gamification" or "profile settings"]
---

# UI/UX Pro Max — AI CITI Design System

Generate comprehensive design recommendations adapted for AI CITI brand colors.

## Arguments

$ARGUMENTS

## Step 1: Generate Design System

Run the design system generator:

```bash
python3 .shared/ui-ux-pro-max/scripts/search.py "$ARGUMENTS" --design-system -p "AI CITI"
```

## Step 2: Apply AI CITI Brand Colors

**IMPORTANT:** Replace any recommended colors with AI CITI brand:

| Role | Replace with |
|------|--------------|
| Primary | `#FF5A1F` (orange-500) or `from-orange-400 to-orange-500` |
| Secondary | `#06B6D4` (cyan-500) or `from-cyan-400 to-cyan-500` |
| Background | `#FFFFFF` (white) or `#FFF8F5` (soft peach) |
| Text | `#1A1A1A` (gray-900) |

**NEVER use:** purple, pink, blue for primary elements.

## Step 3: Ready Components

### CTA Button:
```tsx
<button className="bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl px-6 py-3 font-medium hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-200 cursor-pointer active:scale-[0.98]">
  Action
</button>
```

### Glassmorphism Card:
```tsx
<div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl shadow-sm p-6">
  {/* content */}
</div>
```

### Cyan Card (AI elements):
```tsx
<div className="bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-2xl p-6 text-white">
  {/* content */}
</div>
```

## Step 4: Additional Searches (if needed)

```bash
# UX guidelines
python3 .shared/ui-ux-pro-max/scripts/search.py "animation accessibility" --domain ux

# Typography
python3 .shared/ui-ux-pro-max/scripts/search.py "modern readable" --domain typography

# Landing structure
python3 .shared/ui-ux-pro-max/scripts/search.py "hero cta" --domain landing
```

## Pre-Delivery Checklist

- [ ] No emojis as icons (use Lucide/Heroicons SVG)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Colors only orange/cyan for accents
- [ ] Light mode text contrast 4.5:1 minimum
- [ ] Responsive: 375px, 768px, 1024px, 1440px
