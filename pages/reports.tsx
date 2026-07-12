"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useAuth } from "@/lib/context/AuthContext";

interface AssetUtilization {
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  totalAssets: number;
  allocatedAssets: number;
  availableAssets: number;
  underMaintenanceAssets: number;
  utilizationRate: number;
}

interface CategoryMaintenance {
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  totalRequests: number;
  resolvedRequests: number;
  pendingRequests: number;
  activeRequests: number;
  averageDowntimeHours: number;
}

interface TopMaintainedAsset {
  asset: {
    id: string;
    name: string;
    assetTag: string;
    location: string | null;
    status: string;
  };
  requestCount: number;
}

interface OpenMaintenanceRequest {
  id: string;
  assetId: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: string;
  issueTitle: string;
  requestedAt: string;
  asset: {
    id: string;
    name: string;
    assetTag: string;
    condition: string;
    status: string;
  };
  requestedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface AtRiskAsset {
  id: string;
  name: string;
  assetTag: string;
  category: string;
  condition: string;
  status: string;
  maintenanceCount: number;
}

interface DepartmentAllocation {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  totalAssetsCount: number;
  totalAssetValue: number;
  directAllocationsCount: number;
  employeeAllocationsCount: number;
  totalActiveAllocations: number;
}

interface BookingHeatmapCell {
  dayOfWeek: number;
  hourOfDay: number;
  count: number;
}

export default function Reports() {
  const { user, role, loading: authLoading } = useAuth();

  // Active Report Tab
  const [activeReportTab, setActiveReportTab] = useState<"utilization" | "maintenance" | "preventive" | "allocation" | "heatmap">("utilization");
  
  // Data States
  const [utilizationData, setUtilizationData] = useState<AssetUtilization[]>([]);
  const [maintenanceData, setMaintenanceData] = useState<{ byCategory: CategoryMaintenance[]; topMaintainedAssets: TopMaintainedAsset[] }>({ byCategory: [], topMaintainedAssets: [] });
  const [preventiveData, setPreventiveData] = useState<{ openRequests: OpenMaintenanceRequest[]; atRiskAssets: AtRiskAsset[] }>({ openRequests: [], atRiskAssets: [] });
  const [departmentData, setDepartmentData] = useState<DepartmentAllocation[]>([]);
  const [heatmapData, setHeatmapData] = useState<{ heatmap: BookingHeatmapCell[]; byCategory: Record<string, number> }>({ heatmap: [], byCategory: {} });
  
  const [loadingReports, setLoadingReports] = useState(true);

  const fetchReports = async () => {
    try {
      setLoadingReports(true);
      
      // Fetch utilization
      const utilRes = await fetch("/api/reports/asset-utilization");
      if (utilRes.status === 200) {
        const data = await utilRes.json();
        if (data.success) setUtilizationData(data.utilization || []);
      }

      // Fetch maintenance
      const maintRes = await fetch("/api/reports/maintenance-frequency");
      if (maintRes.status === 200) {
        const data = await maintRes.json();
        if (data.success) {
          setMaintenanceData({
            byCategory: data.byCategory || [],
            topMaintainedAssets: data.topMaintainedAssets || []
          });
        }
      }

      // Fetch preventive
      const prevRes = await fetch("/api/reports/preventive-maintenance");
      if (prevRes.status === 200) {
        const data = await prevRes.json();
        if (data.success) {
          setPreventiveData({
            openRequests: data.openRequests || [],
            atRiskAssets: data.atRiskAssets || []
          });
        }
      }

      // Fetch department allocations
      const deptRes = await fetch("/api/reports/department-allocation");
      if (deptRes.status === 200) {
        const data = await deptRes.json();
        if (data.success) setDepartmentData(data.departmentAllocations || []);
      }

      // Fetch booking heatmap
      const heatRes = await fetch("/api/reports/booking-heatmap");
      if (heatRes.status === 200) {
        const data = await heatRes.json();
        if (data.success) {
          setHeatmapData({
            heatmap: data.heatmap || [],
            byCategory: data.byCategory || {}
          });
        }
      }
    } catch (e) {
      console.error("Error fetching reports:", e);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (user && (role === "ADMIN" || role === "ASSET_MANAGER")) {
      fetchReports();
    }
  }, [user, role]);

  if (authLoading || (loadingReports && utilizationData.length === 0)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-label-mono text-xs uppercase tracking-widest text-secondary">
        Retrieving system metrics...
      </div>
    );
  }

  if (role !== "ADMIN" && role !== "ASSET_MANAGER") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-label-mono text-xs uppercase tracking-widest text-error">
        Access Denied: Administrative Clearance Required
      </div>
    );
  }

  // Helper for heatmap cell color intensity
  const getHeatmapColor = (count: number) => {
    if (count === 0) return "bg-surface-container-low hover:bg-surface-container-high";
    if (count < 2) return "bg-primary/20 hover:bg-primary/30";
    if (count < 5) return "bg-primary/45 hover:bg-primary/55";
    if (count < 10) return "bg-primary/70 hover:bg-primary/80";
    return "bg-primary text-on-primary hover:opacity-90";
  };

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-container">
      {/* Sidebar Navigation */}
      <Sidebar activePage="reports" />

      {/* Main Content Area */}
      <main className="ml-64 min-h-screen px-container-padding py-12 flex flex-col justify-between">
        <div>
          {/* Header Bar */}
          <Header section="Analytics Engine" />

          {/* Header Section */}
          <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <p className="font-label-mono text-label-mono text-secondary uppercase tracking-[0.2em] mb-2 flex items-center text-xs font-semibold">
                <span className="text-primary font-bold">§ 06</span>
                <span className="mx-2 opacity-30">·</span>
                ANALYTICS ENGINE
              </p>
              <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                Deep <span className="font-display-lg-italic italic text-primary font-normal">insights</span>.
              </h1>
            </div>
            <div className="flex gap-4 pb-2 text-xs items-center self-stretch md:self-auto justify-end">
              <select 
                id="export-select"
                className="px-4 py-2.5 border border-border-hairline bg-white font-label-mono uppercase text-[11px] tracking-wider focus:outline-none cursor-pointer"
                defaultValue="utilization"
              >
                <option value="utilization">Asset Utilization</option>
                <option value="maintenance">Maintenance</option>
                <option value="allocation">Department Allocations</option>
                <option value="bookings">Resource Bookings</option>
              </select>
              <button 
                onClick={() => {
                  const select = document.getElementById("export-select") as HTMLSelectElement;
                  const type = select?.value || "utilization";
                  window.open(`/api/reports/export?type=${type}`, "_blank");
                }}
                className="px-6 py-2.5 bg-primary text-white font-label-mono text-label-mono uppercase tracking-widest hover:bg-opacity-90 transition-all flex items-center gap-2 cursor-pointer font-bold border-0 text-xs"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export CSV
              </button>
            </div>
          </header>

          {/* Sub Tab Navigation */}
          <div className="flex border-b border-border-hairline mb-8 text-xs font-label-mono uppercase tracking-widest text-secondary font-semibold">
            <button
              onClick={() => setActiveReportTab("utilization")}
              className={`px-6 py-4 border-b-2 transition-all cursor-pointer ${
                activeReportTab === "utilization" ? "border-primary text-on-surface font-bold" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              Asset Utilization
            </button>
            <button
              onClick={() => setActiveReportTab("maintenance")}
              className={`px-6 py-4 border-b-2 transition-all cursor-pointer ${
                activeReportTab === "maintenance" ? "border-primary text-on-surface font-bold" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              Maintenance Frequency
            </button>
            <button
              onClick={() => setActiveReportTab("preventive")}
              className={`px-6 py-4 border-b-2 transition-all cursor-pointer ${
                activeReportTab === "preventive" ? "border-primary text-on-surface font-bold" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              Preventive Maintenance
            </button>
            <button
              onClick={() => setActiveReportTab("allocation")}
              className={`px-6 py-4 border-b-2 transition-all cursor-pointer ${
                activeReportTab === "allocation" ? "border-primary text-on-surface font-bold" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              Department Summary
            </button>
            <button
              onClick={() => setActiveReportTab("heatmap")}
              className={`px-6 py-4 border-b-2 transition-all cursor-pointer ${
                activeReportTab === "heatmap" ? "border-primary text-on-surface font-bold" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              Booking Heatmap
            </button>
          </div>

          {/* Tab 1: Asset Utilization */}
          {activeReportTab === "utilization" && (
            <div className="bg-white border border-border-hairline p-6">
              <div className="font-label-mono text-xs uppercase tracking-wider text-secondary font-bold pb-2 border-b border-border-hairline mb-4">
                Asset Category Utilization Rates
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-max text-xs font-body-md">
                  <thead>
                    <tr className="border-b border-border-hairline bg-surface-container-low text-secondary font-label-mono uppercase font-bold">
                      <th className="px-gutter py-4">Category Code</th>
                      <th className="px-gutter py-4">Category Name</th>
                      <th className="px-gutter py-4 text-center">Total Assets</th>
                      <th className="px-gutter py-4 text-center">Allocated</th>
                      <th className="px-gutter py-4 text-center">Available</th>
                      <th className="px-gutter py-4 text-center">Under Maintenance</th>
                      <th className="px-gutter py-4 text-right">Utilization Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-hairline">
                    {utilizationData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-gutter py-8 text-center text-secondary">
                          No asset categories registered.
                        </td>
                      </tr>
                    ) : (
                      utilizationData.map((row) => (
                        <tr key={row.categoryId} className="hover:bg-surface-container-lowest transition-colors">
                          <td className="px-gutter py-4 font-label-mono font-bold uppercase">{row.categoryCode}</td>
                          <td className="px-gutter py-4 font-bold">{row.categoryName}</td>
                          <td className="px-gutter py-4 text-center font-label-mono">{row.totalAssets}</td>
                          <td className="px-gutter py-4 text-center font-label-mono text-status-allocated font-semibold">{row.allocatedAssets}</td>
                          <td className="px-gutter py-4 text-center font-label-mono text-status-available font-semibold">{row.availableAssets}</td>
                          <td className="px-gutter py-4 text-center font-label-mono text-status-maintenance font-semibold">{row.underMaintenanceAssets}</td>
                          <td className="px-gutter py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <div className="w-24 bg-surface-container-high h-2 rounded-full overflow-hidden hidden sm:block">
                                <div 
                                  style={{ width: `${row.utilizationRate}%` }} 
                                  className="h-full bg-primary"
                                />
                              </div>
                              <span className="font-label-mono font-bold text-sm">{row.utilizationRate.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Maintenance Frequency */}
          {activeReportTab === "maintenance" && (
            <div className="grid grid-cols-12 gap-gutter items-start">
              {/* Left Side: Category Summary */}
              <div className="col-span-12 lg:col-span-7 bg-white border border-border-hairline p-6">
                <div className="font-label-mono text-xs uppercase tracking-wider text-secondary font-bold pb-2 border-b border-border-hairline mb-4">
                  Maintenance Metrics by Category
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-max text-xs font-body-md">
                    <thead>
                      <tr className="border-b border-border-hairline bg-surface-container-low text-secondary font-label-mono uppercase font-bold">
                        <th className="px-gutter py-4">Category</th>
                        <th className="px-gutter py-4 text-center">Total Tickets</th>
                        <th className="px-gutter py-4 text-center">Resolved</th>
                        <th className="px-gutter py-4 text-center">Active</th>
                        <th className="px-gutter py-4 text-center">Pending</th>
                        <th className="px-gutter py-4 text-right">Avg Downtime</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-hairline">
                      {maintenanceData.byCategory.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-gutter py-8 text-center text-secondary">
                            No maintenance logs recorded.
                          </td>
                        </tr>
                      ) : (
                        maintenanceData.byCategory.map((row) => (
                          <tr key={row.categoryId} className="hover:bg-surface-container-lowest transition-colors">
                            <td className="px-gutter py-4">
                              <span className="font-bold block">{row.categoryName}</span>
                              <span className="font-label-mono text-[10px] text-secondary uppercase">{row.categoryCode}</span>
                            </td>
                            <td className="px-gutter py-4 text-center font-label-mono">{row.totalRequests}</td>
                            <td className="px-gutter py-4 text-center font-label-mono text-status-available font-semibold">{row.resolvedRequests}</td>
                            <td className="px-gutter py-4 text-center font-label-mono text-status-allocated font-semibold">{row.activeRequests}</td>
                            <td className="px-gutter py-4 text-center font-label-mono text-status-maintenance font-semibold">{row.pendingRequests}</td>
                            <td className="px-gutter py-4 text-right font-label-mono font-bold">{row.averageDowntimeHours.toFixed(1)} hrs</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Side: Top Maintained Assets */}
              <div className="col-span-12 lg:col-span-5 bg-white border border-border-hairline p-6">
                <div className="font-label-mono text-xs uppercase tracking-wider text-secondary font-bold pb-2 border-b border-border-hairline mb-4 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">construction</span>
                  Most Repaired Assets (Top 5)
                </div>
                {maintenanceData.topMaintainedAssets.length === 0 ? (
                  <p className="text-secondary text-xs italic py-6">No assets have required repairs yet.</p>
                ) : (
                  <div className="space-y-4">
                    {maintenanceData.topMaintainedAssets.map((item, idx) => (
                      <div key={item.asset.id} className="text-xs p-3.5 border border-border-hairline bg-surface flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-on-surface leading-tight">{item.asset.name}</span>
                            <span className="font-label-mono text-[9px] uppercase text-secondary bg-surface-container-high px-1.5 py-0.5">{item.asset.assetTag}</span>
                          </div>
                          <p className="text-secondary text-[10px]">Location: {item.asset.location || "—"} · Status: {item.asset.status}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-label-mono text-sm font-bold text-error bg-error-container/20 px-2.5 py-1">{item.requestCount} Fixes</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Preventive Maintenance */}
          {activeReportTab === "preventive" && (
            <div className="grid grid-cols-12 gap-gutter items-start">
              {/* Left Side: At Risk Assets */}
              <div className="col-span-12 lg:col-span-6 bg-white border border-border-hairline p-6">
                <div className="font-label-mono text-xs uppercase tracking-wider text-secondary font-bold pb-2 border-b border-border-hairline mb-4 flex items-center gap-1.5 text-error">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  At-Risk Assets (Damaged or Repeated Fixes)
                </div>
                {preventiveData.atRiskAssets.length === 0 ? (
                  <p className="text-secondary text-xs italic py-6">No assets flagged in critical/at-risk states.</p>
                ) : (
                  <div className="space-y-3">
                    {preventiveData.atRiskAssets.map((asset) => (
                      <div key={asset.id} className="p-3 border border-error/20 bg-error-container/5 text-xs font-body-md">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-on-surface">{asset.name}</span>
                          <span className="font-label-mono text-[9px] uppercase text-secondary bg-surface-container-high px-1.5 py-0.5">{asset.assetTag}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-secondary">
                          <span>Category: {asset.category} · Condition: <strong className="text-error">{asset.condition}</strong></span>
                          <span className="font-label-mono font-bold text-error">{asset.maintenanceCount} Past repairs</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Side: Open Maintenance Tickets */}
              <div className="col-span-12 lg:col-span-6 bg-white border border-border-hairline p-6">
                <div className="font-label-mono text-xs uppercase tracking-wider text-secondary font-bold pb-2 border-b border-border-hairline mb-4 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">hourglass_empty</span>
                  Active Repairs Queue ({preventiveData.openRequests.length})
                </div>
                {preventiveData.openRequests.length === 0 ? (
                  <p className="text-secondary text-xs italic py-6">No active maintenance tickets in process.</p>
                ) : (
                  <div className="space-y-3">
                    {preventiveData.openRequests.map((req) => (
                      <div key={req.id} className="p-3 border border-border-hairline bg-surface text-xs font-body-md">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-bold block leading-tight">{req.issueTitle}</span>
                            <span className="text-[10px] text-secondary font-label-mono">Asset: {req.asset.name} ({req.asset.assetTag})</span>
                          </div>
                          <span className={`px-2 py-0.5 text-[9px] font-label-mono font-bold uppercase ${
                            req.priority === "CRITICAL" ? "bg-error text-white" :
                            req.priority === "HIGH" ? "bg-error-container text-on-error-container" :
                            req.priority === "MEDIUM" ? "bg-status-maintenance/20 text-on-tertiary-container" : "bg-surface-container-high text-secondary"
                          }`}>{req.priority}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-secondary pt-2 border-t border-border-hairline/60">
                          <span>Reported By: {req.requestedBy.firstName} {req.requestedBy.lastName}</span>
                          <span className="font-label-mono">Date: {new Date(req.requestedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Department Summary */}
          {activeReportTab === "allocation" && (
            <div className="bg-white border border-border-hairline p-6">
              <div className="font-label-mono text-xs uppercase tracking-wider text-secondary font-bold pb-2 border-b border-border-hairline mb-4">
                Department Asset Allocation &amp; Portfolio Value
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-max text-xs font-body-md">
                  <thead>
                    <tr className="border-b border-border-hairline bg-surface-container-low text-secondary font-label-mono uppercase font-bold">
                      <th className="px-gutter py-4">Dept Code</th>
                      <th className="px-gutter py-4">Department Name</th>
                      <th className="px-gutter py-4 text-center">Total Inventory Assets</th>
                      <th className="px-gutter py-4 text-center">Direct Allocations</th>
                      <th className="px-gutter py-4 text-center">Personnel Allocations</th>
                      <th className="px-gutter py-4 text-center">Total Active Allocations</th>
                      <th className="px-gutter py-4 text-right">Portfolio Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-hairline">
                    {departmentData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-gutter py-8 text-center text-secondary">
                          No department metrics processed.
                        </td>
                      </tr>
                    ) : (
                      departmentData.map((row) => (
                        <tr key={row.departmentId} className="hover:bg-surface-container-lowest transition-colors">
                          <td className="px-gutter py-4 font-label-mono font-bold uppercase">{row.departmentCode}</td>
                          <td className="px-gutter py-4 font-bold">{row.departmentName}</td>
                          <td className="px-gutter py-4 text-center font-label-mono">{row.totalAssetsCount}</td>
                          <td className="px-gutter py-4 text-center font-label-mono">{row.directAllocationsCount}</td>
                          <td className="px-gutter py-4 text-center font-label-mono">{row.employeeAllocationsCount}</td>
                          <td className="px-gutter py-4 text-center font-label-mono font-bold text-primary">{row.totalActiveAllocations}</td>
                          <td className="px-gutter py-4 text-right font-label-mono font-bold text-sm">
                            ${row.totalAssetValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 5: Booking Heatmap */}
          {activeReportTab === "heatmap" && (
            <div className="space-y-6">
              {/* Category split */}
              <div className="bg-white border border-border-hairline p-6">
                <div className="font-label-mono text-xs uppercase tracking-wider text-secondary font-bold pb-2 border-b border-border-hairline mb-4">
                  Reservations Count by Resource Class
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-2">
                  {Object.keys(heatmapData.byCategory).length === 0 ? (
                    <p className="text-secondary text-xs italic col-span-4 text-center">No bookings logged yet.</p>
                  ) : (
                    Object.entries(heatmapData.byCategory).map(([catName, count]) => (
                      <div key={catName} className="p-4 border border-border-hairline text-center">
                        <span className="font-label-mono text-2xl font-bold block text-primary mb-1">{count}</span>
                        <span className="text-[10px] font-label-mono text-secondary uppercase font-semibold">{catName}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Heatmap Grid */}
              <div className="bg-white border border-border-hairline p-6">
                <div className="font-label-mono text-xs uppercase tracking-wider text-secondary font-bold pb-2 border-b border-border-hairline mb-6 flex justify-between items-center">
                  <span>Weekly Booking Density Heatmap (Day of Week vs Hour of Day)</span>
                  <div className="flex gap-2 items-center text-[9px] font-label-mono font-bold text-secondary">
                    <span>Low</span>
                    <span className="w-3 h-3 bg-surface-container-low border border-border-hairline"></span>
                    <span className="w-3 h-3 bg-primary/20"></span>
                    <span className="w-3 h-3 bg-primary/45"></span>
                    <span className="w-3 h-3 bg-primary/70"></span>
                    <span className="w-3 h-3 bg-primary"></span>
                    <span>High</span>
                  </div>
                </div>
                
                <div className="overflow-x-auto custom-scrollbar">
                  <div className="min-w-[800px] space-y-1">
                    {/* Hours row labels */}
                    <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: 'repeat(25, minmax(0, 1fr))' }}>
                      <div className="col-span-1 text-[9px] font-label-mono text-secondary font-semibold">Day</div>
                      {Array.from({ length: 24 }).map((_, hour) => (
                        <div key={hour} className="text-center text-[9px] font-label-mono text-secondary font-semibold">
                          {hour.toString().padStart(2, "0")}
                        </div>
                      ))}
                    </div>

                    {/* Day Rows */}
                    {daysOfWeek.map((dayName, dayIdx) => (
                      <div key={dayIdx} className="grid gap-1 items-center" style={{ gridTemplateColumns: 'repeat(25, minmax(0, 1fr))' }}>
                        <div className="col-span-1 text-[11px] font-label-mono text-secondary font-bold">{dayName}</div>
                        {Array.from({ length: 24 }).map((_, hourIdx) => {
                          const cell = heatmapData.heatmap.find(c => c.dayOfWeek === dayIdx && c.hourOfDay === hourIdx);
                          const count = cell ? cell.count : 0;
                          return (
                            <div 
                              key={hourIdx} 
                              className={`h-7 rounded-sm border border-border-hairline/25 ${getHeatmapColor(count)} flex items-center justify-center text-[9px] font-label-mono font-bold text-transparent hover:text-on-surface-variant transition-all`}
                              title={`${dayName} at ${hourIdx.toString().padStart(2, "0")}:00 - ${count} Booking(s)`}
                            >
                              {count > 0 ? count : ""}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-12 border-t border-border-hairline flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-12">
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
