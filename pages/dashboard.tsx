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
    const duration = 800; // Animation duration in ms
    const stepTime = 16;   // ~60 FPS
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
  };
  requestedBy: {
    firstName: string;
    lastName: string;
    employeeCode: string;
  };
}

interface TransferRequest {
  id: string;
  asset: {
    id: string;
    name: string;
    assetTag: string;
  };
  requestedBy: {
    firstName: string;
    lastName: string;
  };
  fromEmployee?: {
    firstName: string;
    lastName: string;
  } | null;
  fromDepartment?: {
    name: string;
  } | null;
  toEmployee?: {
    firstName: string;
    lastName: string;
  } | null;
  toDepartment?: {
    name: string;
  } | null;
  reason: string;
  createdAt: string;
}

interface OverdueReturn {
  id: string;
  expectedReturnDate: string;
  asset: {
    name: string;
    assetTag: string;
  };
  allocatedToEmployee?: {
    firstName: string;
    lastName: string;
  } | null;
  allocatedToDepartment?: {
    name: string;
  } | null;
}

interface CategoryReport {
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  totalRequests: number;
  resolvedRequests: number;
  pendingRequests: number;
  activeRequests: number;
  averageDowntimeHours: number;
}

interface UtilizationReport {
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  totalAssets: number;
  allocatedAssets: number;
  availableAssets: number;
  underMaintenanceAssets: number;
  utilizationRate: number;
}

export default function Dashboard() {
  const { user, role, loading: authLoading } = useAuth();

  // Basic States
  const [kpis, setKpis] = useState<KPIProps | null>(null);
  const [pendingReturnsCount, setPendingReturnsCount] = useState(0);
  const [todaysBookingsCount, setTodaysBookingsCount] = useState(0);
  
  // Tables States
  const [maintenanceTickets, setMaintenanceTickets] = useState<MaintenanceTicket[]>([]);
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [overdueReturns, setOverdueReturns] = useState<OverdueReturn[]>([]);

  // Charts data
  const [utilizationList, setUtilizationList] = useState<UtilizationReport[]>([]);
  const [maintenanceStats, setMaintenanceStats] = useState({ pending: 0, active: 0, resolved: 0 });
  const [animate, setAnimate] = useState(false);

  // Global loading
  const [loading, setLoading] = useState(true);

  // Modals States
  const [activeModal, setActiveModal] = useState<"register" | "allocate" | "maintenance_approve" | "return" | "booking" | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; firstName: string; lastName: string; employeeCode: string }[]>([]);
  const [availableAssets, setAvailableAssets] = useState<{ id: string; name: string; assetTag: string }[]>([]);
  const [activeAllocations, setActiveAllocations] = useState<{ id: string; asset: { name: string; assetTag: string }; expectedReturnDate: string | null }[]>([]);
  const [bookableAssets, setBookableAssets] = useState<{ id: string; name: string; assetTag: string }[]>([]);

  // Modal Form Fields
  // 1. Register Asset
  const [regName, setRegName] = useState("");
  const [regCategory, setRegCategory] = useState("");
  const [regSerial, setRegSerial] = useState("");
  const [regCost, setRegCost] = useState("");
  const [regDate, setRegDate] = useState("");
  const [regCondition, setRegCondition] = useState("GOOD");
  const [regLocation, setRegLocation] = useState("");
  const [regDescription, setRegDescription] = useState("");
  const [regDeptId, setRegDeptId] = useState("");
  const [regShared, setRegShared] = useState(false);
  
  // 2. Allocate Asset
  const [allocAssetId, setAllocAssetId] = useState("");
  const [allocType, setAllocType] = useState<"employee" | "department">("employee");
  const [allocTarget, setAllocTarget] = useState("");
  const [allocReturnDate, setAllocReturnDate] = useState("");
  const [allocNote, setAllocNote] = useState("");

  // 3. Return Asset
  const [returnAllocId, setReturnAllocId] = useState("");
  const [returnCondition, setReturnCondition] = useState("GOOD");
  const [returnNotes, setReturnNotes] = useState("");

  // 4. Create Booking
  const [bookAssetId, setBookAssetId] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookPurpose, setBookPurpose] = useState("OTHER");
  const [bookAudience, setBookAudience] = useState("INDIVIDUAL");
  const [bookDeptId, setBookDeptId] = useState("");
  const [bookStart, setBookStart] = useState("");
  const [bookEnd, setBookEnd] = useState("");
  const [bookNotes, setBookNotes] = useState("");
  const [bookLocation, setBookLocation] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Concurrently fetch primary statistics
      const [kpiRes, returnRequestsRes, bookingsRes, maintenanceRes, transfersRes, overdueRes, utilizationRes, maintFreqRes] = await Promise.all([
        fetch("/api/dashboard/kpis"),
        fetch("/api/returns?status=PENDING_INSPECTION&limit=100"),
        fetch("/api/bookings?limit=100"),
        fetch("/api/maintenance?status=PENDING&limit=5"),
        fetch("/api/transfers?status=PENDING&limit=5"),
        fetch("/api/dashboard/overdue-returns?limit=5"),
        fetch("/api/reports/asset-utilization"),
        fetch("/api/reports/maintenance-frequency")
      ]);

      // Parse KPIs
      if (kpiRes.ok) {
        const kpiData = await kpiRes.json();
        if (kpiData.success) setKpis(kpiData.kpis);
      }

      // Parse Pending returns count
      if (returnRequestsRes.ok) {
        const data = await returnRequestsRes.json();
        if (data.success) setPendingReturnsCount(data.pagination?.totalCount || data.returns?.length || 0);
      }

      // Parse Bookings for Today
      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        if (data.success) {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const endOfToday = new Date();
          endOfToday.setHours(23, 59, 59, 999);
          
          const todays = data.bookings.filter((b: any) => {
            const start = new Date(b.startAt);
            return start >= startOfToday && start <= endOfToday;
          });
          setTodaysBookingsCount(todays.length);
        }
      }

      // Parse Tables Data
      if (maintenanceRes.ok) {
        const data = await maintenanceRes.json();
        if (data.success) setMaintenanceTickets(data.requests || []);
      }

      if (transfersRes.ok) {
        const data = await transfersRes.json();
        if (data.success) setTransfers(data.transfers || []);
      }

      if (overdueRes.ok) {
        const data = await overdueRes.json();
        if (data.success) setOverdueReturns(data.overdueAllocations || []);
      }

      // Parse Reports data for Charts
      if (utilizationRes.ok) {
        const data = await utilizationRes.json();
        if (data.success) setUtilizationList(data.utilization || []);
      }

      if (maintFreqRes.ok) {
        const data = await maintFreqRes.json();
        if (data.success) {
          const report: CategoryReport[] = data.categoryReport || [];
          let pend = 0, act = 0, res = 0;
          report.forEach(r => {
            pend += r.pendingRequests;
            act += r.activeRequests;
            res += r.resolvedRequests;
          });
          setMaintenanceStats({ pending: pend, active: act, resolved: res });
        }
      }
    } catch (e) {
      console.error("Failed to load dashboard statistics", e);
    } finally {
      setLoading(false);
      setTimeout(() => setAnimate(true), 150);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, role]);

  // Load context options for modals on demand
  const loadModalContext = async (modalType: typeof activeModal) => {
    setFormError(null);
    if (!modalType) return;
    try {
      if (modalType === "register") {
        const [catRes, deptRes] = await Promise.all([
          fetch("/api/asset-categories?status=ACTIVE"),
          fetch("/api/departments?status=ACTIVE")
        ]);
        const catData = await catRes.json();
        const deptData = await deptRes.json();
        if (catData.success) setCategories(catData.categories || []);
        if (deptData.success) setDepartments(deptData.departments || []);
      } else if (modalType === "allocate") {
        const [assetRes, empRes, deptRes] = await Promise.all([
          fetch("/api/assets?status=AVAILABLE&limit=100"),
          fetch("/api/employees?status=ACTIVE&limit=100"),
          fetch("/api/departments?status=ACTIVE")
        ]);
        const assetData = await assetRes.json();
        const empData = await empRes.json();
        const deptData = await deptRes.json();
        if (assetData.success) setAvailableAssets(assetData.assets || []);
        if (empData.success) setEmployees(empData.employees || []);
        if (deptData.success) setDepartments(deptData.departments || []);
      } else if (modalType === "return") {
        const allocRes = await fetch("/api/allocations?status=ACTIVE&limit=100");
        const data = await allocRes.json();
        if (data.success) setActiveAllocations(data.allocations || []);
      } else if (modalType === "booking") {
        const [assetRes, deptRes] = await Promise.all([
          fetch("/api/assets/bookable?limit=100"),
          fetch("/api/departments?status=ACTIVE")
        ]);
        const assetData = await assetRes.json();
        const deptData = await deptRes.json();
        if (assetData.success) setBookableAssets(assetData.assets || []);
        if (deptData.success) setDepartments(deptData.departments || []);
      }
    } catch (e) {
      setFormError("Failed to query context data from server.");
    }
  };

  const handleOpenModal = (modalType: typeof activeModal) => {
    setActiveModal(modalType);
    loadModalContext(modalType);
  };

  // Submit Quick Actions Handlers
  const handleRegisterAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          categoryId: regCategory,
          serialNumber: regSerial || null,
          acquisitionCost: regCost ? parseFloat(regCost) : null,
          acquisitionDate: regDate ? new Date(regDate).toISOString() : null,
          condition: regCondition,
          location: regLocation || null,
          departmentId: regDeptId || null,
          sharedBookable: regShared,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveModal(null);
        // Reset fields
        setRegName("");
        setRegCategory("");
        setRegSerial("");
        setRegCost("");
        setRegDate("");
        setRegCondition("GOOD");
        setRegLocation("");
        setRegDescription("");
        setRegDeptId("");
        setRegShared(false);
        fetchDashboardData();
      } else {
        setFormError(data.error || "Failed to register asset.");
      }
    } catch {
      setFormError("A connection error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAllocateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
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
        setActiveModal(null);
        setAllocAssetId("");
        setAllocTarget("");
        setAllocReturnDate("");
        setAllocNote("");
        fetchDashboardData();
      } else {
        setFormError(data.error || "Failed to allocate asset.");
      }
    } catch {
      setFormError("A connection error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      // 1. Submit return request
      const returnRes = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetAllocationId: returnAllocId,
          conditionOnReturn: returnCondition,
          conditionNotes: returnNotes || null,
        }),
      });
      const returnData = await returnRes.json();
      if (!returnRes.ok || !returnData.success) {
        setFormError(returnData.error || "Failed to file return request.");
        setSubmitting(false);
        return;
      }

      // 2. Auto-approve return because role is ASSET_MANAGER
      const approveRes = await fetch(`/api/returns/${returnData.returnRequest.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conditionOnReturn: returnCondition,
          inspectionNotes: returnNotes || "Automatically approved return via Quick Action",
        }),
      });
      const approveData = await approveRes.json();
      if (approveRes.ok && approveData.success) {
        setActiveModal(null);
        setReturnAllocId("");
        setReturnCondition("GOOD");
        setReturnNotes("");
        fetchDashboardData();
      } else {
        setFormError(approveData.error || "Failed to automatically approve/receive the returned asset.");
      }
    } catch {
      setFormError("A connection error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: bookAssetId,
          title: bookTitle,
          purpose: bookPurpose,
          audience: bookAudience,
          bookedForDepartmentId: bookAudience === "DEPARTMENT" ? bookDeptId : null,
          startAt: new Date(bookStart).toISOString(),
          endAt: new Date(bookEnd).toISOString(),
          notes: bookNotes || null,
          locationNote: bookLocation || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveModal(null);
        setBookAssetId("");
        setBookTitle("");
        setBookPurpose("OTHER");
        setBookAudience("INDIVIDUAL");
        setBookDeptId("");
        setBookStart("");
        setBookEnd("");
        setBookNotes("");
        setBookLocation("");
        fetchDashboardData();
      } else {
        setFormError(data.error || "Failed to schedule booking.");
      }
    } catch {
      setFormError("A connection error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveMaintenanceTicket = async (id: string) => {
    if (!confirm("Are you sure you want to approve this maintenance request?")) return;
    try {
      const res = await fetch(`/api/maintenance/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Maintenance request approved. Asset status set to UNDER MAINTENANCE.");
        fetchDashboardData();
      } else {
        alert(data.error || "Failed to approve maintenance request.");
      }
    } catch {
      alert("A connection error occurred.");
    }
  };

  const handleApproveTransferTicket = async (id: string) => {
    if (!confirm("Are you sure you want to approve this transfer request?")) return;
    try {
      const res = await fetch(`/api/transfers/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Transfer request approved.");
        fetchDashboardData();
      } else {
        alert(data.error || "Failed to approve transfer request.");
      }
    } catch {
      alert("A connection error occurred.");
    }
  };

  const handleRejectTransferTicket = async (id: string) => {
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
        alert("Transfer request rejected.");
        fetchDashboardData();
      } else {
        alert(data.error || "Failed to reject transfer request.");
      }
    } catch {
      alert("A connection error occurred.");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-label-mono text-xs uppercase tracking-widest text-secondary">
        Syncing system rules...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Sidebar Navigation */}
      <Sidebar activePage="dashboard" />

      {/* Main Content Area */}
      <main className="ml-64 min-h-screen px-container-padding py-12 flex flex-col justify-between">
        <div>
          {/* Header Bar */}
          <Header section="Operational Dashboard" />

          {/* Section Header */}
          <header className="mb-section-margin">
            <div className="font-label-mono text-label-mono text-secondary uppercase tracking-[0.2em] mb-2 flex items-center text-xs font-semibold">
              <span className="text-primary font-bold">§ 01</span>
              <span className="mx-2 opacity-30">·</span>
              OPERATIONAL HUB
            </div>
            <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
              Operational <span className="font-display-lg-italic italic font-light text-primary font-normal">status</span>.
            </h1>
          </header>

          {/* KPI Cards Grid */}
          {kpis && (
            <section className="mb-12">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-0 border border-border-hairline divide-y sm:divide-y-0 lg:divide-x divide-border-hairline bg-surface">
                {/* Available Assets */}
                <div className="p-6 group hover:bg-surface-container-low transition-colors duration-200">
                  <span className="font-label-mono text-[10px] text-secondary uppercase tracking-widest block mb-3 font-semibold">
                    Available Assets
                  </span>
                  <div className="text-[32px] text-on-surface font-bold tracking-tight font-stat-kpi">
                    <AnimatedCounter target={kpis.availableAssets} />
                  </div>
                  <div className="mt-2 text-[10px] text-status-available font-semibold uppercase tracking-wider font-label-mono">
                    Ready for Deployment
                  </div>
                </div>

                {/* Allocated Assets */}
                <div className="p-6 group hover:bg-surface-container-low transition-colors duration-200">
                  <span className="font-label-mono text-[10px] text-secondary uppercase tracking-widest block mb-3 font-semibold">
                    Allocated Assets
                  </span>
                  <div className="text-[32px] text-on-surface font-bold tracking-tight font-stat-kpi">
                    <AnimatedCounter target={kpis.allocatedAssets} />
                  </div>
                  <div className="mt-2 text-[10px] text-status-allocated font-semibold uppercase tracking-wider font-label-mono">
                    {((kpis.allocatedAssets / (kpis.totalAssets || 1)) * 100).toFixed(1)}% In Custody
                  </div>
                </div>

                {/* Assets Under Maintenance */}
                <div className="p-6 group hover:bg-surface-container-low transition-colors duration-200">
                  <span className="font-label-mono text-[10px] text-secondary uppercase tracking-widest block mb-3 font-semibold">
                    In Maintenance
                  </span>
                  <div className="text-[32px] text-on-surface font-bold tracking-tight font-stat-kpi">
                    <AnimatedCounter target={kpis.underMaintenance} />
                  </div>
                  <div className="mt-2 text-[10px] text-status-maintenance font-semibold uppercase tracking-wider font-label-mono">
                    Out of Service
                  </div>
                </div>

                {/* Pending Returns count */}
                <div className="p-6 group hover:bg-surface-container-low transition-colors duration-200">
                  <span className="font-label-mono text-[10px] text-secondary uppercase tracking-widest block mb-3 font-semibold">
                    Pending Returns
                  </span>
                  <div className="text-[32px] text-on-surface font-bold tracking-tight font-stat-kpi">
                    <AnimatedCounter target={pendingReturnsCount} />
                  </div>
                  <div className="mt-2 text-[10px] text-secondary font-semibold uppercase tracking-wider font-label-mono">
                    Awaiting Inspection
                  </div>
                </div>

                {/* Active Transfers count */}
                <div className="p-6 group hover:bg-surface-container-low transition-colors duration-200">
                  <span className="font-label-mono text-[10px] text-secondary uppercase tracking-widest block mb-3 font-semibold">
                    Active Transfers
                  </span>
                  <div className="text-[32px] text-on-surface font-bold tracking-tight font-stat-kpi">
                    <AnimatedCounter target={kpis.pendingTransfers} />
                  </div>
                  <div className="mt-2 text-[10px] text-secondary font-semibold uppercase tracking-wider font-label-mono">
                    Awaiting Approval
                  </div>
                </div>

                {/* Today's Bookings count */}
                <div className="p-6 group hover:bg-surface-container-low transition-colors duration-200">
                  <span className="font-label-mono text-[10px] text-secondary uppercase tracking-widest block mb-3 font-semibold">
                    Today's Bookings
                  </span>
                  <div className="text-[32px] text-on-surface font-bold tracking-tight font-stat-kpi">
                    <AnimatedCounter target={todaysBookingsCount} />
                  </div>
                  <div className="mt-2 text-[10px] text-status-reserved font-semibold uppercase tracking-wider font-label-mono">
                    Shared Slots
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Quick Actions Panel */}
          <section className="mb-12">
            <div className="font-label-mono text-label-mono text-secondary uppercase tracking-widest mb-4 text-xs font-semibold">
              § 02 · Operational Quick Actions
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <button
                onClick={() => handleOpenModal("register")}
                className="flex items-center justify-between bg-primary text-white p-5 hover:bg-opacity-90 transition-all font-label-mono uppercase tracking-widest text-[11px] font-semibold text-left cursor-pointer"
              >
                <span>Register Asset</span>
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
              </button>
              <button
                onClick={() => handleOpenModal("allocate")}
                className="flex items-center justify-between border border-border-hairline bg-surface text-on-surface p-5 hover:border-primary transition-all font-label-mono uppercase tracking-widest text-[11px] font-semibold text-left cursor-pointer"
              >
                <span>Allocate Asset</span>
                <span className="material-symbols-outlined text-[18px]">assignment_ind</span>
              </button>
              <Link href="/maintenance" className="w-full">
                <button className="w-full h-full flex items-center justify-between border border-border-hairline bg-surface text-on-surface p-5 hover:border-primary transition-all font-label-mono uppercase tracking-widest text-[11px] font-semibold text-left cursor-pointer">
                  <span>Approve Maintenance</span>
                  <span className="material-symbols-outlined text-[18px]">build</span>
                </button>
              </Link>
              <button
                onClick={() => handleOpenModal("return")}
                className="flex items-center justify-between border border-border-hairline bg-surface text-on-surface p-5 hover:border-primary transition-all font-label-mono uppercase tracking-widest text-[11px] font-semibold text-left cursor-pointer"
              >
                <span>Return Asset</span>
                <span className="material-symbols-outlined text-[18px]">keyboard_return</span>
              </button>
              <button
                onClick={() => handleOpenModal("booking")}
                className="flex items-center justify-between border border-border-hairline bg-surface text-on-surface p-5 hover:border-primary transition-all font-label-mono uppercase tracking-widest text-[11px] font-semibold text-left cursor-pointer"
              >
                <span>Create Booking</span>
                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
              </button>
            </div>
          </section>

          {/* Charts Bento Grid */}
          <section className="mb-12">
            <div className="font-label-mono text-label-mono text-secondary uppercase tracking-widest mb-4 text-xs font-semibold">
              § 03 · Operational Charts &amp; Analytics
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Asset Utilization Chart */}
              <div className="col-span-12 lg:col-span-5 bg-surface border border-border-hairline p-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-label-mono text-xs uppercase tracking-widest text-on-surface mb-1 font-semibold">
                    Asset Utilization Rate
                  </h3>
                  <p className="text-[11px] text-secondary mb-6">Custody allocations versus total fleet stock.</p>
                </div>
                <div className="space-y-4">
                  {utilizationList.slice(0, 4).map((util) => (
                    <div key={util.categoryId} className="text-xs">
                      <div className="flex justify-between font-label-mono text-[10px] mb-1.5 uppercase font-semibold">
                        <span>{util.categoryName}</span>
                        <span>{util.utilizationRate.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-container-high">
                        <div
                          style={{ width: animate ? `${util.utilizationRate}%` : "0%" }}
                          className="h-full bg-primary transition-all duration-1000"
                        ></div>
                      </div>
                    </div>
                  ))}
                  {utilizationList.length === 0 && (
                    <div className="text-center text-xs text-secondary italic py-8">No utilization data.</div>
                  )}
                </div>
              </div>

              {/* Maintenance Status Stacked Breakdown */}
              <div className="col-span-12 lg:col-span-4 bg-surface border border-border-hairline p-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-label-mono text-xs uppercase tracking-widest text-on-surface mb-1 font-semibold">
                    Maintenance Tickets Status
                  </h3>
                  <p className="text-[11px] text-secondary mb-6">Proportion of backlog, in-progress, and resolved.</p>
                </div>
                <div>
                  {/* Segmented Stacked Progress Bar */}
                  {maintenanceStats.pending + maintenanceStats.active + maintenanceStats.resolved > 0 ? (
                    (() => {
                      const total = maintenanceStats.pending + maintenanceStats.active + maintenanceStats.resolved;
                      const pendPct = (maintenanceStats.pending / total) * 100;
                      const activePct = (maintenanceStats.active / total) * 100;
                      const resolvedPct = (maintenanceStats.resolved / total) * 100;
                      return (
                        <div className="space-y-6">
                          <div className="w-full h-4 flex bg-surface-container-high overflow-hidden">
                            <div
                              style={{ width: animate ? `${pendPct}%` : "0%" }}
                              className="h-full bg-status-maintenance transition-all duration-1000"
                              title={`Pending: ${maintenanceStats.pending}`}
                            ></div>
                            <div
                              style={{ width: animate ? `${activePct}%` : "0%" }}
                              className="h-full bg-status-reserved transition-all duration-1000"
                              title={`In Progress: ${maintenanceStats.active}`}
                            ></div>
                            <div
                              style={{ width: animate ? `${resolvedPct}%` : "0%" }}
                              className="h-full bg-status-available transition-all duration-1000"
                              title={`Resolved: ${maintenanceStats.resolved}`}
                            ></div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[10px] font-label-mono uppercase text-secondary">
                            <div>
                              <span className="inline-block w-2.5 h-2.5 bg-status-maintenance mr-1.5"></span>
                              Pending: {maintenanceStats.pending}
                            </div>
                            <div>
                              <span className="inline-block w-2.5 h-2.5 bg-status-reserved mr-1.5"></span>
                              Active: {maintenanceStats.active}
                            </div>
                            <div>
                              <span className="inline-block w-2.5 h-2.5 bg-status-available mr-1.5"></span>
                              Resolved: {maintenanceStats.resolved}
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-center text-xs text-secondary italic py-8">No maintenance stats available.</div>
                  )}
                </div>
              </div>

              {/* Assets by Category */}
              <div className="col-span-12 lg:col-span-3 bg-surface border border-border-hairline p-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-label-mono text-xs uppercase tracking-widest text-on-surface mb-1 font-semibold">
                    Assets by Category
                  </h3>
                  <p className="text-[11px] text-secondary mb-4">Inventory density per category.</p>
                </div>
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {utilizationList.map((util) => (
                    <div key={util.categoryId} className="flex justify-between items-center text-xs border-b border-border-hairline pb-1.5">
                      <span className="text-on-surface font-semibold">{util.categoryName}</span>
                      <span className="font-label-mono text-secondary bg-surface-container-high px-2 py-0.5 font-bold">
                        {util.totalAssets}
                      </span>
                    </div>
                  ))}
                  {utilizationList.length === 0 && (
                    <div className="text-center text-xs text-secondary italic py-8">No categories found.</div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Tables Block */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
            {/* Table 1: Pending Maintenance Requests */}
            <div className="col-span-12 lg:col-span-6 bg-surface border border-border-hairline p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-label-mono text-xs uppercase tracking-widest text-on-surface font-semibold">
                  Pending Maintenance Requests
                </h3>
                <Link href="/maintenance" className="text-[10px] font-label-mono uppercase text-primary hover:underline font-bold">
                  View All
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border-hairline font-label-mono uppercase text-secondary text-[10px]">
                      <th className="py-2.5 font-semibold">Asset Tag</th>
                      <th className="py-2.5 font-semibold">Name</th>
                      <th className="py-2.5 font-semibold">Requested By</th>
                      <th className="py-2.5 font-semibold">Priority</th>
                      <th className="py-2.5 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-hairline">
                    {maintenanceTickets.map((t) => (
                      <tr key={t.id} className="hover:bg-surface-container-low transition-colors duration-150">
                        <td className="py-3 font-label-mono text-[10px] font-bold text-primary">{t.asset.assetTag}</td>
                        <td className="py-3 font-semibold text-on-surface">{t.issueTitle}</td>
                        <td className="py-3 text-secondary">{t.requestedBy.firstName} {t.requestedBy.lastName}</td>
                        <td className="py-3">
                          <span className={`px-1.5 py-0.5 text-[9px] font-label-mono uppercase font-bold ${
                            t.priority === "CRITICAL" ? "bg-error/15 text-error" : 
                            t.priority === "HIGH" ? "bg-status-maintenance/20 text-on-secondary-container" : "bg-surface-container-high text-secondary"
                          }`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleApproveMaintenanceTicket(t.id)}
                            className="bg-primary text-white px-2.5 py-1 text-[10px] font-label-mono uppercase tracking-wider hover:bg-opacity-90 cursor-pointer font-bold"
                          >
                            Approve
                          </button>
                        </td>
                      </tr>
                    ))}
                    {maintenanceTickets.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-secondary italic">
                          No pending maintenance requests.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2: Pending Asset Transfers */}
            <div className="col-span-12 lg:col-span-6 bg-surface border border-border-hairline p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-label-mono text-xs uppercase tracking-widest text-on-surface font-semibold">
                  Pending Asset Transfers
                </h3>
                <Link href="/transfers" className="text-[10px] font-label-mono uppercase text-primary hover:underline font-bold">
                  View All
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border-hairline font-label-mono uppercase text-secondary text-[10px]">
                      <th className="py-2.5 font-semibold">Asset</th>
                      <th className="py-2.5 font-semibold">From</th>
                      <th className="py-2.5 font-semibold">To</th>
                      <th className="py-2.5 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-hairline">
                    {transfers.map((tr) => (
                      <tr key={tr.id} className="hover:bg-surface-container-low transition-colors duration-150">
                        <td className="py-3">
                          <div className="font-semibold text-on-surface">{tr.asset.name}</div>
                          <div className="font-label-mono text-[9px] text-secondary">{tr.asset.assetTag}</div>
                        </td>
                        <td className="py-3 text-secondary">
                          {tr.fromEmployee ? `${tr.fromEmployee.firstName} ${tr.fromEmployee.lastName}` : tr.fromDepartment?.name || "Unallocated"}
                        </td>
                        <td className="py-3 text-on-surface">
                          {tr.toEmployee ? `${tr.toEmployee.firstName} ${tr.toEmployee.lastName}` : tr.toDepartment?.name || "-"}
                        </td>
                        <td className="py-3 text-right space-x-1.5">
                          <button
                            onClick={() => handleApproveTransferTicket(tr.id)}
                            className="bg-primary text-white px-2 py-0.5 text-[9px] font-label-mono uppercase tracking-wider hover:bg-opacity-90 cursor-pointer font-bold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectTransferTicket(tr.id)}
                            className="border border-border-hairline text-secondary px-2 py-0.5 text-[9px] font-label-mono uppercase tracking-wider hover:border-error hover:text-error cursor-pointer font-bold bg-transparent"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                    {transfers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-secondary italic">
                          No pending transfer requests.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 3: Assets Due For Return */}
            <div className="col-span-12 bg-surface border border-border-hairline p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-label-mono text-xs uppercase tracking-widest text-on-surface font-semibold">
                  Assets Due For Return
                </h3>
                <Link href="/allocations" className="text-[10px] font-label-mono uppercase text-primary hover:underline font-bold">
                  View All Allocations
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border-hairline font-label-mono uppercase text-secondary text-[10px]">
                      <th className="py-2.5 font-semibold">Asset Tag</th>
                      <th className="py-2.5 font-semibold">Asset Name</th>
                      <th className="py-2.5 font-semibold">Custodian</th>
                      <th className="py-2.5 font-semibold">Expected Return Date</th>
                      <th className="py-2.5 text-right font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-hairline">
                    {overdueReturns.map((o) => {
                      const isOverdue = new Date(o.expectedReturnDate) < new Date();
                      return (
                        <tr key={o.id} className="hover:bg-surface-container-low transition-colors duration-150">
                          <td className="py-3 font-label-mono text-[10px] font-bold text-primary">{o.asset.assetTag}</td>
                          <td className="py-3 font-semibold text-on-surface">{o.asset.name}</td>
                          <td className="py-3 text-secondary">
                            {o.allocatedToEmployee ? `${o.allocatedToEmployee.firstName} ${o.allocatedToEmployee.lastName}` : o.allocatedToDepartment?.name || "Organization"}
                          </td>
                          <td className="py-3 font-label-mono text-secondary">
                            {new Date(o.expectedReturnDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                          </td>
                          <td className="py-3 text-right">
                            <span className={`px-2 py-0.5 text-[9px] font-label-mono uppercase font-bold ${
                              isOverdue ? "bg-error/15 text-error" : "bg-primary-container text-on-primary-container"
                            }`}>
                              {isOverdue ? "Overdue" : "Due Soon"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {overdueReturns.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-secondary italic">
                          No assets currently due or overdue for return.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-section-margin pt-12 border-t border-border-hairline flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-12">
          <div className="space-y-1">
            <div className="font-section-number text-[18px] text-on-surface font-semibold">
              AssetFlow
            </div>
            <p className="font-label-mono text-[11px] text-secondary uppercase tracking-widest">
              © 2026 AssetFlow Systems. All rights reserved.
            </p>
          </div>
          <div className="flex gap-8 text-xs">
            <Link className="font-label-mono text-[11px] text-secondary uppercase tracking-widest hover:text-primary transition-colors font-bold" href="#">
              Privacy
            </Link>
            <Link className="font-label-mono text-[11px] text-secondary uppercase tracking-widest hover:text-primary transition-colors font-bold" href="#">
              Terms
            </Link>
            <Link className="font-label-mono text-[11px] text-secondary uppercase tracking-widest hover:text-primary transition-colors font-bold" href="#">
              Security
            </Link>
            <Link className="font-label-mono text-[11px] text-secondary uppercase tracking-widest hover:text-primary transition-colors font-bold" href="#">
              System Status
            </Link>
          </div>
        </footer>
      </main>

      {/* ============================================================
          MODALS FOR QUICK ACTIONS
          ============================================================ */}

      {/* 1. Modal: Register Asset */}
      {activeModal === "register" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border-hairline max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6 uppercase tracking-widest font-label-mono">Register New Asset</h2>
            <form onSubmit={handleRegisterAsset} className="space-y-4 text-xs font-body-md">
              {formError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{formError}</div>}
              
              <div className="flex flex-col gap-1">
                <label className="font-label-mono uppercase text-secondary font-semibold">Asset Name *</label>
                <input required className="border border-border-hairline p-2.5 focus:outline-none" value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="e.g. Dell Latitude 7420" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Category *</label>
                  <select required className="border border-border-hairline p-2.5 focus:outline-none bg-white" value={regCategory} onChange={(e) => setRegCategory(e.target.value)}>
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Department Custody</label>
                  <select className="border border-border-hairline p-2.5 focus:outline-none bg-white" value={regDeptId} onChange={(e) => setRegDeptId(e.target.value)}>
                    <option value="">None (Unassigned)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Serial Number</label>
                  <input className="border border-border-hairline p-2.5 focus:outline-none" value={regSerial} onChange={(e) => setRegSerial(e.target.value)} placeholder="e.g. SN-99824X" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Initial Condition</label>
                  <select className="border border-border-hairline p-2.5 focus:outline-none bg-white" value={regCondition} onChange={(e) => setRegCondition(e.target.value)}>
                    <option value="NEW">New</option>
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="POOR">Poor</option>
                    <option value="DAMAGED">Damaged</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Acquisition Cost ($)</label>
                  <input type="number" step="0.01" className="border border-border-hairline p-2.5 focus:outline-none" value={regCost} onChange={(e) => setRegCost(e.target.value)} placeholder="e.g. 1299.99" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Acquisition Date</label>
                  <input type="date" className="border border-border-hairline p-2.5 focus:outline-none" value={regDate} onChange={(e) => setRegDate(e.target.value)} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-mono uppercase text-secondary font-semibold">Physical Location</label>
                <input className="border border-border-hairline p-2.5 focus:outline-none" value={regLocation} onChange={(e) => setRegLocation(e.target.value)} placeholder="e.g. HQ - Room 404" />
              </div>

              <div className="flex items-center gap-6 py-2">
                <label className="flex items-center gap-2 cursor-pointer font-label-mono uppercase text-secondary font-semibold">
                  <input type="checkbox" checked={regShared} onChange={(e) => setRegShared(e.target.checked)} />
                  Shared / Bookable
                </label>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border-hairline">
                <button type="button" onClick={() => setActiveModal(null)} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer bg-transparent font-bold">Cancel</button>
                <button type="submit" disabled={submitting} className="bg-primary text-white px-5 py-2.5 font-label-mono uppercase tracking-wider hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">
                  {submitting ? "Registering..." : "Complete Registration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Allocate Asset */}
      {activeModal === "allocate" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border-hairline max-w-md w-full p-8">
            <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6 uppercase tracking-widest font-label-mono">Allocate Custody</h2>
            <form onSubmit={handleAllocateAsset} className="space-y-4 text-xs font-body-md">
              {formError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{formError}</div>}
              
              <div className="flex flex-col gap-1">
                <label className="font-label-mono uppercase text-secondary font-semibold">Select Available Asset *</label>
                <select required className="border border-border-hairline p-2.5 focus:outline-none bg-white" value={allocAssetId} onChange={(e) => setAllocAssetId(e.target.value)}>
                  <option value="">Select Asset</option>
                  {availableAssets.map((a) => (
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
                <button type="button" onClick={() => setActiveModal(null)} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer bg-transparent font-bold">Cancel</button>
                <button type="submit" disabled={submitting} className="bg-primary text-white px-5 py-2.5 font-label-mono uppercase tracking-wider hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">
                  {submitting ? "Allocating..." : "Issue Custody"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Return Asset */}
      {activeModal === "return" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border-hairline max-w-md w-full p-8">
            <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6 uppercase tracking-widest font-label-mono">Return Asset</h2>
            <form onSubmit={handleReturnAsset} className="space-y-4 text-xs font-body-md">
              {formError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{formError}</div>}
              
              <div className="flex flex-col gap-1">
                <label className="font-label-mono uppercase text-secondary font-semibold">Select Active Custody *</label>
                <select required className="border border-border-hairline p-2.5 focus:outline-none bg-white" value={returnAllocId} onChange={(e) => setReturnAllocId(e.target.value)}>
                  <option value="">Select Asset</option>
                  {activeAllocations.map((a) => (
                    <option key={a.id} value={a.id}>{a.asset.name} ({a.asset.assetTag})</option>
                  ))}
                </select>
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
                <button type="button" onClick={() => setActiveModal(null)} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer bg-transparent font-bold">Cancel</button>
                <button type="submit" disabled={submitting} className="bg-primary text-white px-5 py-2.5 font-label-mono uppercase tracking-wider hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">
                  {submitting ? "Processing Return..." : "Confirm Return"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: Create Booking */}
      {activeModal === "booking" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border-hairline max-w-md w-full p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6 uppercase tracking-widest font-label-mono">Create Booking</h2>
            <form onSubmit={handleCreateBooking} className="space-y-4 text-xs font-body-md">
              {formError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{formError}</div>}
              
              <div className="flex flex-col gap-1">
                <label className="font-label-mono uppercase text-secondary font-semibold">Select Bookable Resource *</label>
                <select required className="border border-border-hairline p-2.5 focus:outline-none bg-white" value={bookAssetId} onChange={(e) => setBookAssetId(e.target.value)}>
                  <option value="">Select Resource</option>
                  {bookableAssets.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-mono uppercase text-secondary font-semibold">Booking Title *</label>
                <input required className="border border-border-hairline p-2.5 focus:outline-none" value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} placeholder="e.g. Q3 Sales Sync" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Booking Type</label>
                  <select className="border border-border-hairline p-2.5 focus:outline-none bg-white" value={bookPurpose} onChange={(e) => setBookPurpose(e.target.value)}>
                    <option value="ROOM">Room</option>
                    <option value="VEHICLE">Vehicle</option>
                    <option value="EQUIPMENT">Equipment</option>
                    <option value="SPACE">Space</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Booking Audience</label>
                  <select className="border border-border-hairline p-2.5 focus:outline-none bg-white" value={bookAudience} onChange={(e) => { setBookAudience(e.target.value); setBookDeptId(""); }}>
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="DEPARTMENT">Department</option>
                  </select>
                </div>
              </div>

              {bookAudience === "DEPARTMENT" && (
                <div className="flex flex-col gap-1">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Select Target Department *</label>
                  <select required className="border border-border-hairline p-2.5 focus:outline-none bg-white" value={bookDeptId} onChange={(e) => setBookDeptId(e.target.value)}>
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Start Time *</label>
                  <input type="datetime-local" required className="border border-border-hairline p-2.5 focus:outline-none" value={bookStart} onChange={(e) => setBookStart(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-mono uppercase text-secondary font-semibold">End Time *</label>
                  <input type="datetime-local" required className="border border-border-hairline p-2.5 focus:outline-none" value={bookEnd} onChange={(e) => setBookEnd(e.target.value)} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-mono uppercase text-secondary font-semibold">Location / Access Note</label>
                <input className="border border-border-hairline p-2.5 focus:outline-none" value={bookLocation} onChange={(e) => setBookLocation(e.target.value)} placeholder="e.g. Room B2, 2nd Floor" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-mono uppercase text-secondary font-semibold">Notes</label>
                <textarea className="border border-border-hairline p-2.5 focus:outline-none resize-none h-16" value={bookNotes} onChange={(e) => setBookNotes(e.target.value)} placeholder="Add any details..." />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border-hairline">
                <button type="button" onClick={() => setActiveModal(null)} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer bg-transparent font-bold">Cancel</button>
                <button type="submit" disabled={submitting} className="bg-primary text-white px-5 py-2.5 font-label-mono uppercase tracking-wider hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">
                  {submitting ? "Booking..." : "Schedule Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
