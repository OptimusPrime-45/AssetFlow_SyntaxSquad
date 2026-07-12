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
  asset: {
    id: string;
    assetTag: string;
    name: string;
    serialNumber: string | null;
    status: string;
    condition: string;
  };
}

export default function Dashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const [kpis, setKpis] = useState<KPIProps | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [custody, setCustody] = useState<Allocation[]>([]);
  const [overdueReturns, setOverdueReturns] = useState<any[]>([]);
  const [upcomingReturns, setUpcomingReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

      // Fetch Recent Activities
      const actRes = await fetch("/api/dashboard/recent-activity?limit=10");
      if (actRes.status === 200) {
        const actData = await actRes.json();
        if (actData.success) {
          setActivities(actData.activities);
        }
      }

      // Fetch user's custody allocation list if Employee / Department Head
      if (role === "EMPLOYEE" || role === "DEPARTMENT_HEAD") {
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
    if (user) {
      fetchDashboardData();
    }
  }, [user, role]);

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
                    {role === "EMPLOYEE" ? "My Custody" : "Total Assets"}
                  </span>
                  <div className="font-stat-kpi text-stat-kpi text-on-surface font-bold tracking-tight">
                    <AnimatedCounter target={role === "EMPLOYEE" ? kpis.totalAssets : kpis.totalAssets} />
                  </div>
                  <div className="mt-4 flex items-center text-secondary text-xs font-semibold">
                    <span className="font-label-mono uppercase">System Reg</span>
                  </div>
                </div>

                {/* Stat 2 */}
                <div className="p-8 group hover:bg-surface-container-low transition-colors duration-200">
                  <span className="font-label-mono text-label-mono text-secondary uppercase tracking-widest block mb-4 text-xs font-semibold">
                    {role === "EMPLOYEE" ? "Active Bookings" : "Allocated"}
                  </span>
                  <div className="font-stat-kpi text-stat-kpi text-on-surface font-bold tracking-tight">
                    <AnimatedCounter target={role === "EMPLOYEE" ? kpis.activeBookings : kpis.allocatedAssets} />
                  </div>
                  <div className="mt-4 flex items-center text-secondary text-xs font-semibold">
                    <span className="font-label-mono uppercase">
                      {role === "EMPLOYEE" ? "Shared Reservations" : `${((kpis.allocatedAssets / (kpis.totalAssets || 1)) * 100).toFixed(1)}% Utilized`}
                    </span>
                  </div>
                </div>

                {/* Stat 3 */}
                <div className="p-8 group hover:bg-surface-container-low transition-colors duration-200">
                  <span className="font-label-mono text-label-mono text-secondary uppercase tracking-widest block mb-4 text-xs font-semibold">
                    {role === "EMPLOYEE" ? "Active Tickets" : "Available"}
                  </span>
                  <div className="font-stat-kpi text-stat-kpi text-on-surface font-bold tracking-tight">
                    <AnimatedCounter target={role === "EMPLOYEE" ? kpis.underMaintenance : kpis.availableAssets} />
                  </div>
                  <div className="mt-4 flex items-center text-secondary text-xs font-semibold">
                    <span className="font-label-mono uppercase">
                      {role === "EMPLOYEE" ? "Maintenance Work" : "Ready for Deployment"}
                    </span>
                  </div>
                </div>

                {/* Stat 4 */}
                <div className="p-8 group hover:bg-surface-container-low transition-colors duration-200">
                  <span className="font-label-mono text-label-mono text-secondary uppercase tracking-widest block mb-4 text-xs font-semibold">
                    {role === "EMPLOYEE" ? "Pending Transfers" : "Overdue Returns"}
                  </span>
                  <div className="font-stat-kpi text-stat-kpi text-on-surface font-bold tracking-tight">
                    <AnimatedCounter target={role === "EMPLOYEE" ? kpis.pendingTransfers : kpis.overdueReturns} />
                  </div>
                  <div className="mt-4 flex items-center text-xs font-semibold text-error">
                    <span className="font-label-mono uppercase">
                      {role === "EMPLOYEE" ? "Outbound Requests" : `${kpis.overdueReturns} Items Flagged`}
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
                  {role === "EMPLOYEE" ? (
                    <>
                      <Link href="/bookings">
                        <button className="group flex items-center justify-between w-full bg-primary text-on-primary px-6 py-5 rounded-none transition-all hover:bg-opacity-90 cursor-pointer text-xs font-label-mono uppercase tracking-[0.15em]">
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
                    </>
                  )}
                </div>
              </div>

              {/* Custody Listing Widget (For Employees/Heads) */}
              {(role === "EMPLOYEE" || role === "DEPARTMENT_HEAD") && (
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

          {/* Visual Anchor § 04 */}
          <section className="mt-section-margin">
            <div className="font-label-mono text-label-mono text-secondary uppercase tracking-widest mb-4 text-xs font-semibold">
              § 04 · Visual Integrity
            </div>
            <div className="h-64 relative border border-border-hairline overflow-hidden bg-[#1c1b1b] flex items-center justify-center">
              <div className="absolute inset-0 bg-black/5 pointer-events-none"></div>
              <div className="absolute bottom-8 left-8 text-left">
                <h2 className="text-white font-display-lg text-[32px] font-bold leading-tight">
                  Flow Visualization
                  <br />
                  <span className="italic font-display-lg-italic font-light opacity-80 font-normal text-primary-fixed">
                    Real-time assets.
                  </span>
                </h2>
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
            <Link className="font-label-mono text-[11px] text-secondary uppercase tracking-widest hover:text-primary transition-colors" href="#">
              Privacy
            </Link>
            <Link className="font-label-mono text-[11px] text-secondary uppercase tracking-widest hover:text-primary transition-colors" href="#">
              Terms
            </Link>
            <Link className="font-label-mono text-[11px] text-secondary uppercase tracking-widest hover:text-primary transition-colors" href="#">
              Security
            </Link>
            <Link className="font-label-mono text-[11px] text-secondary uppercase tracking-widest hover:text-primary transition-colors" href="#">
              System Status
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
