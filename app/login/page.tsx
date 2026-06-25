const errorMessages: Record<string, string> = {
  config: "Faltan variables de entorno para activar el login.",
  domain: "Solo pueden entrar cuentas de laolabuena.com.",
  google: "Google no pudo completar el inicio de sesion.",
  state: "La sesion de login ha caducado. Intentalo de nuevo."
};

type Props = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const error = params?.error ? errorMessages[params.error] : "";

  return (
    <main className="login-page">
      <section className="login-panel">
        <div>
          <div className="brand">BAKANA</div>
          <p>Presupuestos internos</p>
        </div>
        <a className="google-login" href="/api/auth/login">
          Entrar con Google
        </a>
        {error && <p className="login-error">{error}</p>}
        <p className="login-note">Acceso exclusivo para cuentas @laolabuena.com</p>
      </section>
    </main>
  );
}
