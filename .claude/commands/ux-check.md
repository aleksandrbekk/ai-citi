---
description: Check UX best practices and find issues in UI code
argument-hint: [topic like "animation", "accessibility", "mobile", "z-index"]
---

# UX Guidelines Check

Search UX best practices and anti-patterns for the specified topic.

## Topic

$ARGUMENTS

## Run Search

```bash
python3 .shared/ui-ux-pro-max/scripts/search.py "$ARGUMENTS" --domain ux -n 10
```

## Common Issues to Check

### Animation
- Duration: 150-300ms (not longer!)
- Use `prefers-reduced-motion` for accessibility
- No layout shift on hover (avoid `scale` > 1.05)

### Accessibility  
- Color contrast 4.5:1 minimum
- Focus states visible
- All images have alt text
- Form inputs have labels

### Mobile
- Touch targets 44x44px minimum
- No horizontal scroll
- Test at 375px width

### Z-index
- Use consistent z-index scale
- Don't use arbitrary high values (999999)

## After Check

Apply findings to the codebase. Fix any anti-patterns found.
