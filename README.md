# Moneta

Moneta is a coin database. It gets its data from Numista. Right now it only has US coins (and i guess banknotes and "exonumia", which just means weird types of currency), but once I find the time to scrape every single bit of data from numista it (should) have everything. Anyway, have fun!

## Building locally

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.
