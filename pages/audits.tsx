import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useAuth } from "@/lib/context/AuthContext";

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
}

interface Asset {
  id: string;
  assetTag: string;
  name: string;
  location: string | null;
  condition: string;
  status: string;
}

interface AuditCycle {
  id: string;
  title: string;
  description: string | null;
  status: "DRAFT" | "IN_PROGRESS" | "CLOSED" | "CANCELLED";
  scopeType: "DEPARTMENT" | "LOCATION" | "CUSTOM";
  startDate: string;
  endDate: string;
  department?: Department | null;
  locationFilter: string | null;
}

interface AuditAssignment {
  id: string;
  status: "ASSIGNED" | "SUBMITTED" | "REVOKED";
  cycle: AuditCycle;
  assignedBy: Employee;
  submittedAt: string | null;
}

interface AuditResult {
  id: string;
  finding: "VERIFIED" | "MISSING" | "DAMAGED";
  observedCondition: string | null;
  observedStatus: string | null;
  observedLocation: string | null;
  notes: string | null;
  submittedAt: string;
  asset: Asset;
  auditor: Employee;
}

interface AuditDiscrepancy {
  id: string;
  discrepancyType: "MISSING_ASSET" | "CONDITION_MISMATCH" | "STATUS_MISMATCH" | "LOCATION_MISMATCH";
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  details: string;
  createdAt: string;
  asset: Asset;
  auditResult: {
    finding: string;
    notes: string | null;
    auditor: Employee;
  };
  resolvedBy?: Employee | null;
  resolutionNote?: string | null;
}

export default function Audits() {
  const { user, role, loading: authLoading } = useAuth();

  // Lists
  const [cycles, setCycles] = useState<AuditCycle[]>([]);
  const [assignments, setAssignments] = useState<AuditAssignment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  // Detailed view of selected cycle
  const [selectedCycle, setSelectedCycle] = useState<AuditCycle | null>(null);
  const [cycleResults, setCycleResults] = useState<AuditResult[]>([]);
  const [cycleDiscrepancies, setCycleDiscrepancies] = useState<AuditDiscrepancy[]>([]);

  // States
  const [activeTab, setActiveTab] = useState<"cycles" | "assignments">("cycles");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modals Open
  const [isAddCycleModalOpen, setIsAddCycleModalOpen] = useState(false);
  const [isLogFindingModalOpen, setIsLogFindingModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);

  // Form states
  // Create Cycle
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newScope, setNewScope] = useState<"DEPARTMENT" | "LOCATION" | "CUSTOM">("DEPARTMENT");
  const [newDeptId, setNewDeptId] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  // Log Finding
  const [findingAssetId, setFindingAssetId] = useState("");
  const [findingType, setFindingType] = useState<"VERIFIED" | "MISSING" | "DAMAGED">("VERIFIED");
  const [findingCondition, setFindingCondition] = useState("GOOD");
  const [findingStatus, setFindingStatus] = useState("AVAILABLE");
  const [findingLocation, setFindingLocation] = useState("");
  const [findingNotes, setFindingNotes] = useState("");

  // Resolve Discrepancy
  const [activeDiscrepancy, setActiveDiscrepancy] = useState<AuditDiscrepancy | null>(null);
  const [resolveNote, setResolveNote] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);

      // Independent of each other — awaiting them in turn cost a round trip per list.
      const [cycleRes, assignRes, deptRes, assetRes] = await Promise.all([
        fetch("/api/audit-cycles"),
        fetch("/api/audits/my-assignments"),
        fetch("/api/departments"),
        fetch("/api/assets?limit=100"),
      ]);

      if (cycleRes.status === 200) {
        const data = await cycleRes.json();
        if (data.success) {
          setCycles(data.cycles || []);
        }
      }

      if (assignRes.status === 200) {
        const data = await assignRes.json();
        if (data.success) {
          setAssignments(data.assignments);
        }
      }

      if (deptRes.status === 200) {
        const data = await deptRes.json();
        if (data.success) {
          setDepartments(data.departments);
        }
      }

      if (assetRes.status === 200) {
        const data = await assetRes.json();
        if (data.success) {
          setAssets(data.assets);
        }
      }
    } catch (e) {
      console.error("Failed to load audit registry", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, role]);

  // Fetch results and discrepancies when a cycle is selected
  const handleSelectCycle = async (cycle: AuditCycle) => {
    setSelectedCycle(cycle);
    try {
      // Results
      const resRes = await fetch(`/api/audit-cycles/${cycle.id}/results`);
      if (resRes.status === 200) {
        const data = await resRes.json();
        if (data.success) {
          setCycleResults(data.results);
        }
      }
      // Discrepancies
      const discRes = await fetch(`/api/audit-cycles/${cycle.id}/discrepancies`);
      if (discRes.status === 200) {
        const data = await discRes.json();
        if (data.success) {
          setCycleDiscrepancies(data.discrepancies);
        }
      }
    } catch (e) {
      console.error("Failed to load cycle findings", e);
    }
  };

  // 1. Create Audit Cycle
  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/audit-cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc || null,
          scopeType: newScope,
          departmentId: newScope === "DEPARTMENT" ? newDeptId : null,
          locationFilter: newScope === "LOCATION" ? newLocation : null,
          startDate: new Date(newStart).toISOString(),
          endDate: new Date(newEnd).toISOString(),
        }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (res.status === 201 && data.success) {
        setIsAddCycleModalOpen(false);
        setNewTitle("");
        setNewDesc("");
        setNewDeptId("");
        setNewLocation("");
        setNewStart("");
        setNewEnd("");
        fetchData();
      } else {
        setFormError(data.error || "Failed to create audit cycle");
      }
    } catch (e) {
      setSubmitting(false);
      setFormError("A network error occurred.");
    }
  };

  // 2. Control Actions (Start/Close/Cancel)
  const handleCycleAction = async (cycleId: string, action: "start" | "close" | "cancel") => {
    if (!confirm(`Are you sure you want to ${action} this audit cycle?`)) return;
    try {
      const res = await fetch(`/api/audit-cycles/${cycleId}/${action}`, { method: "POST" });
      const data = await res.json();
      if (res.status === 200 && data.success) {
        fetchData();
        if (selectedCycle && selectedCycle.id === cycleId) {
          handleSelectCycle({ ...selectedCycle, status: action === "start" ? "IN_PROGRESS" : action === "close" ? "CLOSED" : "CANCELLED" });
        }
      } else {
        alert(data.error || "Action failed");
      }
    } catch (e) {
      alert("A network error occurred.");
    }
  };

  // 3. Submit Finding (Auditor)
  const handleLogFinding = async (e: React.FormEvent, cycleId: string) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/audit-cycles/${cycleId}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: findingAssetId,
          finding: findingType,
          observedCondition: findingType === "VERIFIED" ? findingCondition : null,
          observedStatus: findingType === "VERIFIED" ? findingStatus : null,
          observedLocation: findingLocation || null,
          notes: findingNotes || null,
        }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (res.status === 201 && data.success) {
        setIsLogFindingModalOpen(false);
        setFindingAssetId("");
        setFindingType("VERIFIED");
        setFindingCondition("GOOD");
        setFindingStatus("AVAILABLE");
        setFindingLocation("");
        setFindingNotes("");
        fetchData();
        if (selectedCycle && selectedCycle.id === cycleId) {
          handleSelectCycle(selectedCycle);
        }
      } else {
        setFormError(data.error || "Failed to submit result finding");
      }
    } catch (e) {
      setSubmitting(false);
      setFormError("A network error occurred.");
    }
  };

  // 4. Resolve Discrepancy
  const handleResolveDiscrepancy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDiscrepancy) return;
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/discrepancies/${activeDiscrepancy.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolutionNote: resolveNote }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (res.status === 200 && data.success) {
        setIsResolveModalOpen(false);
        setResolveNote("");
        setActiveDiscrepancy(null);
        if (selectedCycle) {
          handleSelectCycle(selectedCycle);
        }
      } else {
        setFormError(data.error || "Resolution failed");
      }
    } catch (e) {
      setSubmitting(false);
      setFormError("A network error occurred.");
    }
  };

  // Dismiss Discrepancy
  const handleDismissDiscrepancy = async (discrepancyId: string) => {
    const note = prompt("Please enter the reason for dismissing this discrepancy (optional):");
    if (note === null) return; // User cancelled
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/discrepancies/${discrepancyId}/dismiss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolutionNote: note || null }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (res.status === 200 && data.success) {
        if (selectedCycle) {
          handleSelectCycle(selectedCycle);
        }
      } else {
        alert(data.error || "Dismissal failed");
      }
    } catch (e) {
      setSubmitting(false);
      alert("A network error occurred.");
    }
  };

  // 5. Submit Auditor Assignment Complete
  const handleSubmitAssignment = async (cycleId: string) => {
    if (!confirm("Submit assignment? This locks your audit inputs and signals completion to the manager.")) return;
    try {
      const res = await fetch(`/api/audit-cycles/${cycleId}/submit`, { method: "POST" });
      const data = await res.json();
      if (res.status === 200 && data.success) {
        fetchData();
      } else {
        alert(data.error || "Submission failed");
      }
    } catch (e) {
      alert("A network error occurred.");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-label-mono text-xs uppercase tracking-widest text-secondary">
        Validating compliance registry...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Sidebar Navigation */}
      <Sidebar activePage="audits" />

      {/* Main Content Area */}
      <main className="ml-64 min-h-screen px-container-padding py-12 flex flex-col justify-between">
        <div>
          {/* Header Bar */}
          <Header section="Compliance Audits" />

          {/* Section Header */}
          <div className="mb-12 flex justify-between items-end">
            <div>
              <div className="font-label-mono text-label-mono text-secondary uppercase tracking-[0.2em] mb-2 flex items-center text-xs font-semibold">
                <span className="text-primary font-bold">§ 05</span>
                <span className="mx-2 opacity-30">·</span>
                COMPLIANCE &amp; AUDITS
              </div>
              <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                Cycle <span className="font-display-lg-italic italic font-light text-primary font-normal">verification</span>.
              </h1>
            </div>

            {(role === "ADMIN" || role === "ASSET_MANAGER") && (
              <button
                onClick={() => setIsAddCycleModalOpen(true)}
                className="bg-primary text-on-primary px-6 py-3 font-label-mono text-xs uppercase tracking-widest hover:bg-opacity-90 transition-all flex items-center gap-2 rounded-none cursor-pointer font-bold"
              >
                <span className="material-symbols-outlined text-sm">verified_user</span>
                Create Audit Cycle
              </button>
            )}
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-border-hairline mb-8 text-xs font-label-mono uppercase tracking-widest text-secondary font-semibold">
            {(role === "ADMIN" || role === "ASSET_MANAGER") && (
              <button
                onClick={() => setActiveTab("cycles")}
                className={`px-6 py-4 border-b-2 transition-all cursor-pointer ${
                  activeTab === "cycles" ? "border-primary text-on-surface font-bold" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                Management Registry
              </button>
            )}
            <button
              onClick={() => setActiveTab("assignments")}
              className={`px-6 py-4 border-b-2 transition-all cursor-pointer ${
                activeTab === "assignments" ? "border-primary text-on-surface font-bold" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              My Auditor Assignments ({assignments.filter((a) => a.status === "ASSIGNED").length})
            </button>
          </div>

          {/* Tab 1: Cycles Management */}
          {activeTab === "cycles" && (role === "ADMIN" || role === "ASSET_MANAGER") && (
            <div className="grid grid-cols-12 gap-gutter items-start">
              {/* Cycles List (5 columns) */}
              <div className="col-span-12 lg:col-span-5 bg-white border border-border-hairline p-6 space-y-4">
                <div className="font-label-mono text-xs uppercase tracking-wider text-secondary font-bold pb-2 border-b border-border-hairline">
                  Audit Cycle Logs
                </div>
                <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                  {cycles.length === 0 ? (
                    <p className="text-secondary text-xs italic">No cycles configured.</p>
                  ) : (
                    cycles.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCycle(c)}
                        className={`p-4 border cursor-pointer transition-colors ${
                          selectedCycle?.id === c.id ? "border-primary bg-surface-container-low" : "border-border-hairline hover:bg-surface-container-lowest"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-sm text-on-surface leading-tight">{c.title}</span>
                          <span className={`px-2 py-0.5 text-[9px] font-label-mono uppercase font-bold ${
                            c.status === "IN_PROGRESS" ? "bg-status-available/20 text-on-primary-container" :
                            c.status === "CLOSED" ? "bg-status-allocated/20 text-on-secondary-container" : "bg-surface-container-high text-secondary"
                          }`}>
                            {c.status}
                          </span>
                        </div>
                        <p className="text-secondary text-[11px] mb-3">{c.description || "No description provided."}</p>
                        <div className="flex justify-between items-center text-[10px] text-secondary font-label-mono">
                          <span>Dates: {new Date(c.startDate).toLocaleDateString()} - {new Date(c.endDate).toLocaleDateString()}</span>
                          <span className="uppercase text-primary font-bold">Scope: {c.scopeType}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Cycle Verification Workpanel (7 columns) */}
              <div className="col-span-12 lg:col-span-7 bg-white border border-border-hairline p-6">
                {selectedCycle ? (
                  <div className="space-y-6">
                    {/* Header Details */}
                    <div className="flex justify-between items-start pb-4 border-b border-border-hairline">
                      <div>
                        <h3 className="font-bold text-base mb-1">{selectedCycle.title}</h3>
                        <span className="font-label-mono text-[10px] uppercase text-secondary">ID: {selectedCycle.id}</span>
                      </div>
                      <div className="flex gap-2">
                        {selectedCycle.status === "DRAFT" && (
                          <button onClick={() => handleCycleAction(selectedCycle.id, "start")} className="bg-primary text-white px-4 py-2 font-label-mono text-[10px] uppercase tracking-wider font-bold cursor-pointer">Start Cycle</button>
                        )}
                        {selectedCycle.status === "IN_PROGRESS" && (
                          <>
                            <button onClick={() => handleCycleAction(selectedCycle.id, "close")} className="bg-primary text-white px-4 py-2 font-label-mono text-[10px] uppercase tracking-wider font-bold cursor-pointer">Close &amp; Commit</button>
                            <button onClick={() => handleCycleAction(selectedCycle.id, "cancel")} className="border border-error text-error px-4 py-2 font-label-mono text-[10px] uppercase tracking-wider cursor-pointer">Cancel</button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Discrepancies Grid */}
                    <div>
                      <div className="font-label-mono text-xs uppercase tracking-wider text-secondary font-bold mb-4">
                        Flagged Discrepancies ({cycleDiscrepancies.length})
                      </div>
                      {cycleDiscrepancies.length === 0 ? (
                        <p className="text-secondary text-xs italic">No discrepancies identified in findings.</p>
                      ) : (
                        <div className="space-y-3">
                          {cycleDiscrepancies.map((disc) => (
                            <div key={disc.id} className="p-4 border border-border-hairline text-xs font-body-md">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-on-surface leading-tight">{disc.asset.name} ({disc.asset.assetTag})</span>
                                <span className={`px-2 py-0.5 text-[8px] font-label-mono font-bold ${
                                  disc.status === "RESOLVED" ? "bg-status-available/20 text-on-primary-container" :
                                  disc.status === "DISMISSED" ? "bg-surface-container-high text-secondary" :
                                  "bg-error-container text-on-error-container"
                                }`}>{disc.status}</span>
                              </div>
                              <p className="text-secondary text-[11px] mb-2">{disc.details}</p>
                              {disc.status === "OPEN" && (
                                <div className="text-right space-x-2">
                                  <button onClick={() => { setActiveDiscrepancy(disc); setIsResolveModalOpen(true); }} className="bg-primary text-white px-3 py-1 font-label-mono text-[9px] uppercase tracking-wider hover:bg-opacity-95 cursor-pointer">Resolve Mismatch</button>
                                  {(role === "ADMIN" || role === "ASSET_MANAGER") && (
                                    <button onClick={() => handleDismissDiscrepancy(disc.id)} className="border border-secondary text-secondary px-3 py-1 font-label-mono text-[9px] uppercase tracking-wider hover:bg-secondary/5 cursor-pointer">Dismiss</button>
                                  )}
                                </div>
                              )}
                              {disc.status === "RESOLVED" && (
                                <div className="mt-2 pt-2 border-t border-border-hairline text-[10px] text-secondary font-label-mono">
                                  Resolved By: {disc.resolvedBy?.firstName} · Note: {disc.resolutionNote}
                                </div>
                              )}
                              {disc.status === "DISMISSED" && (
                                <div className="mt-2 pt-2 border-t border-border-hairline text-[10px] text-secondary font-label-mono">
                                  Dismissed By: {disc.resolvedBy?.firstName || "Admin"} · Note: {disc.resolutionNote}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Results History */}
                    <div>
                      <div className="font-label-mono text-xs uppercase tracking-wider text-secondary font-bold mb-4 pb-2 border-b border-border-hairline">
                        Logged Audit Submissions
                      </div>
                      {cycleResults.length === 0 ? (
                        <p className="text-secondary text-xs italic">No submissions logged by auditors.</p>
                      ) : (
                        <div className="divide-y divide-border-hairline">
                          {cycleResults.map((r) => (
                            <div key={r.id} className="py-3 text-xs flex justify-between items-center">
                              <div>
                                <span className="font-bold block">{r.asset.name}</span>
                                <span className="text-[10px] font-label-mono text-secondary">
                                  Tag: {r.asset.assetTag} · Finding: <strong className={r.finding === "VERIFIED" ? "text-primary" : "text-error"}>{r.finding}</strong>
                                </span>
                              </div>
                              <div className="text-right font-label-mono text-[10px] text-secondary">
                                <span>Auditor: {r.auditor.firstName}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-secondary text-xs italic">Select an audit cycle log to view audit findings and discrepancies.</div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Auditor Assignments */}
          {activeTab === "assignments" && (
            <div className="space-y-6">
              {assignments.length === 0 ? (
                <div className="bg-white border border-border-hairline p-8 text-center text-secondary text-xs italic">
                  No active auditor assignments.
                </div>
              ) : (
                assignments.map((assign) => (
                  <div key={assign.id} className="bg-white border border-border-hairline p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                      <span className="font-label-mono text-[10px] text-secondary uppercase tracking-widest block mb-1">Assigned Cycle</span>
                      <h4 className="font-bold text-sm mb-2">{assign.cycle.title}</h4>
                      <p className="text-secondary text-xs mb-3">{assign.cycle.description || "Review assigned scope details."}</p>
                      <div className="flex gap-4 text-[10px] font-label-mono text-secondary uppercase">
                        <span>Status: <strong>{assign.status}</strong></span>
                        <span>End Date: {new Date(assign.cycle.endDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {assign.cycle.status === "IN_PROGRESS" && assign.status === "ASSIGNED" && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => { setSelectedCycle(assign.cycle); setIsLogFindingModalOpen(true); }}
                          className="bg-primary text-on-primary px-5 py-2.5 font-label-mono text-[10px] uppercase tracking-wider font-bold hover:bg-opacity-95 transition-all cursor-pointer"
                        >
                          Record Asset Finding
                        </button>
                        <button
                          onClick={() => handleSubmitAssignment(assign.cycle.id)}
                          className="border border-primary text-primary px-5 py-2.5 font-label-mono text-[10px] uppercase tracking-wider font-semibold hover:bg-sage-hover transition-all cursor-pointer"
                        >
                          Submit Assignment
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal: Create Cycle */}
        {isAddCycleModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-border-hairline max-w-md w-full p-8 relative animate-countUp">
              <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6">Create Audit Cycle</h2>
              <form onSubmit={handleCreateCycle} className="space-y-4 text-xs">
                {formError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{formError}</div>}
                
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Cycle Title</label>
                  <input required className="border border-border-hairline p-2 focus:outline-none" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Q3 Hardware Audit" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Scope Type</label>
                  <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent font-label-mono" value={newScope} onChange={(e) => setNewScope(e.target.value as any)}>
                    <option value="DEPARTMENT">Department Specific</option>
                    <option value="LOCATION">Site Location</option>
                    <option value="CUSTOM">Global Registry</option>
                  </select>
                </div>

                {newScope === "DEPARTMENT" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Target Department</label>
                    <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={newDeptId} onChange={(e) => setNewDeptId(e.target.value)}>
                      <option value="">Select Department</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                    </select>
                  </div>
                )}

                {newScope === "LOCATION" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Location Filter</label>
                    <input required className="border border-border-hairline p-2 focus:outline-none" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="e.g. London Office" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Start Date</label>
                    <input required type="date" className="border border-border-hairline p-2 focus:outline-none" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">End Date</label>
                    <input required type="date" className="border border-border-hairline p-2 focus:outline-none" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Description / Notes</label>
                  <textarea rows={3} className="border border-border-hairline p-2 focus:outline-none" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Audit description..." />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsAddCycleModalOpen(false)} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer">Cancel</button>
                  <button type="submit" disabled={submitting} className="bg-primary text-white px-6 py-2.5 font-label-mono uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">{submitting ? "Creating..." : "Launch Cycle"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Log Finding */}
        {isLogFindingModalOpen && selectedCycle && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-border-hairline max-w-md w-full p-8 relative animate-countUp">
              <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6">Log Compliance Finding</h2>
              <form onSubmit={(e) => handleLogFinding(e, selectedCycle.id)} className="space-y-4 text-xs">
                {formError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{formError}</div>}
                
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Select Audited Asset</label>
                  <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={findingAssetId} onChange={(e) => setFindingAssetId(e.target.value)}>
                    <option value="">Choose Asset</option>
                    {assets.map((a) => <option key={a.id} value={a.id}>{a.assetTag} - {a.name}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Audit Finding</label>
                  <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent font-label-mono" value={findingType} onChange={(e) => setFindingType(e.target.value as any)}>
                    <option value="VERIFIED">Verified / In Stock</option>
                    <option value="MISSING">Missing / Lost</option>
                    <option value="DAMAGED">Faulty / Damaged</option>
                  </select>
                </div>

                {findingType === "VERIFIED" && (
                  <div className="grid grid-cols-2 gap-4 animate-countUp">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-mono uppercase text-secondary font-semibold">Observed Condition</label>
                      <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={findingCondition} onChange={(e) => setFindingCondition(e.target.value)}>
                        <option value="NEW">New</option>
                        <option value="EXCELLENT">Excellent</option>
                        <option value="GOOD">Good</option>
                        <option value="FAIR">Fair</option>
                        <option value="POOR">Poor</option>
                        <option value="DAMAGED">Damaged</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-mono uppercase text-secondary font-semibold">Observed Status</label>
                      <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={findingStatus} onChange={(e) => setFindingStatus(e.target.value)}>
                        <option value="AVAILABLE">Available</option>
                        <option value="ALLOCATED">Allocated</option>
                        <option value="UNDER_MAINTENANCE">Maintenance</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Observed Location</label>
                  <input className="border border-border-hairline p-2 focus:outline-none" value={findingLocation} onChange={(e) => setFindingLocation(e.target.value)} placeholder="e.g. Room 402 or Main lab" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Finding Notes / Observations</label>
                  <textarea rows={3} className="border border-border-hairline p-2 focus:outline-none" value={findingNotes} onChange={(e) => setFindingNotes(e.target.value)} placeholder="Discrepancy remarks..." />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsLogFindingModalOpen(false)} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer">Cancel</button>
                  <button type="submit" disabled={submitting} className="bg-primary text-white px-6 py-2.5 font-label-mono uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">{submitting ? "Submitting..." : "Submit Finding"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Resolve Discrepancy */}
        {isResolveModalOpen && activeDiscrepancy && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-border-hairline max-w-md w-full p-8 relative animate-countUp">
              <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6">Resolve Audit Discrepancy</h2>
              <form onSubmit={handleResolveDiscrepancy} className="space-y-4 text-xs">
                {formError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{formError}</div>}
                
                <div className="bg-surface-container-low p-3 font-label-mono uppercase tracking-wide text-secondary mb-4">
                  <span>Target Asset:</span>
                  <span className="font-bold text-on-surface block mt-1">{activeDiscrepancy.asset.name} ({activeDiscrepancy.asset.assetTag})</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Resolution Actions Note</label>
                  <textarea required rows={4} className="border border-border-hairline p-2 focus:outline-none" value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} placeholder="Explain the resolution actions taken (e.g., location corrected in record, asset written off, or retrieved from employee)..." />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsResolveModalOpen(false)} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer">Cancel</button>
                  <button type="submit" disabled={submitting} className="bg-primary text-white px-6 py-2.5 font-label-mono uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">{submitting ? "Resolving..." : "Confirm Resolve"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
