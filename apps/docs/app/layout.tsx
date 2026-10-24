import "./global.css";

import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: { default: "submitly", template: "%s | submitly" },
  description:
    "Headless form submission for React and Next.js: Standard Schema validation, typed actions, server errors mapped to fields, pending and dialog locks, and post-mutation refresh.",
  authors: [{ name: site.author.name, url: site.author.portfolio }],
  creator: site.author.name,
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
