import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

import { LogoMark } from "@/components/logo";
import { site } from "@/lib/site";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <LogoMark size={22} />
          <span className="font-semibold tracking-tight">submitly</span>
        </>
      ),
    },
    githubUrl: site.repo,
    links: [{ text: "Author", url: site.author.portfolio, external: true }],
  };
}
