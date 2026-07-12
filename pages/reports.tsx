"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

export default function Reports() {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Trigger height transition shortly after mounting
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const chartData = [
    { label: "JAN", primaryHeight: "160px", secondaryHeight: "48px" },
    { label: "FEB", primaryHeight: "128px", secondaryHeight: "64px" },
    { label: "MAR", primaryHeight: "192px", secondaryHeight: "96px" },
    { label: "APR", primaryHeight: "144px", secondaryHeight: "80px" },
    { label: "MAY", primaryHeight: "208px", secondaryHeight: "112px" },
    { label: "JUN", primaryHeight: "176px", secondaryHeight: "48px" },
  ];

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-container">
      {/* Sidebar Navigation */}
      <Sidebar activePage="reports" />

      {/* Main Content Area */}
      <main className="ml-64 min-h-screen px-container-padding py-section-margin flex flex-col justify-between">
        <div>
          {/* Header Section */}
          <header className="mb-section-margin flex justify-between items-end">
            <div>
              <p className="font-section-number text-section-number text-primary mb-2 text-xs font-semibold">
                § 05 · ANALYTICS ENGINE
              </p>
              <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                Deep <span className="font-display-lg-italic italic text-primary font-normal">insights</span>.
              </h1>
            </div>
            <div className="flex gap-4 pb-2 text-xs">
              <button className="px-6 py-2 border border-border-hairline font-label-mono text-label-mono uppercase tracking-widest hover:border-primary transition-all flex items-center gap-2 cursor-pointer bg-white">
                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                Last 30 Days
              </button>
              <button className="px-6 py-2 bg-primary text-surface font-label-mono text-label-mono uppercase tracking-widest hover:bg-opacity-90 transition-all flex items-center gap-2 cursor-pointer text-white">
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export PDF
              </button>
            </div>
          </header>

          {/* KPI Strip */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-section-margin">
            {/* KPI 1 */}
            <div className="bg-surface border border-border-hairline p-card-padding group hover:border-primary transition-all">
              <div className="kpi-number font-stat-kpi text-stat-kpi text-on-surface mb-2 tabular-nums font-bold">
                12.4M
              </div>
              <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest text-xs">
                Total Assets
              </p>
              <div className="mt-4 flex items-center text-status-available font-label-mono text-[10px] font-semibold">
                <span className="material-symbols-outlined text-[14px] mr-1">trending_up</span>
                +4.2% VS PREV.
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-surface border border-border-hairline p-card-padding group hover:border-primary transition-all">
              <div className="kpi-number font-stat-kpi text-stat-kpi text-on-surface mb-2 tabular-nums font-bold">
                0.82<span className="text-display-lg font-normal text-2xl">%</span>
              </div>
              <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest text-xs">
                Liquidity Ratio
              </p>
              <div className="mt-4 flex items-center text-secondary font-label-mono text-[10px] font-semibold">
                <span className="material-symbols-outlined text-[14px] mr-1">trending_flat</span>
                STABLE
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-surface border border-border-hairline p-card-padding group hover:border-primary transition-all">
              <div className="kpi-number font-stat-kpi text-stat-kpi text-on-surface mb-2 tabular-nums font-bold">
                842
              </div>
              <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest text-xs">
                Active Flows
              </p>
              <div className="mt-4 flex items-center text-status-available font-label-mono text-[10px] font-semibold">
                <span className="material-symbols-outlined text-[14px] mr-1">check_circle</span>
                12 COMPLETED TODAY
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-surface border border-border-hairline p-card-padding group hover:border-primary transition-all">
              <div className="kpi-number font-stat-kpi text-stat-kpi text-on-surface mb-2 tabular-nums font-bold">
                2.4<span className="text-display-lg font-normal text-2xl">s</span>
              </div>
              <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest text-xs">
                Avg Settlement
              </p>
              <div className="mt-4 flex items-center text-primary font-label-mono text-[10px] font-semibold">
                <span className="material-symbols-outlined text-[14px] mr-1">speed</span>
                OPTIMIZED
              </div>
            </div>
          </section>

          {/* Bento Grid Charts */}
          <section className="grid grid-cols-12 gap-gutter mb-section-margin">
            {/* Main Chart Card */}
            <div className="col-span-12 lg:col-span-8 bg-surface border border-border-hairline p-card-padding">
              <div className="flex justify-between items-start mb-12">
                <div>
                  <h3 className="font-label-mono text-label-mono text-on-surface uppercase tracking-widest mb-1 text-xs font-semibold">
                    Asset Allocation Variance
                  </h3>
                  <p className="text-[12px] text-on-surface-variant opacity-60">
                    Distribution across primary institutional vaults.
                  </p>
                </div>
                <div className="flex gap-2 text-xs font-label-mono">
                  <span className="w-3 h-3 bg-primary"></span>
                  <span className="uppercase text-[10px]">Primary</span>
                  <span className="w-3 h-3 bg-secondary-fixed ml-4"></span>
                  <span className="uppercase text-[10px]">Secondary</span>
                </div>
              </div>

              {/* Chart Component */}
              <div className="h-64 flex items-end justify-between gap-4 px-2 border-b border-border-hairline relative mb-2">
                {/* Grid Lines */}
                <div className="absolute inset-x-0 top-0 border-t border-border-hairline opacity-20"></div>
                <div className="absolute inset-x-0 top-1/4 border-t border-border-hairline opacity-20"></div>
                <div className="absolute inset-x-0 top-2/4 border-t border-border-hairline opacity-20"></div>
                <div className="absolute inset-x-0 top-3/4 border-t border-border-hairline opacity-20"></div>

                {/* Bars */}
                {chartData.map((data, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                    <div
                      style={{
                        height: animate ? data.secondaryHeight : "0px",
                      }}
                      className="w-full bg-secondary-container chart-bar group-hover:bg-primary-fixed transition-all duration-[1000ms]"
                    ></div>
                    <div
                      style={{
                        height: animate ? data.primaryHeight : "0px",
                      }}
                      className="w-full bg-primary chart-bar group-hover:bg-primary-fixed-dim transition-all duration-[1000ms]"
                    ></div>
                    <span className="font-label-mono text-[10px] mt-4 opacity-40">{data.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Workflow Efficiency Card */}
            <div className="col-span-12 lg:col-span-4 bg-surface border border-border-hairline p-card-padding flex flex-col">
              <h3 className="font-label-mono text-label-mono text-on-surface uppercase tracking-widest mb-8 text-xs font-semibold">
                Workflow Efficiency
              </h3>
              <div className="flex-1 flex flex-col justify-center gap-6">
                <div>
                  <div className="flex justify-between font-label-mono text-[10px] mb-2 uppercase tracking-tighter">
                    <span>Automation Engine</span>
                    <span className="text-primary font-bold">94%</span>
                  </div>
                  <div className="w-full h-1 bg-surface-container-high">
                    <div
                      style={{ width: animate ? "94%" : "0%" }}
                      className="h-full bg-primary transition-all duration-1000"
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-label-mono text-[10px] mb-2 uppercase tracking-tighter">
                    <span>Manual Review</span>
                    <span className="text-primary font-bold">06%</span>
                  </div>
                  <div className="w-full h-1 bg-surface-container-high">
                    <div
                      style={{ width: animate ? "6%" : "0%" }}
                      className="h-full bg-primary transition-all duration-1000"
                    ></div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border-hairline">
                  <p className="text-[12px] leading-relaxed text-on-surface-variant italic">
                    "Current cycle demonstrates a significant shift towards autonomous settlement, reducing
                    operational friction by 18% month-over-month."
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Detailed Ledger Table */}
          <section className="bg-surface border border-border-hairline">
            <div className="p-gutter border-b border-border-hairline flex justify-between items-center">
              <h3 className="font-label-mono text-label-mono text-on-surface uppercase tracking-widest text-xs font-semibold">
                Recent Activity Ledger
              </h3>
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant cursor-pointer hover:text-primary transition-colors">
                filter_list
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-hairline text-xs">
                    <th className="px-gutter py-4 font-label-mono text-[10px] text-on-surface-variant uppercase tracking-widest">
                      Reference ID
                    </th>
                    <th className="px-gutter py-4 font-label-mono text-[10px] text-on-surface-variant uppercase tracking-widest">
                      Asset Class
                    </th>
                    <th className="px-gutter py-4 font-label-mono text-[10px] text-on-surface-variant uppercase tracking-widest">
                      Volume (ETH)
                    </th>
                    <th className="px-gutter py-4 font-label-mono text-[10px] text-on-surface-variant uppercase tracking-widest">
                      Status
                    </th>
                    <th className="px-gutter py-4 font-label-mono text-[10px] text-on-surface-variant uppercase tracking-widest">
                      Temporal Log
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-hairline">
                  <tr className="hover:bg-surface-container-low transition-colors group cursor-pointer text-sm">
                    <td className="px-gutter py-5 font-label-mono text-[13px] text-on-surface">
                      #AF-90210-X
                    </td>
                    <td className="px-gutter py-5 text-[14px]">Sovereign Bond Flow</td>
                    <td className="px-gutter py-5 font-label-mono tabular-nums">420.00</td>
                    <td className="px-gutter py-5">
                      <span className="px-2 py-0.5 bg-status-available/10 text-status-available font-label-mono text-[9px] uppercase font-bold">
                        Settled
                      </span>
                    </td>
                    <td className="px-gutter py-5 font-label-mono text-[12px] opacity-40">
                      2024.05.12 14:22:11
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-container-low transition-colors group cursor-pointer text-sm">
                    <td className="px-gutter py-5 font-label-mono text-[13px] text-on-surface">
                      #AF-88321-Y
                    </td>
                    <td className="px-gutter py-5 text-[14px]">Private Equity Index</td>
                    <td className="px-gutter py-5 font-label-mono tabular-nums">1,240.50</td>
                    <td className="px-gutter py-5">
                      <span className="px-2 py-0.5 bg-status-allocated/10 text-status-allocated font-label-mono text-[9px] uppercase font-bold">
                        Allocated
                      </span>
                    </td>
                    <td className="px-gutter py-5 font-label-mono text-[12px] opacity-40">
                      2024.05.12 13:04:05
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-container-low transition-colors group cursor-pointer text-sm">
                    <td className="px-gutter py-5 font-label-mono text-[13px] text-on-surface">
                      #AF-74112-Z
                    </td>
                    <td className="px-gutter py-5 text-[14px]">Treasury Yield Lock</td>
                    <td className="px-gutter py-5 font-label-mono tabular-nums">98.15</td>
                    <td className="px-gutter py-5">
                      <span className="px-2 py-0.5 bg-status-maintenance/10 text-status-maintenance font-label-mono text-[9px] uppercase font-bold">
                        Review
                      </span>
                    </td>
                    <td className="px-gutter py-5 font-label-mono text-[12px] opacity-40">
                      2024.05.12 11:45:59
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-container-low transition-colors group cursor-pointer text-sm">
                    <td className="px-gutter py-5 font-label-mono text-[13px] text-on-surface">
                      #AF-66231-M
                    </td>
                    <td className="px-gutter py-5 text-[14px]">Synthetic Liquidity Pair</td>
                    <td className="px-gutter py-5 font-label-mono tabular-nums">3,110.00</td>
                    <td className="px-gutter py-5">
                      <span className="px-2 py-0.5 bg-status-available/10 text-status-available font-label-mono text-[9px] uppercase font-bold">
                        Settled
                      </span>
                    </td>
                    <td className="px-gutter py-5 font-label-mono text-[12px] opacity-40">
                      2024.05.12 09:12:44
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Table Pagination */}
            <div className="p-gutter flex justify-between items-center bg-surface-container-lowest text-xs">
              <p className="font-label-mono text-[10px] text-on-surface-variant opacity-50 uppercase">
                Showing 4 of 2,840 records
              </p>
              <div className="flex gap-4">
                <button className="font-label-mono text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity flex items-center cursor-pointer">
                  <span className="material-symbols-outlined text-[14px] mr-1">chevron_left</span> Previous
                </button>
                <button className="font-label-mono text-[10px] uppercase tracking-widest hover:text-primary transition-colors flex items-center cursor-pointer">
                  Next <span className="material-symbols-outlined text-[14px] ml-1">chevron_right</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-section-margin w-full py-gutter border-t border-border-hairline px-0 grid grid-cols-1 md:grid-cols-2 gap-gutter text-xs bg-background">
          <div>
            <p className="font-label-mono text-label-mono text-secondary uppercase opacity-60">
              © 2024 AssetFlow Systems. All rights reserved.
            </p>
          </div>
          <div className="flex md:justify-end gap-6">
            <Link className="font-label-mono text-label-mono text-secondary hover:text-primary transition-opacity duration-300 uppercase underline" href="#">
              Privacy
            </Link>
            <Link className="font-label-mono text-label-mono text-secondary hover:text-primary transition-opacity duration-300 uppercase underline" href="#">
              Terms
            </Link>
            <Link className="font-label-mono text-label-mono text-secondary hover:text-primary transition-opacity duration-300 uppercase underline" href="#">
              Security
            </Link>
            <Link className="font-label-mono text-label-mono text-secondary hover:text-primary transition-opacity duration-300 uppercase underline" href="#">
              System Status
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
