"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useAuth } from "@/lib/context/AuthContext";

interface Allocation {
  id: string;
  status: string;
  allocatedAt: string;
  expectedReturnDate: string | null;
  actualReturnDate: string | null;
  allocationNote: string | null;
  asset: {
    id: string;
    name: string;
    assetTag: string;
    serialNumber: string | null;
  };
  allocatedToEmployee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  } | null;
  allocatedToDepartment?: {
    id: string;
    name: string;
  } | null;
}

export default function Allocations() {
  const { user, role, loading: authLoading } = useAuth();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ACTIVE");

  // Allocate form states
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [assets, setAssets] = useState<{ id: string; name: string; assetTag: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; firstName: string; lastName: string; employeeCode: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  const [allocAssetId, setAllocAssetId] = useState("");
  const [allocType, setAllocType] = useState<"employee" | "department">("employee");
  const [allocTarget, setAllocTarget] = useState("");
  const [allocReturnDate, setAllocReturnDate] = useState("");
  const [allocNote, setAllocNote] = useState("");

  // Return form states
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [activeReturnAlloc, setActiveReturnAlloc] = useState<Allocation | null>(null);
  const [returnCondition, setReturnCondition] = useState("GOOD");
  const [returnNotes, setReturnNotes] = useState("");

  const [error, setError] = useState<string | null>(null);

  const fetchAllocations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/allocations?status=${statusFilter}&limit=100`);
      const data = await res.json();
      if (data.success) {
        setAllocations(data.allocations || []);
      } else {
        setError(data.error || "Failed to load allocations.");
      }
    } catch {
      setError("A connection error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const loadContextData = async () => {
    try {
      const [assetRes, empRes, deptRes] = await Promise.all([
        fetch("/api/assets?status=AVAILABLE&limit=100"),
        fetch("/api/employees?status=ACTIVE&limit=100"),
        fetch("/api/departments?status=ACTIVE")
      ]);
      const assetData = await assetRes.json();
      const empData = await empRes.json();
      const deptData = await deptRes.json();
      if (assetData.success) setAssets(assetData.assets || []);
      if (empData.success) setEmployees(empData.employees || []);
      if (deptData.success) setDepartments(deptData.departments || []);
    } catch {
      setError("Failed to query context selection values.");
    }
  };

  useEffect(() => {
    if (user) {
      fetchAllocations();
    }
  }, [user, statusFilter]);

  const handleOpenAllocate = () => {
    setIsAllocateOpen(true);
    loadContextData();
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: allocAssetId,
          allocatedToEmployeeId: allocType === "employee" ? allocTarget : null,
          allocatedToDepartmentId: allocType === "department" ? allocTarget : null,
          expectedReturnDate: allocReturnDate ? new Date(allocReturnDate).toISOString() : null,
          allocationNote: allocNote || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAllocateOpen(false);
        setAllocAssetId("");
        setAllocTarget("");
        setAllocReturnDate("");
        setAllocNote("");
        fetchAllocations();
      } else {
        setError(data.error || "Failed to allocate asset.");
      }
    } catch {
      setError("A network error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReturn = (alloc: Allocation) => {
    setActiveReturnAlloc(alloc);
    setIsReturnOpen(true);
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReturnAlloc) return;
    setSubmitting(true);
    setError(null);
    try {
      // 1. Submit return request
      const returnRes = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetAllocationId: activeReturnAlloc.id,
          conditionOnReturn: returnCondition,
          conditionNotes: returnNotes || null,
        }),
      });
      const returnData = await returnRes.json();
      if (!returnRes.ok || !returnData.success) {
        setError(returnData.error || "Failed to file return request.");
        setSubmitting(false);
        return;
      }

      // 2. Approve return instantly
      const approveRes = await fetch(`/api/returns/${returnData.returnRequest.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conditionOnReturn: returnCondition,
          inspectionNotes: returnNotes || "Approved return via dashboard allocations console",
        }),
      });
      const approveData = await approveRes.json();
      if (approveRes.ok && approveData.success) {
        setIsReturnOpen(false);
        setActiveReturnAlloc(null);
        setReturnCondition("GOOD");
        setReturnNotes("");
        fetchAllocations();
      } else {
        setError(approveData.error || "Failed to approve returned asset.");
      }
    } catch {
      setError("A connection error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-label-mono text-xs uppercase tracking-widest text-secondary">
        Syncing allocations directory...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-fixed selection:text-on-primary-fixed">
      <Sidebar activePage="allocations" />

      <main className="ml-64 min-h-screen px-container-padding py-12 flex flex-col justify-between">
        <div>
          <Header section="Allocations Directory" />

          <header className="mb-section-margin flex justify-between items-end">
            <div>
              <p className="font-label-mono text-label-mono text-secondary uppercase tracking-[0.2em] mb-2 flex items-center text-xs font-semibold">
                <span className="text-primary font-bold">§ 04</span>
                <span className="mx-2 opacity-30">·</span>
                CUSTODY LEDGER
              </p>
              <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                Asset <span className="font-display-lg-italic italic font-light text-primary font-normal">allocations</span>.
              </h1>
            </div>
            {role === "ASSET_MANAGER" || role === "ADMIN" ? (
              <button
                onClick={handleOpenAllocate}
                className="bg-primary text-white px-6 py-3 font-label-mono text-xs uppercase tracking-widest hover:bg-opacity-90 transition-all cursor-pointer font-bold"
              >
                Issue Custody
              </button>
            ) : null}
          </header>

          {/* Filters */}
          <section className="mb-8 flex justify-between items-center text-xs">
            <div className="flex gap-4 font-label-mono uppercase text-secondary font-semibold">
              {["ACTIVE", "RETURNED", "OVERDUE"].map((s) => (
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
                    <th className="py-3 font-semibold">Custodian</th>
                    <th className="py-3 font-semibold">Allocated Date</th>
                    <th className="py-3 font-semibold">Expected Return Date</th>
                    <th className="py-3 font-semibold">Status</th>
                    {role === "ASSET_MANAGER" || role === "ADMIN" ? (
                      <th className="py-3 text-right font-semibold">Action</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-hairline">
                  {allocations.map((a) => (
                    <tr key={a.id} className="hover:bg-surface-container-low transition-colors duration-150">
                      <td className="py-3.5 font-label-mono text-[10px] font-bold text-primary">{a.asset.assetTag}</td>
                      <td className="py-3.5 font-semibold text-on-surface">{a.asset.name}</td>
                      <td className="py-3.5 text-secondary">
                        {a.allocatedToEmployee ? `${a.allocatedToEmployee.firstName} ${a.allocatedToEmployee.lastName} (${a.allocatedToEmployee.employeeCode})` : a.allocatedToDepartment?.name || "Organization"}
                      </td>
                      <td className="py-3.5 text-secondary">{new Date(a.allocatedAt).toLocaleDateString()}</td>
                      <td className="py-3.5 text-secondary">{a.expectedReturnDate ? new Date(a.expectedReturnDate).toLocaleDateString() : "—"}</td>
                      <td className="py-3.5">
                        <span className={`px-1.5 py-0.5 text-[9px] font-label-mono uppercase font-bold ${
                          a.status === "ACTIVE" ? "bg-primary-container text-on-primary-container" :
                          a.status === "OVERDUE" ? "bg-error/15 text-error" : "bg-surface-container-high text-secondary"
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      {(role === "ASSET_MANAGER" || role === "ADMIN") && a.status === "ACTIVE" ? (
                        <td className="py-3.5 text-right">
                          <button
                            onClick={() => handleOpenReturn(a)}
                            className="border border-border-hairline text-secondary px-3 py-1 text-[10px] font-label-mono uppercase tracking-wider hover:border-primary hover:text-primary cursor-pointer font-bold bg-transparent"
                          >
                            Return Asset
                          </button>
                        </td>
                      ) : (role === "ASSET_MANAGER" || role === "ADMIN") ? (
                        <td className="py-3.5 text-right text-secondary">—</td>
                      ) : null}
                    </tr>
                  ))}
                  {allocations.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-secondary italic">
                        No allocations found matching status.
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

      {/* Allocate Custody Modal */}
      {isAllocateOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border-hairline max-w-md w-full p-8">
            <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6 uppercase tracking-widest font-label-mono">Allocate Custody</h2>
            <form onSubmit={handleAllocate} className="space-y-4 text-xs font-body-md">
              {error && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{error}</div>}
              
              <div className="flex flex-col gap-1">
                <label className="font-label-mono uppercase text-secondary font-semibold">Select Available Asset *</label>
                <select required className="border border-border-hairline p-2.5 focus:outline-none bg-white" value={allocAssetId} onChange={(e) => setAllocAssetId(e.target.value)}>
                  <option value="">Select Asset</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-mono uppercase text-secondary font-semibold">Allocation Target Type *</label>
                <div className="flex gap-4 py-1.5 font-label-mono uppercase text-secondary">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="allocType" checked={allocType === "employee"} onChange={() => { setAllocType("employee"); setAllocTarget(""); }} />
                    Employee
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="allocType" checked={allocType === "department"} onChange={() => { setAllocType("department"); setAllocTarget(""); }} />
                    Department
                  </label>
                </div>
              </div>

              {allocType === "employee" ? (
                <div className="flex flex-col gap-1">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Select Employee Target *</label>
                  <select required className="border border-border-hairline p-2.5 focus:outline-none bg-white" value={allocTarget} onChange={(e) => setAllocTarget(e.target.value)}>
                    <option value="">Select Employee</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Select Department Target *</label>
                  <select required className="border border-border-hairline p-2.5 focus:outline-none bg-white" value={allocTarget} onChange={(e) => setAllocTarget(e.target.value)}>
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="font-label-mono uppercase text-secondary font-semibold">Expected Return Date</label>
                <input type="date" className="border border-border-hairline p-2.5 focus:outline-none" value={allocReturnDate} onChange={(e) => setAllocReturnDate(e.target.value)} />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-mono uppercase text-secondary font-semibold">Custodian Notes</label>
                <textarea className="border border-border-hairline p-2.5 focus:outline-none resize-none h-20" value={allocNote} onChange={(e) => setAllocNote(e.target.value)} placeholder="Allocation specific hand-over description..." />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border-hairline">
                <button type="button" onClick={() => setIsAllocateOpen(false)} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer bg-transparent font-bold">Cancel</button>
                <button type="submit" disabled={submitting} className="bg-primary text-white px-5 py-2.5 font-label-mono uppercase tracking-wider hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">
                  {submitting ? "Allocating..." : "Issue Custody"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Asset Modal */}
      {isReturnOpen && activeReturnAlloc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border-hairline max-w-md w-full p-8">
            <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6 uppercase tracking-widest font-label-mono">Return Asset</h2>
            <form onSubmit={handleReturn} className="space-y-4 text-xs font-body-md">
              {error && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{error}</div>}
              
              <div className="mb-4">
                <div className="font-bold text-sm text-on-surface">{activeReturnAlloc.asset.name}</div>
                <div className="text-[10px] font-label-mono text-secondary">{activeReturnAlloc.asset.assetTag}</div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-mono uppercase text-secondary font-semibold">Condition On Check-In *</label>
                <select className="border border-border-hairline p-2.5 focus:outline-none bg-white" value={returnCondition} onChange={(e) => setReturnCondition(e.target.value)}>
                  <option value="NEW">New</option>
                  <option value="EXCELLENT">Excellent</option>
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                  <option value="POOR">Poor</option>
                  <option value="DAMAGED">Damaged</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-mono uppercase text-secondary font-semibold">Condition Check-In Notes</label>
                <textarea className="border border-border-hairline p-2.5 focus:outline-none resize-none h-20" value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} placeholder="Condition details or inspection notes..." />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border-hairline">
                <button type="button" onClick={() => { setIsReturnOpen(false); setActiveReturnAlloc(null); }} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer bg-transparent font-bold">Cancel</button>
                <button type="submit" disabled={submitting} className="bg-primary text-white px-5 py-2.5 font-label-mono uppercase tracking-wider hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">
                  {submitting ? "Processing Return..." : "Confirm Return"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
