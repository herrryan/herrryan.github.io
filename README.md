# herrryan.github.io

Personal website and technical blog of **Ryan Guo** (Cloud Architect, Systems Engineer & AI Builder).

Live at [https://herrryan.github.io](https://herrryan.github.io).

## 🚀 Tech Stack

- **[Astro](https://astro.build/)** (v7) — Ultra-fast static site generator with zero client JS by default
- **[AstroPaper](https://github.com/satnaing/astro-paper)** — Minimalist, accessible, responsive theme
- **[Tailwind CSS v4](https://tailwindcss.com/)** — Modern design system and typography
- **[Pagefind](https://pagefind.app/)** — Fully offline, zero-latency static client search
- **TypeScript** & **Markdown/MDX** — Strongly typed content collections

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Start local dev server
pnpm run dev

# Build for production (with type-check and Pagefind indexing)
pnpm run build

# Preview production build locally
pnpm run preview
```

## 📦 Deployment

Continuous deployment runs on GitHub Actions on every push to `master` and publishes to GitHub Pages.
