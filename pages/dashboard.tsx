"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

function AnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1200; // Total animation time in ms
    const stepTime = 16;   // ~60 FPS
    const steps = duration / stepTime;
    const stepValue = target / steps;

    const timer = setInterval(() => {
      start += stepValue;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [target]);

  return <>{count.toLocaleString()}</>;
}

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Sidebar Navigation */}
      <Sidebar activePage="dashboard" />

      {/* Main Content Area */}
      <main className="ml-64 min-h-screen px-container-padding py-12 flex flex-col justify-between">
        <div>
          {/* Header Section */}
          <header className="mb-section-margin">
            <div className="font-label-mono text-label-mono text-secondary uppercase tracking-[0.2em] mb-2 flex items-center text-xs">
              <span className="text-primary font-bold">§ 01</span>
              <span className="mx-2 opacity-30">·</span>
              TODAY'S OVERVIEW
            </div>
            <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
              Today's <span className="font-display-lg-italic italic font-light text-primary font-normal">overview</span>.
            </h1>
          </header>

          {/* Stat Strips */}
          <section className="mb-section-margin">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border-y border-border-hairline divide-y md:divide-y-0 md:divide-x divide-border-hairline bg-surface">
              {/* Total Assets */}
              <div className="p-8 group hover:bg-surface-container-low transition-colors duration-200">
                <span className="font-label-mono text-label-mono text-secondary uppercase tracking-widest block mb-4 text-xs">
                  Total Assets
                </span>
                <div className="font-stat-kpi text-stat-kpi text-on-surface font-bold tracking-tight">
                  <AnimatedCounter target={12840} />
                </div>
                <div className="mt-4 flex items-center text-status-available text-xs">
                  <span className="material-symbols-outlined text-[16px] mr-1">trending_up</span>
                  <span className="font-label-mono uppercase">+4.2%</span>
                </div>
              </div>

              {/* Allocated */}
              <div className="p-8 group hover:bg-surface-container-low transition-colors duration-200">
                <span className="font-label-mono text-label-mono text-secondary uppercase tracking-widest block mb-4 text-xs">
                  Allocated
                </span>
                <div className="font-stat-kpi text-stat-kpi text-on-surface font-bold tracking-tight">
                  <AnimatedCounter target={8291} />
                </div>
                <div className="mt-4 flex items-center text-status-allocated text-xs">
                  <span className="font-label-mono uppercase">64.5% Utilized</span>
                </div>
              </div>

              {/* Available */}
              <div className="p-8 group hover:bg-surface-container-low transition-colors duration-200">
                <span className="font-label-mono text-label-mono text-secondary uppercase tracking-widest block mb-4 text-xs">
                  Available
                </span>
                <div className="font-stat-kpi text-stat-kpi text-on-surface font-bold tracking-tight">
                  <AnimatedCounter target={4549} />
                </div>
                <div className="mt-4 flex items-center text-primary text-xs">
                  <span className="font-label-mono uppercase">Ready for Deployment</span>
                </div>
              </div>

              {/* Active Bookings */}
              <div className="p-8 group hover:bg-surface-container-low transition-colors duration-200">
                <span className="font-label-mono text-label-mono text-secondary uppercase tracking-widest block mb-4 text-xs">
                  Active Bookings
                </span>
                <div className="font-stat-kpi text-stat-kpi text-on-surface font-bold tracking-tight">
                  <AnimatedCounter target={312} />
                </div>
                <div className="mt-4 flex items-center text-status-maintenance text-xs">
                  <span className="font-label-mono uppercase">12 Pending Approval</span>
                </div>
              </div>
            </div>
          </section>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-12 gap-gutter items-start">
            {/* Quick Actions & Highlights (4 columns) */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div>
                <div className="font-label-mono text-label-mono text-secondary uppercase tracking-widest mb-4 text-xs">
                  § 02 · Quick Actions
                </div>
                <div className="flex flex-col gap-3">
                  <Link href="/assets">
                    <button className="group flex items-center justify-between w-full bg-primary text-on-primary px-6 py-5 rounded-none transition-all hover:bg-opacity-90 cursor-pointer text-xs font-label-mono uppercase tracking-[0.15em]">
                      Provision New Asset
                      <span className="material-symbols-outlined">add_circle</span>
                    </button>
                  </Link>
                  <button className="group flex items-center justify-between w-full border border-border-hairline bg-surface text-on-surface px-6 py-5 rounded-none transition-all hover:border-primary cursor-pointer text-xs font-label-mono uppercase tracking-[0.15em]">
                    Export Inventory
                    <span className="material-symbols-outlined">file_download</span>
                  </button>
                  <Link href="/workflows">
                    <button className="group flex items-center justify-between w-full border border-border-hairline bg-surface text-on-surface px-6 py-5 rounded-none transition-all hover:border-primary cursor-pointer text-xs font-label-mono uppercase tracking-[0.15em]">
                      Audit Workflow
                      <span className="material-symbols-outlined">verified_user</span>
                    </button>
                  </Link>
                </div>
              </div>

              {/* Asset Card Highlight */}
              <div className="p-gutter border border-border-hairline bg-surface relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="font-label-mono text-[10px] text-secondary uppercase tracking-widest mb-2">
                    Priority Focus
                  </div>
                  <h3 className="font-headline-md text-headline-md font-bold mb-4 leading-tight">
                    London Treasury <br />
                    <span className="italic font-display-lg-italic text-primary font-normal">Consolidation</span>
                  </h3>
                  <div className="flex items-center gap-2 mb-6">
                    <span className="w-2 h-2 rounded-full bg-status-available"></span>
                    <span className="font-label-mono text-[11px] uppercase tracking-widest text-on-surface-variant">
                      Ongoing Phase 02
                    </span>
                  </div>
                  <div className="w-full bg-surface-container-highest h-px mb-6"></div>
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="font-label-mono text-[10px] text-secondary block mb-1">
                        Target Value
                      </span>
                      <span className="font-stat-kpi text-[24px] font-bold">£ 4.2M</span>
                    </div>
                    <button className="border border-on-surface text-on-surface px-4 py-2 font-label-mono text-[10px] uppercase tracking-widest hover:bg-on-surface hover:text-surface transition-colors cursor-pointer">
                      Details
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity (8 columns) */}
            <div className="col-span-12 lg:col-span-8">
              <div className="font-label-mono text-label-mono text-secondary uppercase tracking-widest mb-4 text-xs">
                § 03 · Recent Activity
              </div>
              <div className="bg-surface border border-border-hairline">
                <div className="divide-y divide-border-hairline">
                  {/* Row 1 */}
                  <div className="hover-reveal-row flex items-center p-6 transition-all hover:bg-surface-container-low cursor-pointer group">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary-fixed flex items-center justify-center mr-6">
                      <span className="material-symbols-outlined text-primary">sync_alt</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1 text-sm">
                        <span className="font-semibold">Asset Transfer Initiated</span>
                        <span className="font-label-mono text-[11px] text-secondary">09:42 AM</span>
                      </div>
                      <p className="text-on-surface-variant text-sm">
                        Transfer of #AX-9022 from{" "}
                        <span className="font-label-mono text-[12px] uppercase">LDN-01</span> to{" "}
                        <span className="font-label-mono text-[12px] uppercase">NYC-04</span>.
                      </p>
                    </div>
                    <div className="reveal-arrow ml-6 text-primary transition-all duration-300">
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div className="hover-reveal-row flex items-center p-6 transition-all hover:bg-surface-container-low cursor-pointer group">
                    <div className="flex-shrink-0 w-12 h-12 bg-status-available/20 flex items-center justify-center mr-6">
                      <span className="material-symbols-outlined text-status-available">check_circle</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1 text-sm">
                        <span className="font-semibold">Maintenance Cycle Completed</span>
                        <span className="font-label-mono text-[11px] text-secondary">Yesterday</span>
                      </div>
                      <p className="text-on-surface-variant text-sm">
                        Primary server clusters 04 through 08 passed all technical integrity checks.
                      </p>
                    </div>
                    <div className="reveal-arrow ml-6 text-primary transition-all duration-300">
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </div>
                  </div>

                  {/* Row 3 */}
                  <div className="hover-reveal-row flex items-center p-6 transition-all hover:bg-surface-container-low cursor-pointer group">
                    <div className="flex-shrink-0 w-12 h-12 bg-status-allocated/20 flex items-center justify-center mr-6">
                      <span className="material-symbols-outlined text-status-allocated">lock_open</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1 text-sm">
                        <span className="font-semibold">Treasury Access Granted</span>
                        <span className="font-label-mono text-[11px] text-secondary">Oct 24</span>
                      </div>
                      <p className="text-on-surface-variant text-sm">
                        Security clearance updated for{" "}
                        <span className="font-label-mono text-[12px] uppercase">User: M. Sterling</span>.
                      </p>
                    </div>
                    <div className="reveal-arrow ml-6 text-primary transition-all duration-300">
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </div>
                  </div>

                  {/* Row 4 */}
                  <div className="hover-reveal-row flex items-center p-6 transition-all hover:bg-surface-container-low cursor-pointer group">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary-fixed flex items-center justify-center mr-6">
                      <span className="material-symbols-outlined text-primary">add_business</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1 text-sm">
                        <span className="font-semibold">New Entity Boarded</span>
                        <span className="font-label-mono text-[11px] text-secondary">Oct 23</span>
                      </div>
                      <p className="text-on-surface-variant text-sm">
                        AssetFlow Singapore officially integrated into global treasury framework.
                      </p>
                    </div>
                    <div className="reveal-arrow ml-6 text-primary transition-all duration-300">
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 text-center border-t border-border-hairline">
                  <button className="font-label-mono text-label-mono text-secondary uppercase tracking-widest hover:text-primary transition-colors underline decoration-border-hairline underline-offset-8 cursor-pointer text-xs">
                    View Archive Index
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Anchor § 05 */}
          <section className="mt-section-margin">
            <div className="font-label-mono text-label-mono text-secondary uppercase tracking-widest mb-4 text-xs">
              § 04 · Visual Integrity
            </div>
            <div className="h-64 relative border border-border-hairline overflow-hidden bg-[#1c1b1b] flex items-center justify-center">
              <div className="absolute inset-0 bg-black/5 pointer-events-none"></div>
              <div className="absolute bottom-8 left-8 text-left">
                <h2 className="text-white font-display-lg text-[32px] font-bold leading-tight">
                  Flow Visualization
                  <br />
                  <span className="italic font-display-lg-italic font-light opacity-80 font-normal text-primary-fixed">
                    Real-time assets.
                  </span>
                </h2>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-section-margin pt-12 border-t border-border-hairline flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-12">
          <div className="space-y-1">
            <div className="font-section-number text-[18px] text-on-surface font-semibold">
              AssetFlow
            </div>
            <p className="font-label-mono text-[11px] text-secondary uppercase tracking-widest">
              © 2024 AssetFlow Systems. All rights reserved.
            </p>
          </div>
          <div className="flex gap-8 text-xs">
            <Link className="font-label-mono text-[11px] text-secondary uppercase tracking-widest hover:text-primary transition-colors" href="#">
              Privacy
            </Link>
            <Link className="font-label-mono text-[11px] text-secondary uppercase tracking-widest hover:text-primary transition-colors" href="#">
              Terms
            </Link>
            <Link className="font-label-mono text-[11px] text-secondary uppercase tracking-widest hover:text-primary transition-colors" href="#">
              Security
            </Link>
            <Link className="font-label-mono text-[11px] text-secondary uppercase tracking-widest hover:text-primary transition-colors" href="#">
              System Status
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
