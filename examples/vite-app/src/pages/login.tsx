import { Link } from "react-router";

export function LoginPage() {
  return (
    <main className="page page-center">
      <section className="card login">
        <span className="badge">Redirected after a 401</span>
        <h1>Session expired</h1>
        <p>
          The API answered <code>401</code>. <code>mapError</code> turned it into a failed result and the provider's{" "}
          <code>notify.error</code> sent you here: no error toast, no error panel, just the navigation.
        </p>
        <Link className="btn btn-primary" to="/">
          Back to the playground
        </Link>
      </section>
    </main>
  );
}
