"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useAuth } from "@/lib/context/AuthContext";

interface AssetCategory {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
  warrantyMonths: number | null;
  hasSerialNumber: boolean;
  isBookable: boolean;
  _count?: {
    assets: number;
  };
}

export default function Categories() {
  const { user, role, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");

  // Form Fields
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [warrantyMonths, setWarrantyMonths] = useState("");
  const [hasSerialNumber, setHasSerialNumber] = useState(true);
  const [isBookable, setIsBookable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/asset-categories?status=${statusFilter}&search=${search}`);
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories || []);
      } else {
        setError(data.error || "Failed to load categories.");
      }
    } catch {
      setError("A connection error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user, search, statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/asset-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code: code.toUpperCase(),
          description: description || null,
          warrantyMonths: warrantyMonths ? parseInt(warrantyMonths, 10) : null,
          hasSerialNumber,
          isBookable,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAddModalOpen(false);
        setName("");
        setCode("");
        setDescription("");
        setWarrantyMonths("");
        setHasSerialNumber(true);
        setIsBookable(false);
        fetchCategories();
      } else {
        setError(data.error || "Failed to create asset category.");
      }
    } catch {
      setError("A network error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-label-mono text-xs uppercase tracking-widest text-secondary">
        Syncing categories directory...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-fixed selection:text-on-primary-fixed">
      <Sidebar activePage="categories" />

      <main className="ml-64 min-h-screen px-container-padding py-12 flex flex-col justify-between">
        <div>
          <Header section="Categories Management" />

          <header className="mb-section-margin flex justify-between items-end">
            <div>
              <p className="font-label-mono text-label-mono text-secondary uppercase tracking-[0.2em] mb-2 flex items-center text-xs font-semibold">
                <span className="text-primary font-bold">§ 03</span>
                <span className="mx-2 opacity-30">·</span>
                ASSET TAXONOMY
              </p>
              <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                Asset <span className="font-display-lg-italic italic font-light text-primary font-normal">categories</span>.
              </h1>
            </div>
            {role === "ASSET_MANAGER" || role === "ADMIN" ? (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-primary text-white px-6 py-3 font-label-mono text-xs uppercase tracking-widest hover:bg-opacity-90 transition-all cursor-pointer font-bold"
              >
                Create Category
              </button>
            ) : null}
          </header>

          {/* Search and Filters */}
          <section className="mb-8 flex flex-col sm:flex-row gap-4 justify-between items-center text-xs">
            <div className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border border-border-hairline bg-surface p-2.5 focus:outline-none w-full sm:w-64"
              />
            </div>
            <div className="flex gap-4 font-label-mono uppercase text-secondary">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="statusFilter" checked={statusFilter === "ACTIVE"} onChange={() => setStatusFilter("ACTIVE")} />
                Active
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="statusFilter" checked={statusFilter === "INACTIVE"} onChange={() => setStatusFilter("INACTIVE")} />
                Inactive
              </label>
            </div>
          </section>

          {/* Table Directory */}
          <section className="bg-surface border border-border-hairline p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border-hairline font-label-mono uppercase text-secondary text-[10px]">
                    <th className="py-3 font-semibold">Category Name</th>
                    <th className="py-3 font-semibold">Code</th>
                    <th className="py-3 font-semibold">Description</th>
                    <th className="py-3 font-semibold">Warranty</th>
                    <th className="py-3 font-semibold">Has Serial</th>
                    <th className="py-3 font-semibold">Is Bookable</th>
                    <th className="py-3 text-right font-semibold">Total Assets</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-hairline">
                  {categories.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-container-low transition-colors duration-150">
                      <td className="py-3.5 font-semibold text-on-surface">{c.name}</td>
                      <td className="py-3.5 font-label-mono text-primary font-bold">{c.code}</td>
                      <td className="py-3.5 text-secondary">{c.description || "—"}</td>
                      <td className="py-3.5 text-secondary">{c.warrantyMonths ? `${c.warrantyMonths} Months` : "None"}</td>
                      <td className="py-3.5">
                        <span className={`px-1.5 py-0.5 text-[10px] font-label-mono uppercase font-bold ${c.hasSerialNumber ? "bg-primary-container text-on-primary-container" : "bg-surface-container-high text-secondary"}`}>
                          {c.hasSerialNumber ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span className={`px-1.5 py-0.5 text-[10px] font-label-mono uppercase font-bold ${c.isBookable ? "bg-status-reserved/20 text-on-secondary-container" : "bg-surface-container-high text-secondary"}`}>
                          {c.isBookable ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="py-3.5 text-right font-label-mono text-on-surface font-bold">{c._count?.assets || 0}</td>
                    </tr>
                  ))}
                  {categories.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-secondary italic">
                        No categories found matching filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <footer className="mt-section-margin pt-12 border-t border-border-hairline flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-12">
          <div className="space-y-1">
            <div className="font-section-number text-[18px] text-on-surface font-semibold">
              AssetFlow
            </div>
            <p className="font-label-mono text-[11px] text-secondary uppercase tracking-widest">
              © 2026 AssetFlow Systems. All rights reserved.
            </p>
          </div>
        </footer>
      </main>

      {/* Register Category Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border-hairline max-w-md w-full p-8">
            <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6 uppercase tracking-widest font-label-mono">Add Category</h2>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-body-md">
              {error && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{error}</div>}

              <div className="flex flex-col gap-1">
                <label className="font-label-mono uppercase text-secondary font-semibold">Category Name *</label>
                <input required className="border border-border-hairline p-2.5 focus:outline-none" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Server Hardware" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-mono uppercase text-secondary font-semibold">Code *</label>
                <input required className="border border-border-hairline p-2.5 focus:outline-none uppercase" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. SERVER" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-mono uppercase text-secondary font-semibold">Description</label>
                <input className="border border-border-hairline p-2.5 focus:outline-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Category summary details..." />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-mono uppercase text-secondary font-semibold">Warranty Period (Months)</label>
                <input type="number" className="border border-border-hairline p-2.5 focus:outline-none" value={warrantyMonths} onChange={(e) => setWarrantyMonths(e.target.value)} placeholder="e.g. 36" />
              </div>

              <div className="flex items-center gap-6 py-2">
                <label className="flex items-center gap-2 cursor-pointer font-label-mono uppercase text-secondary font-semibold">
                  <input type="checkbox" checked={hasSerialNumber} onChange={(e) => setHasSerialNumber(e.target.checked)} />
                  Requires Serial Number
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-label-mono uppercase text-secondary font-semibold">
                  <input type="checkbox" checked={isBookable} onChange={(e) => setIsBookable(e.target.checked)} />
                  Is Bookable / Shared
                </label>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border-hairline">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer bg-transparent font-bold">Cancel</button>
                <button type="submit" disabled={submitting} className="bg-primary text-white px-5 py-2.5 font-label-mono uppercase tracking-wider hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">
                  {submitting ? "Saving..." : "Register Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
