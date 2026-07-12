"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useAuth } from "@/lib/context/AuthContext";

interface TransferRequest {
  id: string;
  status: string;
  reason: string;
  decisionNote: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  completedAt: string | null;
  asset: {
    id: string;
    name: string;
    assetTag: string;
    serialNumber: string | null;
  };
  requestedBy: {
    firstName: string;
    lastName: string;
    employeeCode: string;
  };
  fromEmployee?: {
    firstName: string;
    lastName: string;
    employeeCode: string;
  } | null;
  fromDepartment?: {
    name: string;
  } | null;
  toEmployee?: {
    firstName: string;
    lastName: string;
    employeeCode: string;
  } | null;
  toDepartment?: {
    name: string;
  } | null;
}

export default function Transfers() {
  const { user, role, loading: authLoading } = useAuth();
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [error, setError] = useState<string | null>(null);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/transfers?status=${statusFilter}&limit=100`);
      const data = await res.json();
      if (data.success) {
        setTransfers(data.transfers || []);
      } else {
        setError(data.error || "Failed to load transfers.");
      }
    } catch {
      setError("A connection error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTransfers();
    }
  }, [user, statusFilter]);

  const handleApprove = async (id: string) => {
    if (!confirm("Are you sure you want to approve this transfer request?")) return;
    try {
      const res = await fetch(`/api/transfers/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Transfer approved.");
        fetchTransfers();
      } else {
        alert(data.error || "Failed to approve transfer.");
      }
    } catch {
      alert("A network error occurred.");
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Enter reason for rejection:");
    if (reason === null) return;
    try {
      const res = await fetch(`/api/transfers/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Transfer rejected.");
        fetchTransfers();
      } else {
        alert(data.error || "Failed to reject transfer.");
      }
    } catch {
      alert("A network error occurred.");
    }
  };

  const handleComplete = async (id: string) => {
    if (!confirm("Confirm custody handover and complete transfer?")) return;
    try {
      const res = await fetch(`/api/transfers/${id}/complete`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Transfer marked as COMPLETED. Custody records updated.");
        fetchTransfers();
      } else {
        alert(data.error || "Failed to complete transfer.");
      }
    } catch {
      alert("A network error occurred.");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-label-mono text-xs uppercase tracking-widest text-secondary">
        Syncing transfers directory...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-fixed selection:text-on-primary-fixed">
      <Sidebar activePage="transfers" />

      <main className="ml-64 min-h-screen px-container-padding py-12 flex flex-col justify-between">
        <div>
          <Header section="Transfers Directory" />

          <header className="mb-section-margin">
            <p className="font-label-mono text-label-mono text-secondary uppercase tracking-[0.2em] mb-2 flex items-center text-xs font-semibold">
              <span className="text-primary font-bold">§ 05</span>
              <span className="mx-2 opacity-30">·</span>
              CUSTODY TRANSFERS
            </p>
            <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
              Transfer <span className="font-display-lg-italic italic font-light text-primary font-normal">requests</span>.
            </h1>
          </header>

          {/* Filters */}
          <section className="mb-8 flex justify-between items-center text-xs">
            <div className="flex gap-4 font-label-mono uppercase text-secondary font-semibold">
              {["PENDING", "APPROVED", "COMPLETED", "REJECTED"].map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="statusFilter" checked={statusFilter === s} onChange={() => setStatusFilter(s)} />
                  {s}
                </label>
              ))}
            </div>
          </section>

          {/* Table Directory */}
          <section className="bg-surface border border-border-hairline p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border-hairline font-label-mono uppercase text-secondary text-[10px]">
                    <th className="py-3 font-semibold">Asset Tag</th>
                    <th className="py-3 font-semibold">Asset Name</th>
                    <th className="py-3 font-semibold">Requested By</th>
                    <th className="py-3 font-semibold">From Holder</th>
                    <th className="py-3 font-semibold">To Target</th>
                    <th className="py-3 font-semibold">Reason</th>
                    <th className="py-3 font-semibold">Status</th>
                    {(role === "ASSET_MANAGER" || role === "ADMIN") ? (
                      <th className="py-3 text-right font-semibold">Actions</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-hairline">
                  {transfers.map((tr) => (
                    <tr key={tr.id} className="hover:bg-surface-container-low transition-colors duration-150">
                      <td className="py-3.5 font-label-mono text-[10px] font-bold text-primary">{tr.asset.assetTag}</td>
                      <td className="py-3.5 font-semibold text-on-surface">{tr.asset.name}</td>
                      <td className="py-3.5 text-secondary">{tr.requestedBy.firstName} {tr.requestedBy.lastName}</td>
                      <td className="py-3.5 text-secondary">
                        {tr.fromEmployee ? `${tr.fromEmployee.firstName} ${tr.fromEmployee.lastName}` : tr.fromDepartment?.name || "Unallocated"}
                      </td>
                      <td className="py-3.5 text-on-surface">
                        {tr.toEmployee ? `${tr.toEmployee.firstName} ${tr.toEmployee.lastName}` : tr.toDepartment?.name || "—"}
                      </td>
                      <td className="py-3.5 text-secondary max-w-xs truncate" title={tr.reason}>{tr.reason}</td>
                      <td className="py-3.5">
                        <span className={`px-1.5 py-0.5 text-[9px] font-label-mono uppercase font-bold ${
                          tr.status === "PENDING" ? "bg-status-maintenance/20 text-on-secondary-container" :
                          tr.status === "APPROVED" ? "bg-primary-container text-on-primary-container" :
                          tr.status === "COMPLETED" ? "bg-status-available/20 text-on-primary-container" : "bg-error/10 text-error"
                        }`}>
                          {tr.status}
                        </span>
                      </td>
                      {(role === "ASSET_MANAGER" || role === "ADMIN") ? (
                        <td className="py-3.5 text-right space-x-1.5">
                          {tr.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleApprove(tr.id)}
                                className="bg-primary text-white px-2.5 py-1 text-[10px] font-label-mono uppercase tracking-wider hover:bg-opacity-90 cursor-pointer font-bold"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(tr.id)}
                                className="border border-border-hairline text-secondary px-2.5 py-1 text-[10px] font-label-mono uppercase tracking-wider hover:border-error hover:text-error cursor-pointer bg-transparent font-bold"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {tr.status === "APPROVED" && (
                            <button
                              onClick={() => handleComplete(tr.id)}
                              className="bg-primary text-white px-2.5 py-1 text-[10px] font-label-mono uppercase tracking-wider hover:bg-opacity-90 cursor-pointer font-bold"
                            >
                              Complete
                            </button>
                          )}
                          {tr.status !== "PENDING" && tr.status !== "APPROVED" && (
                            <span className="text-secondary">—</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                  {transfers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-secondary italic">
                        No transfer requests matching status.
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
    </div>
  );
}
