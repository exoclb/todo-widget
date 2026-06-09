import { signInWithEmail } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    sent?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="shell">
      <section className="panel">
        <header className="panel-header">
          <p className="eyebrow">Streamer dashboard</p>
          <h1>Sign in to manage your hosted overlay.</h1>
          <p>
            Use your streamer email to receive a Supabase magic link. The dashboard
            stays private; public overlay links only receive stream-safe Overlay State.
          </p>
        </header>
        <div className="panel-section stack">
          {params.sent === "1" ? (
            <div className="notice">Check your email for the sign-in link.</div>
          ) : null}
          {params.error ? (
            <div className="notice danger">Sign-in could not be started. Please try again.</div>
          ) : null}
          <form action={signInWithEmail} className="stack">
            <label className="field">
              <span className="label">Email</span>
              <input className="input" name="email" type="email" required autoComplete="email" />
            </label>
            <button className="button" type="submit">
              Send magic link
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
