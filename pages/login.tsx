import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/context/AuthContext";

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const result = await login(email, password);
    setSubmitting(false);

    if (!result.success) {
      setFormError(result.error || "Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-body-md bg-background text-on-background selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* TopNavBar (Shell Suppression: No navigation links, just Logo) */}
      <header className="w-full top-0 sticky flex justify-between items-center h-20 px-container-padding max-w-full mx-auto bg-background border-b border-border-hairline z-50">
        <div className="flex items-center">
          <span className="font-display-lg text-display-lg font-bold tracking-tighter text-on-surface">
            AssetFlow
          </span>
        </div>
        <div className="hidden md:flex items-center gap-gutter">
          <span className="font-label-mono text-label-mono text-secondary uppercase tracking-widest text-xs">
            Auth Portal v2.4
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center px-gutter py-section-margin">
        <div className="w-full max-w-[480px]">
          {/* Welcome Header */}
          <div className="mb-12 text-center">
            <p className="font-label-mono text-label-mono text-primary uppercase tracking-[0.2em] mb-4 text-xs font-semibold">
              § 01 · Access
            </p>
            <h1 className="font-display-lg text-[40px] leading-[1.1] text-on-surface font-bold tracking-tight">
              Welcome <span className="font-display-lg-italic italic text-primary font-normal">back</span>.
            </h1>
          </div>

          {/* Login Card */}
          <div className="login-card p-10 bg-white border border-border-hairline rounded-none transition-all duration-300">
            <form onSubmit={handleSubmit} className="space-y-8">
              {formError && (
                <div className="p-4 bg-error-container text-on-error-container font-label-mono text-xs uppercase tracking-wider">
                  {formError}
                </div>
              )}

              {/* Email Field */}
              <div className="relative">
                <label
                  className={`block font-label-mono text-label-mono uppercase mb-2 text-xs transition-colors duration-200 ${
                    emailFocused ? "text-primary font-semibold" : "text-secondary"
                  }`}
                  htmlFor="email"
                >
                  Identification / Email
                </label>
                <input
                  className="w-full bg-transparent border-t-0 border-x-0 border-b border-border-hairline py-3 px-0 font-body-md text-on-surface placeholder:text-outline-variant focus:border-primary focus:outline-none transition-colors"
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@organization.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </div>

              {/* Password Field */}
              <div className="relative">
                <div className="flex justify-between items-center mb-2">
                  <label
                    className={`block font-label-mono text-label-mono uppercase text-xs transition-colors duration-200 ${
                      passwordFocused ? "text-primary font-semibold" : "text-secondary"
                    }`}
                    htmlFor="password"
                  >
                    Security / Password
                  </label>
                  <Link
                    className="font-label-mono text-label-mono text-primary hover:underline uppercase text-xs transition-opacity"
                    href="#"
                  >
                    Recovery?
                  </Link>
                </div>
                <input
                  className="w-full bg-transparent border-t-0 border-x-0 border-b border-border-hairline py-3 px-0 font-body-md text-on-surface placeholder:text-outline-variant focus:border-primary focus:outline-none transition-colors"
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
              </div>

              {/* Actions */}
              <div className="pt-4 space-y-6">
                <button
                  disabled={submitting}
                  className="w-full bg-primary text-on-primary py-4 font-label-mono text-label-mono uppercase tracking-widest hover:bg-sage-hover transition-colors duration-200 rounded-none cursor-pointer text-xs disabled:opacity-50"
                  type="submit"
                >
                  {submitting ? "Executing Auth..." : "Execute Login"}
                </button>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      className="h-4 w-4 text-primary border-border-hairline rounded-none focus:ring-primary bg-transparent"
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                    />
                    <label
                      className="ml-2 block font-label-mono text-[10px] text-secondary uppercase tracking-wider cursor-pointer"
                      htmlFor="remember-me"
                    >
                      Persist Session
                    </label>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Footer Link */}
          <div className="mt-8 text-center">
            <p className="font-body-md text-secondary text-sm">
              New to the flow?{" "}
              <Link className="text-primary font-bold hover:underline ml-1" href="/register">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="w-full py-section-margin px-container-padding border-t border-border-hairline mt-auto bg-background">
        <div className="max-w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-gutter items-center">
          <div className="font-label-mono text-label-mono text-secondary text-xs">
            © 2024 AssetFlow Systems. All rights reserved.
          </div>
          <div className="flex md:justify-end gap-6 text-xs">
            <Link
              className="font-label-mono text-label-mono text-secondary hover:text-primary transition-opacity"
              href="#"
            >
              Privacy
            </Link>
            <Link
              className="font-label-mono text-label-mono text-secondary hover:text-primary transition-opacity"
              href="#"
            >
              Terms
            </Link>
            <Link
              className="font-label-mono text-label-mono text-secondary hover:text-primary transition-opacity"
              href="#"
            >
              System Status
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
