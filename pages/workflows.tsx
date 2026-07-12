import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useAuth } from "@/lib/context/AuthContext";

interface Asset {
  id: string;
  assetTag: string;
  name: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  departmentId?: string | null;
}

interface MaintenanceRequest {
  id: string;
  assetId: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "PENDING" | "APPROVED" | "REJECTED" | "TECHNICIAN_ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED";
  issueTitle: string;
  issueDescription: string;
  requestedAt: string;
  asset: Asset;
  requestedBy: Employee;
  assignedTechnician?: Employee | null;
}

interface TransferRequest {
  id: string;
  assetId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "COMPLETED";
  reason: string;
  requestedAt: string;
  asset: Asset;
  requestedBy: Employee;
  fromEmployee?: Employee | null;
  toEmployee?: Employee | null;
}

export default function Workflows() {
  const { user, role, loading: authLoading } = useAuth();
  
  // Lists
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // States
  const [activeTab, setActiveTab] = useState<"maintenance" | "transfers">("maintenance");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modals Open
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);

  // Active object context
  const [activeTicket, setActiveTicket] = useState<MaintenanceRequest | null>(null);

  // Form states
  // Add Maintenance Request
  const [addAssetId, setAddAssetId] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addPriority, setAddPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");

  // Assign Technician
  const [assignTechId, setAssignTechId] = useState("");

  // Resolve Ticket
  const [resolveNote, setResolveNote] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch maintenance requests
      const reqRes = await fetch("/api/maintenance");
      if (reqRes.status === 200) {
        const data = await reqRes.json();
        if (data.success) {
          setRequests(data.requests);
        }
      }

      // Fetch custody transfer requests
      const transRes = await fetch("/api/transfers");
      if (transRes.status === 200) {
        const data = await transRes.json();
        if (data.success) {
          setTransfers(data.transfers);
        }
      }

      // Fetch user's assets to report issues
      const assetRes = await fetch("/api/assets?limit=100");
      if (assetRes.status === 200) {
        const data = await assetRes.json();
        if (data.success) {
          setAssets(data.assets);
        }
      }

      // Fetch personnel to assign work (Managers only)
      if (role === "ADMIN" || role === "ASSET_MANAGER") {
        const empRes = await fetch("/api/employees?limit=100");
        if (empRes.status === 200) {
          const data = await empRes.json();
          if (data.success) {
            setEmployees(data.employees);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load workflows requests", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, role]);

  // 1. Submit Maintenance Request
  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: addAssetId,
          issueTitle: addTitle,
          issueDescription: addDesc,
          priority: addPriority,
        }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (res.status === 201 && data.success) {
        setIsAddModalOpen(false);
        setAddAssetId("");
        setAddTitle("");
        setAddDesc("");
        setAddPriority("MEDIUM");
        fetchData();
      } else {
        setFormError(data.error || "Failed to submit request");
      }
    } catch (e) {
      setSubmitting(false);
      setFormError("A network error occurred.");
    }
  };

  // 2. Approve Request
  const handleApproveRequest = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/maintenance/${ticketId}/approve`, { method: "POST" });
      if (res.status === 200) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Approval failed");
      }
    } catch (e) {
      alert("A network error occurred.");
    }
  };

  // 3. Assign Technician
  const handleAssignTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket) return;
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/maintenance/${activeTicket.id}/assign-technician`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicianId: assignTechId }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (res.status === 200 && data.success) {
        setIsAssignModalOpen(false);
        setAssignTechId("");
        setActiveTicket(null);
        fetchData();
      } else {
        setFormError(data.error || "Assignment failed");
      }
    } catch (e) {
      setSubmitting(false);
      setFormError("A network error occurred.");
    }
  };

  // 4. Start Maintenance
  const handleStartWork = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/maintenance/${ticketId}/start`, { method: "POST" });
      if (res.status === 200) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Starting failed");
      }
    } catch (e) {
      alert("A network error occurred.");
    }
  };

  // 5. Resolve Maintenance
  const handleResolveWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket) return;
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/maintenance/${activeTicket.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolutionNote: resolveNote }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (res.status === 200 && data.success) {
        setIsResolveModalOpen(false);
        setResolveNote("");
        setActiveTicket(null);
        fetchData();
      } else {
        setFormError(data.error || "Resolution failed");
      }
    } catch (e) {
      setSubmitting(false);
      setFormError("A network error occurred.");
    }
  };

  // 6. Cancel Maintenance
  const handleCancelRequest = async (ticketId: string) => {
    if (!confirm("Are you sure you want to cancel this ticket?")) return;
    try {
      const res = await fetch(`/api/maintenance/${ticketId}/cancel`, { method: "POST" });
      if (res.status === 200) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Cancellation failed");
      }
    } catch (e) {
      alert("A network error occurred.");
    }
  };

  // 7. Approve Transfer
  const handleApproveTransfer = async (transferId: string) => {
    try {
      const res = await fetch(`/api/transfers/${transferId}/approve`, { method: "POST" });
      if (res.status === 200) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Transfer approval failed");
      }
    } catch (e) {
      alert("A network error occurred.");
    }
  };

  // 8. Complete Transfer
  const handleCompleteTransfer = async (transferId: string) => {
    try {
      const res = await fetch(`/api/transfers/${transferId}/complete`, { method: "POST" });
      if (res.status === 200) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Transfer completion failed");
      }
    } catch (e) {
      alert("A network error occurred.");
    }
  };

  // 9. Reject Transfer
  const handleRejectTransfer = async (transferId: string) => {
    const reason = prompt("Enter reason for rejection:");
    if (reason === null) return;
    try {
      const res = await fetch(`/api/transfers/${transferId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.status === 200) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Rejection failed");
      }
    } catch (e) {
      alert("A network error occurred.");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-label-mono text-xs uppercase tracking-widest text-secondary">
        Syncing queues...
      </div>
    );
  }

  // Kanban column grouping
  const backlogCards = requests.filter((r) => r.status === "PENDING");
  const approvedCards = requests.filter((r) => r.status === "APPROVED" || r.status === "TECHNICIAN_ASSIGNED");
  const inProgressCards = requests.filter((r) => r.status === "IN_PROGRESS");
  const resolvedCards = requests.filter((r) => r.status === "RESOLVED");

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Sidebar Navigation */}
      <Sidebar activePage="workflows" />

      {/* Main Content Area */}
      <main className="ml-64 min-h-screen px-container-padding py-12 flex flex-col justify-between">
        <div>
          {/* Header Bar */}
          <Header section="Workflows Queue" />

          {/* Section Header & Subtitle */}
          <div className="mb-12 flex justify-between items-end">
            <div>
              <div className="font-label-mono text-label-mono text-secondary uppercase tracking-[0.2em] mb-2 flex items-center text-xs font-semibold">
                <span className="text-primary font-bold">§ 04</span>
                <span className="mx-2 opacity-30">·</span>
                WORKFLOWS PIPELINE
              </div>
              <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                Operational <span className="font-display-lg-italic italic font-light text-primary font-normal">clearing</span>.
              </h1>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-primary text-on-primary px-6 py-3 font-label-mono text-xs uppercase tracking-widest hover:bg-opacity-90 transition-all flex items-center gap-2 rounded-none cursor-pointer font-bold"
              >
                <span className="material-symbols-outlined text-sm">build</span>
                Report Issue
              </button>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-border-hairline mb-8 text-xs font-label-mono uppercase tracking-widest text-secondary font-semibold">
            <button
              onClick={() => setActiveTab("maintenance")}
              className={`px-6 py-4 border-b-2 transition-all cursor-pointer ${
                activeTab === "maintenance" ? "border-primary text-on-surface font-bold" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              Maintenance Board
            </button>
            {(role === "ADMIN" || role === "ASSET_MANAGER" || role === "DEPARTMENT_HEAD") && (
              <button
                onClick={() => setActiveTab("transfers")}
                className={`px-6 py-4 border-b-2 transition-all cursor-pointer ${
                  activeTab === "transfers" ? "border-primary text-on-surface font-bold" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                Custody Transfers ({transfers.filter((t) => t.status === "PENDING").length})
              </button>
            )}
          </div>

          {/* Tab 1: Maintenance Kanban Board */}
          {activeTab === "maintenance" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter items-start">
              {/* Backlog Column */}
              <div className="space-y-6">
                <div className="border-b border-border-hairline pb-4 flex justify-between items-center font-label-mono text-xs uppercase tracking-wider text-secondary font-bold">
                  <span>Pending Intake</span>
                  <span className="bg-surface-container-high text-on-surface px-1.5 py-0.5 font-semibold">{backlogCards.length}</span>
                </div>
                <div className="space-y-4">
                  {backlogCards.map((card) => (
                    <div key={card.id} className="bg-white border border-border-hairline p-card-padding hover:border-primary transition-all">
                      <div className="flex justify-between items-start mb-4 text-[10px] font-label-mono">
                        <span className="text-secondary">{card.asset.assetTag}</span>
                        <span className={`px-2 py-0.5 font-bold ${card.priority === "CRITICAL" || card.priority === "HIGH" ? "bg-error-container text-on-error-container" : "bg-surface-container-high text-secondary"}`}>{card.priority}</span>
                      </div>
                      <h4 className="font-bold text-sm mb-2">{card.issueTitle}</h4>
                      <p className="text-secondary text-xs mb-4">{card.issueDescription}</p>
                      <div className="pt-3 border-t border-border-hairline flex justify-between items-center text-[10px] font-label-mono text-secondary">
                        <span>By: {card.requestedBy.firstName}</span>
                        <div className="flex gap-2">
                          {(role === "ADMIN" || role === "ASSET_MANAGER") && (
                            <button onClick={() => handleApproveRequest(card.id)} className="text-primary hover:underline cursor-pointer">Approve</button>
                          )}
                          {card.requestedBy.id === user?.employee?.id && (
                            <button onClick={() => handleCancelRequest(card.id)} className="text-error hover:underline cursor-pointer">Cancel</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Approved/Assigned Column */}
              <div className="space-y-6">
                <div className="border-b border-border-hairline pb-4 flex justify-between items-center font-label-mono text-xs uppercase tracking-wider text-secondary font-bold">
                  <span>Approved Queue</span>
                  <span className="bg-surface-container-high text-on-surface px-1.5 py-0.5 font-semibold">{approvedCards.length}</span>
                </div>
                <div className="space-y-4">
                  {approvedCards.map((card) => (
                    <div key={card.id} className="bg-white border border-border-hairline p-card-padding hover:border-primary transition-all">
                      <div className="flex justify-between items-start mb-4 text-[10px] font-label-mono">
                        <span className="text-secondary">{card.asset.assetTag}</span>
                        <span className={`px-2 py-0.5 font-bold ${card.priority === "CRITICAL" || card.priority === "HIGH" ? "bg-error-container text-on-error-container" : "bg-surface-container-high text-secondary"}`}>{card.priority}</span>
                      </div>
                      <h4 className="font-bold text-sm mb-2">{card.issueTitle}</h4>
                      <p className="text-secondary text-xs mb-4">Tech: {card.assignedTechnician ? `${card.assignedTechnician.firstName} ${card.assignedTechnician.lastName}` : "Unassigned"}</p>
                      <div className="pt-3 border-t border-border-hairline flex justify-between items-center text-[10px] font-label-mono text-secondary">
                        <span>Status: {card.status.replace("_", " ")}</span>
                        <div className="flex gap-2">
                          {(role === "ADMIN" || role === "ASSET_MANAGER") && !card.assignedTechnician && (
                            <button onClick={() => { setActiveTicket(card); setIsAssignModalOpen(true); }} className="text-primary hover:underline cursor-pointer">Assign</button>
                          )}
                          {(card.assignedTechnician?.id === user?.employee?.id || role === "ADMIN") && (
                            <button onClick={() => handleStartWork(card.id)} className="text-primary hover:underline cursor-pointer font-bold">Start</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* In Progress Column */}
              <div className="space-y-6">
                <div className="border-b border-border-hairline pb-4 flex justify-between items-center font-label-mono text-xs uppercase tracking-wider text-secondary font-bold">
                  <span>In Progress</span>
                  <span className="bg-surface-container-high text-on-surface px-1.5 py-0.5 font-semibold">{inProgressCards.length}</span>
                </div>
                <div className="space-y-4">
                  {inProgressCards.map((card) => (
                    <div key={card.id} className="bg-white border border-border-hairline p-card-padding hover:border-primary transition-all">
                      <div className="flex justify-between items-start mb-4 text-[10px] font-label-mono">
                        <span className="text-secondary">{card.asset.assetTag}</span>
                        <span className={`px-2 py-0.5 font-bold ${card.priority === "CRITICAL" || card.priority === "HIGH" ? "bg-error-container text-on-error-container" : "bg-surface-container-high text-secondary"}`}>{card.priority}</span>
                      </div>
                      <h4 className="font-bold text-sm mb-2">{card.issueTitle}</h4>
                      <p className="text-secondary text-xs mb-4">Tech: {card.assignedTechnician?.firstName}</p>
                      <div className="pt-3 border-t border-border-hairline flex justify-between items-center text-[10px] font-label-mono text-secondary">
                        <span>Work Active</span>
                        {(card.assignedTechnician?.id === user?.employee?.id || role === "ADMIN" || role === "ASSET_MANAGER") && (
                          <button onClick={() => { setActiveTicket(card); setIsResolveModalOpen(true); }} className="text-primary hover:underline cursor-pointer font-bold">Complete</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resolved Column */}
              <div className="space-y-6">
                <div className="border-b border-border-hairline pb-4 flex justify-between items-center font-label-mono text-xs uppercase tracking-wider text-secondary font-bold">
                  <span>Resolved</span>
                  <span className="bg-surface-container-high text-on-surface px-1.5 py-0.5 font-semibold">{resolvedCards.length}</span>
                </div>
                <div className="space-y-4">
                  {resolvedCards.map((card) => (
                    <div key={card.id} className="bg-white border border-border-hairline p-card-padding opacity-75">
                      <div className="flex justify-between items-start mb-4 text-[10px] font-label-mono text-secondary">
                        <span>{card.asset.assetTag}</span>
                        <span>RESOLVED</span>
                      </div>
                      <h4 className="font-bold text-sm mb-2">{card.issueTitle}</h4>
                      <p className="text-secondary text-xs">{card.issueDescription}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Custody Transfers */}
          {activeTab === "transfers" && (
            <div className="bg-white border border-border-hairline overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-max text-xs font-body-md">
                <thead>
                  <tr className="border-b border-border-hairline bg-surface-container-low text-secondary font-label-mono uppercase font-bold">
                    <th className="px-gutter py-4">Asset Tag</th>
                    <th className="px-gutter py-4">Description</th>
                    <th className="px-gutter py-4">From (Holder)</th>
                    <th className="px-gutter py-4">To (Requestor)</th>
                    <th className="px-gutter py-4">Transfer Reason</th>
                    <th className="px-gutter py-4">Status</th>
                    <th className="px-gutter py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-hairline">
                  {transfers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-gutter py-12 text-center text-secondary">
                        No custody transfers reported.
                      </td>
                    </tr>
                  ) : (
                    transfers.map((item) => {
                      const isSender = item.fromEmployee?.id === user?.employee?.id;
                      const isApprover = role === "ADMIN" || role === "ASSET_MANAGER" || (role === "DEPARTMENT_HEAD" && user?.employee?.departmentId === item.fromEmployee?.departmentId);

                      return (
                        <tr key={item.id} className="hover:bg-surface-container-lowest transition-colors">
                          <td className="px-gutter py-4 font-label-mono font-bold uppercase">{item.asset.assetTag}</td>
                          <td className="px-gutter py-4 font-bold">{item.asset.name}</td>
                          <td className="px-gutter py-4 font-label-mono">
                            {item.fromEmployee ? `${item.fromEmployee.firstName} ${item.fromEmployee.lastName}` : "Inventory"}
                          </td>
                          <td className="px-gutter py-4 font-label-mono">
                            {item.toEmployee ? `${item.toEmployee.firstName} ${item.toEmployee.lastName}` : "Department"}
                          </td>
                          <td className="px-gutter py-4 text-secondary">{item.reason}</td>
                          <td className="px-gutter py-4">
                            <span className={`px-2 py-0.5 font-label-mono uppercase text-[10px] font-bold ${
                              item.status === "PENDING" ? "bg-status-maintenance/20 text-on-tertiary-container" :
                              item.status === "APPROVED" ? "bg-status-available/20 text-on-primary-container" :
                              item.status === "COMPLETED" ? "bg-status-allocated/20 text-on-secondary-container" : "bg-surface-container-high text-secondary"
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-gutter py-4 text-right">
                            <div className="inline-flex gap-2">
                              {item.status === "PENDING" && isApprover && (
                                <>
                                  <button onClick={() => handleApproveTransfer(item.id)} className="bg-primary text-white px-3 py-1 font-label-mono text-[9px] uppercase tracking-wider hover:bg-opacity-90 cursor-pointer">Approve</button>
                                  <button onClick={() => handleRejectTransfer(item.id)} className="border border-error text-error px-3 py-1 font-label-mono text-[9px] uppercase tracking-wider hover:bg-error-container hover:text-on-error-container cursor-pointer">Reject</button>
                                </>
                              )}
                              {item.status === "APPROVED" && (role === "ADMIN" || role === "ASSET_MANAGER") && (
                                <button onClick={() => handleCompleteTransfer(item.id)} className="bg-primary text-white px-3 py-1 font-label-mono text-[9px] uppercase tracking-wider hover:bg-opacity-90 cursor-pointer font-bold">Complete Handover</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Report Issue */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-border-hairline max-w-md w-full p-8 relative animate-countUp">
              <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6">Report Equipment Fault</h2>
              <form onSubmit={handleAddRequest} className="space-y-4 text-xs">
                {formError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{formError}</div>}
                
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Select Faulty Asset</label>
                  <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={addAssetId} onChange={(e) => setAddAssetId(e.target.value)}>
                    <option value="">Choose Asset</option>
                    {assets.map((a) => <option key={a.id} value={a.id}>{a.assetTag} - {a.name}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Issue Title</label>
                  <input required className="border border-border-hairline p-2 focus:outline-none" value={addTitle} onChange={(e) => setAddTitle(e.target.value)} placeholder="e.g. Screen Flickering or Fan Overheating" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Severity / Priority</label>
                  <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent font-label-mono" value={addPriority} onChange={(e) => setAddPriority(e.target.value as any)}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Fault Description Details</label>
                  <textarea required rows={4} className="border border-border-hairline p-2 focus:outline-none" value={addDesc} onChange={(e) => setAddDesc(e.target.value)} placeholder="Provide context about what triggers the breakage..." />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer">Cancel</button>
                  <button type="submit" disabled={submitting} className="bg-primary text-white px-6 py-2.5 font-label-mono uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">{submitting ? "Reporting..." : "Submit Fault Ticket"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Assign Technician */}
        {isAssignModalOpen && activeTicket && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-border-hairline max-w-sm w-full p-8 relative animate-countUp">
              <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6">Assign Maintenance Staff</h2>
              <form onSubmit={handleAssignTechnician} className="space-y-4 text-xs">
                {formError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{formError}</div>}

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Assign Technician</label>
                  <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={assignTechId} onChange={(e) => setAssignTechId(e.target.value)}>
                    <option value="">Select Technician</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>)}
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsAssignModalOpen(false)} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer">Cancel</button>
                  <button type="submit" disabled={submitting} className="bg-primary text-white px-6 py-2.5 font-label-mono uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">{submitting ? "Assigning..." : "Assign Staff"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Resolve Maintenance */}
        {isResolveModalOpen && activeTicket && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-border-hairline max-w-md w-full p-8 relative animate-countUp">
              <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6">Log Technical Resolution</h2>
              <form onSubmit={handleResolveWork} className="space-y-4 text-xs">
                {formError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{formError}</div>}

                <div className="bg-surface-container-low p-3 font-label-mono uppercase tracking-wide text-secondary mb-4">
                  <span>Resolving Fault:</span>
                  <span className="font-bold text-on-surface block mt-1">{activeTicket.issueTitle}</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Resolution Check notes</label>
                  <textarea required rows={4} className="border border-border-hairline p-2 focus:outline-none" value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} placeholder="Explain details of how issue was resolved..." />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsResolveModalOpen(false)} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer">Cancel</button>
                  <button type="submit" disabled={submitting} className="bg-primary text-white px-6 py-2.5 font-label-mono uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">{submitting ? "Resolving..." : "Mark Resolved"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
