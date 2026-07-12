"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useAuth } from "@/lib/context/AuthContext";

interface MaintenanceTicket {
  id: string;
  issueTitle: string;
  issueDescription: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: string;
  requestedAt: string;
  asset: {
    id: string;
    name: string;
    assetTag: string;
    status: string;
  };
  requestedBy: {
    firstName: string;
    lastName: string;
    employeeCode: string;
  };
  assignedTechnician?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  } | null;
}

export default function Maintenance() {
  const { user, role, loading: authLoading } = useAuth();
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  
  // Dialog/Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);

  // Form states
  const [assets, setAssets] = useState<{ id: string; name: string; assetTag: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; firstName: string; lastName: string; employeeCode: string }[]>([]);
  
  const [newAssetId, setNewAssetId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");

  const [techId, setTechId] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");

  const [error, setError] = useState<string | null>(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/maintenance?status=${statusFilter}&limit=100`);
      const data = await res.json();
      if (data.success) {
        setTickets(data.requests || []);
      } else {
        setError(data.error || "Failed to load maintenance tickets.");
      }
    } catch {
      setError("A connection error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const loadContextData = async () => {
    try {
      const [assetRes, empRes] = await Promise.all([
        fetch("/api/assets?limit=100"),
        fetch("/api/employees?status=ACTIVE&limit=100")
      ]);
      const assetData = await assetRes.json();
      const empData = await empRes.json();
      if (assetData.success) setAssets(assetData.assets || []);
      if (empData.success) setEmployees(empData.employees || []);
    } catch {
      setError("Failed to load options metadata.");
    }
  };

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user, statusFilter]);

  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);
    loadContextData();
  };

  const handleOpenAssignModal = (ticket: MaintenanceTicket) => {
    setSelectedTicket(ticket);
    setIsAssignModalOpen(true);
    loadContextData();
  };

  const handleOpenResolveModal = (ticket: MaintenanceTicket) => {
    setSelectedTicket(ticket);
    setIsResolveModalOpen(true);
  };

  const handleAddTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: newAssetId,
          issueTitle: newTitle,
          issueDescription: newDesc,
          priority: newPriority,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAddModalOpen(false);
        setNewAssetId("");
        setNewTitle("");
        setNewDesc("");
        setNewPriority("MEDIUM");
        fetchTickets();
      } else {
        setError(data.error || "Failed to submit ticket.");
      }
    } catch {
      setError("A network error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm("Approve this maintenance ticket? Status of asset will transition to Under Maintenance.")) return;
    try {
      const res = await fetch(`/api/maintenance/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Approved successfully.");
        fetchTickets();
      } else {
        alert(data.error || "Failed to approve.");
      }
    } catch {
      alert("A network error occurred.");
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Enter rejection reason:");
    if (reason === null) return;
    try {
      const res = await fetch(`/api/maintenance/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Rejected successfully.");
        fetchTickets();
      } else {
        alert(data.error || "Failed to reject.");
      }
    } catch {
      alert("A network error occurred.");
    }
  };

  const handleAssignTech = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/maintenance/${selectedTicket.id}/assign-technician`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicianId: techId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAssignModalOpen(false);
        setTechId("");
        setSelectedTicket(null);
        fetchTickets();
      } else {
        setError(data.error || "Failed to assign technician.");
      }
    } catch {
      setError("A network error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/maintenance/${selectedTicket.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: resolutionNote }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsResolveModalOpen(false);
        setResolutionNote("");
        setSelectedTicket(null);
        fetchTickets();
      } else {
        setError(data.error || "Failed to resolve ticket.");
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
        Syncing maintenance records...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-fixed selection:text-on-primary-fixed">
      <Sidebar activePage="maintenance" />

      <main className="ml-64 min-h-screen px-container-padding py-12 flex flex-col justify-between">
        <div>
          <Header section="Maintenance Logs" />

          <header className="mb-section-margin flex justify-between items-end">
            <div>
              <p className="font-label-mono text-label-mono text-secondary uppercase tracking-[0.2em] mb-2 flex items-center text-xs font-semibold">
                <span className="text-primary font-bold">§ 07</span>
                <span className="mx-2 opacity-30">·</span>
                MAINTENANCE WORKFLOWS
              </p>
              <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                Maintenance <span className="font-display-lg-italic italic font-light text-primary font-normal">tickets</span>.
              </h1>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="bg-primary text-white px-6 py-3 font-label-mono text-xs uppercase tracking-widest hover:bg-opacity-90 transition-all cursor-pointer font-bold"
            >
              Raise Request
            </button>
          </header>

          {/* Filters */}
          <section className="mb-8 flex justify-between items-center text-xs">
            <div className="flex gap-4 font-label-mono uppercase text-secondary font-semibold flex-wrap">
              {["PENDING", "APPROVED", "TECHNICIAN_ASSIGNED", "IN_PROGRESS", "RESOLVED"].map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="statusFilter" checked={statusFilter === s} onChange={() => setStatusFilter(s)} />
                  {s.replace("_", " ")}
                </label>
              ))}
            </div>
          </section>

          {/* Table Listing */}
          <section className="bg-surface border border-border-hairline p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border-hairline font-label-mono uppercase text-secondary text-[10px]">
                    <th className="py-3 font-semibold">Asset Tag</th>
                    <th className="py-3 font-semibold">Asset Name</th>
                    <th className="py-3 font-semibold">Issue Title</th>
                    <th className="py-3 font-semibold">Priority</th>
                    <th className="py-3 font-semibold">Requested By</th>
                    <th className="py-3 font-semibold">Assigned Tech</th>
                    <th className="py-3 font-semibold">Created Date</th>
                    {(role === "ASSET_MANAGER" || role === "ADMIN") ? (
                      <th className="py-3 text-right font-semibold">Actions</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-hairline">
                  {tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-surface-container-low transition-colors duration-150">
                      <td className="py-3.5 font-label-mono text-[10px] font-bold text-primary">{t.asset.assetTag}</td>
                      <td className="py-3.5 font-semibold text-on-surface">{t.asset.name}</td>
                      <td className="py-3.5 font-semibold text-on-surface">{t.issueTitle}</td>
                      <td className="py-3.5">
                        <span className={`px-1.5 py-0.5 text-[9px] font-label-mono uppercase font-bold ${
                          t.priority === "CRITICAL" ? "bg-error/15 text-error" : 
                          t.priority === "HIGH" ? "bg-status-maintenance/20 text-on-secondary-container" : "bg-surface-container-high text-secondary"
                        }`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3.5 text-secondary">{t.requestedBy.firstName} {t.requestedBy.lastName}</td>
                      <td className="py-3.5 text-secondary">
                        {t.assignedTechnician ? `${t.assignedTechnician.firstName} ${t.assignedTechnician.lastName}` : "Unassigned"}
                      </td>
                      <td className="py-3.5 text-secondary">{new Date(t.requestedAt).toLocaleDateString()}</td>
                      {(role === "ASSET_MANAGER" || role === "ADMIN") ? (
                        <td className="py-3.5 text-right space-x-1.5">
                          {t.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleApprove(t.id)}
                                className="bg-primary text-white px-2.5 py-1 text-[10px] font-label-mono uppercase tracking-wider hover:bg-opacity-90 cursor-pointer font-bold"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(t.id)}
                                className="border border-border-hairline text-secondary px-2.5 py-1 text-[10px] font-label-mono uppercase tracking-wider hover:border-error hover:text-error cursor-pointer bg-transparent font-bold"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {t.status === "APPROVED" && (
                            <button
                              onClick={() => handleOpenAssignModal(t)}
                              className="bg-primary text-white px-2.5 py-1 text-[10px] font-label-mono uppercase tracking-wider hover:bg-opacity-90 cursor-pointer font-bold"
                            >
                              Assign Tech
                            </button>
                          )}
                          {(t.status === "TECHNICIAN_ASSIGNED" || t.status === "IN_PROGRESS") && (
                            <button
                              onClick={() => handleOpenResolveModal(t)}
                              className="bg-primary text-white px-2.5 py-1 text-[10px] font-label-mono uppercase tracking-wider hover:bg-opacity-90 cursor-pointer font-bold"
                            >
                              Resolve
                            </button>
                          )}
                          {t.status === "RESOLVED" && <span className="text-secondary">—</span>}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                  {tickets.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-secondary italic">
                        No maintenance requests found matching status.
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

      {/* Add Request Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border-hairline max-w-md w-full p-8">
            <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6 uppercase tracking-widest font-label-mono">Raise Maintenance Request</h2>
            <form onSubmit={handleAddTicketSubmit} className="space-y-4 text-xs font-body-md">
              {error && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{error}</div>}

              <div className="flex flex-col gap-1">
                <label className="font-label-mono uppercase text-secondary font-semibold">Select Asset *</label>
                <select required className="border border-border-hairline p-2.5 focus:outline-none bg-white" value={newAssetId} onChange={(e) => setNewAssetId(e.target.value)}>
                  <option value="">Select Asset</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-mono uppercase text-secondary font-semibold">Issue Title *</label>
                <input required className="border border-border-hairline p-2.5 focus:outline-none" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Battery bulging" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-mono uppercase text-secondary font-semibold">Issue Description *</label>
                <textarea required className="border border-border-hairline p-2.5 focus:outline-none h-20 resize-none" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Details of malfunction..." />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-mono uppercase text-secondary font-semibold">Priority</label>
                <select className="border border-border-hairline p-2.5 focus:outline-none bg-white" value={newPriority} onChange={(e) => setNewPriority(e.target.value as any)}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border-hairline">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer bg-transparent font-bold">Cancel</button>
                <button type="submit" disabled={submitting} className="bg-primary text-white px-5 py-2.5 font-label-mono uppercase tracking-wider hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">
                  {submitting ? "Saving..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Technician Modal */}
      {isAssignModalOpen && selectedTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border-hairline max-w-sm w-full p-8">
            <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6 uppercase tracking-widest font-label-mono">Assign Technician</h2>
            <form onSubmit={handleAssignTech} className="space-y-4 text-xs font-body-md">
              {error && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{error}</div>}

              <div className="mb-4">
                <div className="font-bold text-sm text-on-surface">{selectedTicket.issueTitle}</div>
                <div className="text-[10px] font-label-mono text-secondary">{selectedTicket.asset.name} ({selectedTicket.asset.assetTag})</div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-mono uppercase text-secondary font-semibold">Select Technician *</label>
                <select required className="border border-border-hairline p-2.5 focus:outline-none bg-white" value={techId} onChange={(e) => setTechId(e.target.value)}>
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeCode})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border-hairline">
                <button type="button" onClick={() => { setIsAssignModalOpen(false); setSelectedTicket(null); }} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer bg-transparent font-bold">Cancel</button>
                <button type="submit" disabled={submitting} className="bg-primary text-white px-5 py-2.5 font-label-mono uppercase tracking-wider hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">
                  {submitting ? "Assigning..." : "Assign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {isResolveModalOpen && selectedTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border-hairline max-w-sm w-full p-8">
            <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6 uppercase tracking-widest font-label-mono">Resolve Ticket</h2>
            <form onSubmit={handleResolve} className="space-y-4 text-xs font-body-md">
              {error && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{error}</div>}

              <div className="mb-4">
                <div className="font-bold text-sm text-on-surface">{selectedTicket.issueTitle}</div>
                <div className="text-[10px] font-label-mono text-secondary">{selectedTicket.asset.name} ({selectedTicket.asset.assetTag})</div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-mono uppercase text-secondary font-semibold">Resolution Summary notes *</label>
                <textarea required className="border border-border-hairline p-2.5 focus:outline-none h-20 resize-none" value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} placeholder="Explain the fix or repair..." />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border-hairline">
                <button type="button" onClick={() => { setIsResolveModalOpen(false); setSelectedTicket(null); }} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer bg-transparent font-bold">Cancel</button>
                <button type="submit" disabled={submitting} className="bg-primary text-white px-5 py-2.5 font-label-mono uppercase tracking-wider hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">
                  {submitting ? "Resolving..." : "Complete Repair"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
