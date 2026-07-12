"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/context/AuthContext";

interface SidebarProps {
  activePage: "dashboard" | "assets" | "workflows" | "treasury" | "reports" | "settings" | "bookings" | "audits" | "notifications" | "profile";
}

export default function Sidebar({ activePage }: SidebarProps) {
  const { role, logout, user } = useAuth();

  const allLinks = [
    {
      id: "dashboard",
      label: "§ 01 · Dashboard",
      icon: "dashboard",
      href: "/dashboard",
      roles: ["ADMIN", "ASSET_MANAGER", "DEPARTMENT_HEAD", "EMPLOYEE"],
    },
    // Manager Assets
    {
      id: "assets",
      label: "§ 02 · Assets",
      icon: "account_balance_wallet",
      href: "/assets",
      roles: ["ADMIN", "ASSET_MANAGER", "DEPARTMENT_HEAD"],
    },
    // Employee My Assets
    {
      id: "assets",
      label: "§ 02 · My Assets",
      icon: "account_balance_wallet",
      href: "/assets",
      roles: ["EMPLOYEE"],
    },
    // Manager Bookings
    {
      id: "bookings",
      label: "§ 03 · Bookings",
      icon: "calendar_today",
      href: "/bookings",
      roles: ["ASSET_MANAGER", "DEPARTMENT_HEAD"],
    },
    // Employee My Bookings
    {
      id: "bookings",
      label: "§ 03 · My Bookings",
      icon: "calendar_today",
      href: "/bookings",
      roles: ["EMPLOYEE"],
    },
    // Manager Workflows
    {
      id: "workflows",
      label: "§ 04 · Workflows",
      icon: "account_tree",
      href: "/workflows",
      roles: ["ADMIN", "ASSET_MANAGER", "DEPARTMENT_HEAD"],
    },
    // Employee Maintenance
    {
      id: "workflows",
      label: "§ 04 · Maintenance",
      icon: "build",
      href: "/workflows",
      roles: ["EMPLOYEE"],
    },
    {
      id: "notifications",
      label: "§ 05 · Notifications",
      icon: "notifications",
      href: "/notifications",
      roles: ["EMPLOYEE"],
    },
    {
      id: "profile",
      label: "§ 06 · Profile",
      icon: "account_circle",
      href: "/profile",
      roles: ["EMPLOYEE"],
    },
    {
      id: "audits",
      label: "§ 05 · Audits",
      icon: "verified_user",
      href: "/audits",
      roles: ["ADMIN"],
    },
    {
      id: "reports",
      label: "§ 06 · Reports",
      icon: "analytics",
      href: "/reports",
      roles: ["ADMIN", "ASSET_MANAGER"],
    },
    {
      id: "settings",
      label: "§ 07 · Settings",
      icon: "settings",
      href: "/settings",
      roles: ["ADMIN"],
    },
  ];

  // Filter links by current user's role
  const links = allLinks.filter((link) => {
    if (!role) return false;
    return link.roles.includes(role);
  });

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-low border-r border-border-hairline flex flex-col py-gutter space-y-unit z-50">
      {/* Brand Header */}
      <div className="px-6 mb-10">
        <div className="font-section-number text-section-number text-primary uppercase tracking-widest mb-1">
          AssetFlow
        </div>
        <div className="text-[10px] font-label-mono text-on-surface-variant opacity-60 uppercase tracking-[0.2em]">
          {role ? `${role.replace("_", " ")} Mode` : "Loading..."}
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
        <button
          onClick={logout}
          className="w-full flex items-center px-4 py-2 font-label-mono text-[11px] uppercase tracking-widest text-on-surface-variant opacity-70 hover:text-error transition-all text-left cursor-pointer bg-transparent border-0"
        >
          <span className="material-symbols-outlined mr-3 text-[20px]">logout</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
