"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useAuth } from "@/lib/context/AuthContext";

function AnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 600; // Animation duration in ms
    const stepTime = 16;
    const steps = duration / stepTime;
    const stepValue = target / steps;

    if (target <= 0) {
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

// -----------------------------------------------------------------
// Department Head Dashboard Panel
// -----------------------------------------------------------------
function DepartmentHeadConsole({ departmentId, user, employee }: { departmentId: string; user: any; employee: any }) {
  const router = useRouter();
  const tab = (router.query.tab as string) || "dashboard";

  // Data states
  const [kpis, setKpis] = useState<any>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Forms states
  const [bookableAssets, setBookableAssets] = useState<any[]>([]);
  const [bookingForm, setBookingForm] = useState({
    assetId: "",
    title: "",
    purpose: "OTHER" as any,
    audience: "INDIVIDUAL" as any,
    startAt: "",
    endAt: "",
    notes: "",
    locationNote: "",
  });
  const [maintenanceForm, setMaintenanceForm] = useState({
    assetId: "",
    issueTitle: "",
    issueDescription: "",
    priority: "MEDIUM" as any,
  });

  // Table filters
  const [assetSearch, setAssetSearch] = useState("");
  const [assetStatusFilter, setAssetStatusFilter] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === "dashboard") {
        // Load KPIs
        const kpiRes = await fetch(`/api/dashboard/kpis?departmentId=${departmentId}`);
        const kpiData = await kpiRes.json();
        if (kpiData.success) setKpis(kpiData.kpis);

        // Load Activities
        const actRes = await fetch(`/api/dashboard/recent-activity?limit=10&departmentId=${departmentId}`);
        const actData = await actRes.json();
        if (actData.success) setRecentActivities(actData.activities);

        // Load Pending Approvals
        const transRes = await fetch(`/api/transfers?status=PENDING`);
        const transData = await transRes.json();
        if (transData.success) setTransfers(transData.transfers);

        const bookRes = await fetch(`/api/bookings?status=PENDING`);
        const bookData = await bookRes.json();
        if (bookData.success) setBookings(bookData.bookings);
      }

      if (tab === "assets" || tab === "reports") {
        const assetsRes = await fetch(`/api/assets?limit=100&departmentId=${departmentId}`);
        const assetsData = await assetsRes.json();
        if (assetsData.success) setAssets(assetsData.assets);
      }

      if (tab === "employees") {
        const empRes = await fetch(`/api/employees?limit=100&departmentId=${departmentId}`);
        const empData = await empRes.json();
        if (empData.success) setEmployees(empData.employees);
      }

      if (tab === "transfers") {
        const transRes = await fetch(`/api/transfers?limit=100`);
        const transData = await transRes.json();
        if (transData.success) setTransfers(transData.transfers);
      }

      if (tab === "bookings") {
        const bookRes = await fetch(`/api/bookings?limit=100`);
        const bookData = await bookRes.json();
        if (bookData.success) setBookings(bookData.bookings);

        // Also fetch bookable assets
        const bookableRes = await fetch(`/api/assets/bookable`);
        const bookableData = await bookableRes.json();
        if (bookableData.success) setBookableAssets(bookableData.assets);
      }

      if (tab === "maintenance") {
        const maintRes = await fetch(`/api/maintenance?limit=100`);
        const maintData = await maintRes.json();
        if (maintData.success) setMaintenance(maintData.requests);

        // Fetch assets to raise maintenance on
        const assetsRes = await fetch(`/api/assets?limit=100&departmentId=${departmentId}`);
        const assetsData = await assetsRes.json();
        if (assetsData.success) setAssets(assetsData.assets);
      }

      if (tab === "notifications") {
        const notifRes = await fetch(`/api/notifications?limit=100`);
        const notifData = await notifRes.json();
        if (notifData.success) setNotifications(notifData.notifications);
      }
    } catch (e) {
      console.error("Failed to load department head console data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tab, departmentId]);

  // Actions
  const handleApproveTransfer = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/transfers/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("Transfer request approved successfully!");
        fetchData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectTransfer = async (id: string) => {
    const reason = prompt("Enter reason for rejection:") || "Rejected by Department Head";
    setActionLoading(true);
    try {
      const res = await fetch(`/api/transfers/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: reason }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Transfer request rejected successfully!");
        fetchData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveBooking = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("Booking request approved successfully!");
        fetchData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectBooking = async (id: string) => {
    const reason = prompt("Enter reason for rejection:") || "Rejected by Department Head";
    setActionLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: reason }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Booking request rejected successfully!");
        fetchData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingForm),
      });
      const data = await res.json();
      if (data.success) {
        alert("Resource Booking requested successfully!");
        setBookingForm({
          assetId: "",
          title: "",
          purpose: "OTHER",
          audience: "INDIVIDUAL",
          startAt: "",
          endAt: "",
          notes: "",
          locationNote: "",
        });
        fetchData();
      } else {
        alert(`Error: ${data.error || "Failed to book resource"}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRaiseMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(maintenanceForm),
      });
      const data = await res.json();
      if (data.success) {
        alert("Maintenance request filed successfully!");
        setMaintenanceForm({
          assetId: "",
          issueTitle: "",
          issueDescription: "",
          priority: "MEDIUM",
        });
        fetchData();
      } else {
        alert(`Error: ${data.error || "Failed to raise maintenance"}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // Scoped metrics logic for Charts
  const calculateUtilization = () => {
    if (!kpis) return 0;
    const total = kpis.totalAssets || 1;
    return Math.round((kpis.allocatedAssets / total) * 100);
  };

  const getAssetsByEmployee = () => {
    // Generate allocation distribution map
    const distribution: Record<string, number> = {};
    assets.forEach((a) => {
      // Find current active allocations
      if (a.status === "ALLOCATED") {
        distribution["Allocated"] = (distribution["Allocated"] || 0) + 1;
      } else {
        distribution["Available"] = (distribution["Available"] || 0) + 1;
      }
    });
    return Object.entries(distribution).map(([label, count]) => ({ label, count }));
  };

  const getAssetValuation = () => {
    return assets.reduce((sum, asset) => sum + Number(asset.acquisitionCost || 0), 0);
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Sidebar Navigation */}
      <Sidebar activePage={tab === "dashboard" ? "dashboard" : tab} />

      {/* Main Content Area */}
      <main className="ml-64 min-h-screen px-container-padding py-12 flex flex-col justify-between">
        <div>
          {/* Header Bar */}
          <Header section={tab === "dashboard" ? "Dashboard" : tab.toUpperCase()} />

          {loading ? (
            <div className="py-24 text-center font-label-mono text-xs uppercase tracking-widest text-secondary">
              Synchronizing department parameters...
            </div>
          ) : (
            <>
              {/* -----------------------------------------------------------
                  TAB: DASHBOARD OVERVIEW
                 ----------------------------------------------------------- */}
              {tab === "dashboard" && (
                <div>
                  <header className="mb-section-margin">
                    <div className="font-label-mono text-label-mono text-secondary uppercase tracking-[0.2em] mb-2 flex items-center text-xs font-semibold">
                      <span className="text-primary font-bold">§ 01</span>
                      <span className="mx-2 opacity-30">·</span>
                      DEPARTMENT CONSOLE OVERVIEW
                    </div>
                    <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                      Control <span className="font-display-lg-italic italic font-light text-primary font-normal">center</span>.
                    </h1>
                  </header>

                  {/* KPI Cards Strip */}
                  <section className="mb-section-margin grid grid-cols-1 md:grid-cols-5 gap-4 border-y border-border-hairline divide-y md:divide-y-0 md:divide-x divide-border-hairline bg-surface">
                    <div className="p-6 group hover:bg-surface-container-low transition-colors duration-200">
                      <span className="font-label-mono text-label-mono text-secondary uppercase tracking-widest block mb-4 text-xs font-semibold">
                        Dept Assets
                      </span>
                      <div className="font-stat-kpi text-4xl text-on-surface font-bold tracking-tight">
                        <AnimatedCounter target={kpis?.totalAssets || 0} />
                      </div>
                      <div className="mt-4 text-secondary text-[10px] font-label-mono uppercase">
                        Registered inventory
                      </div>
                    </div>

                    <div className="p-6 group hover:bg-surface-container-low transition-colors duration-200">
                      <span className="font-label-mono text-label-mono text-secondary uppercase tracking-widest block mb-4 text-xs font-semibold">
                        Active Bookings
                      </span>
                      <div className="font-stat-kpi text-4xl text-on-surface font-bold tracking-tight">
                        <AnimatedCounter target={kpis?.activeBookings || 0} />
                      </div>
                      <div className="mt-4 text-secondary text-[10px] font-label-mono uppercase">
                        Resource leases
                      </div>
                    </div>

                    <div className="p-6 group hover:bg-surface-container-low transition-colors duration-200">
                      <span className="font-label-mono text-label-mono text-secondary uppercase tracking-widest block mb-4 text-xs font-semibold">
                        Maintenance Requests
                      </span>
                      <div className="font-stat-kpi text-4xl text-on-surface font-bold tracking-tight">
                        <AnimatedCounter target={kpis?.underMaintenance || 0} />
                      </div>
                      <div className="mt-4 text-secondary text-[10px] font-label-mono uppercase">
                        Active repairs
                      </div>
                    </div>

                    <div className="p-6 group hover:bg-surface-container-low transition-colors duration-200">
                      <span className="font-label-mono text-label-mono text-secondary uppercase tracking-widest block mb-4 text-xs font-semibold">
                        Overdue Returns
                      </span>
                      <div className="font-stat-kpi text-4xl text-error font-bold tracking-tight">
                        <AnimatedCounter target={kpis?.overdueReturns || 0} />
                      </div>
                      <div className="mt-4 text-error text-[10px] font-label-mono uppercase">
                        Holdings overdue
                      </div>
                    </div>

                    <div className="p-6 group hover:bg-surface-container-low transition-colors duration-200">
                      <span className="font-label-mono text-label-mono text-secondary uppercase tracking-widest block mb-4 text-xs font-semibold">
                        Total Valuation
                      </span>
                      <div className="font-stat-kpi text-4xl text-on-surface font-bold tracking-tight">
                        ${getAssetValuation().toLocaleString()}
                      </div>
                      <div className="mt-4 text-secondary text-[10px] font-label-mono uppercase">
                        Acquisition asset value
                      </div>
                    </div>
                  </section>

                  {/* Main Grid: Visualizations & Approvals */}
                  <div className="grid grid-cols-12 gap-gutter mb-section-margin items-start">
                    {/* Left: Quick Actions & Utilization Chart (4 cols) */}
                    <div className="col-span-12 lg:col-span-4 space-y-6">
                      {/* Quick Actions */}
                      <div className="p-6 border border-border-hairline bg-surface">
                        <div className="font-label-mono text-label-mono text-secondary uppercase tracking-widest mb-4 text-xs font-semibold">
                          § 02 · Console Actions
                        </div>
                        <div className="flex flex-col gap-3">
                          <button
                            onClick={() => router.push("/dashboard?tab=bookings")}
                            className="flex items-center justify-between w-full bg-primary text-on-primary px-5 py-4 rounded-none transition-all hover:bg-opacity-90 cursor-pointer text-xs font-label-mono uppercase tracking-widest text-white"
                          >
                            Book Resource
                            <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                          </button>
                          <button
                            onClick={() => router.push("/dashboard?tab=maintenance")}
                            className="flex items-center justify-between w-full border border-border-hairline bg-surface text-on-surface px-5 py-4 rounded-none transition-all hover:border-primary cursor-pointer text-xs font-label-mono uppercase tracking-widest"
                          >
                            Raise Maintenance
                            <span className="material-symbols-outlined text-[18px]">build</span>
                          </button>
                          <button
                            onClick={() => router.push("/dashboard?tab=reports")}
                            className="flex items-center justify-between w-full border border-border-hairline bg-surface text-on-surface px-5 py-4 rounded-none transition-all hover:border-primary cursor-pointer text-xs font-label-mono uppercase tracking-widest"
                          >
                            Generate Report
                            <span className="material-symbols-outlined text-[18px]">analytics</span>
                          </button>
                        </div>
                      </div>

                      {/* Utilization Chart */}
                      <div className="p-6 border border-border-hairline bg-surface">
                        <div className="font-label-mono text-label-mono text-secondary uppercase tracking-widest mb-4 text-xs font-semibold">
                          § 03 · Asset Utilization
                        </div>
                        <div className="flex items-center gap-4 mb-4">
                          <div className="text-4xl font-bold font-stat-kpi">{calculateUtilization()}%</div>
                          <div className="text-xs text-secondary font-label-mono uppercase">
                            Allocated vs Stock
                          </div>
                        </div>
                        <div className="w-full h-4 bg-surface-container-high relative border border-border-hairline">
                          <div
                            style={{ width: `${calculateUtilization()}%` }}
                            className="h-full bg-primary transition-all duration-700"
                          ></div>
                        </div>
                        <div className="mt-4 flex justify-between text-[10px] text-secondary font-label-mono uppercase">
                          <span>Allocated: {kpis?.allocatedAssets}</span>
                          <span>Available: {kpis?.availableAssets}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Approvals Panels (8 cols) */}
                    <div className="col-span-12 lg:col-span-8 space-y-6">
                      <div className="font-label-mono text-label-mono text-secondary uppercase tracking-widest mb-2 text-xs font-semibold">
                        § 04 · Pending Department Approvals
                      </div>
                      
                      {/* Transfer Requests */}
                      <div className="bg-surface border border-border-hairline p-6">
                        <h3 className="font-semibold text-sm uppercase tracking-wider mb-4 border-b border-border-hairline pb-2 flex justify-between">
                          <span>Transfer Approvals</span>
                          <span className="text-xs text-primary font-bold">({transfers.length} pending)</span>
                        </h3>
                        {transfers.length === 0 ? (
                          <p className="text-secondary text-xs italic">No transfer requests pending department review.</p>
                        ) : (
                          <div className="divide-y divide-border-hairline max-h-60 overflow-y-auto custom-scrollbar">
                            {transfers.map((req) => (
                              <div key={req.id} className="py-4 flex justify-between items-center text-xs">
                                <div>
                                  <div className="font-bold">{req.asset.name} ({req.asset.assetTag})</div>
                                  <div className="text-secondary mt-1">
                                    Requested by: {req.requestedBy.firstName} {req.requestedBy.lastName}
                                  </div>
                                  <div className="text-secondary">
                                    Target: {req.toEmployee ? `${req.toEmployee.firstName} ${req.toEmployee.lastName}` : req.toDepartment?.name}
                                  </div>
                                  <div className="italic text-on-surface-variant mt-1">"Reason: {req.reason}"</div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleApproveTransfer(req.id)}
                                    disabled={actionLoading}
                                    className="bg-primary text-white px-3 py-1.5 font-label-mono uppercase text-[10px] tracking-wider cursor-pointer hover:bg-opacity-90 text-white"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectTransfer(req.id)}
                                    disabled={actionLoading}
                                    className="border border-border-hairline text-on-surface px-3 py-1.5 font-label-mono uppercase text-[10px] tracking-wider cursor-pointer hover:border-primary"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Booking Requests */}
                      <div className="bg-surface border border-border-hairline p-6">
                        <h3 className="font-semibold text-sm uppercase tracking-wider mb-4 border-b border-border-hairline pb-2 flex justify-between">
                          <span>Resource Booking Approvals</span>
                          <span className="text-xs text-primary font-bold">({bookings.length} pending)</span>
                        </h3>
                        {bookings.length === 0 ? (
                          <p className="text-secondary text-xs italic">No booking requests pending review.</p>
                        ) : (
                          <div className="divide-y divide-border-hairline max-h-60 overflow-y-auto custom-scrollbar">
                            {bookings.map((req) => (
                              <div key={req.id} className="py-4 flex justify-between items-center text-xs">
                                <div>
                                  <div className="font-bold">{req.title}</div>
                                  <div className="text-secondary mt-1">
                                    Asset: {req.asset.name}
                                  </div>
                                  <div className="text-secondary">
                                    Requested by: {req.bookedBy.firstName} {req.bookedBy.lastName}
                                  </div>
                                  <div className="text-[10px] text-secondary mt-1 font-label-mono">
                                    {new Date(req.startAt).toLocaleString()} — {new Date(req.endAt).toLocaleString()}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleApproveBooking(req.id)}
                                    disabled={actionLoading}
                                    className="bg-primary text-white px-3 py-1.5 font-label-mono uppercase text-[10px] tracking-wider cursor-pointer hover:bg-opacity-90 text-white"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectBooking(req.id)}
                                    disabled={actionLoading}
                                    className="border border-border-hairline text-on-surface px-3 py-1.5 font-label-mono uppercase text-[10px] tracking-wider cursor-pointer hover:border-primary"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Activity Section */}
                  <section className="col-span-12">
                    <div className="font-label-mono text-label-mono text-secondary uppercase tracking-widest mb-4 text-xs font-semibold">
                      § 05 · Department Activity Stream
                    </div>
                    <div className="bg-surface border border-border-hairline">
                      <div className="divide-y divide-border-hairline max-h-80 overflow-y-auto custom-scrollbar">
                        {recentActivities.length === 0 ? (
                          <div className="p-8 text-center text-secondary text-xs italic">
                            No recent logs in the department activity trail.
                          </div>
                        ) : (
                          recentActivities.map((act) => (
                            <div key={act.id} className="p-5 flex items-center text-xs">
                              <span className="material-symbols-outlined text-primary mr-4 text-lg">notifications</span>
                              <div className="flex-1">
                                <div className="flex justify-between items-center">
                                  <span className="font-semibold text-on-surface">{act.action.replace("_", " ")}</span>
                                  <span className="text-[10px] text-secondary font-label-mono">
                                    {new Date(act.occurredAt).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-secondary mt-1">{act.description}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* -----------------------------------------------------------
                  TAB: DEPARTMENT ASSETS
                 ----------------------------------------------------------- */}
              {tab === "assets" && (
                <div>
                  <header className="mb-section-margin">
                    <div className="font-label-mono text-secondary uppercase tracking-[0.2em] mb-2 text-xs font-semibold">
                      § 02 · REGISTERED DEPARTMENT ASSETS
                    </div>
                    <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                      Department <span className="font-display-lg-italic italic font-light text-primary font-normal">assets</span>.
                    </h1>
                  </header>

                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <input
                      type="text"
                      placeholder="Search assets by tag, name or serial..."
                      value={assetSearch}
                      onChange={(e) => setAssetSearch(e.target.value)}
                      className="flex-1 border border-border-hairline p-3 text-xs bg-white focus:outline-none focus:border-primary"
                    />
                    <select
                      value={assetStatusFilter}
                      onChange={(e) => setAssetStatusFilter(e.target.value)}
                      className="border border-border-hairline p-3 text-xs bg-white focus:outline-none focus:border-primary font-label-mono uppercase"
                    >
                      <option value="">All Statuses</option>
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="ALLOCATED">ALLOCATED</option>
                      <option value="RESERVED">RESERVED</option>
                      <option value="UNDER_MAINTENANCE">UNDER MAINTENANCE</option>
                      <option value="LOST">LOST</option>
                      <option value="RETIRED">RETIRED</option>
                    </select>
                  </div>

                  {/* Assets Table */}
                  <div className="bg-surface border border-border-hairline overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border-hairline font-label-mono uppercase text-secondary">
                          <th className="p-4">Tag</th>
                          <th className="p-4">Name</th>
                          <th className="p-4">Category</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Condition</th>
                          <th className="p-4">Cost</th>
                          <th className="p-4">Location</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-hairline">
                        {assets
                          .filter((a) => {
                            const matchSearch =
                              a.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
                              a.assetTag.toLowerCase().includes(assetSearch.toLowerCase()) ||
                              (a.serialNumber && a.serialNumber.toLowerCase().includes(assetSearch.toLowerCase()));
                            const matchStatus = assetStatusFilter ? a.status === assetStatusFilter : true;
                            return matchSearch && matchStatus;
                          })
                          .map((a) => (
                            <tr key={a.id} className="hover:bg-surface-container-low transition-colors">
                              <td className="p-4 font-label-mono font-bold">{a.assetTag}</td>
                              <td className="p-4 font-semibold">{a.name}</td>
                              <td className="p-4 text-secondary">{a.category?.name}</td>
                              <td className="p-4 font-label-mono text-[10px]">
                                <span
                                  className={`px-2 py-1 ${
                                    a.status === "AVAILABLE"
                                      ? "bg-green-100 text-green-800"
                                      : a.status === "ALLOCATED"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {a.status}
                                </span>
                              </td>
                              <td className="p-4">{a.condition}</td>
                              <td className="p-4 font-label-mono">${Number(a.acquisitionCost || 0).toLocaleString()}</td>
                              <td className="p-4 text-secondary">{a.location || "N/A"}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* -----------------------------------------------------------
                  TAB: EMPLOYEES
                 ----------------------------------------------------------- */}
              {tab === "employees" && (
                <div>
                  <header className="mb-section-margin">
                    <div className="font-label-mono text-secondary uppercase tracking-[0.2em] mb-2 text-xs font-semibold">
                      § 03 · DEPARTMENT EMPLOYEES DIRECTORY
                    </div>
                    <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                      Our <span className="font-display-lg-italic italic font-light text-primary font-normal">team</span>.
                    </h1>
                  </header>

                  {/* Search Bar */}
                  <input
                    type="text"
                    placeholder="Search employees by code, name, designation, role..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="w-full border border-border-hairline p-3 text-xs bg-white focus:outline-none focus:border-primary mb-6"
                  />

                  {/* Employees Table */}
                  <div className="bg-surface border border-border-hairline overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border-hairline font-label-mono uppercase text-secondary">
                          <th className="p-4">Code</th>
                          <th className="p-4">Name</th>
                          <th className="p-4">Designation</th>
                          <th className="p-4">Role</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Joined Date</th>
                          <th className="p-4">Email</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-hairline">
                        {employees
                          .filter((e) => {
                            const nameStr = `${e.firstName} ${e.lastName}`.toLowerCase();
                            return (
                              e.employeeCode.toLowerCase().includes(employeeSearch.toLowerCase()) ||
                              nameStr.includes(employeeSearch.toLowerCase()) ||
                              (e.designation && e.designation.toLowerCase().includes(employeeSearch.toLowerCase())) ||
                              (e.user?.role && e.user.role.toLowerCase().includes(employeeSearch.toLowerCase()))
                            );
                          })
                          .map((e) => (
                            <tr key={e.id} className="hover:bg-surface-container-low transition-colors">
                              <td className="p-4 font-label-mono font-bold">{e.employeeCode}</td>
                              <td className="p-4 font-semibold">
                                {e.firstName} {e.lastName}
                              </td>
                              <td className="p-4 text-secondary">{e.designation || "N/A"}</td>
                              <td className="p-4 font-label-mono text-[10px]">
                                <span className={`px-2 py-1 uppercase tracking-wider ${
                                  e.user?.role === "ADMIN" ? "bg-error-container text-on-error-container" :
                                  e.user?.role === "ASSET_MANAGER" ? "bg-status-available/20 text-on-primary-container" :
                                  e.user?.role === "DEPARTMENT_HEAD" ? "bg-status-allocated/20 text-on-secondary-container" :
                                  "bg-surface-container-high text-secondary"
                                }`}>
                                  {(e.user?.role || "EMPLOYEE").replace(/_/g, " ")}
                                </span>
                              </td>
                              <td className="p-4 font-label-mono text-[10px]">
                                <span className="px-2 py-1 bg-green-100 text-green-800">{e.status}</span>
                              </td>
                              <td className="p-4 font-label-mono">{new Date(e.joinedAt).toLocaleDateString()}</td>
                              <td className="p-4 text-secondary">{e.user?.email || "N/A"}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* -----------------------------------------------------------
                  TAB: TRANSFERS
                 ----------------------------------------------------------- */}
              {tab === "transfers" && (
                <div>
                  <header className="mb-section-margin">
                    <div className="font-label-mono text-secondary uppercase tracking-[0.2em] mb-2 text-xs font-semibold">
                      § 04 · ASSET TRANSFERS LOG
                    </div>
                    <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                      Asset <span className="font-display-lg-italic italic font-light text-primary font-normal">transfers</span>.
                    </h1>
                  </header>

                  <div className="bg-surface border border-border-hairline p-6">
                    {transfers.length === 0 ? (
                      <p className="text-secondary text-xs italic">No transfer requests logged.</p>
                    ) : (
                      <div className="divide-y divide-border-hairline">
                        {transfers.map((req) => (
                          <div key={req.id} className="py-4 flex justify-between items-center text-xs">
                            <div>
                              <div className="font-bold">{req.asset.name} ({req.asset.assetTag})</div>
                              <div className="text-secondary mt-1">
                                Requester: {req.requestedBy.firstName} {req.requestedBy.lastName}
                              </div>
                              <div className="text-secondary">
                                Transfer target: {req.toEmployee ? `${req.toEmployee.firstName} ${req.toEmployee.lastName}` : req.toDepartment?.name}
                              </div>
                              <div className="italic text-on-surface-variant mt-1">Reason: "{req.reason}"</div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-label-mono uppercase text-[10px] px-2 py-1 bg-amber-100 text-amber-800">
                                {req.status}
                              </span>
                              {req.status === "PENDING" && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleApproveTransfer(req.id)}
                                    className="bg-primary text-white px-3 py-1 font-label-mono text-[10px] text-white"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectTransfer(req.id)}
                                    className="border border-border-hairline px-3 py-1 font-label-mono text-[10px]"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* -----------------------------------------------------------
                  TAB: BOOKINGS
                 ----------------------------------------------------------- */}
              {tab === "bookings" && (
                <div className="grid grid-cols-12 gap-gutter items-start">
                  <div className="col-span-12 lg:col-span-8">
                    <header className="mb-section-margin">
                      <div className="font-label-mono text-secondary uppercase tracking-[0.2em] mb-2 text-xs font-semibold">
                        § 05 · ACTIVE RESOURCE BOOKINGS
                      </div>
                      <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                        Shared <span className="font-display-lg-italic italic font-light text-primary font-normal">reservations</span>.
                      </h1>
                    </header>

                    <div className="bg-surface border border-border-hairline p-6">
                      {bookings.length === 0 ? (
                        <p className="text-secondary text-xs italic">No active bookings registered.</p>
                      ) : (
                        <div className="divide-y divide-border-hairline">
                          {bookings.map((b) => (
                            <div key={b.id} className="py-4 flex justify-between items-center text-xs">
                              <div>
                                <div className="font-bold">{b.title}</div>
                                <div className="text-secondary mt-1">Asset: {b.asset.name}</div>
                                <div className="text-secondary">Booked by: {b.bookedBy.firstName} {b.bookedBy.lastName}</div>
                                <div className="text-[10px] text-secondary mt-1 font-label-mono">
                                  {new Date(b.startAt).toLocaleString()} — {new Date(b.endAt).toLocaleString()}
                                </div>
                              </div>
                              <span className="font-label-mono uppercase text-[10px] px-2 py-1 bg-blue-100 text-blue-800">
                                {b.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Booking form side card */}
                  <div className="col-span-12 lg:col-span-4 bg-surface border border-border-hairline p-6">
                    <h3 className="font-label-mono text-xs uppercase tracking-widest text-secondary mb-4 font-semibold">
                      Book Department Resource
                    </h3>
                    <form onSubmit={handleCreateBooking} className="space-y-4 text-xs">
                      <div>
                        <label className="block text-secondary mb-1">Asset to Book</label>
                        <select
                          required
                          value={bookingForm.assetId}
                          onChange={(e) => setBookingForm({ ...bookingForm, assetId: e.target.value })}
                          className="w-full border border-border-hairline p-2 bg-white"
                        >
                          <option value="">Select Asset...</option>
                          {bookableAssets.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              {asset.name} ({asset.assetTag})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-secondary mb-1">Booking Title</label>
                        <input
                          type="text"
                          required
                          value={bookingForm.title}
                          onChange={(e) => setBookingForm({ ...bookingForm, title: e.target.value })}
                          className="w-full border border-border-hairline p-2"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-secondary mb-1">Purpose</label>
                          <select
                            value={bookingForm.purpose}
                            onChange={(e) => setBookingForm({ ...bookingForm, purpose: e.target.value as any })}
                            className="w-full border border-border-hairline p-2 bg-white"
                          >
                            <option value="ROOM">ROOM</option>
                            <option value="VEHICLE">VEHICLE</option>
                            <option value="EQUIPMENT">EQUIPMENT</option>
                            <option value="SPACE">SPACE</option>
                            <option value="OTHER">OTHER</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-secondary mb-1">Audience</label>
                          <select
                            value={bookingForm.audience}
                            onChange={(e) => setBookingForm({ ...bookingForm, audience: e.target.value as any })}
                            className="w-full border border-border-hairline p-2 bg-white"
                          >
                            <option value="INDIVIDUAL">INDIVIDUAL</option>
                            <option value="DEPARTMENT">DEPARTMENT</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-secondary mb-1">Start Date &amp; Time</label>
                        <input
                          type="datetime-local"
                          required
                          value={bookingForm.startAt}
                          onChange={(e) => setBookingForm({ ...bookingForm, startAt: e.target.value })}
                          className="w-full border border-border-hairline p-2"
                        />
                      </div>
                      <div>
                        <label className="block text-secondary mb-1">End Date &amp; Time</label>
                        <input
                          type="datetime-local"
                          required
                          value={bookingForm.endAt}
                          onChange={(e) => setBookingForm({ ...bookingForm, endAt: e.target.value })}
                          className="w-full border border-border-hairline p-2"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="w-full bg-primary text-white py-3 font-label-mono uppercase tracking-widest text-white hover:bg-opacity-90"
                      >
                        File Request
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* -----------------------------------------------------------
                  TAB: MAINTENANCE
                 ----------------------------------------------------------- */}
              {tab === "maintenance" && (
                <div className="grid grid-cols-12 gap-gutter items-start">
                  <div className="col-span-12 lg:col-span-8">
                    <header className="mb-section-margin">
                      <div className="font-label-mono text-secondary uppercase tracking-[0.2em] mb-2 text-xs font-semibold">
                        § 06 · MAINTENANCE WORK ORDERS
                      </div>
                      <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                        Repair <span className="font-display-lg-italic italic font-light text-primary font-normal">orders</span>.
                      </h1>
                    </header>

                    <div className="bg-surface border border-border-hairline p-6">
                      {maintenance.length === 0 ? (
                        <p className="text-secondary text-xs italic">No maintenance tickets filed.</p>
                      ) : (
                        <div className="divide-y divide-border-hairline">
                          {maintenance.map((m) => (
                            <div key={m.id} className="py-4 text-xs">
                              <div className="flex justify-between items-start">
                                <span className="font-bold">{m.issueTitle}</span>
                                <span className={`px-2 py-0.5 text-[10px] font-label-mono ${
                                  m.status === "PENDING" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
                                }`}>
                                  {m.status}
                                </span>
                              </div>
                              <p className="text-secondary mt-1">{m.issueDescription}</p>
                              <div className="flex gap-4 mt-2 text-[10px] text-secondary font-label-mono uppercase">
                                <span>Asset: {m.asset.name} ({m.asset.assetTag})</span>
                                <span>Priority: {m.priority}</span>
                                <span>Raised: {new Date(m.requestedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Raise maintenance card */}
                  <div className="col-span-12 lg:col-span-4 bg-surface border border-border-hairline p-6">
                    <h3 className="font-label-mono text-xs uppercase tracking-widest text-secondary mb-4 font-semibold">
                      File New Repair Order
                    </h3>
                    <form onSubmit={handleRaiseMaintenance} className="space-y-4 text-xs">
                      <div>
                        <label className="block text-secondary mb-1">Asset requiring repair</label>
                        <select
                          required
                          value={maintenanceForm.assetId}
                          onChange={(e) => setMaintenanceForm({ ...maintenanceForm, assetId: e.target.value })}
                          className="w-full border border-border-hairline p-2 bg-white"
                        >
                          <option value="">Select Asset...</option>
                          {assets.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              {asset.name} ({asset.assetTag})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-secondary mb-1">Issue Summary</label>
                        <input
                          type="text"
                          required
                          value={maintenanceForm.issueTitle}
                          onChange={(e) => setMaintenanceForm({ ...maintenanceForm, issueTitle: e.target.value })}
                          className="w-full border border-border-hairline p-2"
                        />
                      </div>
                      <div>
                        <label className="block text-secondary mb-1">Detailed Description</label>
                        <textarea
                          required
                          rows={4}
                          value={maintenanceForm.issueDescription}
                          onChange={(e) => setMaintenanceForm({ ...maintenanceForm, issueDescription: e.target.value })}
                          className="w-full border border-border-hairline p-2"
                        />
                      </div>
                      <div>
                        <label className="block text-secondary mb-1">Priority</label>
                        <select
                          value={maintenanceForm.priority}
                          onChange={(e) => setMaintenanceForm({ ...maintenanceForm, priority: e.target.value as any })}
                          className="w-full border border-border-hairline p-2 bg-white"
                        >
                          <option value="LOW">LOW</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="HIGH">HIGH</option>
                          <option value="CRITICAL">CRITICAL</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="w-full bg-primary text-white py-3 font-label-mono uppercase tracking-widest text-white hover:bg-opacity-90"
                      >
                        Raise Work Order
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* -----------------------------------------------------------
                  TAB: REPORTS
                 ----------------------------------------------------------- */}
              {tab === "reports" && (
                <div>
                  <header className="mb-section-margin">
                    <div className="font-label-mono text-secondary uppercase tracking-[0.2em] mb-2 text-xs font-semibold">
                      § 07 · DEPARTMENT ANALYTICAL REPORT
                    </div>
                    <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                      Departmental <span className="font-display-lg-italic italic font-light text-primary font-normal">audits</span>.
                    </h1>
                  </header>

                  <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="p-6 bg-surface border border-border-hairline">
                      <span className="text-secondary font-label-mono text-[10px] uppercase block mb-2">Total Capital Valuation</span>
                      <div className="text-3xl font-bold font-stat-kpi">${getAssetValuation().toLocaleString()}</div>
                    </div>
                    <div className="p-6 bg-surface border border-border-hairline">
                      <span className="text-secondary font-label-mono text-[10px] uppercase block mb-2">Average Asset Value</span>
                      <div className="text-3xl font-bold font-stat-kpi">
                        ${assets.length ? Math.round(getAssetValuation() / assets.length).toLocaleString() : 0}
                      </div>
                    </div>
                    <div className="p-6 bg-surface border border-border-hairline">
                      <span className="text-secondary font-label-mono text-[10px] uppercase block mb-2">Total Asset Count</span>
                      <div className="text-3xl font-bold font-stat-kpi">{assets.length}</div>
                    </div>
                  </section>

                  {/* Cost profiles bar charts */}
                  <div className="bg-surface border border-border-hairline p-6">
                    <h3 className="font-label-mono text-xs uppercase tracking-wider mb-6 font-semibold">
                      Asset Category Distribution
                    </h3>
                    <div className="space-y-4 text-xs">
                      {getAssetsByEmployee().map((item, idx) => {
                        const max = assets.length || 1;
                        const pct = Math.round((item.count / max) * 100);
                        return (
                          <div key={idx}>
                            <div className="flex justify-between font-label-mono uppercase mb-1">
                              <span>{item.label}</span>
                              <span>{item.count} items ({pct}%)</span>
                            </div>
                            <div className="w-full h-3 bg-surface-container-high relative border border-border-hairline">
                              <div style={{ width: `${pct}%` }} className="h-full bg-primary"></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* -----------------------------------------------------------
                  TAB: NOTIFICATIONS
                 ----------------------------------------------------------- */}
              {tab === "notifications" && (
                <div>
                  <header className="mb-section-margin flex justify-between items-end">
                    <div>
                      <div className="font-label-mono text-secondary uppercase tracking-[0.2em] mb-2 text-xs font-semibold">
                        § 08 · CONSOLE NOTIFICATIONS FEED
                      </div>
                      <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                        Inbox <span className="font-display-lg-italic italic font-light text-primary font-normal">alerts</span>.
                      </h1>
                    </div>
                    <button
                      onClick={handleMarkAllNotificationsRead}
                      className="px-4 py-2 border border-border-hairline text-xs font-label-mono uppercase tracking-widest hover:border-primary cursor-pointer bg-white"
                    >
                      Mark all as read
                    </button>
                  </header>

                  <div className="bg-surface border border-border-hairline">
                    <div className="divide-y divide-border-hairline max-h-[500px] overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-secondary text-xs italic">
                          No notifications found.
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => notif.status === "UNREAD" && handleMarkNotificationRead(notif.id)}
                            className={`p-6 flex items-start justify-between cursor-pointer transition-colors hover:bg-surface-container-low ${
                              notif.status === "UNREAD" ? "bg-primary-fixed/5 font-semibold" : ""
                            }`}
                          >
                            <div className="flex gap-4">
                              <span className={`material-symbols-outlined mt-0.5 ${
                                notif.status === "UNREAD" ? "text-primary" : "text-secondary"
                              }`}>
                                {notif.type === "OVERDUE_RETURN" ? "warning" : "info"}
                              </span>
                              <div>
                                <h4 className="text-xs">{notif.title}</h4>
                                <p className="text-secondary text-xs mt-1">{notif.message}</p>
                                <span className="text-[10px] text-secondary font-label-mono block mt-1">
                                  {new Date(notif.sentAt).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            {notif.status === "UNREAD" && (
                              <span className="w-2.5 h-2.5 bg-primary rounded-full mt-1.5 flex-shrink-0"></span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* -----------------------------------------------------------
                  TAB: PROFILE
                 ----------------------------------------------------------- */}
              {tab === "profile" && (
                <div>
                  <header className="mb-section-margin">
                    <div className="font-label-mono text-secondary uppercase tracking-[0.2em] mb-2 text-xs font-semibold">
                      § 09 · USER PROFILE DETAILS
                    </div>
                    <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                      My <span className="font-display-lg-italic italic font-light text-primary font-normal">credentials</span>.
                    </h1>
                  </header>

                  <div className="bg-surface border border-border-hairline p-8 max-w-2xl text-xs space-y-6">
                    <div className="flex items-center gap-6 pb-6 border-b border-border-hairline">
                      <div className="w-16 h-16 bg-primary-fixed flex items-center justify-center text-primary text-2xl font-bold">
                        {employee.firstName[0]}{employee.lastName[0]}
                      </div>
                      <div>
                        <h2 className="text-base font-bold">{employee.firstName} {employee.lastName}</h2>
                        <p className="text-secondary font-label-mono uppercase text-[10px] mt-1">{employee.designation || "Department Head"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-secondary block mb-1">Employee Code</span>
                        <span className="font-semibold font-label-mono">{employee.employeeCode}</span>
                      </div>
                      <div>
                        <span className="text-secondary block mb-1">System Role</span>
                        <span className="font-semibold font-label-mono">{user.role}</span>
                      </div>
                      <div>
                        <span className="text-secondary block mb-1">Email Address</span>
                        <span className="font-semibold">{user.email}</span>
                      </div>
                      <div>
                        <span className="text-secondary block mb-1">Contact Phone</span>
                        <span className="font-semibold">{employee.phone || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-secondary block mb-1">Join Date</span>
                        <span className="font-semibold font-label-mono">{new Date(employee.joinedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-section-margin pt-12 border-t border-border-hairline flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-12">
          <div className="space-y-1">
            <div className="font-section-number text-[18px] text-on-surface font-semibold">
              AssetFlow
            </div>
            <p className="font-label-mono text-[11px] text-secondary uppercase tracking-widest font-semibold">
              © 2026 AssetFlow Systems. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
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
  const [kpis, setKpis] = useState<any | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [custody, setCustody] = useState<any[]>([]);
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
      const kpiRes = await fetch("/api/dashboard/kpis");
      if (kpiRes.status === 200) {
        const kpiData = await kpiRes.json();
        if (kpiData.success) {
          setKpis(kpiData.kpis);
        }
      }

      const actRes = await fetch("/api/dashboard/recent-activity?limit=10");
      if (actRes.status === 200) {
        const actData = await actRes.json();
        if (actData.success) {
          setActivities(actData.activities);
        }
      }

      if (role === "EMPLOYEE") {
        const allocRes = await fetch("/api/allocations/my");
        if (allocRes.status === 200) {
          const allocData = await allocRes.json();
          if (allocData.success) {
            setCustody(allocData.allocations);
          }
        }
      }

      // Fetch Overdue and Upcoming returns if Admin / Asset Manager
      if (role === "ADMIN" || role === "ASSET_MANAGER") {
        const overdueRes = await fetch("/api/dashboard/overdue-returns?limit=10");
        if (overdueRes.status === 200) {
          const overdueData = await overdueRes.json();
          if (overdueData.success) {
            setOverdueReturns(overdueData.overdueAllocations || []);
          }
        }

        const upcomingRes = await fetch("/api/dashboard/upcoming-returns?limit=10&days=7");
        if (upcomingRes.status === 200) {
          const upcomingData = await upcomingRes.json();
          if (upcomingData.success) {
            setUpcomingReturns(upcomingData.upcomingAllocations || []);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load dashboard data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && role !== "DEPARTMENT_HEAD") {
      fetchDashboardData();
    }
  }, [user, role]);

  if (authLoading || (loading && role !== "DEPARTMENT_HEAD")) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-label-mono text-xs uppercase tracking-widest text-secondary">
        Initializing Workspace...
      </div>
    );
  }

  // Intercept and load custom DEPARTMENT_HEAD Console Dashboard
  if (user && role === "DEPARTMENT_HEAD" && user.employee) {
    return (
      <DepartmentHeadConsole
        departmentId={user.employee.departmentId || ""}
        user={user}
        employee={user.employee}
      />
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
                  {role === "EMPLOYEE" ? (
                    <>
                      <Link href="/bookings">
                        <button className="group flex items-center justify-between w-full bg-primary text-on-primary px-6 py-5 rounded-none transition-all hover:bg-opacity-90 cursor-pointer text-xs font-label-mono uppercase tracking-[0.15em] text-white">
                          Reserve Shared Resource
                          <span className="material-symbols-outlined">calendar_today</span>
                        </button>
                      </Link>
                      <Link href="/workflows">
                        <button className="group flex items-center justify-between w-full border border-border-hairline bg-surface text-on-surface px-6 py-5 rounded-none transition-all hover:border-primary cursor-pointer text-xs font-label-mono uppercase tracking-[0.15em]">
                          File Maintenance Ticket
                          <span className="material-symbols-outlined">build</span>
                        </button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link href="/assets">
                        <button className="group flex items-center justify-between w-full bg-primary text-on-primary px-6 py-5 rounded-none transition-all hover:bg-opacity-90 cursor-pointer text-xs font-label-mono uppercase tracking-[0.15em] text-white">
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
                    </>
                  )}
                </div>
              </div>

              {/* Custody Listing Widget */}
              {role === "EMPLOYEE" && (
                <div className="p-gutter border border-border-hairline bg-surface">
                  <div className="font-label-mono text-[10px] text-secondary uppercase tracking-widest mb-4 font-semibold">
                    Items In My Custody
                  </div>
                  {custody.length === 0 ? (
                    <p className="text-secondary text-xs italic">No assets currently allocated to you.</p>
                  ) : (
                    <div className="space-y-4 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                      {custody.map((alloc) => {
                        const isOverdue = alloc.expectedReturnDate && new Date(alloc.expectedReturnDate) < new Date();
                        return (
                          <div key={alloc.id} className="text-xs p-3 border border-border-hairline">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-bold text-on-surface leading-tight">{alloc.asset.name}</span>
                              <span className="font-label-mono text-[10px] uppercase text-secondary bg-surface-container-high px-1.5 py-0.5">{alloc.asset.assetTag}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-secondary font-label-mono">
                              <span>Assigned: {new Date(alloc.allocatedAt).toLocaleDateString()}</span>
                              {alloc.expectedReturnDate ? (
                                <span className={isOverdue ? "text-error font-bold" : ""}>
                                  Due: {new Date(alloc.expectedReturnDate).toLocaleDateString()}
                                </span>
                              ) : (
                                <span>No Return Date</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Overdue & Upcoming Returns Widget (Admin/Asset Manager only) */}
              {(role === "ADMIN" || role === "ASSET_MANAGER") && (
                <div className="p-gutter border border-border-hairline bg-surface space-y-6">
                  <div>
                    <div className="font-label-mono text-[10px] text-error uppercase tracking-widest mb-4 font-semibold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      Overdue Returns ({overdueReturns.length})
                    </div>
                    {overdueReturns.length === 0 ? (
                      <p className="text-secondary text-xs italic">No overdue returns flagged.</p>
                    ) : (
                      <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                        {overdueReturns.map((alloc) => (
                          <div key={alloc.id} className="text-xs p-3 border border-error/20 bg-error-container/5">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-bold text-on-surface leading-tight">{alloc.asset.name}</span>
                              <span className="font-label-mono text-[9px] uppercase text-error bg-error-container/20 px-1.5 py-0.5">{alloc.asset.assetTag}</span>
                            </div>
                            <div className="space-y-1 text-[10px] text-secondary">
                              <p>Holder: <span className="font-bold text-on-surface">{alloc.allocatedToEmployee ? `${alloc.allocatedToEmployee.firstName} ${alloc.allocatedToEmployee.lastName}` : (alloc.allocatedToDepartment ? alloc.allocatedToDepartment.name : '—')}</span></p>
                              <div className="flex justify-between items-center font-label-mono pt-1">
                                <span>Due: <span className="text-error font-bold">{new Date(alloc.expectedReturnDate).toLocaleDateString()}</span></span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border-hairline pt-6">
                    <div className="font-label-mono text-[10px] text-secondary uppercase tracking-widest mb-4 font-semibold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">pending_actions</span>
                      Upcoming Returns (7 Days)
                    </div>
                    {upcomingReturns.length === 0 ? (
                      <p className="text-secondary text-xs italic">No returns expected this week.</p>
                    ) : (
                      <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                        {upcomingReturns.map((alloc) => (
                          <div key={alloc.id} className="text-xs p-3 border border-border-hairline bg-surface-container-lowest">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-bold text-on-surface leading-tight">{alloc.asset.name}</span>
                              <span className="font-label-mono text-[9px] uppercase text-secondary bg-surface-container-high px-1.5 py-0.5">{alloc.asset.assetTag}</span>
                            </div>
                            <div className="space-y-1 text-[10px] text-secondary">
                              <p>Holder: <span className="font-bold text-on-surface">{alloc.allocatedToEmployee ? `${alloc.allocatedToEmployee.firstName} ${alloc.allocatedToEmployee.lastName}` : (alloc.allocatedToDepartment ? alloc.allocatedToDepartment.name : '—')}</span></p>
                              <div className="flex justify-between items-center font-label-mono pt-1">
                                <span>Due: {new Date(alloc.expectedReturnDate).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Recent Activity (8 columns) */}
            <div className="col-span-12 lg:col-span-8">
              <div className="font-label-mono text-label-mono text-secondary uppercase tracking-widest mb-4 text-xs font-semibold">
                § 03 · Recent Activity
              </div>
              <div className="bg-surface border border-border-hairline">
                <div className="divide-y divide-border-hairline max-h-[500px] overflow-y-auto custom-scrollbar">
                  {activities.length === 0 ? (
                    <div className="p-8 text-center text-secondary text-xs italic">
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
                            <span className="font-label-mono text-[11px] text-secondary font-semibold">
                              {new Date(act.occurredAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-on-surface-variant text-sm">
                            {act.description}
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
            <div className="font-section-number text-[18px] text-on-surface font-semibold">
              AssetFlow
            </div>
            <p className="font-label-mono text-[11px] text-secondary uppercase tracking-widest font-semibold">
              © 2026 AssetFlow Systems. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
