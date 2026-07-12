"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

interface Asset {
  tag: string;
  name: string;
  type: string;
  tier: string;
  valuation: number;
  status: "Available" | "Allocated" | "Maintenance";
  updated: string;
}

export default function Assets() {
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "transit" | "review">("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Modal form states
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetType, setNewAssetType] = useState("Commodity");
  const [newAssetValuation, setNewAssetValuation] = useState("");

  const [assets, setAssets] = useState<Asset[]>([
    {
      tag: "AF-TX-0922-K",
      name: "Equatorial Lithium Reserve",
      type: "Commodity",
      tier: "Tier 1",
      valuation: 12400000,
      status: "Available",
      updated: "02 OCT 2024",
    },
    {
      tag: "AF-RE-4410-X",
      name: "Helsinki Data Center Complex",
      type: "Infrastructure",
      tier: "Fixed",
      valuation: 8120500,
      status: "Allocated",
      updated: "28 SEP 2024",
    },
    {
      tag: "AF-AV-1102-L",
      name: "Global Cargo Carrier #91",
      type: "Aviation",
      tier: "Fleet",
      valuation: 2440000,
      status: "Maintenance",
      updated: "30 SEP 2024",
    },
    {
      tag: "AF-EQ-8839-M",
      name: "Renewable Grid Alpha",
      type: "Energy",
      tier: "Strategic",
      valuation: 15900000,
      status: "Available",
      updated: "01 OCT 2024",
    },
  ]);

  // Keyboard shortcut listener for Ctrl+K / Cmd+K search focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleAddAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName) return;
    const newAsset: Asset = {
      tag: `AF-NEW-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newAssetName,
      type: newAssetType,
      tier: "Tier 1",
      valuation: parseFloat(newAssetValuation) || 0,
      status: "Available",
      updated: "TODAY",
    };
    setAssets((prev) => [newAsset, ...prev]);
    setIsAddModalOpen(false);
    // Reset form
    setNewAssetName("");
    setNewAssetValuation("");
  };

  // Filtering
  const filteredAssets = assets.filter((asset) => {
    // Tab filtering
    if (activeTab === "transit" && asset.status !== "Allocated") return false;
    if (activeTab === "review" && asset.status !== "Maintenance") return false;

    // Search query filtering
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      return (
        asset.name.toLowerCase().includes(query) ||
        asset.tag.toLowerCase().includes(query) ||
        asset.type.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Sidebar Navigation */}
      <Sidebar activePage="assets" />

      {/* Main Content Area */}
      <main className="ml-64 min-h-screen flex flex-col justify-between">
        <div>
          {/* Header Strip */}
          <header className="w-full h-20 px-container-padding sticky top-0 bg-background/80 backdrop-blur-md flex justify-between items-center z-40 border-b border-border-hairline">
            <div className="flex items-center gap-4">
              <span className="font-section-number text-section-number text-primary">§ 02</span>
              <h2 className="font-display-lg text-[32px] tracking-tight font-bold">
                Asset <span className="font-display-lg-italic italic text-primary font-normal">management</span>
              </h2>
            </div>
            <div className="flex items-center gap-6">
              {/* Search */}
              <div className="relative flex items-center group">
                <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-sm">
                  search
                </span>
                <input
                  ref={searchInputRef}
                  id="search-input"
                  className="bg-surface-container-low border-none border-b border-border-hairline focus:border-primary focus:outline-none focus:ring-0 font-label-mono text-label-mono w-64 pl-10 pr-4 py-2 transition-all text-xs"
                  placeholder="CMD + K TO SEARCH..."
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-primary text-on-primary px-6 py-2 font-label-mono text-label-mono uppercase tracking-widest hover:bg-opacity-90 transition-all cursor-pointer text-xs rounded-none"
              >
                Add New Asset
              </button>
            </div>
          </header>

          <div className="p-container-padding">
            {/* Quick Stats Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter mb-section-margin">
              <div className="border-l border-border-hairline pl-4">
                <p className="font-label-mono text-label-mono text-secondary uppercase mb-2 text-xs">
                  Total Value
                </p>
                <h3 className="font-stat-kpi text-stat-kpi text-on-surface tabular-nums font-bold">
                  ${(assets.reduce((sum, a) => sum + a.valuation, 0) / 1000000).toFixed(1)}M
                </h3>
              </div>
              <div className="border-l border-border-hairline pl-4">
                <p className="font-label-mono text-label-mono text-secondary uppercase mb-2 text-xs">
                  Active Nodes
                </p>
                <h3 className="font-stat-kpi text-stat-kpi text-on-surface tabular-nums font-bold">
                  1,204
                </h3>
              </div>
              <div className="border-l border-border-hairline pl-4">
                <p className="font-label-mono text-label-mono text-secondary uppercase mb-2 text-xs">
                  Liquidity
                </p>
                <h3 className="font-stat-kpi text-stat-kpi text-on-surface tabular-nums font-bold">
                  84.2%
                </h3>
              </div>
              <div className="border-l border-border-hairline pl-4">
                <p className="font-label-mono text-label-mono text-secondary uppercase mb-2 text-xs">
                  Health Index
                </p>
                <h3 className="font-stat-kpi text-stat-kpi text-on-surface tabular-nums font-bold">
                  0.98
                </h3>
              </div>
            </div>

            {/* Asset Table Controls */}
            <div className="flex justify-between items-end border-b border-border-hairline pb-4 mb-gutter">
              <div className="flex gap-8">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`font-label-mono text-label-mono uppercase tracking-widest pb-4 text-xs cursor-pointer ${
                    activeTab === "all"
                      ? "border-b-2 border-primary text-on-surface font-semibold"
                      : "text-secondary hover:text-on-surface"
                  }`}
                >
                  All Assets ({assets.length})
                </button>
                <button
                  onClick={() => setActiveTab("transit")}
                  className={`font-label-mono text-label-mono uppercase tracking-widest pb-4 text-xs cursor-pointer ${
                    activeTab === "transit"
                      ? "border-b-2 border-primary text-on-surface font-semibold"
                      : "text-secondary hover:text-on-surface"
                  }`}
                >
                  In Transit
                </button>
                <button
                  onClick={() => setActiveTab("review")}
                  className={`font-label-mono text-label-mono uppercase tracking-widest pb-4 text-xs cursor-pointer ${
                    activeTab === "review"
                      ? "border-b-2 border-primary text-on-surface font-semibold"
                      : "text-secondary hover:text-on-surface"
                  }`}
                >
                  In Review
                </button>
              </div>
              <div className="flex gap-4 pb-4">
                <button className="flex items-center gap-2 font-label-mono text-label-mono uppercase text-secondary hover:text-primary transition-colors text-xs cursor-pointer">
                  <span className="material-symbols-outlined text-[18px]">filter_list</span> Filter
                </button>
                <button className="flex items-center gap-2 font-label-mono text-label-mono uppercase text-secondary hover:text-primary transition-colors text-xs cursor-pointer">
                  <span className="material-symbols-outlined text-[18px]">download</span> Export
                </button>
              </div>
            </div>

            {/* Asset Table */}
            <div className="bg-surface overflow-hidden border border-border-hairline">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low border-b border-border-hairline">
                  <tr className="text-xs">
                    <th className="px-gutter py-4 font-label-mono text-label-mono text-secondary uppercase">
                      Asset Ident
                    </th>
                    <th className="px-gutter py-4 font-label-mono text-label-mono text-secondary uppercase">
                      Classification
                    </th>
                    <th className="px-gutter py-4 font-label-mono text-label-mono text-secondary uppercase">
                      Valuation
                    </th>
                    <th className="px-gutter py-4 font-label-mono text-label-mono text-secondary uppercase">
                      Status
                    </th>
                    <th className="px-gutter py-4 font-label-mono text-label-mono text-secondary uppercase">
                      Updated
                    </th>
                    <th className="px-gutter py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-hairline">
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-gutter py-12 text-center text-secondary text-sm">
                        No assets found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map((asset) => (
                      <tr
                        key={asset.tag}
                        className="row-hover-reveal group hover:bg-surface-container-lowest transition-colors duration-150"
                      >
                        <td className="px-gutter py-5">
                          <span className="font-label-mono text-label-mono text-on-surface font-bold tracking-tight text-xs">
                            {asset.tag}
                          </span>
                        </td>
                        <td className="px-gutter py-5">
                          <div className="flex flex-col">
                            <span className="text-body-md font-medium text-on-surface text-sm">
                              {asset.name}
                            </span>
                            <span className="font-label-mono text-[10px] text-secondary">
                              {asset.type} · {asset.tier}
                            </span>
                          </div>
                        </td>
                        <td className="px-gutter py-5">
                          <span className="text-body-md font-bold text-on-surface text-sm">
                            ${asset.valuation.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-gutter py-5">
                          {asset.status === "Available" && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-status-available/20 text-on-primary-container text-[11px] font-bold uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-status-available"></span>
                              Available
                            </div>
                          )}
                          {asset.status === "Allocated" && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-status-allocated/20 text-on-secondary-container text-[11px] font-bold uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-status-allocated"></span>
                              Allocated
                            </div>
                          )}
                          {asset.status === "Maintenance" && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-status-maintenance/20 text-on-tertiary-container text-[11px] font-bold uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-status-maintenance"></span>
                              Maintenance
                            </div>
                          )}
                        </td>
                        <td className="px-gutter py-5">
                          <span className="font-label-mono text-label-mono text-secondary text-xs">
                            {asset.updated}
                          </span>
                        </td>
                        <td className="px-gutter py-5 text-right">
                          <div className="action-trigger inline-flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button className="text-secondary hover:text-primary cursor-pointer">
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                            <button className="text-secondary hover:text-primary cursor-pointer">
                              <span className="material-symbols-outlined text-lg">arrow_forward</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="px-gutter py-4 border-t border-border-hairline flex justify-between items-center bg-surface-container-low text-xs">
                <p className="font-label-mono text-[10px] text-secondary uppercase">
                  Showing 1-25 of 1,204 Assets
                </p>
                <div className="flex gap-2">
                  <button className="w-8 h-8 flex items-center justify-center border border-border-hairline hover:bg-sage-hover transition-colors cursor-pointer bg-white">
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center border border-border-hairline bg-primary text-on-primary font-label-mono text-[10px] font-bold">
                    1
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center border border-border-hairline hover:bg-sage-hover transition-colors font-label-mono text-[10px] cursor-pointer bg-white">
                    2
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center border border-border-hairline hover:bg-sage-hover transition-colors font-label-mono text-[10px] cursor-pointer bg-white">
                    3
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center border border-border-hairline hover:bg-sage-hover transition-colors cursor-pointer bg-white">
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-section-margin grid grid-cols-1 md:grid-cols-2 gap-gutter border-t border-border-hairline py-section-margin px-container-padding bg-background">
          <div>
            <h4 className="font-display-lg text-[24px] text-on-surface mb-4 font-bold">
              AssetFlow Systems
            </h4>
            <p className="font-label-mono text-label-mono text-secondary text-xs">
              © 2024 AssetFlow Systems. All rights reserved.
            </p>
          </div>
          <div className="flex flex-wrap gap-8 md:justify-end items-start text-xs">
            <Link className="font-label-mono text-label-mono text-secondary hover:text-primary underline transition-opacity" href="#">
              Privacy
            </Link>
            <Link className="font-label-mono text-label-mono text-secondary hover:text-primary underline transition-opacity" href="#">
              Terms
            </Link>
            <Link className="font-label-mono text-label-mono text-secondary hover:text-primary underline transition-opacity" href="#">
              Security
            </Link>
            <Link className="font-label-mono text-label-mono text-secondary hover:text-primary underline transition-opacity" href="#">
              System Status
            </Link>
          </div>
        </footer>
      </main>

      {/* Add New Asset Modal Dialog */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white border border-border-hairline p-8 max-w-md w-full">
            <h3 className="font-headline-md font-bold mb-6 text-on-surface">Provision New Asset</h3>
            <form onSubmit={handleAddAssetSubmit} className="space-y-6 text-sm">
              <div className="flex flex-col gap-2">
                <label className="font-label-mono text-secondary uppercase text-xs">Asset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. London Office Printer"
                  className="bg-transparent border-t-0 border-l-0 border-r-0 border-b border-border-hairline py-2 font-body-md text-on-surface focus:border-primary focus:outline-none transition-all"
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-label-mono text-secondary uppercase text-xs">Category</label>
                <select
                  className="bg-transparent border-t-0 border-l-0 border-r-0 border-b border-border-hairline py-2 font-body-md text-on-surface focus:border-primary focus:outline-none transition-all"
                  value={newAssetType}
                  onChange={(e) => setNewAssetType(e.target.value)}
                >
                  <option value="Commodity">Commodity</option>
                  <option value="Infrastructure">Infrastructure</option>
                  <option value="Aviation">Aviation</option>
                  <option value="Energy">Energy</option>
                  <option value="Electronics">Electronics</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-label-mono text-secondary uppercase text-xs">Valuation ($)</label>
                <input
                  type="number"
                  required
                  placeholder="1500000"
                  className="bg-transparent border-t-0 border-l-0 border-r-0 border-b border-border-hairline py-2 font-body-md text-on-surface focus:border-primary focus:outline-none transition-all"
                  value={newAssetValuation}
                  onChange={(e) => setNewAssetValuation(e.target.value)}
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
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
