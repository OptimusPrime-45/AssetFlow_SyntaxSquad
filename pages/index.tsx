"use client";

import React from "react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="font-body-md text-on-surface bg-background selection:bg-primary-fixed selection:text-on-primary-fixed min-h-screen flex flex-col justify-between relative overflow-hidden">
      {/* Background Cinematic Video Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-30 w-screen h-screen">
        <video
          className="w-full h-full object-cover"
          src="https://www.pexels.com/download/video/3977804/"
          autoPlay
          loop
          muted
          playsInline
        />
      </div>

      {/* Top Navbar */}
      <nav className="w-full top-0 sticky bg-background/80 backdrop-blur-md border-b border-border-hairline z-50 flex justify-between items-center h-20 px-6 md:px-16 max-w-full mx-auto relative">
        <div className="font-display-lg text-[22px] font-bold tracking-tight text-on-surface">
          AssetFlow
        </div>
        <div className="hidden md:flex items-center space-x-12">
          <Link
            className="font-body-md text-sm text-on-surface font-semibold hover:text-primary transition-colors duration-200"
            href="#"
          >
            Solutions
          </Link>
          <Link
            className="font-body-md text-sm text-secondary hover:text-primary transition-colors duration-200"
            href="#"
          >
            Framework
          </Link>
          <Link
            className="font-body-md text-sm text-secondary hover:text-primary transition-colors duration-200"
            href="#"
          >
            Journal
          </Link>
          <Link
            className="font-body-md text-sm text-secondary hover:text-primary transition-colors duration-200"
            href="#"
          >
            Pricing
          </Link>
        </div>
        <div className="flex items-center space-x-8">
          <span className="material-symbols-outlined text-secondary hover:text-primary cursor-pointer text-[20px] transition-colors">
            search
          </span>
          <Link href="/login">
            <button className="bg-primary text-white text-xs px-6 py-3 rounded-none font-label-mono uppercase tracking-widest hover:bg-opacity-90 transition-all cursor-pointer font-semibold">
              Launch App
            </button>
          </Link>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow relative z-10">
        {/* Hero Section */}
        <section className="px-6 md:px-16 pt-24 pb-20 max-w-7xl mx-auto">
          <div className="max-w-4xl">
            <div className="mb-6">
              <span className="font-label-mono text-secondary uppercase tracking-[0.2em] text-xs font-semibold">
                Institutional Asset Management
              </span>
            </div>
            <h1 className="font-display-lg text-4xl md:text-[68px] leading-[1.05] mb-8 text-on-surface font-bold tracking-tight">
              Track every <span className="font-display-lg-italic italic text-secondary font-normal font-serif">asset</span> with
              surgical precision.
            </h1>
            <p className="font-body-lg text-base md:text-[17px] text-secondary max-w-2xl mb-12 leading-relaxed">
              An editorial approach to enterprise workflows. Unified liquidity oversight, automated asset
              reconciliation, and high-fidelity reporting for modern treasuries.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Link href="/register">
                <button className="bg-primary text-white px-8 py-4 rounded-none font-label-mono text-xs uppercase tracking-widest hover:bg-opacity-90 transition-all flex items-center justify-center gap-3 cursor-pointer font-semibold">
                  Begin Onboarding
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </Link>
              <button className="border border-border-hairline text-secondary hover:text-on-surface hover:border-primary px-8 py-4 rounded-none font-label-mono text-xs uppercase tracking-widest transition-all cursor-pointer bg-transparent">
                Read Documentation
              </button>
            </div>
          </div>
        </section>

        {/* Compliance & Trust Strip */}
        <div className="border-y border-border-hairline bg-[#f4f4f2]/40 py-6 px-6 md:px-16">
          <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-6 text-secondary text-xs font-label-mono">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">verified_user</span>
              <span className="uppercase tracking-wider">SOC2 TYPE II COMPLIANT</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">verified</span>
              <span className="uppercase tracking-wider">ESM STORE CERTIFIED</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">lock</span>
              <span className="uppercase tracking-wider">AES-256 ENCRYPTED</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">account_balance</span>
              <span className="uppercase tracking-wider">SEC REGISTERED AGENT</span>
            </div>
          </div>
        </div>

        {/* Section 01 - Features */}
        <section className="px-6 md:px-16 py-20 max-w-7xl mx-auto">
          <div className="mb-16">
            <div className="flex items-center gap-4 mb-4">
              <span className="font-section-number text-primary font-semibold text-sm">§ 01</span>
              <div className="h-px w-12 bg-primary"></div>
            </div>
            <h2 className="font-display-lg text-3xl md:text-5xl text-on-surface font-bold tracking-tight">
              The <span className="font-display-lg-italic italic text-secondary font-normal font-serif">Infrastructure</span> of Trust
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-white border border-border-hairline p-8 flex flex-col justify-between h-[360px] transition-all duration-300 hover:border-primary">
              <div>
                <span className="font-label-mono text-[10px] text-secondary uppercase tracking-widest mb-6 block font-semibold">
                  01 / LIQUIDITY
                </span>
                <h3 className="font-display-lg text-xl font-bold text-on-surface mb-3 tracking-tight">
                  Real-time Treasury
                </h3>
                <p className="text-secondary text-[13px] leading-relaxed">
                  Instant visibility into global cash positions with zero latency reconciliation across 40+ currencies.
                </p>
              </div>
              <div>
                <span className="material-symbols-outlined text-secondary text-2xl">account_balance_wallet</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white border border-border-hairline p-8 flex flex-col justify-between h-[360px] transition-all duration-300 hover:border-primary">
              <div>
                <span className="font-label-mono text-[10px] text-secondary uppercase tracking-widest mb-6 block font-semibold">
                  02 / AUTOMATION
                </span>
                <h3 className="font-display-lg text-xl font-bold text-on-surface mb-3 tracking-tight">
                  Workflow <span className="font-display-lg-italic italic text-secondary font-normal font-serif font-light">Engines</span>
                </h3>
                <p className="text-secondary text-[13px] leading-relaxed">
                  Sophisticated smart routing for cross-border transfers and automated compliance checks.
                </p>
              </div>
              <div>
                <span className="material-symbols-outlined text-secondary text-2xl">account_tree</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white border border-border-hairline p-8 flex flex-col justify-between h-[360px] transition-all duration-300 hover:border-primary">
              <div>
                <span className="font-label-mono text-[10px] text-secondary uppercase tracking-widest mb-6 block font-semibold">
                  03 / INTELLIGENCE
                </span>
                <h3 className="font-display-lg text-xl font-bold text-on-surface mb-3 tracking-tight">
                  Predictive Analytics
                </h3>
                <p className="text-secondary text-[13px] leading-relaxed">
                  Machine learning models forecasting asset utilization and capital requirements for enterprise scale.
                </p>
              </div>
              <div>
                <span className="material-symbols-outlined text-secondary text-2xl">analytics</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 02 - Designed for Clarity */}
        <section className="px-6 md:px-16 py-20 border-t border-border-hairline bg-[#fbfbfa]">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-5 flex flex-col justify-between h-full py-2">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <span className="font-section-number text-primary font-semibold text-sm">§ 02</span>
                  <div className="h-px w-12 bg-primary"></div>
                </div>
                <h2 className="font-display-lg text-3xl md:text-5xl text-on-surface font-bold tracking-tight mb-6">
                  Designed for <span className="font-display-lg-italic italic text-secondary font-normal font-serif font-light">Clarity</span>.
                </h2>
                <p className="font-body-md text-secondary text-[14px] leading-relaxed mb-12">
                  We've eliminated the clutter of traditional FinTech to focus on the data points that drive decision making.
                </p>
              </div>
              <div className="space-y-6">
                <div>
                  <span className="font-label-mono text-[10px] text-secondary uppercase tracking-widest block mb-1">
                    CURRENT PROTOCOL
                  </span>
                  <span className="font-body-md font-bold text-on-surface text-[13px]">
                    V4.2.1 Stable
                  </span>
                </div>
                <div>
                  <span className="font-label-mono text-[10px] text-secondary uppercase tracking-widest block mb-1">
                    LAST AUDIT
                  </span>
                  <span className="font-body-md font-bold text-on-surface text-[13px]">
                    Oct 24, 2024
                  </span>
                </div>
              </div>
            </div>

            {/* Right Desktop Video Showcase */}
            <div className="lg:col-span-7">
              <div className="border border-border-hairline overflow-hidden bg-white shadow-sm flex items-center justify-center relative group">
                <video
                  className="w-full h-[400px] object-cover block transition-transform duration-700 group-hover:scale-105"
                  src="https://www.pexels.com/download/video/7439776/"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-all duration-300 pointer-events-none"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Dark Stats Strip */}
        <section className="bg-[#121212] text-white py-16 px-6 md:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="font-display-lg text-3xl md:text-5xl font-bold tracking-tight mb-2">
                $4.2B
              </div>
              <div className="font-label-mono text-[10px] uppercase tracking-widest text-[#a3a3a3]">
                ASSETS MANAGED
              </div>
            </div>
            <div>
              <div className="font-display-lg text-3xl md:text-5xl font-bold tracking-tight mb-2">
                99.9%
              </div>
              <div className="font-label-mono text-[10px] uppercase tracking-widest text-[#a3a3a3]">
                SYSTEM UPTIME
              </div>
            </div>
            <div>
              <div className="font-display-lg text-3xl md:text-5xl font-bold tracking-tight mb-2">
                0.02s
              </div>
              <div className="font-label-mono text-[10px] uppercase tracking-widest text-[#a3a3a3]">
                SYNC LATENCY
              </div>
            </div>
            <div>
              <div className="font-display-lg text-3xl md:text-5xl font-bold tracking-tight mb-2">
                120+
              </div>
              <div className="font-label-mono text-[10px] uppercase tracking-widest text-[#a3a3a3]">
                INTEGRATIONS
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 py-24 text-center max-w-4xl mx-auto">
          <h2 className="font-display-lg text-3xl md:text-[56px] leading-[1.1] mb-10 text-on-surface font-bold tracking-tight">
            Modernize your <span className="font-display-lg-italic italic text-secondary font-normal font-serif font-light">financial</span> stack today.
          </h2>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
            <Link href="/register">
              <button className="bg-primary text-white px-10 py-5 rounded-none font-label-mono text-xs uppercase tracking-widest hover:bg-opacity-90 transition-all cursor-pointer font-semibold">
                Start Free Pilot
              </button>
            </Link>
            <Link
              className="font-label-mono text-xs uppercase tracking-widest border-b border-on-surface pb-1 hover:text-primary hover:border-primary transition-all font-semibold"
              href="#"
            >
              Talk to a Strategist
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-16 bg-[#fbfbfa]/90 border-t border-border-hairline px-6 md:px-16 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Brand Column */}
          <div className="flex flex-col justify-between gap-6">
            <div>
              <div className="font-display-lg text-[22px] text-on-surface mb-3 font-bold tracking-tight">
                AssetFlow
              </div>
              <p className="font-body-md text-secondary text-xs max-w-xs leading-relaxed">
                The precision ledger for institutional grade asset orchestration and workflow management.
              </p>
            </div>
            <div className="font-label-mono text-[10px] text-secondary uppercase">
              © 2024 AssetFlow Systems. All rights reserved.
            </div>
          </div>

          {/* Links Columns */}
          <div className="grid grid-cols-2 gap-8 md:justify-items-end">
            <div className="flex flex-col space-y-3 text-xs md:items-end">
              <span className="font-label-mono text-[10px] text-on-surface uppercase mb-2 font-bold tracking-wider">
                Company
              </span>
              <Link className="font-label-mono text-secondary hover:text-primary transition-colors" href="#">
                Privacy
              </Link>
              <Link className="font-label-mono text-secondary hover:text-primary transition-colors" href="#">
                Terms
              </Link>
              <Link className="font-label-mono text-secondary hover:text-primary transition-colors" href="#">
                Security
              </Link>
              <Link className="font-label-mono text-secondary hover:text-primary transition-colors" href="#">
                System Status
              </Link>
            </div>

            <div className="flex flex-col space-y-3 text-xs md:items-end">
              <span className="font-label-mono text-[10px] text-on-surface uppercase mb-2 font-bold tracking-wider">
                Platform
              </span>
              <Link className="font-label-mono text-secondary hover:text-primary transition-colors" href="#">
                Solutions
              </Link>
              <Link className="font-label-mono text-secondary hover:text-primary transition-colors" href="#">
                Framework
              </Link>
              <Link className="font-label-mono text-secondary hover:text-primary transition-colors" href="#">
                Journal
              </Link>
              <Link className="font-label-mono text-secondary hover:text-primary transition-colors" href="#">
                Pricing
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
