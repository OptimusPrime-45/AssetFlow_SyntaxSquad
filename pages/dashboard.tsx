"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useAuth } from "@/lib/context/AuthContext";

function AnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 800;
    const stepTime = 16;
    const steps = duration / stepTime;
    const stepValue = target / steps;

    if (target === 0) {
      setCount(0);
      return;
    }

    const timer = setInterval(() => {
      start += stepValue;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [target]);

  return <>{count.toLocaleString()}</>;
}

interface KPIProps {
  totalAssets: number;
  allocatedAssets: number;
  availableAssets: number;
  underMaintenance: number;
  overdueReturns: number;
  upcomingReturns: number;
  activeBookings: number;
  pendingTransfers: number;
}

interface Activity {
  id: string;
  action: string;
  details: string;
  occurredAt: string;
  actorEmployee?: {
    firstName: string;
    lastName: string;
    employeeCode: string;
  };
}

interface Allocation {
  id: string;
  expectedReturnDate: string | null;
  allocatedAt: string;
  status: string;
  asset: {
    id: string;
    assetTag: string;
    name: string;
    serialNumber: string | null;
    status: string;
    condition: string;
  };
}

interface Booking {
  id: string;
  title: string;
  purpose: "ROOM" | "VEHICLE" | "EQUIPMENT" | "SPACE" | "OTHER";
  audience: "INDIVIDUAL" | "DEPARTMENT";
  status: "PENDING" | "UPCOMING" | "ONGOING" | "APPROVED" | "REJECTED" | "CANCELLED" | "COMPLETED" | "ACTIVE" | "NOSHOW";
  startAt: string;
  endAt: string;
  notes: string | null;
  asset: {
    id: string;
    assetTag: string;
    name: string;
  };
}

interface MaintenanceRequest {
  id: string;
  assetId: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "PENDING" | "APPROVED" | "REJECTED" | "TECHNICIAN_ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED";
  issueTitle: string;
  issueDescription: string;
  requestedAt: string;
  asset: {
    id: string;
    name: string;
    assetTag: string;
  };
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  sentAt: string;
}

export default function Dashboard() {
  const { user, role, loading: authLoading } = useAuth();
  
  // States common or specific
  const [kpis, setKpis] = useState<KPIProps | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [custody, setCustody] = useState<Allocation[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [myMaintenance, setMyMaintenance] = useState<MaintenanceRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Scoped helper counts
  const [pendingReturnsCount, setPendingReturnsCount] = useState(0);
  const [upcomingBookingsCount, setUpcomingBookingsCount] = useState(0);

  // Dropdown lists for modals
  const [bookableAssets, setBookableAssets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Modals state
  const [activeModal, setActiveModal] = useState<"MAINTENANCE" | "BOOKING" | "RETURN" | "TRANSFER" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form states
  const [formAssetId, setFormAssetId] = useState("");
  const [formAllocId, setFormAllocId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPriority, setFormPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [formPurpose, setFormPurpose] = useState<"ROOM" | "VEHICLE" | "EQUIPMENT" | "SPACE" | "OTHER">("EQUIPMENT");
  const [formAudience, setFormAudience] = useState<"INDIVIDUAL" | "DEPARTMENT">("INDIVIDUAL");
  const [formStartDate, setFormStartDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndDate, setFormEndDate] = useState("");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [formNotes, setFormNotes] = useState("");
  const [formReturnCondition, setFormReturnCondition] = useState("GOOD");
  const [formReturnNotes, setFormReturnNotes] = useState("");
  const [formTransferType, setFormTransferType] = useState<"employee" | "department">("employee");
  const [formTransferTarget, setFormTransferTarget] = useState("");
  const [formTransferReason, setFormTransferReason] = useState("");

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch KPIs
      const kpiRes = await fetch("/api/dashboard/kpis");
      if (kpiRes.status === 200) {
        const kpiData = await kpiRes.json();
        if (kpiData.success) {
          setKpis(kpiData.kpis);
        }
      }

      // Fetch user's custody allocation list
      const allocRes = await fetch("/api/allocations/my");
      if (allocRes.status === 200) {
        const allocData = await allocRes.json();
        if (allocData.success) {
          setCustody(allocData.allocations);
        }
      }

      // Fetch user's bookings
      const bookingsRes = await fetch("/api/bookings/my?limit=50");
      if (bookingsRes.status === 200) {
        const bookingsData = await bookingsRes.json();
        if (bookingsData.success) {
          setMyBookings(bookingsData.bookings);
          // Calculate upcoming bookings
          const upcoming = bookingsData.bookings.filter((b: Booking) => b.status === "UPCOMING" || new Date(b.startAt) > new Date());
          setUpcomingBookingsCount(upcoming.length);
        }
      }

      // Fetch user's returns for counting pending requests
      const returnsRes = await fetch("/api/returns?status=PENDING_INSPECTION");
      if (returnsRes.status === 200) {
        const returnsData = await returnsRes.json();
        if (returnsData.success) {
          setPendingReturnsCount(returnsData.pagination.totalCount || returnsData.returns.length);
        }
      }

      // Fetch user's maintenance requests
      const maintRes = await fetch("/api/maintenance?limit=50");
      if (maintRes.status === 200) {
        const maintData = await maintRes.json();
        if (maintData.success) {
          setMyMaintenance(maintData.requests);
        }
      }

      // Fetch notifications
      const notifRes = await fetch("/api/notifications?limit=5");
      if (notifRes.status === 200) {
        const notifData = await notifRes.json();
        if (notifData.success) {
          setNotifications(notifData.notifications);
        }
      }

      // Fetch Recent Activities (Non-employee only)
      if (role !== "EMPLOYEE") {
        const actRes = await fetch("/api/dashboard/recent-activity?limit=10");
        if (actRes.status === 200) {
          const actData = await actRes.json();
          if (actData.success) {
            setActivities(actData.activities);
          }
        }
      }

      // Fetch dropdown assets/employees/departments
      const bookableRes = await fetch("/api/assets/bookable");
      if (bookableRes.status === 200) {
        const data = await bookableRes.json();
        if (data.success) {
          setBookableAssets(data.assets);
        }
      }

      const empRes = await fetch("/api/employees?limit=100");
      if (empRes.status === 200) {
        const data = await empRes.json();
        if (data.success) {
          setEmployees(data.employees);
        }
      }

      const deptRes = await fetch("/api/departments");
      if (deptRes.status === 200) {
        const data = await deptRes.json();
        if (data.success) {
          setDepartments(data.departments);
        }
      }

    } catch (e) {
      console.error("Failed to load dashboard data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, role]);

  const handleRaiseMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: formAssetId,
          issueTitle: formTitle,
          issueDescription: formDesc,
          priority: formPriority,
        }),
      });
      const data = await res.json();
      setSubmitting(false);
      if (res.status === 201 && data.success) {
        setActiveModal(null);
        resetForm();
        fetchDashboardData();
      } else {
        setModalError(data.error || "Failed to file maintenance request.");
      }
    } catch (err) {
      setSubmitting(false);
      setModalError("Network error occurred.");
    }
  };

  const handleBookResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    const startAt = new Date(`${formStartDate}T${formStartTime}:00`).toISOString();
    const endAt = new Date(`${formEndDate}T${formEndTime}:00`).toISOString();
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: formAssetId,
          title: formTitle,
          purpose: formPurpose,
          audience: formAudience,
          startAt,
          endAt,
          notes: formNotes || null,
        }),
      });
      const data = await res.json();
      setSubmitting(false);
      if (res.status === 201 && data.success) {
        setActiveModal(null);
        resetForm();
        fetchDashboardData();
      } else {
        setModalError(data.error || "Failed to reserve resource.");
      }
    } catch (err) {
      setSubmitting(false);
      setModalError("Network error occurred.");
    }
  };

  const handleRequestReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetAllocationId: formAllocId,
          conditionOnReturn: formReturnCondition,
          conditionNotes: formReturnNotes || null,
        }),
      });
      const data = await res.json();
      setSubmitting(false);
      if (res.status === 201 && data.success) {
        setActiveModal(null);
        resetForm();
        fetchDashboardData();
      } else {
        setModalError(data.error || "Failed to submit return request.");
      }
    } catch (err) {
      setSubmitting(false);
      setModalError("Network error occurred.");
    }
  };

  const handleRequestTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: formAssetId,
          toEmployeeId: formTransferType === "employee" ? formTransferTarget : null,
          toDepartmentId: formTransferType === "department" ? formTransferTarget : null,
          reason: formTransferReason,
        }),
      });
      const data = await res.json();
      setSubmitting(false);
      if (res.status === 201 && data.success) {
        setActiveModal(null);
        resetForm();
        fetchDashboardData();
      } else {
        setModalError(data.error || "Failed to request transfer.");
      }
    } catch (err) {
      setSubmitting(false);
      setModalError("Network error occurred.");
    }
  };

  const resetForm = () => {
    setFormAssetId("");
    setFormAllocId("");
    setFormTitle("");
    setFormDesc("");
    setFormPriority("MEDIUM");
    setFormPurpose("EQUIPMENT");
    setFormAudience("INDIVIDUAL");
    setFormStartDate("");
    setFormStartTime("09:00");
    setFormEndDate("");
    setFormEndTime("10:00");
    setFormNotes("");
    setFormReturnCondition("GOOD");
    setFormReturnNotes("");
    setFormTransferType("employee");
    setFormTransferTarget("");
    setFormTransferReason("");
    setModalError(null);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-label-mono text-xs uppercase tracking-widest text-secondary">
        Initializing Workspace...
      </div>
    );
  }

  // Format activity action helper
  const getActivityIcon = (action: string) => {
    switch (action) {
      case "CREATED": return "add_circle";
      case "ASSIGNED": return "sync_alt";
      case "RETURNED": return "keyboard_return";
      case "MAINTENANCE_REQUESTED": return "build";
      case "AUDIT_CREATED": return "verified_user";
      default: return "notifications";
    }
  };

  // IF AUTH ROLE IS EMPLOYEE, RENDER EMPLOYEE DASHBOARD
  if (role === "EMPLOYEE") {
    // Group user's maintenance tickets
    const maintPending = myMaintenance.filter((m) => m.status === "PENDING");
    const maintInProgress = myMaintenance.filter((m) => ["APPROVED", "TECHNICIAN_ASSIGNED", "IN_PROGRESS"].includes(m.status));
    const maintResolved = myMaintenance.filter((m) => ["RESOLVED", "CANCELLED", "REJECTED"].includes(m.status));

    return (
      <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-fixed selection:text-on-primary-fixed">
        <Sidebar activePage="dashboard" />

        <main className="ml-64 min-h-screen px-container-padding py-12 flex flex-col justify-between">
          <div>
            <Header section="Dashboard" />

            <header className="mb-section-margin">
              <div className="font-label-mono text-label-mono text-secondary uppercase tracking-[0.2em] mb-2 flex items-center text-xs font-semibold">
                <span className="text-primary font-bold">§ 01</span>
                <span className="mx-2 opacity-30">·</span>
                EMPLOYEE PORTAL
              </div>
              <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                My <span className="font-display-lg-italic italic font-light text-primary font-normal">workspace</span>.
              </h1>
            </header>

            {/* Quick Actions Panel */}
            <section className="mb-10">
              <div className="font-label-mono text-xs text-secondary uppercase tracking-widest mb-4 font-semibold">
                Quick Actions
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => { resetForm(); setActiveModal("MAINTENANCE"); }}
                  className="bg-white border border-border-hairline p-5 text-left hover:border-primary transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div>
                    <div className="font-bold text-xs uppercase font-label-mono tracking-wider">Raise Maintenance</div>
                    <p className="text-[10px] text-secondary mt-1">Report hardware issue</p>
                  </div>
                  <span className="material-symbols-outlined text-secondary group-hover:text-primary transition-colors">build</span>
                </button>

                <button
                  onClick={() => { resetForm(); setActiveModal("BOOKING"); }}
                  className="bg-white border border-border-hairline p-5 text-left hover:border-primary transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div>
                    <div className="font-bold text-xs uppercase font-label-mono tracking-wider">Book Resource</div>
                    <p className="text-[10px] text-secondary mt-1">Reserve spaces or vehicles</p>
                  </div>
                  <span className="material-symbols-outlined text-secondary group-hover:text-primary transition-colors">calendar_today</span>
                </button>

                <button
                  onClick={() => { resetForm(); setActiveModal("RETURN"); }}
                  className="bg-white border border-border-hairline p-5 text-left hover:border-primary transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div>
                    <div className="font-bold text-xs uppercase font-label-mono tracking-wider">Request Return</div>
                    <p className="text-[10px] text-secondary mt-1">Surrender active allocation</p>
                  </div>
                  <span className="material-symbols-outlined text-secondary group-hover:text-primary transition-colors">assignment_return</span>
                </button>

                <button
                  onClick={() => { resetForm(); setActiveModal("TRANSFER"); }}
                  className="bg-white border border-border-hairline p-5 text-left hover:border-primary transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div>
                    <div className="font-bold text-xs uppercase font-label-mono tracking-wider">Request Transfer</div>
                    <p className="text-[10px] text-secondary mt-1">Hand over custody</p>
                  </div>
                  <span className="material-symbols-outlined text-secondary group-hover:text-primary transition-colors">sync_alt</span>
                </button>
              </div>
            </section>

            {/* KPI Cards Strip */}
            {kpis && (
              <section className="mb-10">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-0 border-y border-border-hairline divide-y md:divide-y-0 md:divide-x divide-border-hairline bg-white">
                  <div className="p-6 group hover:bg-surface-container-low transition-colors duration-200">
                    <span className="font-label-mono text-[10px] text-secondary uppercase tracking-widest block mb-2 font-semibold">
                      My Assets
                    </span>
                    <div className="text-3xl text-on-surface font-bold tracking-tight">
                      <AnimatedCounter target={kpis.totalAssets} />
                    </div>
                    <div className="mt-2 text-[10px] text-secondary font-label-mono uppercase">In custody</div>
                  </div>

                  <div className="p-6 group hover:bg-surface-container-low transition-colors duration-200">
                    <span className="font-label-mono text-[10px] text-secondary uppercase tracking-widest block mb-2 font-semibold">
                      Active Bookings
                    </span>
                    <div className="text-3xl text-on-surface font-bold tracking-tight">
                      <AnimatedCounter target={kpis.activeBookings} />
                    </div>
                    <div className="mt-2 text-[10px] text-secondary font-label-mono uppercase">Reserved items</div>
                  </div>

                  <div className="p-6 group hover:bg-surface-container-low transition-colors duration-200">
                    <span className="font-label-mono text-[10px] text-secondary uppercase tracking-widest block mb-2 font-semibold">
                      Open Tickets
                    </span>
                    <div className="text-3xl text-on-surface font-bold tracking-tight">
                      <AnimatedCounter target={kpis.underMaintenance} />
                    </div>
                    <div className="mt-2 text-[10px] text-secondary font-label-mono uppercase">Maintenance</div>
                  </div>

                  <div className="p-6 group hover:bg-surface-container-low transition-colors duration-200">
                    <span className="font-label-mono text-[10px] text-secondary uppercase tracking-widest block mb-2 font-semibold">
                      Pending Returns
                    </span>
                    <div className="text-3xl text-on-surface font-bold tracking-tight">
                      <AnimatedCounter target={pendingReturnsCount} />
                    </div>
                    <div className="mt-2 text-[10px] text-secondary font-label-mono uppercase">Awaiting check</div>
                  </div>

                  <div className="p-6 group hover:bg-surface-container-low transition-colors duration-200">
                    <span className="font-label-mono text-[10px] text-secondary uppercase tracking-widest block mb-2 font-semibold">
                      Upcoming Bookings
                    </span>
                    <div className="text-3xl text-on-surface font-bold tracking-tight">
                      <AnimatedCounter target={upcomingBookingsCount} />
                    </div>
                    <div className="mt-2 text-[10px] text-secondary font-label-mono uppercase">Scheduled ahead</div>
                  </div>
                </div>
              </section>
            )}

            {/* My Assets Table */}
            <section className="mb-10 bg-white border border-border-hairline p-8">
              <div className="font-label-mono text-xs text-secondary uppercase tracking-widest mb-6 font-semibold flex justify-between items-center">
                <span>My Assets Register</span>
                <Link href="/assets" className="text-primary hover:underline lowercase tracking-normal">view all</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-hairline font-label-mono uppercase text-secondary">
                      <th className="py-4 font-semibold">Asset Tag</th>
                      <th className="py-4 font-semibold">Asset Name</th>
                      <th className="py-4 font-semibold">Status</th>
                      <th className="py-4 font-semibold">Return Date</th>
                      <th className="py-4 font-semibold">Condition</th>
                      <th className="py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-hairline">
                    {custody.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-secondary italic">No assets allocated to your registry.</td>
                      </tr>
                    ) : (
                      custody.map((alloc) => (
                        <tr key={alloc.id} className="hover:bg-surface-container-lowest transition-colors">
                          <td className="py-4 font-label-mono font-bold">{alloc.asset.assetTag}</td>
                          <td className="py-4 font-semibold text-on-surface">{alloc.asset.name}</td>
                          <td className="py-4">
                            <span className={`px-2 py-0.5 font-label-mono text-[9px] uppercase font-bold ${
                              alloc.asset.status === "AVAILABLE" ? "bg-status-available/20 text-on-primary-container" :
                              alloc.asset.status === "UNDER_MAINTENANCE" ? "bg-status-maintenance/20 text-on-tertiary-container" :
                              "bg-surface-container-high text-secondary"
                            }`}>
                              {alloc.asset.status}
                            </span>
                          </td>
                          <td className="py-4 font-label-mono">
                            {alloc.expectedReturnDate ? new Date(alloc.expectedReturnDate).toLocaleDateString() : "No Return Date"}
                          </td>
                          <td className="py-4 uppercase font-label-mono text-[10px]">{alloc.asset.condition}</td>
                          <td className="py-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                resetForm();
                                setFormAllocId(alloc.id);
                                setFormReturnCondition(alloc.asset.condition);
                                setActiveModal("RETURN");
                              }}
                              className="text-primary hover:underline font-label-mono text-[9px] uppercase font-bold cursor-pointer"
                            >
                              Return
                            </button>
                            <button
                              onClick={() => {
                                resetForm();
                                setFormAssetId(alloc.asset.id);
                                setActiveModal("TRANSFER");
                              }}
                              className="text-secondary hover:text-primary hover:underline font-label-mono text-[9px] uppercase font-bold cursor-pointer"
                            >
                              Transfer
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Bookings & Maintenance Grid */}
            <div className="grid grid-cols-12 gap-gutter mb-10">
              {/* Upcoming Bookings / Calendar (6 columns) */}
              <div className="col-span-12 lg:col-span-6 bg-white border border-border-hairline p-8">
                <div className="font-label-mono text-xs text-secondary uppercase tracking-widest mb-6 font-semibold flex justify-between items-center">
                  <span>Upcoming Bookings</span>
                  <Link href="/bookings" className="text-primary hover:underline lowercase tracking-normal">view calendar</Link>
                </div>
                <div className="space-y-4">
                  {myBookings.length === 0 ? (
                    <p className="text-secondary italic text-xs py-4">No scheduled bookings found.</p>
                  ) : (
                    myBookings.slice(0, 5).map((b) => (
                      <div key={b.id} className="p-4 border border-border-hairline text-xs space-y-2 hover:border-primary transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-on-surface text-sm">{b.title}</h4>
                            <p className="text-[10px] text-secondary font-label-mono uppercase mt-0.5">Asset: {b.asset.name} ({b.asset.assetTag})</p>
                          </div>
                          <span className={`px-2 py-0.5 font-label-mono text-[9px] uppercase font-bold ${
                            b.status === "APPROVED" || b.status === "ACTIVE" ? "bg-status-available/20 text-on-primary-container" :
                            b.status === "PENDING" ? "bg-status-maintenance/20 text-on-tertiary-container" : "bg-surface-container-high text-secondary"
                          }`}>
                            {b.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-secondary font-label-mono flex justify-between">
                          <span>Start: {new Date(b.startAt).toLocaleString()}</span>
                          <span>End: {new Date(b.endAt).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Maintenance Request Section (6 columns) */}
              <div className="col-span-12 lg:col-span-6 bg-white border border-border-hairline p-8">
                <div className="font-label-mono text-xs text-secondary uppercase tracking-widest mb-6 font-semibold flex justify-between items-center">
                  <span>Maintenance Section</span>
                  <Link href="/workflows" className="text-primary hover:underline lowercase tracking-normal">view details</Link>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* Pending */}
                  <div className="space-y-3">
                    <div className="font-label-mono text-[9px] uppercase text-secondary bg-surface-container-low p-2 font-bold tracking-wider text-center border-b border-border-hairline">
                      Pending ({maintPending.length})
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {maintPending.map((t) => (
                        <div key={t.id} className="p-3 border border-border-hairline text-[10px] space-y-1 bg-surface-container-lowest">
                          <div className="font-bold text-on-surface leading-tight truncate">{t.issueTitle}</div>
                          <div className="text-[9px] font-label-mono text-secondary">{t.asset.assetTag}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* In Progress */}
                  <div className="space-y-3">
                    <div className="font-label-mono text-[9px] uppercase text-secondary bg-surface-container-low p-2 font-bold tracking-wider text-center border-b border-border-hairline">
                      In Progress ({maintInProgress.length})
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {maintInProgress.map((t) => (
                        <div key={t.id} className="p-3 border border-border-hairline text-[10px] space-y-1 bg-primary/5">
                          <div className="font-bold text-on-surface leading-tight truncate">{t.issueTitle}</div>
                          <div className="text-[9px] font-label-mono text-secondary">{t.asset.assetTag}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resolved */}
                  <div className="space-y-3">
                    <div className="font-label-mono text-[9px] uppercase text-secondary bg-surface-container-low p-2 font-bold tracking-wider text-center border-b border-border-hairline">
                      Resolved ({maintResolved.length})
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {maintResolved.map((t) => (
                        <div key={t.id} className="p-3 border border-border-hairline text-[10px] space-y-1 bg-surface-container-low opacity-60">
                          <div className="font-bold text-on-surface leading-tight truncate line-through">{t.issueTitle}</div>
                          <div className="text-[9px] font-label-mono text-secondary">{t.asset.assetTag}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notifications panel list */}
            <section className="bg-white border border-border-hairline p-8">
              <div className="font-label-mono text-xs text-secondary uppercase tracking-widest mb-6 font-semibold flex justify-between items-center">
                <span>Recent Notifications</span>
                <Link href="/notifications" className="text-primary hover:underline lowercase tracking-normal">view all</Link>
              </div>
              <div className="divide-y divide-border-hairline">
                {notifications.length === 0 ? (
                  <p className="text-secondary italic text-xs py-4">No recent notifications.</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="py-4 text-xs flex justify-between items-center gap-4">
                      <div>
                        <h4 className="font-bold text-on-surface">{n.title}</h4>
                        <p className="text-secondary mt-1 max-w-4xl">{n.message}</p>
                      </div>
                      <span className="font-label-mono text-[9px] text-secondary whitespace-nowrap">{new Date(n.sentAt).toLocaleDateString()}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Quick Actions Modals */}
          {/* 1. Raise Maintenance Modal */}
          {activeModal === "MAINTENANCE" && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white border border-border-hairline max-w-md w-full p-8 relative animate-countUp">
                <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6">Raise Maintenance Request</h2>
                <form onSubmit={handleRaiseMaintenance} className="space-y-4 text-xs">
                  {modalError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{modalError}</div>}
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Select Asset</label>
                    <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={formAssetId} onChange={(e) => setFormAssetId(e.target.value)}>
                      <option value="">-- Choose Asset --</option>
                      {custody.map((c) => (
                        <option key={c.asset.id} value={c.asset.id}>{c.asset.name} ({c.asset.assetTag})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Issue Title</label>
                    <input required className="border border-border-hairline p-2 focus:outline-none" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Brief title..." />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Issue Description</label>
                    <textarea required rows={4} className="border border-border-hairline p-2 focus:outline-none" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Provide full details..." />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Priority</label>
                    <select className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={formPriority} onChange={(e) => setFormPriority(e.target.value as any)}>
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => { setActiveModal(null); resetForm(); }} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer">Cancel</button>
                    <button type="submit" disabled={submitting} className="bg-primary text-white px-6 py-2.5 font-label-mono uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">{submitting ? "Submitting..." : "Submit Request"}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 2. Book Shared Resource Modal */}
          {activeModal === "BOOKING" && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white border border-border-hairline max-w-md w-full p-8 relative animate-countUp">
                <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6">Book Shared Resource</h2>
                <form onSubmit={handleBookResource} className="space-y-4 text-xs">
                  {modalError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{modalError}</div>}
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Select Resource</label>
                    <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={formAssetId} onChange={(e) => setFormAssetId(e.target.value)}>
                      <option value="">-- Choose Resource --</option>
                      {bookableAssets.map((a) => (
                        <option key={a.id} value={a.id}>{a.name} ({a.assetTag}) - {a.category?.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Booking Title</label>
                    <input required className="border border-border-hairline p-2 focus:outline-none" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g. Project Review Meeting..." />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-mono uppercase text-secondary font-semibold">Purpose Type</label>
                      <select className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={formPurpose} onChange={(e) => setFormPurpose(e.target.value as any)}>
                        <option value="ROOM">Room</option>
                        <option value="VEHICLE">Vehicle</option>
                        <option value="EQUIPMENT">Equipment</option>
                        <option value="SPACE">Space</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-mono uppercase text-secondary font-semibold">Audience</label>
                      <select className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={formAudience} onChange={(e) => setFormAudience(e.target.value as any)}>
                        <option value="INDIVIDUAL">Individual</option>
                        <option value="DEPARTMENT">Department</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-mono uppercase text-secondary font-semibold">Start Date</label>
                      <input required type="date" className="border border-border-hairline p-2 focus:outline-none" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-mono uppercase text-secondary font-semibold">Start Time</label>
                      <input type="time" className="border border-border-hairline p-2 focus:outline-none" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-mono uppercase text-secondary font-semibold">End Date</label>
                      <input required type="date" className="border border-border-hairline p-2 focus:outline-none" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-mono uppercase text-secondary font-semibold">End Time</label>
                      <input type="time" className="border border-border-hairline p-2 focus:outline-none" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Additional Notes</label>
                    <textarea rows={2} className="border border-border-hairline p-2 focus:outline-none" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Special requirements..." />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => { setActiveModal(null); resetForm(); }} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer">Cancel</button>
                    <button type="submit" disabled={submitting} className="bg-primary text-white px-6 py-2.5 font-label-mono uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">{submitting ? "Booking..." : "Schedule Booking"}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 3. Request Asset Return Modal */}
          {activeModal === "RETURN" && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white border border-border-hairline max-w-md w-full p-8 relative animate-countUp">
                <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6">Request Asset Return</h2>
                <form onSubmit={handleRequestReturn} className="space-y-4 text-xs">
                  {modalError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{modalError}</div>}
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Select Active Allocation</label>
                    <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={formAllocId} onChange={(e) => setFormAllocId(e.target.value)}>
                      <option value="">-- Choose Allocation --</option>
                      {custody.map((c) => (
                        <option key={c.id} value={c.id}>{c.asset.name} ({c.asset.assetTag}) - Assg: {new Date(c.allocatedAt).toLocaleDateString()}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Condition on Return</label>
                    <select className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={formReturnCondition} onChange={(e) => setFormReturnCondition(e.target.value)}>
                      <option value="NEW">New</option>
                      <option value="EXCELLENT">Excellent</option>
                      <option value="GOOD">Good</option>
                      <option value="FAIR">Fair</option>
                      <option value="POOR">Poor</option>
                      <option value="DAMAGED">Damaged</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Condition Notes / Discrepancies</label>
                    <textarea rows={3} className="border border-border-hairline p-2 focus:outline-none" value={formReturnNotes} onChange={(e) => setFormReturnNotes(e.target.value)} placeholder="Mention any cosmetic or functional issues..." />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => { setActiveModal(null); resetForm(); }} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer">Cancel</button>
                    <button type="submit" disabled={submitting} className="bg-primary text-white px-6 py-2.5 font-label-mono uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">{submitting ? "Submitting..." : "Confirm Return"}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 4. Request Asset Transfer Modal */}
          {activeModal === "TRANSFER" && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white border border-border-hairline max-w-md w-full p-8 relative animate-countUp">
                <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6">Request Custody Transfer</h2>
                <form onSubmit={handleRequestTransfer} className="space-y-4 text-xs">
                  {modalError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{modalError}</div>}
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Select Custody Asset</label>
                    <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={formAssetId} onChange={(e) => setFormAssetId(e.target.value)}>
                      <option value="">-- Choose Asset --</option>
                      {custody.map((c) => (
                        <option key={c.asset.id} value={c.asset.id}>{c.asset.name} ({c.asset.assetTag})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Transfer Type</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="transferType" checked={formTransferType === "employee"} onChange={() => { setFormTransferType("employee"); setFormTransferTarget(""); }} />
                        To Employee
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="transferType" checked={formTransferType === "department"} onChange={() => { setFormTransferType("department"); setFormTransferTarget(""); }} />
                        To Department
                      </label>
                    </div>
                  </div>

                  {formTransferType === "employee" ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-mono uppercase text-secondary font-semibold">Recipient Employee</label>
                      <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={formTransferTarget} onChange={(e) => setFormTransferTarget(e.target.value)}>
                        <option value="">-- Choose Employee --</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeCode})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-mono uppercase text-secondary font-semibold">Recipient Department</label>
                      <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={formTransferTarget} onChange={(e) => setFormTransferTarget(e.target.value)}>
                        <option value="">-- Choose Department --</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Reason for Transfer</label>
                    <textarea required rows={3} className="border border-border-hairline p-2 focus:outline-none" value={formTransferReason} onChange={(e) => setFormTransferReason(e.target.value)} placeholder="Provide explanation for transfer request..." />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => { setActiveModal(null); resetForm(); }} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer">Cancel</button>
                    <button type="submit" disabled={submitting} className="bg-primary text-white px-6 py-2.5 font-label-mono uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">{submitting ? "Requesting..." : "Send Request"}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <footer className="mt-section-margin pt-12 border-t border-border-hairline flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-12">
            <div className="space-y-1">
              <div className="font-section-number text-[18px] text-on-surface font-semibold">AssetFlow</div>
              <p className="font-label-mono text-[11px] text-secondary uppercase tracking-widest">© 2026 AssetFlow Systems.</p>
            </div>
          </footer>
        </main>
      </div>
    );
  }

  // DEFAULT RENDER FOR MANAGERS/ADMINS
  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Sidebar Navigation */}
      <Sidebar activePage="dashboard" />

      {/* Main Content Area */}
      <main className="ml-64 min-h-screen px-container-padding py-12 flex flex-col justify-between">
        <div>
          {/* Header Bar */}
          <Header section="Dashboard" />

          {/* Header Section */}
          <header className="mb-section-margin">
            <div className="font-label-mono text-label-mono text-secondary uppercase tracking-[0.2em] mb-2 flex items-center text-xs font-semibold">
              <span className="text-primary font-bold">§ 01</span>
              <span className="mx-2 opacity-30">·</span>
              TODAY'S OVERVIEW
            </div>
            <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
              Today's <span className="font-display-lg-italic italic font-light text-primary font-normal">overview</span>.
            </h1>
          </header>

          {/* Dynamic Stats Strips */}
          {kpis && (
            <section className="mb-section-margin">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border-y border-border-hairline divide-y md:divide-y-0 md:divide-x divide-border-hairline bg-surface">
                {/* Stat 1 */}
                <div className="p-8 group hover:bg-surface-container-low transition-colors duration-200">
                  <span className="font-label-mono text-label-mono text-secondary uppercase tracking-widest block mb-4 text-xs font-semibold">
                    Total Assets
                  </span>
                  <div className="font-stat-kpi text-stat-kpi text-on-surface font-bold tracking-tight">
                    <AnimatedCounter target={kpis.totalAssets} />
                  </div>
                  <div className="mt-4 flex items-center text-secondary text-xs font-semibold">
                    <span className="font-label-mono uppercase">System Reg</span>
                  </div>
                </div>

                {/* Stat 2 */}
                <div className="p-8 group hover:bg-surface-container-low transition-colors duration-200">
                  <span className="font-label-mono text-label-mono text-secondary uppercase tracking-widest block mb-4 text-xs font-semibold">
                    Allocated
                  </span>
                  <div className="font-stat-kpi text-stat-kpi text-on-surface font-bold tracking-tight">
                    <AnimatedCounter target={kpis.allocatedAssets} />
                  </div>
                  <div className="mt-4 flex items-center text-secondary text-xs font-semibold">
                    <span className="font-label-mono uppercase">
                      {((kpis.allocatedAssets / (kpis.totalAssets || 1)) * 100).toFixed(1)}% Utilized
                    </span>
                  </div>
                </div>

                {/* Stat 3 */}
                <div className="p-8 group hover:bg-surface-container-low transition-colors duration-200">
                  <span className="font-label-mono text-label-mono text-secondary uppercase tracking-widest block mb-4 text-xs font-semibold">
                    Available
                  </span>
                  <div className="font-stat-kpi text-stat-kpi text-on-surface font-bold tracking-tight">
                    <AnimatedCounter target={kpis.availableAssets} />
                  </div>
                  <div className="mt-4 flex items-center text-secondary text-xs font-semibold">
                    <span className="font-label-mono uppercase">
                      Ready for Deployment
                    </span>
                  </div>
                </div>

                {/* Stat 4 */}
                <div className="p-8 group hover:bg-surface-container-low transition-colors duration-200">
                  <span className="font-label-mono text-label-mono text-secondary uppercase tracking-widest block mb-4 text-xs font-semibold">
                    Overdue Returns
                  </span>
                  <div className="font-stat-kpi text-stat-kpi text-on-surface font-bold tracking-tight text-error">
                    <AnimatedCounter target={kpis.overdueReturns} />
                  </div>
                  <div className="mt-4 flex items-center text-xs font-semibold text-error">
                    <span className="font-label-mono uppercase">
                      {kpis.overdueReturns} Items Flagged
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Main Grid Layout */}
          <div className="grid grid-cols-12 gap-gutter items-start">
            {/* Quick Actions & Custody Listing (4 columns) */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div>
                <div className="font-label-mono text-label-mono text-secondary uppercase tracking-widest mb-4 text-xs font-semibold">
                  § 02 · Quick Actions
                </div>
                <div className="flex flex-col gap-3">
                  <Link href="/assets">
                    <button className="group flex items-center justify-between w-full bg-primary text-on-primary px-6 py-5 rounded-none transition-all hover:bg-opacity-90 cursor-pointer text-xs font-label-mono uppercase tracking-[0.15em]">
                      Provision New Asset
                      <span className="material-symbols-outlined">add_circle</span>
                    </button>
                  </Link>
                  <Link href="/workflows">
                    <button className="group flex items-center justify-between w-full border border-border-hairline bg-surface text-on-surface px-6 py-5 rounded-none transition-all hover:border-primary cursor-pointer text-xs font-label-mono uppercase tracking-[0.15em]">
                      Verify Custody &amp; Transfers
                      <span className="material-symbols-outlined">sync_alt</span>
                    </button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Recent Activity (8 columns) */}
            <div className="col-span-12 lg:col-span-8">
              <div className="font-label-mono text-label-mono text-secondary uppercase tracking-widest mb-4 text-xs font-semibold">
                § 03 · Recent Activity
              </div>
              <div className="bg-surface border border-border-hairline">
                <div className="divide-y divide-border-hairline max-h-[500px] overflow-y-auto custom-scrollbar">
                  {activities.length === 0 ? (
                    <div className="p-8 text-center text-secondary text-xs">
                      No logs in the activity trail yet.
                    </div>
                  ) : (
                    activities.map((act) => (
                      <div
                        key={act.id}
                        className="hover-reveal-row flex items-center p-6 transition-all hover:bg-surface-container-low cursor-pointer group"
                      >
                        <div className="flex-shrink-0 w-12 h-12 bg-primary-fixed flex items-center justify-center mr-6">
                          <span className="material-symbols-outlined text-primary">
                            {getActivityIcon(act.action)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1 text-sm">
                            <span className="font-semibold">{act.action.replace("_", " ")}</span>
                            <span className="font-label-mono text-[11px] text-secondary">
                              {new Date(act.occurredAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-on-surface-variant text-sm">
                            {act.details}
                          </p>
                          {act.actorEmployee && (
                            <span className="block mt-1 font-label-mono text-[10px] text-secondary uppercase tracking-wider">
                              Actor: {act.actorEmployee.firstName} {act.actorEmployee.lastName} ({act.actorEmployee.employeeCode})
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-section-margin pt-12 border-t border-border-hairline flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-12">
          <div className="space-y-1">
            <div className="font-section-number text-[18px] text-on-surface font-semibold">AssetFlow</div>
            <p className="font-label-mono text-[11px] text-secondary uppercase tracking-widest">
              © 2026 AssetFlow Systems. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
