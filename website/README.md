# FZR Rekordbox Exporter — Website

Official landing page for **FZR Rekordbox Exporter**, statically exported with Next.js (`output: "export"`) and hosted on **Cloudflare Pages** (`https://fzr-rekordbox-exporter.pages.dev`).

## Local development

```bash
cd website
npm install
npm run dev
```

## Build & verify

```bash
npm run lint
npm run typecheck
npm run build
```

Static output is generated in `website/out/`.

## Deploy to Cloudflare Pages

### Manual deploy via Wrangler

```bash
npx wrangler login
npm run deploy:cloudflare
```

### Automatic CI/CD (GitHub Actions)

Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to your GitHub repository secrets. Pushes to `master` touching `website/` automatically build and deploy to Cloudflare Pages via `.github/workflows/deploy-website.yml`.
