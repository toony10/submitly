import Link from "next/link";

import { site } from "@/lib/site";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Headless form submission for React and Next.js</h1>
      <p className="text-lg text-fd-muted-foreground">
        Standard Schema validation, typed actions, server errors mapped to fields, pending and dialog locks, and
        post-mutation refresh. It renders nothing, so it works with any UI.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/docs/installation"
          className="rounded-lg bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground"
        >
          Get started
        </Link>
        <Link href="/docs" className="rounded-lg border px-4 py-2 text-sm font-medium">
          Read the docs
        </Link>
        <a href={site.repo} className="rounded-lg border px-4 py-2 text-sm font-medium">
          GitHub
        </a>
      </div>
      <p className="text-sm text-fd-muted-foreground">
        Created by{" "}
        <a href={site.author.portfolio} className="font-medium text-fd-foreground underline underline-offset-4">
          {site.author.name}
        </a>
        . MIT licensed.
      </p>
    </main>
  );
}
