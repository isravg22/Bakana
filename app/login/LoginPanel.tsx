"use client";

import { useSearchParams } from "next/navigation";

const errorMessages: Record<string, string> = {
  config: "Faltan variables de entorno para activar el login.",
  domain: "Solo pueden entrar cuentas de laolabuena.com.",
  google: "Google no pudo completar el inicio de sesion.",
  state: "La sesion de login ha caducado. Intentalo de nuevo."
};

export function LoginPanel() {
  const searchParams = useSearchParams();
  const errorKey = searchParams.get("error");
  const error = errorKey ? errorMessages[errorKey] : "";

  return (
    <main className="login-page">
      <div className="login-brand">
        <svg viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path d="M -50 620 C 120 560, 220 680, 400 610 C 580 540, 680 660, 850 590" stroke="#ff5a3c" strokeWidth="2" fill="none" opacity="0.35" />
          <path d="M -50 700 C 130 630, 230 760, 410 690 C 590 620, 690 750, 850 680" stroke="#ff5a3c" strokeWidth="2" fill="none" opacity="0.5" />
          <path d="M -50 780 C 140 700, 240 840, 420 770 C 600 700, 700 830, 850 770" stroke="#ff5a3c" strokeWidth="3" fill="none" opacity="0.75" />
          <path d="M -50 860 C 150 770, 250 920, 430 850 C 610 780, 710 910, 850 860" stroke="#ff5a3c" strokeWidth="5" fill="none" opacity="1" />
          <circle cx="400" cy="60" r="140" stroke="#ff5a3c" strokeWidth="1" fill="none" opacity="0.18" />
        </svg>
        <div className="login-brand-content">
          <div className="brand">BAKANA</div>
          <p>Presupuestos internos de Bakana Reformas y Pintura.</p>
        </div>
      </div>

      <div className="login-panel-wrap">
        <section className="login-panel">
          <div>
            <div className="brand">BAKANA</div>
            <p>Presupuestos internos</p>
          </div>
          <a className="google-login" href="/api/auth/login">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 6.5 29.6 4.5 24 4.5 12.9 4.5 4 13.4 4 24.5s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-4z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.8 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 6.5 29.6 4.5 24 4.5c-7.7 0-14.3 4.4-17.7 10.2z" />
              <path fill="#4CAF50" d="M24 44.5c5.5 0 10.4-1.9 14.1-5.1l-6.5-5.5c-2.1 1.5-4.7 2.4-7.6 2.4-5.3 0-9.7-3.1-11.3-7.6l-6.6 5.1C9.6 40 16.3 44.5 24 44.5z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.5 5.5C41.1 36 44 30.9 44 24.5c0-1.3-.1-2.7-.4-4z" />
            </svg>
            Entrar con Google
          </a>
          {error && <p className="login-error">{error}</p>}
          <p className="login-note">Acceso exclusivo para cuentas <strong>@laolabuena.com</strong></p>
        </section>
      </div>
    </main>
  );
}
