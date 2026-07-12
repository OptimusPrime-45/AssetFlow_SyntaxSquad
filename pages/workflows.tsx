"use client";

import React, { useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

interface KanbanCard {
  id: number;
  column: "backlog" | "progress" | "verification" | "resolved";
  asset: string;
  level: "Critical" | "Routine" | "Audit" | "Urgent" | "Testing";
  desc: string;
  assignee?: string;
  assigneeName?: string;
  due?: string;
  statusIcon?: string;
}

export default function Workflows() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAsset, setNewAsset] = useState("");
  const [newLevel, setNewLevel] = useState<"Critical" | "Routine" | "Audit" | "Urgent" | "Testing">("Routine");
  const [newDesc, setNewDesc] = useState("");

  const [cards, setCards] = useState<KanbanCard[]>([
    {
      id: 1,
      column: "backlog",
      asset: "AF-992-B",
      level: "Critical",
      desc: "Hydraulic pressure fluctuation in Server Rack Cooling Unit 4.",
      assignee: "https://lh3.googleusercontent.com/aida-public/AB6AXuDP_TgOCRdURrw416yNoXg8O9aPBpEebPyjotmNU63qDHBc2e1VU7SXDtu4sMeVWLTop0wdJP6lyP9RHBGl9RfZCfG1LFP36c2BGqr7_DTzU-BIHAXNAGFE00qXXYGq9YCNrVKHASBV1L04IN5NedIKnefjyCtsWi80p4AXBhmM8cxFwPXB7MikLa8dSonbZUPe4GM3Ut1NFd6A8icb-4L1JrZWhKsiEEg-4q9ELTZnKGNDTxuJo_9",
    },
    {
      id: 2,
      column: "backlog",
      asset: "AF-104-E",
      level: "Routine",
      desc: "Quarterly sensor recalibration for Environmental Module § 02.",
      due: "DUE: 12 OCT",
    },
    {
      id: 3,
      column: "progress",
      asset: "TR-440",
      level: "Audit",
      desc: "Firmware update rollout across distributed ledger nodes.",
      assigneeName: "J. Sterling",
      statusIcon: "pending",
    },
    {
      id: 4,
      column: "progress",
      asset: "AF-011",
      level: "Urgent",
      desc: "Main power supply redundancy test - Level 3 Data Center.",
      assigneeName: "R. Moore",
      statusIcon: "autorenew",
    },
    {
      id: 5,
      column: "verification",
      asset: "XP-90",
      level: "Testing",
      desc: "Security protocol validation for external API gateway § 09.",
      due: "Awaiting QA",
      statusIcon: "check_circle",
    },
  ]);

  const moveCard = (id: number, direction: "next" | "prev") => {
    const columns: Array<KanbanCard["column"]> = ["backlog", "progress", "verification", "resolved"];
    setCards((prev) =>
      prev.map((card) => {
        if (card.id === id) {
          const currentIndex = columns.indexOf(card.column);
          let newIndex = currentIndex;
          if (direction === "next" && currentIndex < columns.length - 1) {
            newIndex += 1;
          } else if (direction === "prev" && currentIndex > 0) {
            newIndex -= 1;
          }
          return { ...card, column: columns[newIndex] };
        }
        return card;
      })
    );
  };

  const handleAddTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset || !newDesc) return;
    const newCard: KanbanCard = {
      id: Date.now(),
      column: "backlog",
      asset: newAsset,
      level: newLevel,
      desc: newDesc,
    };
    setCards((prev) => [...prev, newCard]);
    setIsAddModalOpen(false);
    // Reset Form
    setNewAsset("");
    setNewDesc("");
  };

  // Helper counts
  const backlogCards = cards.filter((c) => c.column === "backlog");
  const progressCards = cards.filter((c) => c.column === "progress");
  const verificationCards = cards.filter((c) => c.column === "verification");
  const resolvedCards = cards.filter((c) => c.column === "resolved");

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Sidebar Navigation */}
      <Sidebar activePage="workflows" />

      {/* Main Content Area */}
      <main className="ml-64 min-h-screen px-container-padding pb-section-margin flex flex-col justify-between">
        <div>
          {/* Top Utility Bar */}
          <header className="flex justify-between items-center h-20 mb-8 border-b border-border-hairline bg-transparent">
            <div className="flex items-center gap-4">
              <span className="font-label-mono text-label-mono text-secondary text-xs font-semibold tracking-wider">
                SYSTEMS / ASSETS / WORKFLOWS
              </span>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative group">
                <span className="material-symbols-outlined text-secondary hover:text-primary cursor-pointer transition-colors text-lg">
                  search
                </span>
              </div>
              {/* Profile Avatar */}
              <div className="h-8 w-8 bg-primary-container flex items-center justify-center text-on-primary-container font-section-number rounded-full overflow-hidden border border-border-hairline">
                <img
                  className="object-cover w-full h-full"
                  alt="A professional headshot of a senior asset manager."
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD2AK3l9woDAvhrHyPGkjm1M12ExuJvHKCaSu0bEMIx7OrakHTN2nEneqpqXzgmH8YRc2NbQRaTWh6vsDVL29LNFAIftDySc_0TLVbiAQAq94oKHC1MdMg4HpxGFOXLdsIEA15FiKTgPPbELCNfiEo3oQUW7UjNQyA57qeHb18OLVuNj2CtHUQFEIt6UKlEpoOaSTfKTKOJr_AnR0vjwpYxxC0f9drVb6RmR-rTTERaumKT9N9XwhtG"
                />
              </div>
            </div>
          </header>

          {/* Section Header */}
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-4">
              <span className="font-section-number text-section-number text-primary">§ 04</span>
              <div className="h-px w-12 bg-primary"></div>
              <h2 className="font-label-mono text-label-mono uppercase tracking-widest text-secondary text-xs">
                Maintenance
              </h2>
            </div>
            <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
              Maintenance <span className="font-display-lg-italic italic text-primary font-normal">queue</span>
            </h1>
          </div>

          {/* Workflow Stepper */}
          <div className="w-full mb-section-margin overflow-x-auto custom-scrollbar">
            <div className="flex items-center border-b border-border-hairline min-w-max">
              <div className="px-8 py-6 flex items-center gap-3 font-label-mono text-label-mono uppercase tracking-widest text-secondary opacity-50 text-xs">
                <span className="text-xs font-bold">01</span>
                <span>Pending</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </div>
              <div className="px-8 py-6 flex items-center gap-3 font-label-mono text-label-mono uppercase tracking-widest text-secondary opacity-50 text-xs">
                <span className="text-xs font-bold">02</span>
                <span>Approved</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </div>
              <div className="px-8 py-6 flex items-center gap-3 font-label-mono text-label-mono uppercase tracking-widest text-on-surface relative step-active text-xs">
                <span className="text-xs font-bold text-primary">03</span>
                <span className="font-bold">Assigned</span>
                <span className="material-symbols-outlined text-sm text-primary">arrow_forward</span>
              </div>
              <div className="px-8 py-6 flex items-center gap-3 font-label-mono text-label-mono uppercase tracking-widest text-secondary opacity-50 text-xs">
                <span className="text-xs font-bold">04</span>
                <span>In Progress</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </div>
              <div className="px-8 py-6 flex items-center gap-3 font-label-mono text-label-mono uppercase tracking-widest text-secondary opacity-50 text-xs">
                <span className="text-xs font-bold">05</span>
                <span>Resolved</span>
              </div>
            </div>
          </div>

          {/* Kanban Board Area */}
          <div className="flex gap-gutter overflow-x-auto pb-8 custom-scrollbar items-start">
            {/* Column 1: Backlog */}
            <div className="kanban-column space-y-6">
              <div className="flex items-center justify-between border-b border-border-hairline pb-4">
                <h3 className="font-label-mono text-label-mono uppercase tracking-widest flex items-center gap-2 text-xs font-semibold text-on-surface">
                  Backlog{" "}
                  <span className="text-[10px] bg-surface-container-highest px-1.5 py-0.5 font-bold">
                    {backlogCards.length.toString().padStart(2, "0")}
                  </span>
                </h3>
                <button className="material-symbols-outlined text-secondary hover:text-primary transition-colors cursor-pointer">
                  more_horiz
                </button>
              </div>

              {backlogCards.map((card) => (
                <div
                  key={card.id}
                  className="bg-surface p-card-padding border border-border-hairline transition-all duration-300 hover:border-primary cursor-pointer hover:-translate-y-0.5 group hover:shadow-sm"
                >
                  <div className="flex justify-between items-start mb-6 text-[10px]">
                    <span className="font-label-mono uppercase tracking-tighter text-secondary">
                      Asset: {card.asset}
                    </span>
                    <span
                      className={`font-label-mono px-2 py-0.5 uppercase font-bold text-[9px] ${
                        card.level === "Critical"
                          ? "bg-error-container text-on-error-container"
                          : "bg-status-available/20 text-status-available"
                      }`}
                    >
                      {card.level}
                    </span>
                  </div>
                  <p className="font-body-md mb-6 leading-snug text-sm">{card.desc}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-border-hairline">
                    <div className="flex items-center gap-2">
                      {card.assignee && (
                        <div className="w-6 h-6 rounded-full border border-surface overflow-hidden bg-primary-container">
                          <img className="object-cover" alt="assignee" src={card.assignee} />
                        </div>
                      )}
                      {card.due && (
                        <span className="font-label-mono text-[10px] text-secondary">{card.due}</span>
                      )}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => moveCard(card.id, "next")}
                        className="text-primary hover:text-opacity-85 cursor-pointer text-xs uppercase font-label-mono tracking-wider flex items-center gap-1"
                      >
                        Start <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Column 2: In Progress */}
            <div className="kanban-column space-y-6">
              <div className="flex items-center justify-between border-b border-primary pb-4">
                <h3 className="font-label-mono text-label-mono uppercase tracking-widest flex items-center gap-2 text-primary font-bold text-xs">
                  In Progress{" "}
                  <span className="text-[10px] bg-primary text-on-primary px-1.5 py-0.5 font-bold">
                    {progressCards.length.toString().padStart(2, "0")}
                  </span>
                </h3>
              </div>

              {progressCards.map((card) => (
                <div
                  key={card.id}
                  className="bg-surface p-card-padding border border-border-hairline transition-all duration-300 hover:border-primary cursor-pointer hover:-translate-y-0.5 group hover:shadow-sm"
                >
                  <div className="flex justify-between items-start mb-6 text-[10px]">
                    <span className="font-label-mono uppercase tracking-tighter text-secondary">
                      Asset: {card.asset}
                    </span>
                    <span className="bg-status-reserved/20 text-status-reserved text-[10px] font-label-mono px-2 py-0.5 uppercase font-bold text-[9px]">
                      {card.level}
                    </span>
                  </div>
                  <p className="font-body-md mb-6 leading-snug text-sm">{card.desc}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-border-hairline">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-surface-container-high border border-border-hairline flex items-center justify-center">
                        <span className="text-[10px] font-label-mono font-bold">
                          {card.assigneeName?.split(".")[1]?.trim()?.substring(0, 2)?.toUpperCase() || "JS"}
                        </span>
                      </div>
                      <span className="font-label-mono text-[10px] text-secondary">{card.assigneeName}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => moveCard(card.id, "prev")}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-secondary hover:text-on-surface cursor-pointer text-xs"
                      >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                      </button>
                      <button
                        onClick={() => moveCard(card.id, "next")}
                        className="text-primary hover:text-opacity-85 cursor-pointer text-xs uppercase font-label-mono tracking-wider flex items-center gap-1"
                      >
                        Verify <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Column 3: Verification */}
            <div className="kanban-column space-y-6">
              <div className="flex items-center justify-between border-b border-border-hairline pb-4 opacity-60">
                <h3 className="font-label-mono text-label-mono uppercase tracking-widest flex items-center gap-2 text-xs font-semibold text-on-surface">
                  Verification{" "}
                  <span className="text-[10px] bg-surface-container-highest px-1.5 py-0.5 font-bold">
                    {verificationCards.length.toString().padStart(2, "0")}
                  </span>
                </h3>
              </div>

              {verificationCards.map((card) => (
                <div
                  key={card.id}
                  className="bg-surface p-card-padding border border-border-hairline transition-all duration-300 hover:border-primary cursor-pointer hover:-translate-y-0.5 group hover:shadow-sm opacity-80"
                >
                  <div className="flex justify-between items-start mb-6 text-[10px]">
                    <span className="font-label-mono uppercase tracking-tighter text-secondary">
                      Asset: {card.asset}
                    </span>
                    <span className="bg-secondary-container text-on-secondary-container text-[10px] font-label-mono px-2 py-0.5 uppercase font-bold text-[9px]">
                      {card.level}
                    </span>
                  </div>
                  <p className="font-body-md mb-6 leading-snug text-sm">{card.desc}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-border-hairline">
                    <span className="font-label-mono text-[10px] text-secondary">{card.due}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => moveCard(card.id, "prev")}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-secondary hover:text-on-surface cursor-pointer text-xs"
                      >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                      </button>
                      <button
                        onClick={() => moveCard(card.id, "next")}
                        className="text-primary hover:text-opacity-85 cursor-pointer text-xs uppercase font-label-mono tracking-wider flex items-center gap-1 font-bold"
                      >
                        Resolve <span className="material-symbols-outlined text-sm">check_circle</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Column 4: Resolved */}
            <div className="kanban-column space-y-6 opacity-60">
              <div className="flex items-center justify-between border-b border-border-hairline pb-4">
                <h3 className="font-label-mono text-label-mono uppercase tracking-widest flex items-center gap-2 text-xs font-semibold text-on-surface">
                  Resolved{" "}
                  <span className="text-[10px] bg-surface-container-highest px-1.5 py-0.5 font-bold">
                    {resolvedCards.length.toString().padStart(2, "0")}
                  </span>
                </h3>
              </div>

              {resolvedCards.map((card) => (
                <div
                  key={card.id}
                  className="bg-surface/50 p-card-padding border border-border-hairline group cursor-not-allowed line-through"
                >
                  <div className="flex justify-between items-start mb-6 text-[10px]">
                    <span className="font-label-mono uppercase tracking-tighter text-secondary">
                      Asset: {card.asset}
                    </span>
                    <span className="bg-status-retired/20 text-secondary text-[10px] font-label-mono px-2 py-0.5 uppercase font-bold text-[9px]">
                      {card.level}
                    </span>
                  </div>
                  <p className="font-body-md mb-6 leading-snug text-sm text-secondary">{card.desc}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-border-hairline">
                    <span className="font-label-mono text-[10px] text-secondary">ARCHIVED</span>
                    <span className="material-symbols-outlined text-status-available text-sm">check_circle</span>
                  </div>
                </div>
              ))}

              <div className="h-32 border border-dashed border-border-hairline flex items-center justify-center text-center">
                <span className="font-label-mono text-[10px] uppercase tracking-widest opacity-40">
                  Drop here to archive
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Add Button */}
        <div className="fixed bottom-10 right-10 flex flex-col gap-4" id="quick-actions">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-primary text-on-primary w-14 h-14 flex items-center justify-center hover:bg-on-primary-fixed-variant transition-colors shadow-lg cursor-pointer rounded-none"
          >
            <span className="material-symbols-outlined text-2xl">add</span>
          </button>
        </div>

        {/* Footer Shell */}
        <footer className="ml-64 bg-background border-t border-border-hairline py-section-margin px-container-padding grid grid-cols-1 md:grid-cols-2 gap-gutter font-label-mono text-label-mono">
          <div className="flex flex-col gap-4">
            <span className="font-display-lg text-display-lg text-on-surface font-bold">AssetFlow.</span>
            <p className="text-secondary max-w-sm text-sm">
              Proprietary technical asset management for high-frequency enterprise environments. Built for precision.
            </p>
          </div>
          <div className="flex flex-col justify-between items-end">
            <nav className="flex gap-8 text-secondary text-xs">
              <Link className="hover:text-primary transition-colors underline" href="#">
                Privacy
              </Link>
              <Link className="hover:text-primary transition-colors underline" href="#">
                Terms
              </Link>
              <Link className="hover:text-primary transition-colors underline" href="#">
                Security
              </Link>
              <Link className="hover:text-primary transition-colors underline" href="#">
                System Status
              </Link>
            </nav>
            <p className="text-secondary mt-8 text-xs">
              © 2024 AssetFlow Systems. All rights reserved.
            </p>
          </div>
        </footer>
      </main>

      {/* Add Maintenance Ticket Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white border border-border-hairline p-8 max-w-md w-full">
            <h3 className="font-headline-md font-bold mb-6 text-on-surface">Raise Maintenance Request</h3>
            <form onSubmit={handleAddTicketSubmit} className="space-y-6 text-sm">
              <div className="flex flex-col gap-2">
                <label className="font-label-mono text-secondary uppercase text-xs">Asset ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AF-992-B"
                  className="bg-transparent border-t-0 border-l-0 border-r-0 border-b border-border-hairline py-2 font-body-md text-on-surface focus:border-primary focus:outline-none transition-all"
                  value={newAsset}
                  onChange={(e) => setNewAsset(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-label-mono text-secondary uppercase text-xs">Priority</label>
                <select
                  className="bg-transparent border-t-0 border-l-0 border-r-0 border-b border-border-hairline py-2 font-body-md text-on-surface focus:border-primary focus:outline-none transition-all"
                  value={newLevel}
                  onChange={(e) => setNewLevel(e.target.value as any)}
                >
                  <option value="Critical">Critical</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Routine">Routine</option>
                  <option value="Audit">Audit</option>
                  <option value="Testing">Testing</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-label-mono text-secondary uppercase text-xs">Description of Issue</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the failure or routine maintenance requirement..."
                  className="bg-transparent border border-border-hairline p-2 font-body-md text-on-surface focus:border-primary focus:outline-none transition-all"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-border-hairline text-secondary hover:text-on-surface cursor-pointer font-label-mono text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-on-primary hover:bg-opacity-90 cursor-pointer font-label-mono text-xs uppercase"
                >
                  File Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
