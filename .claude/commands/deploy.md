---
description: Build, check and deploy changes to production
allowed-tools: Bash(npm:*), Bash(git:*), Bash(npx:*)
---

# Deploy to Production

## Step 1: Check TypeScript

```bash
npx tsc --noEmit
```

If errors — fix them first!

## Step 2: Build

```bash
npm run build
```

If errors — fix them first!

## Step 3: Commit & Push

```bash
git add .
git status
```

Review changes, then:

```bash
git commit -m "$(cat <<'EOF'
$ARGUMENTS
EOF
)"
git push
```

## Step 4: Verify

Vercel automatically deploys after push. Check:
- https://vercel.com/dashboard for deploy status
- Production URL after deploy completes

## Done!

Changes are now live on production.
