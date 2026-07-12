"use client";

import React from "react";
import Sidebar from "@/components/Sidebar";

export default function Treasury() {
  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-container">
      <Sidebar activePage="treasury" />
      <main className="ml-64 min-h-screen px-container-padding py-section-margin flex flex-col justify-between">
        <div>
          <header className="mb-section-margin">
            <p className="font-section-number text-section-number text-primary mb-2 text-xs font-semibold">
              § 04 · TREASURY CHANNELS
            </p>
            <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
              Treasury <span className="font-display-lg-italic italic text-primary font-normal">clearing</span>.
            </h1>
          </header>
          <div className="p-8 bg-white border border-border-hairline text-center text-secondary text-sm">
            Treasury oversight ledger and asset transfers clearing module.
          </div>
        </div>
      </main>
    </div>
  );
}
