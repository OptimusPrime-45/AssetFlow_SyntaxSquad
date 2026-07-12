"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";

export default function Home() {
  const primaryBtnRef = useRef<HTMLButtonElement | null>(null);
  const statsSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // 1. Mousemove glow effect on primary button
    const primaryBtn = primaryBtnRef.current;
    if (primaryBtn) {
      const handleMouseMove = (e: MouseEvent) => {
        const rect = primaryBtn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        primaryBtn.style.setProperty("--x", `${x}px`);
        primaryBtn.style.setProperty("--y", `${y}px`);
      };
      primaryBtn.addEventListener("mousemove", handleMouseMove);
      return () => {
        primaryBtn.removeEventListener("mousemove", handleMouseMove);
      };
    }
  }, []);

  useEffect(() => {
    // 2. Scroll reveal for stats
    const observerOptions = {
      threshold: 0.2,
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-in");
          // Simple count-up animation trigger for demo
          const el = entry.target as HTMLElement;
          const target = el.getAttribute("data-target");
          if (target) {
            let count = 0;
            const targetVal = parseFloat(target.replace(/[^0-9.]/g, ""));
            const suffix = target.replace(/[0-9.]/g, "");
            const isFloat = target.includes(".");
            const increment = targetVal / 50;
            const updateCount = () => {
              count += increment;
              if (count < targetVal) {
                el.innerText = (isFloat ? count.toFixed(1) : Math.floor(count).toString()) + suffix;
                requestAnimationFrame(updateCount);
              } else {
                el.innerText = target;
              }
            };
            updateCount();
          }
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const statsElements = document.querySelectorAll(".font-stat-kpi");
    statsElements.forEach((el) => observer.observe(el));

    return () => {
      statsElements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  return (
    <div className="font-body-md text-on-background bg-background selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* TopNavBar */}
      <nav className="w-full top-0 sticky bg-background border-b border-border-hairline z-50 flex justify-between items-center h-20 px-container-padding max-w-full mx-auto">
        <div className="font-display-lg text-display-lg font-bold tracking-tighter text-on-surface">
          AssetFlow
        </div>
        <div className="hidden md:flex items-center space-x-8">
          <Link
            className="font-body-md text-body-md text-primary font-bold border-b border-primary hover:text-primary transition-colors duration-200"
            href="#"
          >
            Solutions
          </Link>
          <Link
            className="font-body-md text-body-md text-secondary hover:text-primary transition-colors duration-200"
            href="#"
          >
            Framework
          </Link>
          <Link
            className="font-body-md text-body-md text-secondary hover:text-primary transition-colors duration-200"
            href="#"
          >
            Journal
          </Link>
          <Link
            className="font-body-md text-body-md text-secondary hover:text-primary transition-colors duration-200"
            href="#"
          >
            Pricing
          </Link>
        </div>
        <div className="flex items-center space-x-6">
          <span className="material-symbols-outlined text-on-surface-variant cursor-pointer">
            search
          </span>
          <Link href="/login">
            <button
              ref={primaryBtnRef}
              className="relative overflow-hidden bg-primary text-on-primary px-6 py-2 rounded-none font-label-mono text-label-mono uppercase tracking-widest hover:bg-opacity-90 transition-all cursor-pointer"
              style={
                {
                  "--x": "50%",
                  "--y": "50%",
                } as React.CSSProperties
              }
            >
              Launch App
            </button>
          </Link>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="min-h-[819px] flex flex-col justify-center px-container-padding py-section-margin relative overflow-hidden">
          <div className="max-w-5xl">
            <div className="mb-gutter">
              <span className="font-label-mono text-label-mono text-primary uppercase tracking-[0.2em]">
                Institutional Asset Management
              </span>
            </div>
            <h1 className="font-display-lg text-[80px] leading-[0.95] mb-gutter text-on-surface max-w-4xl font-bold tracking-tight">
              Track every <span className="font-display-lg-italic italic text-primary font-normal">asset</span> with
              surgical precision.
            </h1>
            <p className="font-body-lg text-body-lg text-secondary max-w-2xl mb-12">
              An editorial approach to enterprise workflows. Unified liquidity oversight, automated asset
              reconciliation, and high-fidelity reporting for modern treasuries.
            </p>
            <div className="flex items-center space-x-gutter">
              <Link href="/register">
                <button className="bg-primary text-on-primary px-10 py-4 rounded-none font-label-mono text-label-mono uppercase tracking-widest hover:bg-opacity-90 transition-all flex items-center group cursor-pointer">
                  Begin Onboarding
                  <span className="material-symbols-outlined ml-2 group-hover:translate-x-1 transition-transform duration-200">
                    arrow_forward
                  </span>
                </button>
              </Link>
              <button className="border border-border-hairline text-on-surface px-10 py-4 rounded-none font-label-mono text-label-mono uppercase tracking-widest hover:border-primary transition-all cursor-pointer">
                View Documentation
              </button>
            </div>
          </div>
          {/* Visual Anchor */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/3 h-full hidden lg:block opacity-20 pointer-events-none">
            {/* Visual placeholder matching style */}
          </div>
        </section>

        {/* Verified Status Strip */}
        <div className="border-y border-border-hairline bg-surface-container-low py-8 px-container-padding">
          <div className="flex flex-wrap justify-between items-center gap-gutter opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="flex items-center space-x-2">
              <span className="material-symbols-outlined text-on-surface">verified_user</span>
              <span className="font-label-mono text-label-mono uppercase">SOC2 TYPE II COMPLIANT</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="material-symbols-outlined text-on-surface">security</span>
              <span className="font-label-mono text-label-mono uppercase">ISO 27001 CERTIFIED</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="material-symbols-outlined text-on-surface">encrypted</span>
              <span className="font-label-mono text-label-mono uppercase">AES-256 ENCRYPTED</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="material-symbols-outlined text-on-surface">account_balance</span>
              <span className="font-label-mono text-label-mono uppercase">SEC REGISTERED AGENT</span>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section className="px-container-padding py-section-margin bg-paper">
          <div className="mb-section-margin">
            <div className="flex items-center space-x-4 mb-4">
              <span className="font-section-number text-section-number text-primary">§ 01</span>
              <div className="h-px flex-grow bg-border-hairline"></div>
            </div>
            <h2 className="font-display-lg text-display-lg text-on-surface font-bold">
              The <span className="font-display-lg-italic italic font-normal">Infrastructure</span> of Trust
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {/* Card 1 */}
            <div className="hover-reveal-card bg-surface border border-border-hairline p-card-padding flex flex-col justify-between aspect-square transition-all duration-300 hover:border-primary cursor-pointer group">
              <div>
                <span className="font-label-mono text-label-mono text-secondary-fixed-dim uppercase mb-4 block">
                  01 · LIQUIDITY
                </span>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-2 font-bold">
                  Real-time Treasury
                </h3>
                <p className="text-on-surface-variant text-sm">
                  Instant visibility into global cash positions with zero-latency reconciliation across 40+ currencies.
                </p>
              </div>
              <div className="flex justify-between items-end">
                <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  payments
                </span>
                <span className="material-symbols-outlined hover-reveal-arrow text-primary">
                  arrow_forward
                </span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="hover-reveal-card bg-surface border border-border-hairline p-card-padding flex flex-col justify-between aspect-square transition-all duration-300 hover:border-primary cursor-pointer group">
              <div>
                <span className="font-label-mono text-label-mono text-secondary-fixed-dim uppercase mb-4 block">
                  02 · AUTOMATION
                </span>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-2 font-bold">
                  Workflow <span className="italic font-display-lg-italic font-normal">Engines</span>
                </h3>
                <p className="text-on-surface-variant text-sm">
                  Sophisticated smart-routing for cross-border transfers and automated compliance checks.
                </p>
              </div>
              <div className="flex justify-between items-end">
                <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  account_tree
                </span>
                <span className="material-symbols-outlined hover-reveal-arrow text-primary">
                  arrow_forward
                </span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="hover-reveal-card bg-surface border border-border-hairline p-card-padding flex flex-col justify-between aspect-square transition-all duration-300 hover:border-primary cursor-pointer group">
              <div>
                <span className="font-label-mono text-label-mono text-secondary-fixed-dim uppercase mb-4 block">
                  03 · INTELLIGENCE
                </span>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-2 font-bold">
                  Predictive Analytics
                </h3>
                <p className="text-on-surface-variant text-sm">
                  Machine learning models forecasting asset utilization and capital requirements for enterprise scale.
                </p>
              </div>
              <div className="flex justify-between items-end">
                <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  analytics
                </span>
                <span className="material-symbols-outlined hover-reveal-arrow text-primary">
                  arrow_forward
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Detail Section (Bento Style) */}
        <section className="px-container-padding py-section-margin border-t border-border-hairline">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            <div className="lg:col-span-4 flex flex-col justify-between">
              <div className="mb-gutter">
                <span className="font-section-number text-section-number text-primary block mb-2">§ 02</span>
                <h2 className="font-display-lg text-display-lg text-on-surface font-bold">
                  Designed for <span className="font-display-lg-italic italic font-normal">Clarity</span>.
                </h2>
                <p className="font-body-md text-on-surface-variant mt-4 text-sm leading-relaxed">
                  We've eliminated the clutter of traditional FinTech to focus on the data points that drive decision making.
                </p>
              </div>
              <div className="space-y-4">
                <div className="border-l-2 border-primary pl-4 py-2">
                  <span className="font-label-mono text-label-mono text-primary uppercase text-xs">
                    Current Protocol
                  </span>
                  <p className="font-body-md font-bold text-sm">V4.2.1 Stable</p>
                </div>
                <div className="border-l-2 border-border-hairline pl-4 py-2">
                  <span className="font-label-mono text-label-mono text-secondary uppercase text-xs">
                    Last Audit
                  </span>
                  <p className="font-body-md font-bold text-sm">Oct 24, 2024</p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-8">
              <div className="relative bg-surface border border-border-hairline overflow-hidden h-[450px]">
                <img
                  className="w-full h-full object-cover"
                  alt="A clean, minimalist enterprise software interface showing complex financial charts and data points in a sophisticated sage green and paper-white color palette."
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCBVL5XfMzBGpDEN5eiJy5XLTmG5MalNiiUuYL9u3TDaBZLaBVzBfwXmdoxRJTYvPEvGwQE8qWfz01sRMey8msNIYW8a8oIEhltsz5fPqiX9oZaOUIXiRP77MjKpOITGKzxX0OTDiVQdKdRCMp267G9iRgP6VJXdGbnohA8HzwTNsg_dPJtHdwKwxEKaQYwvzGv4QscZnhyNkx9K-6XmqoLV3r_70qiA32pfPCbCag_794GSHxj_O"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Strip */}
        <section ref={statsSectionRef} className="px-container-padding py-section-margin bg-on-surface text-surface">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter text-center">
            <div className="flex flex-col items-center">
              <span className="font-stat-kpi text-stat-kpi mb-2 tabular-nums font-bold" data-target="$4.2B">
                $0.0B
              </span>
              <span className="font-label-mono text-label-mono uppercase tracking-widest text-surface/60 text-xs">
                Assets Managed
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-stat-kpi text-stat-kpi mb-2 tabular-nums font-bold" data-target="99.9%">
                0.0%
              </span>
              <span className="font-label-mono text-label-mono uppercase tracking-widest text-surface/60 text-xs">
                System Uptime
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-stat-kpi text-stat-kpi mb-2 tabular-nums font-bold" data-target="0.02s">
                0.00s
              </span>
              <span className="font-label-mono text-label-mono uppercase tracking-widest text-surface/60 text-xs">
                Sync Latency
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-stat-kpi text-stat-kpi mb-2 tabular-nums font-bold" data-target="120+">
                0+
              </span>
              <span className="font-label-mono text-label-mono uppercase tracking-widest text-surface/60 text-xs">
                Integrations
              </span>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-container-padding py-section-margin text-center">
          <h2 className="font-display-lg text-[64px] mb-8 max-w-3xl mx-auto font-bold tracking-tight">
            Modernize your <span className="font-display-lg-italic italic font-normal">financial</span> stack today.
          </h2>
          <div className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-gutter">
            <Link href="/register">
              <button className="bg-primary text-on-primary px-12 py-5 rounded-none font-label-mono text-label-mono uppercase tracking-[0.2em] hover:bg-opacity-90 transition-all cursor-pointer">
                Start Free Pilot
              </button>
            </Link>
            <Link
              className="font-label-mono text-label-mono uppercase tracking-widest border-b border-on-surface pb-1 hover:text-primary hover:border-primary transition-all"
              href="#"
            >
              Talk to a Strategist
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-section-margin bg-background border-t border-border-hairline px-container-padding grid grid-cols-1 md:grid-cols-2 gap-gutter">
        <div className="flex flex-col justify-between">
          <div>
            <div className="font-display-lg text-display-lg text-on-surface mb-4 font-bold">
              AssetFlow
            </div>
            <p className="font-body-md text-secondary max-w-sm text-sm">
              The precision ledger for institutional grade asset orchestration and workflow management.
            </p>
          </div>
          <div className="mt-8 font-label-mono text-label-mono text-secondary text-xs">
            © 2024 AssetFlow Systems. All rights reserved.
          </div>
        </div>
        <div className="grid grid-cols-2 gap-gutter">
          <div className="flex flex-col space-y-4 text-sm">
            <span className="font-label-mono text-label-mono text-on-surface uppercase mb-2 font-bold text-xs tracking-wider">
              Company
            </span>
            <Link className="font-label-mono text-label-mono text-secondary hover:text-primary underline transition-opacity duration-300" href="#">
              Privacy
            </Link>
            <Link className="font-label-mono text-label-mono text-secondary hover:text-primary underline transition-opacity duration-300" href="#">
              Terms
            </Link>
            <Link className="font-label-mono text-label-mono text-secondary hover:text-primary underline transition-opacity duration-300" href="#">
              Security
            </Link>
            <Link className="font-label-mono text-label-mono text-secondary hover:text-primary underline transition-opacity duration-300" href="#">
              System Status
            </Link>
          </div>
          <div className="flex flex-col space-y-4 text-sm">
            <span className="font-label-mono text-label-mono text-on-surface uppercase mb-2 font-bold text-xs tracking-wider">
              Platform
            </span>
            <Link className="font-label-mono text-label-mono text-secondary hover:text-primary underline transition-opacity duration-300" href="#">
              Solutions
            </Link>
            <Link className="font-label-mono text-label-mono text-secondary hover:text-primary underline transition-opacity duration-300" href="#">
              Framework
            </Link>
            <Link className="font-label-mono text-label-mono text-secondary hover:text-primary underline transition-opacity duration-300" href="#">
              Journal
            </Link>
            <Link className="font-label-mono text-label-mono text-secondary hover:text-primary underline transition-opacity duration-300" href="#">
              Pricing
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
