import Link from "next/link";
// Imported straight into a Server Component: works only if the package kept "use client".
import { NextCrudProvider } from "submitly/next";

export default function LoginPage() {
  return (
    <NextCrudProvider refreshOnMutated={false}>
      <main className="page page-center">
        <section className="card login">
          <span className="badge">Redirected by a server action</span>
          <h1>Session expired</h1>
          <p>
            The action called <code>redirect(&quot;/login&quot;)</code>. submitly treated it as an interrupt: no error toast,
            no error panel, just the navigation.
          </p>
          <Link className="btn btn-primary" href="/">
            Back to the playground
          </Link>
        </section>
      </main>
    </NextCrudProvider>
  );
}
