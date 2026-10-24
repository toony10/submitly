import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

import { LogoMark } from "@/components/logo";

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
  };
}
