"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useAuth } from "@/lib/context/AuthContext";

const sparklinesData = {
  today: {
    total: [120, 120, 122, 122, 124, 124, 125],
    allocated: [80, 81, 82, 80, 83, 85, 84],
    available: [38, 37, 38, 40, 39, 37, 39],
    overdue: [2, 2, 3, 2, 1, 2, 2]
  },
  '7days': {
    total: [115, 118, 120, 120, 122, 124, 125],
    allocated: [70, 75, 78, 79, 82, 83, 84],
    available: [42, 40, 39, 38, 37, 39, 39],
    overdue: [4, 3, 3, 2, 2, 1, 2]
  },
  '30days': {
    total: [95, 100, 105, 110, 115, 120, 125],
    allocated: [55, 60, 68, 72, 77, 80, 84],
    available: [38, 38, 35, 36, 36, 38, 39],
    overdue: [5, 4, 3, 4, 3, 2, 2]
  }
};

function Sparkline({ data, strokeColor = "stroke-primary" }: { data: number[], strokeColor?: string }) {
  const width = 120;
  const height = 24;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - 2 - ((val - min) / range) * (height - 4);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg className="w-24 h-6 mt-1 self-end opacity-70 group-hover:opacity-100 transition-opacity duration-200" viewBox={`0 0 ${width} ${height}`}>
      <polyline
        fill="none"
        className={`${strokeColor} stroke-[1.5]`}
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}

function getSectorPath(x: number, y: number, radius: number, innerRadius: number, startAngle: number, endAngle: number) {
  const startCell = polarToCartesian(x, y, radius, endAngle);
  const endCell = polarToCartesian(x, y, radius, startAngle);
  const startInner = polarToCartesian(x, y, innerRadius, endAngle);
  const endInner = polarToCartesian(x, y, innerRadius, startAngle);
  
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  
  return [
    "M", startCell.x, startCell.y,
    "A", radius, radius, 0, largeArcFlag, 0, endCell.x, endCell.y,
    "L", endInner.x, endInner.y,
    "A", innerRadius, innerRadius, 0, largeArcFlag, 1, startInner.x, startInner.y,
    "Z"
  ].join(" ");
}

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

  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days'>('7days');
  const [activeVisTab, setActiveVisTab] = useState<'status' | 'trends'>('status');
  const [activityFilter, setActivityFilter] = useState<'all' | 'created' | 'allocated' | 'maintenance'>('all');
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const getKpiVal = (base: number, key: 'total' | 'allocated' | 'available' | 'overdue') => {
    if (timeRange === '7days') return base;
    if (timeRange === 'today') {
      if (key === 'total') return base;
      if (key === 'allocated') return Math.max(0, Math.floor(base * 0.98));
      if (key === 'available') return Math.max(0, Math.floor(base * 1.02));
      if (key === 'overdue') return Math.max(0, Math.floor(base * 0.8));
      return base;
    }
    // 30days
    if (key === 'total') return Math.max(1, Math.floor(base * 0.92));
    if (key === 'allocated') return Math.max(0, Math.floor(base * 0.85));
    if (key === 'available') return Math.max(0, Math.floor(base * 0.95));
    if (key === 'overdue') return Math.max(0, Math.floor(base * 1.5));
    return base;
  };

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
      <main className="ml-64 min-h-screen px-container-padding pt-4 pb-6 flex flex-col justify-between">
        <div>
          {/* Header Bar */}
          <Header section="Dashboard" />

          {/* Header Section */}
          <header className="mb-2 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <div className="font-label-mono text-label-mono text-secondary uppercase tracking-[0.2em] mb-2 flex items-center text-xs font-semibold">
                <span className="text-primary font-bold">§ 01</span>
                <span className="mx-2 opacity-30">·</span>
                TODAY'S OVERVIEW
              </div>
              <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                Today's <span className="font-display-lg-italic italic text-primary font-normal">overview</span>.
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-label-mono text-[10px] text-secondary uppercase tracking-wider font-semibold">Timeframe:</span>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="px-3 py-1.5 border border-border-hairline bg-white font-label-mono text-[10px] tracking-wider focus:outline-none cursor-pointer uppercase font-semibold"
              >
                <option value="today">Today</option>
                <option value="7days">7 Days</option>
                <option value="30days">30 Days</option>
              </select>
            </div>
          </header>

          {/* Dynamic Stats Strips */}
          {kpis && (
            <section className="mb-section-margin">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border-y border-border-hairline divide-y md:divide-y-0 md:divide-x divide-border-hairline bg-surface">
                {/* Stat 1 */}
                <div className="p-8 group hover:bg-surface-container-low transition-colors duration-200 flex flex-col justify-between h-44 border-b md:border-b-0 border-border-hairline">
                  <div>
                    <span className="font-label-mono text-label-mono text-secondary uppercase tracking-widest block mb-2 text-xs font-semibold">
                      {role === "EMPLOYEE" ? "My Custody" : "Total Assets"}
                    </span>
                    <div className="font-stat-kpi text-4xl text-on-surface font-bold tracking-tight flex items-baseline justify-between">
                      <span>
                        <AnimatedCounter target={role === "EMPLOYEE" ? getKpiVal(kpis.totalAssets, 'total') : getKpiVal(kpis.totalAssets, 'total')} />
                      </span>
                      <Sparkline data={sparklinesData[timeRange].total} strokeColor="stroke-primary" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-secondary text-xs font-semibold">
                    <span className="font-label-mono uppercase">System Reg</span>
                    <span className="font-label-mono text-[10px] text-primary-fixed bg-primary px-1.5 py-0.5 rounded-none font-bold">+1.2%</span>
                  </div>
                </div>

                {/* Stat 2 */}
                <div className="p-8 group hover:bg-surface-container-low transition-colors duration-200 flex flex-col justify-between h-44 border-b md:border-b-0 border-border-hairline">
                  <div>
                    <span className="font-label-mono text-label-mono text-secondary uppercase tracking-widest block mb-2 text-xs font-semibold">
                      {role === "EMPLOYEE" ? "Active Bookings" : "Allocated"}
                    </span>
                    <div className="font-stat-kpi text-4xl text-on-surface font-bold tracking-tight flex items-baseline justify-between">
                      <span>
                        <AnimatedCounter target={role === "EMPLOYEE" ? getKpiVal(kpis.activeBookings, 'allocated') : getKpiVal(kpis.allocatedAssets, 'allocated')} />
                      </span>
                      <Sparkline data={sparklinesData[timeRange].allocated} strokeColor="stroke-status-allocated" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-secondary text-xs font-semibold">
                    <span className="font-label-mono uppercase">
                      {role === "EMPLOYEE" ? "Shared Reservations" : `${((getKpiVal(kpis.allocatedAssets, 'allocated') / (getKpiVal(kpis.totalAssets, 'total') || 1)) * 100).toFixed(1)}% Utilized`}
                    </span>
                    <span className="font-label-mono text-[10px] text-primary-fixed bg-primary px-1.5 py-0.5 rounded-none font-bold">Stable</span>
                  </div>
                </div>

                {/* Stat 3 */}
                <div className="p-8 group hover:bg-surface-container-low transition-colors duration-200 flex flex-col justify-between h-44 border-b md:border-b-0 border-border-hairline">
                  <div>
                    <span className="font-label-mono text-label-mono text-secondary uppercase tracking-widest block mb-2 text-xs font-semibold">
                      {role === "EMPLOYEE" ? "Active Tickets" : "Available"}
                    </span>
                    <div className="font-stat-kpi text-4xl text-on-surface font-bold tracking-tight flex items-baseline justify-between">
                      <span>
                        <AnimatedCounter target={role === "EMPLOYEE" ? kpis.underMaintenance : getKpiVal(kpis.availableAssets, 'available')} />
                      </span>
                      <Sparkline data={sparklinesData[timeRange].available} strokeColor="stroke-status-available" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-secondary text-xs font-semibold">
                    <span className="font-label-mono uppercase">
                      {role === "EMPLOYEE" ? "Maintenance Work" : "Ready for Deployment"}
                    </span>
                    <span className="font-label-mono text-[10px] text-status-available font-bold bg-[#A8C69F]/20 px-1.5 py-0.5">Optimal</span>
                  </div>
                </div>

                {/* Stat 4 */}
                <div className="p-8 group hover:bg-surface-container-low transition-colors duration-200 flex flex-col justify-between h-44 border-b md:border-b-0 border-border-hairline">
                  <div>
                    <span className="font-label-mono text-label-mono text-secondary uppercase tracking-widest block mb-2 text-xs font-semibold">
                      {role === "EMPLOYEE" ? "Pending Transfers" : "Overdue Returns"}
                    </span>
                    <div className="font-stat-kpi text-4xl text-on-surface font-bold tracking-tight flex items-baseline justify-between">
                      <span>
                        <AnimatedCounter target={role === "EMPLOYEE" ? kpis.pendingTransfers : getKpiVal(kpis.overdueReturns, 'overdue')} />
                      </span>
                      <Sparkline data={sparklinesData[timeRange].overdue} strokeColor="stroke-error" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs font-semibold text-error">
                    <span className="font-label-mono uppercase">
                      {role === "EMPLOYEE" ? "Outbound Requests" : `${getKpiVal(kpis.overdueReturns, 'overdue')} Items Flagged`}
                    </span>
                    {role !== "EMPLOYEE" && getKpiVal(kpis.overdueReturns, 'overdue') > 0 && (
                      <span className="font-label-mono text-[10px] text-error font-bold bg-error-container/20 px-1.5 py-0.5 uppercase">Critical</span>
                    )}
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <div className="font-label-mono text-label-mono text-secondary uppercase tracking-widest text-xs font-semibold">
                  § 03 · Recent Activity
                </div>
                {/* Filters */}
                <div className="flex border border-border-hairline bg-surface p-0.5">
                  {(["all", "created", "allocated", "maintenance"] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActivityFilter(filter)}
                      className={`px-3 py-1 font-label-mono text-[9px] uppercase tracking-wider transition-all cursor-pointer ${
                        activityFilter === filter ? 'bg-primary text-white font-semibold' : 'text-secondary hover:text-on-surface'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-surface border border-border-hairline">
                <div className="divide-y divide-border-hairline max-h-[500px] overflow-y-auto custom-scrollbar">
                  {(() => {
                    const filteredActivities = activities.filter((act) => {
                      if (activityFilter === 'all') return true;
                      if (activityFilter === 'created') return act.action === 'CREATED';
                      if (activityFilter === 'allocated') return act.action === 'ASSIGNED' || act.action === 'RETURNED';
                      if (activityFilter === 'maintenance') return act.action === 'MAINTENANCE_REQUESTED' || act.action === 'MAINTENANCE_COMPLETED';
                      return true;
                    });

                    if (filteredActivities.length === 0) {
                      return (
                        <div className="p-8 text-center text-secondary text-xs">
                          No matching logs in the activity trail.
                        </div>
                      );
                    }

                    return filteredActivities.map((act) => (
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
                            <span className="font-semibold flex items-center gap-2">
                              {act.action.replace("_", " ")}
                              {act.action.includes("MAINTENANCE") && (
                                <span className="text-[9px] bg-status-maintenance/20 text-on-tertiary-container font-label-mono px-1.5 py-0.2 font-semibold">MTN</span>
                              )}
                              {act.action === "ASSIGNED" && (
                                <span className="text-[9px] bg-primary/20 text-primary font-label-mono px-1.5 py-0.2 font-semibold">OUT</span>
                              )}
                              {act.action === "RETURNED" && (
                                <span className="text-[9px] bg-status-available/20 text-status-available font-label-mono px-1.5 py-0.2 font-semibold">IN</span>
                              )}
                            </span>
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
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Visual Anchor § 04 */}
          <section className="mt-section-margin">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="font-label-mono text-label-mono text-secondary uppercase tracking-[0.2em] text-xs font-semibold flex items-center">
                <span className="text-primary font-bold">§ 04</span>
                <span className="mx-2 opacity-30">·</span>
                VISUALIZATION ENGINE
              </div>
              <div className="flex border border-border-hairline bg-surface p-0.5">
                <button
                  onClick={() => setActiveVisTab('status')}
                  className={`px-4 py-1.5 font-label-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                    activeVisTab === 'status' ? 'bg-primary text-white font-semibold' : 'text-secondary hover:text-on-surface'
                  }`}
                >
                  Status Distribution
                </button>
                <button
                  onClick={() => setActiveVisTab('trends')}
                  className={`px-4 py-1.5 font-label-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                    activeVisTab === 'trends' ? 'bg-primary text-white font-semibold' : 'text-secondary hover:text-on-surface'
                  }`}
                >
                  Velocity Trends
                </button>
              </div>
            </div>

            <div className="border border-border-hairline bg-surface p-8">
              {activeVisTab === 'status' ? (
                /* Interactive Donut Chart */
                <div className="flex flex-col md:flex-row items-center justify-around gap-8">
                  {/* Left: SVG Donut */}
                  {(() => {
                    const allocatedVal = getKpiVal(kpis ? kpis.allocatedAssets : 0, 'allocated');
                    const availableVal = getKpiVal(kpis ? kpis.availableAssets : 0, 'available');
                    const maintenanceVal = kpis ? kpis.underMaintenance : 0;
                    const overdueVal = getKpiVal(kpis ? kpis.overdueReturns : 0, 'overdue');
                    
                    const donutData = [
                      { name: "Allocated", value: allocatedVal, color: "#9FB6C6", hoverColor: "#8BA3B5" },
                      { name: "Available", value: availableVal, color: "#A8C69F", hoverColor: "#93B38A" },
                      { name: "Maintenance", value: maintenanceVal, color: "#D9B88F", hoverColor: "#C6A47B" },
                      { name: "Overdue", value: overdueVal, color: "#E08F8F", hoverColor: "#CD7878" }
                    ];

                    const totalDonutValue = donutData.reduce((sum, item) => sum + item.value, 0) || 1;
                    let cumulativeAngle = 0;

                    const activeSlice = hoveredSlice !== null ? donutData[hoveredSlice] : null;

                    return (
                      <>
                        <div className="relative w-[300px] h-[300px]">
                          <svg width="300" height="300" viewBox="0 0 300 300" className="mx-auto">
                            {donutData.map((slice, idx) => {
                              if (slice.value === 0) return null;
                              const percentage = slice.value / totalDonutValue;
                              const angle = percentage * 360;
                              const startAngle = cumulativeAngle;
                              const endAngle = cumulativeAngle + angle;
                              cumulativeAngle += angle;

                              const safeEndAngle = endAngle - startAngle >= 359.9 ? startAngle + 359.9 : endAngle;
                              const isHovered = hoveredSlice === idx;
                              const pathData = getSectorPath(150, 150, isHovered ? 122 : 112, 70, startAngle, safeEndAngle);

                              return (
                                <path
                                  key={slice.name}
                                  d={pathData}
                                  fill={isHovered ? slice.hoverColor : slice.color}
                                  className="transition-all duration-300 cursor-pointer stroke-white stroke-2"
                                  onMouseEnter={() => setHoveredSlice(idx)}
                                  onMouseLeave={() => setHoveredSlice(null)}
                                />
                              );
                            })}
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                            {activeSlice ? (
                              <>
                                <span className="font-label-mono text-[10px] text-secondary uppercase tracking-widest">{activeSlice.name}</span>
                                <span className="font-stat-kpi text-3xl font-bold text-on-surface mt-1">{activeSlice.value}</span>
                                <span className="font-label-mono text-[11px] text-primary font-semibold mt-1">
                                  {((activeSlice.value / totalDonutValue) * 100).toFixed(1)}%
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="font-label-mono text-[10px] text-secondary uppercase tracking-widest">Total Inventory</span>
                                <span className="font-stat-kpi text-4xl font-bold text-on-surface mt-1">{kpis ? kpis.totalAssets : 0}</span>
                                <span className="font-label-mono text-[9px] uppercase tracking-widest text-secondary mt-1">Live Asset Ledger</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Right: Legend */}
                        <div className="flex-1 w-full max-w-sm space-y-3.5">
                          <span className="font-label-mono text-[11px] text-secondary uppercase tracking-widest block font-bold border-b border-border-hairline pb-2 mb-4">
                            Asset Classification Ledger
                          </span>
                          {donutData.map((item, idx) => {
                            const isHovered = hoveredSlice === idx;
                            return (
                              <div
                                key={item.name}
                                className={`flex justify-between items-center p-3 border transition-colors cursor-pointer ${
                                  isHovered ? 'bg-surface-container-low border-primary' : 'border-border-hairline bg-surface-container-lowest'
                                }`}
                                onMouseEnter={() => setHoveredSlice(idx)}
                                onMouseLeave={() => setHoveredSlice(null)}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="h-3 w-3 block" style={{ backgroundColor: item.color }}></span>
                                  <span className="font-body-md font-bold text-sm text-on-surface">{item.name}</span>
                                </div>
                                <div className="text-right flex items-baseline gap-2 font-label-mono">
                                  <span className="font-bold text-on-surface">{item.value}</span>
                                  <span className="text-[10px] text-secondary">({((item.value / totalDonutValue) * 100).toFixed(1)}%)</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                /* Interactive Wave Area Chart */
                <div className="space-y-6">
                  {(() => {
                    const trendData = {
                      today: [4, 8, 15, 12, 20, 18, 25, 22, 30, 28, 35, 40],
                      '7days': [20, 24, 18, 32, 28, 45, 38, 52, 48, 60, 58, 65],
                      '30days': [80, 95, 88, 110, 120, 105, 130, 140, 135, 160, 155, 180]
                    };
                    const labels = {
                      today: ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"],
                      '7days': ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"],
                      '30days': ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6", "Wk 7", "Wk 8", "Wk 9", "Wk 10", "Wk 11", "Wk 12"]
                    };

                    const currentTrend = trendData[timeRange];
                    const currentLabels = labels[timeRange];
                    
                    const chartWidth = 700;
                    const chartHeight = 180;
                    const padding = { top: 20, right: 30, bottom: 30, left: 40 };
                    
                    const maxVal = Math.max(...currentTrend, 10) * 1.1;
                    
                    // Generate points
                    const points = currentTrend.map((val, idx) => {
                      const x = padding.left + (idx / (currentTrend.length - 1)) * (chartWidth - padding.left - padding.right);
                      const y = chartHeight - padding.bottom - (val / maxVal) * (chartHeight - padding.top - padding.bottom);
                      return { x, y, val, label: currentLabels[idx] };
                    });

                    const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(" ");
                    const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - padding.bottom} L ${points[0].x} ${chartHeight - padding.bottom} Z`;

                    return (
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <span className="font-label-mono text-[11px] text-secondary uppercase tracking-widest font-bold">
                            Operational Resource Clearing Velocity
                          </span>
                          <span className="font-label-mono text-[10px] text-primary font-bold uppercase">
                            {timeRange === 'today' ? 'Hourly Activity Scan' : timeRange === '7days' ? 'Weekly Flow Velocity' : 'Quarterly Asset Sync'}
                          </span>
                        </div>
                        
                        <div className="relative w-full overflow-x-auto custom-scrollbar">
                          <svg className="w-full min-w-[650px] h-[200px]" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                            <defs>
                              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#52625a" stopOpacity="0.3"/>
                                <stop offset="100%" stopColor="#52625a" stopOpacity="0.0"/>
                              </linearGradient>
                            </defs>
                            
                            {/* Gridlines */}
                            {Array.from({ length: 5 }).map((_, idx) => {
                              const y = padding.top + (idx / 4) * (chartHeight - padding.top - padding.bottom);
                              return (
                                <line
                                  key={idx}
                                  x1={padding.left}
                                  y1={y}
                                  x2={chartWidth - padding.right}
                                  y2={y}
                                  className="stroke-border-hairline stroke-[1]"
                                  strokeDasharray="4 4"
                                />
                              );
                            })}

                            {/* Filled Area */}
                            <path d={areaPath} fill="url(#chartGradient)" />

                            {/* Chart Line */}
                            <path d={linePath} fill="none" className="stroke-primary stroke-[2]" strokeLinecap="round" />

                            {/* Interactive Data Points */}
                            {points.map((p, idx) => {
                              const isHovered = hoveredPoint === idx;
                              return (
                                <g key={idx}>
                                  <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={isHovered ? 6 : 3.5}
                                    className="fill-surface stroke-primary stroke-[2] transition-all cursor-pointer"
                                    onMouseEnter={() => setHoveredPoint(idx)}
                                    onMouseLeave={() => setHoveredPoint(null)}
                                  />
                                  
                                  {/* X Axis labels */}
                                  {idx % (timeRange === '30days' ? 2 : 1) === 0 && (
                                    <text
                                      x={p.x}
                                      y={chartHeight - 8}
                                      textAnchor="middle"
                                      className="font-label-mono text-[9px] fill-secondary font-semibold"
                                    >
                                      {p.label}
                                    </text>
                                  )}
                                  
                                  {/* Tooltip */}
                                  {isHovered && (
                                    <g>
                                      <rect
                                        x={p.x - 45}
                                        y={p.y - 32}
                                        width="90"
                                        height="22"
                                        fill="#2f3130"
                                        rx="0"
                                      />
                                      <text
                                        x={p.x}
                                        y={p.y - 17}
                                        textAnchor="middle"
                                        className="font-label-mono text-[10px] fill-white font-bold"
                                      >
                                        Vol: {p.val} units
                                      </text>
                                    </g>
                                  )}
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </section>

          {/* Section 05: System Integrity */}
          <section className="mt-section-margin">
            <div className="font-label-mono text-label-mono text-secondary uppercase tracking-[0.2em] mb-6 flex items-center text-xs font-semibold">
              <span className="text-primary font-bold">§ 05</span>
              <span className="mx-2 opacity-30">·</span>
              SYSTEM INTEGRITY &amp; COMPLIANCE
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
              {/* Compliance Score Circular Progress */}
              <div className="p-8 bg-surface border border-border-hairline flex flex-col items-center justify-between min-h-[260px] group hover:border-primary transition-all duration-200">
                <div className="w-full text-left">
                  <span className="font-label-mono text-[10px] text-secondary uppercase tracking-widest block font-bold mb-2">
                    Security Clearance
                  </span>
                  <span className="font-display-lg font-bold text-sm text-on-surface">
                    SOC2 Type II Readiness
                  </span>
                </div>
                
                {/* SVG Progress Circle */}
                <div className="relative w-32 h-32 flex items-center justify-center my-4">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="stroke-surface-container-high fill-none stroke-[8]"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="stroke-primary fill-none stroke-[8] transition-all duration-1000 ease-out"
                      strokeDasharray="251.3"
                      strokeDashoffset={251.3 - (251.3 * 0.984)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="font-stat-kpi text-xl font-bold">98.4%</span>
                    <span className="font-label-mono text-[8px] uppercase tracking-widest text-secondary font-bold">Secured</span>
                  </div>
                </div>
                
                <div className="w-full flex justify-between text-[10px] font-label-mono text-secondary font-semibold border-t border-border-hairline pt-4">
                  <span>Last Audit: Oct 2026</span>
                  <span className="text-primary font-bold">Healthy</span>
                </div>
              </div>

              {/* Operations Pulse */}
              <div className="p-8 bg-surface border border-border-hairline flex flex-col justify-between min-h-[260px] group hover:border-primary transition-all duration-200">
                <div>
                  <span className="font-label-mono text-[10px] text-secondary uppercase tracking-widest block font-bold mb-2">
                    Infrastructure Status
                  </span>
                  <div className="flex justify-between items-center mb-6">
                    <span className="font-display-lg font-bold text-sm text-on-surface">Ledger Clearing Pulse</span>
                    {/* Live green pulsing indicator */}
                    <div className="flex items-center gap-1.5 font-label-mono text-[9px] font-bold text-primary uppercase">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-duration-1000"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                      </span>
                      Operational
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-1.5 border-b border-border-hairline/50">
                      <span className="text-secondary font-medium">DB Connection Pool</span>
                      <span className="font-label-mono font-semibold text-on-surface">Active (12 Open)</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-border-hairline/50">
                      <span className="text-secondary font-medium">Transaction Latency</span>
                      <span className="font-label-mono font-semibold text-on-surface">18ms avg</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-border-hairline/50">
                      <span className="text-secondary font-medium">Cron Reconciliation</span>
                      <span className="font-label-mono font-semibold text-on-surface">Idle (Next in 4h)</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between text-[10px] font-label-mono text-secondary font-semibold border-t border-border-hairline pt-4">
                  <span>SSL Expiry: 142 Days</span>
                  <span>Uptime: 99.98%</span>
                </div>
              </div>

              {/* Quick Ledger Stats */}
              <div className="p-8 bg-surface border border-border-hairline flex flex-col justify-between min-h-[260px] group hover:border-primary transition-all duration-200">
                <div>
                  <span className="font-label-mono text-[10px] text-secondary uppercase tracking-widest block font-bold mb-2">
                    Ledger Metrics
                  </span>
                  <span className="font-display-lg font-bold text-sm text-on-surface block mb-6">
                    Audit Clearances
                  </span>
                  
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-1.5 border-b border-border-hairline/50">
                      <span className="text-secondary font-medium">Active Discrepancies</span>
                      <span className="font-label-mono font-bold text-primary bg-primary-fixed/30 px-1.5 py-0.5">0 Active</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-border-hairline/50">
                      <span className="text-secondary font-medium">Pending Approvals</span>
                      <span className="font-label-mono font-semibold text-on-surface">3 Requests</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-border-hairline/50">
                      <span className="text-secondary font-medium">Total Ledger Valuation</span>
                      <span className="font-label-mono font-semibold text-on-surface">$1.24M</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between text-[10px] font-label-mono text-secondary font-semibold border-t border-border-hairline pt-4">
                  <span>SEC Registry: Active</span>
                  <span className="text-primary font-bold">Compliant</span>
                </div>
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
