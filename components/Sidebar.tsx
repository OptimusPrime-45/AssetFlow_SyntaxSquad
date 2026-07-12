"use client";

import React from "react";
import Link from "next/link";

interface SidebarProps {
  activePage: "dashboard" | "assets" | "workflows" | "treasury" | "reports" | "settings";
}

export default function Sidebar({ activePage }: SidebarProps) {
  const links = [
    {
      id: "dashboard",
      label: "§ 01 · Dashboard",
      icon: "dashboard",
      href: "/dashboard",
    },
    {
      id: "assets",
      label: "§ 02 · Assets",
      icon: "account_balance_wallet",
      href: "/assets",
    },
    {
      id: "workflows",
      label: "§ 03 · Workflows",
      icon: "account_tree",
      href: "/workflows",
    },
    {
      id: "treasury",
      label: "§ 04 · Treasury",
      icon: "payments",
      href: "/treasury",
    },
    {
      id: "reports",
      label: "§ 05 · Reports",
      icon: "analytics",
      href: "/reports",
    },
    {
      id: "settings",
      label: "§ 06 · Settings",
      icon: "settings",
      href: "/settings",
    },
  ];

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-low border-r border-border-hairline flex flex-col py-gutter space-y-unit z-50">
      {/* Brand Header */}
      <div className="px-6 mb-10">
        <div className="font-section-number text-section-number text-primary uppercase tracking-widest mb-1">
          AssetFlow
        </div>
        <div className="text-[10px] font-label-mono text-on-surface-variant opacity-60 uppercase tracking-[0.2em]">
          Enterprise Tier
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1">
        {links.map((link) => {
          const isActive = activePage === link.id;
          return (
            <Link
              key={link.id}
              href={link.href}
              className={`flex items-center px-4 py-3 transition-all duration-150 group rounded-none text-xs font-label-mono uppercase tracking-widest ${
                isActive
                  ? "text-on-surface bg-surface border-l-2 border-primary font-semibold"
                  : "text-on-surface-variant opacity-70 hover:bg-sage-hover hover:text-on-primary-container"
              }`}
            >
              <span
                className={`material-symbols-outlined mr-3 text-lg ${
                  isActive ? "text-primary" : ""
                }`}
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {link.icon}
              </span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Links */}
      <div className="px-3 border-t border-border-hairline pt-6 space-y-1">
        <Link
          className="flex items-center px-4 py-2 font-label-mono text-[11px] uppercase tracking-widest text-on-surface-variant opacity-70 hover:text-primary transition-all"
          href="#"
        >
          <span className="material-symbols-outlined mr-3 text-[20px]">help</span>
          Support
        </Link>
        <Link
          className="flex items-center px-4 py-2 font-label-mono text-[11px] uppercase tracking-widest text-on-surface-variant opacity-70 hover:text-primary transition-all"
          href="#"
        >
          <span className="material-symbols-outlined mr-3 text-[20px]">description</span>
          Documentation
        </Link>
      </div>
    </aside>
  );
}
