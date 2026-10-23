import type { ReactNode } from "react";
// Imported straight into a Server Component: works only if the package kept "use client".
import { NextCrudProvider } from "submitly/next";

export const metadata = { title: "submitly · Next.js example" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui", maxWidth: 640, margin: "2rem auto" }}>
        {/* runAction revalidates in the same round trip, so skip the client refresh. */}
        <NextCrudProvider refreshOnMutated={false}>{children}</NextCrudProvider>
      </body>
    </html>
  );
}
