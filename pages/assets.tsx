import React, { useEffect, useState, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useAuth } from "@/lib/context/AuthContext";

interface AssetCategory {
  id: string;
  name: string;
  code: string;
  isBookable: boolean;
}

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

interface AssetAllocation {
  id: string;
  status: string;
  allocatedToEmployee?: Employee | null;
  allocatedToDepartment?: Department | null;
}

interface Asset {
  id: string;
  assetTag: string;
  name: string;
  serialNumber: string | null;
  acquisitionCost: number | null;
  acquisitionDate: string | null;
  condition: string;
  status: string;
  location: string | null;
  sharedBookable: boolean;
  category: AssetCategory;
  allocations?: AssetAllocation[];
}

export default function Assets() {
  const { user, role, loading: authLoading } = useAuth();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Lists
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Search/Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Loading States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modals Open
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Selected action context
  const [activeAsset, setActiveAsset] = useState<Asset | null>(null);

  // Modal forms
  // Add Asset
  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [addSerial, setAddSerial] = useState("");
  const [addCost, setAddCost] = useState("");
  const [addDate, setAddDate] = useState("");
  const [addCondition, setAddCondition] = useState("GOOD");
  const [addLocation, setAddLocation] = useState("");
  const [addShared, setAddShared] = useState(false);

  // Allocate Asset
  const [allocType, setAllocType] = useState<"employee" | "department">("employee");
  const [allocTarget, setAllocTarget] = useState("");
  const [allocReturnDate, setAllocReturnDate] = useState("");
  const [allocNote, setAllocNote] = useState("");

  // Return Asset
  const [returnCondition, setReturnCondition] = useState("GOOD");
  const [returnNotes, setReturnNotes] = useState("");

  // Transfer Custody
  const [transferType, setTransferType] = useState<"employee" | "department">("employee");
  const [transferTarget, setTransferTarget] = useState("");
  const [transferReason, setTransferReason] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);

      let query = `/api/assets?page=${page}&limit=${limit}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (selectedCategory) query += `&categoryId=${selectedCategory}`;
      if (selectedStatus) query += `&status=${selectedStatus}`;

      // Independent of each other — awaiting them in turn cost a round trip each.
      // Employees/departments only feed the manager allocation dropdowns.
      const isManager = role === "ADMIN" || role === "ASSET_MANAGER";

      const [assetRes, catRes, empRes, deptRes] = await Promise.all([
        fetch(query),
        fetch("/api/asset-categories"),
        isManager ? fetch("/api/employees?limit=100") : null,
        isManager ? fetch("/api/departments") : null,
      ]);

      if (assetRes.status === 200) {
        const data = await assetRes.json();
        if (data.success) {
          setAssets(data.assets);
          setTotalCount(data.pagination.totalCount);
        }
      }

      if (catRes.status === 200) {
        const data = await catRes.json();
        if (data.success) {
          setCategories(data.categories);
        }
      }

      if (empRes && empRes.status === 200) {
        const data = await empRes.json();
        if (data.success) {
          setEmployees(data.employees);
        }
      }

      if (deptRes && deptRes.status === 200) {
        const data = await deptRes.json();
        if (data.success) {
          setDepartments(data.departments);
        }
      }
    } catch (e) {
      console.error("Failed to load inventory assets", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, role, page, selectedCategory, selectedStatus]);

  // Handle Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  // 1. Submit New Asset
  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName,
          categoryId: addCategory,
          serialNumber: addSerial || null,
          acquisitionCost: addCost ? parseFloat(addCost) : null,
          acquisitionDate: addDate ? new Date(addDate).toISOString() : null,
          condition: addCondition,
          location: addLocation || null,
          sharedBookable: addShared,
        }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (res.status === 201 && data.success) {
        setIsAddModalOpen(false);
        // Reset Form
        setAddName("");
        setAddCategory("");
        setAddSerial("");
        setAddCost("");
        setAddDate("");
        setAddLocation("");
        setAddShared(false);
        fetchData();
      } else {
        setFormError(data.error || "Failed to create asset");
      }
    } catch (e) {
      setSubmitting(false);
      setFormError("A network error occurred.");
    }
  };

  // 2. Submit Allocation
  const handleAllocateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAsset) return;
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: activeAsset.id,
          allocatedToEmployeeId: allocType === "employee" ? allocTarget : null,
          allocatedToDepartmentId: allocType === "department" ? allocTarget : null,
          expectedReturnDate: allocReturnDate ? new Date(allocReturnDate).toISOString() : null,
          allocationNote: allocNote || null,
        }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (res.status === 201 && data.success) {
        setIsAllocateModalOpen(false);
        setAllocTarget("");
        setAllocReturnDate("");
        setAllocNote("");
        setActiveAsset(null);
        fetchData();
      } else {
        setFormError(data.error || "Allocation failed");
      }
    } catch (e) {
      setSubmitting(false);
      setFormError("A network error occurred.");
    }
  };

  // 3. Revoke Allocation
  const handleRevokeAllocation = async (allocationId: string) => {
    if (!confirm("Are you sure you want to revoke custody of this asset?")) return;
    try {
      const res = await fetch(`/api/allocations/${allocationId}/revoke`, { method: "POST" });
      if (res.status === 200) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Revocation failed");
      }
    } catch (e) {
      alert("A network error occurred.");
    }
  };

  // 4. Submit Return Request
  const handleReturnAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAsset) return;
    setSubmitting(true);
    setFormError(null);

    // Get current active allocation ID
    const allocationId = activeAsset.allocations?.find((a) => a.status === "ACTIVE" || a.status === "OVERDUE")?.id;
    if (!allocationId) {
      setFormError("No active allocation found for return");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetAllocationId: allocationId,
          conditionOnReturn: returnCondition,
          conditionNotes: returnNotes || null,
        }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (res.status === 201 && data.success) {
        setIsReturnModalOpen(false);
        setReturnNotes("");
        setActiveAsset(null);
        fetchData();
      } else {
        setFormError(data.error || "Return request failed");
      }
    } catch (e) {
      setSubmitting(false);
      setFormError("A network error occurred.");
    }
  };

  // 5. Submit Transfer Request
  const handleTransferAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAsset) return;
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: activeAsset.id,
          toEmployeeId: transferType === "employee" ? transferTarget : null,
          toDepartmentId: transferType === "department" ? transferTarget : null,
          reason: transferReason,
        }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (res.status === 201 && data.success) {
        setIsTransferModalOpen(false);
        setTransferTarget("");
        setTransferReason("");
        setActiveAsset(null);
        fetchData();
      } else {
        setFormError(data.error || "Transfer request failed");
      }
    } catch (e) {
      setSubmitting(false);
      setFormError("A network error occurred.");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-label-mono text-xs uppercase tracking-widest text-secondary">
        Verifying Session...
      </div>
    );
  }

  // Get active custody text for asset row
  const getCustodianInfo = (asset: Asset) => {
    const activeAlloc = asset.allocations?.find((a) => a.status === "ACTIVE" || a.status === "OVERDUE" || a.status === "RETURN_PENDING");
    if (!activeAlloc) return "—";
    if (activeAlloc.allocatedToEmployee) {
      return `${activeAlloc.allocatedToEmployee.firstName} ${activeAlloc.allocatedToEmployee.lastName}`;
    }
    if (activeAlloc.allocatedToDepartment) {
      return `${activeAlloc.allocatedToDepartment.name} (Dept)`;
    }
    return "—";
  };

  const getCustodianAllocationId = (asset: Asset) => {
    return asset.allocations?.find((a) => a.status === "ACTIVE" || a.status === "OVERDUE" || a.status === "RETURN_PENDING")?.id;
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Sidebar Navigation */}
      <Sidebar activePage="assets" />

      {/* Main Content Area */}
      <main className="ml-64 min-h-screen px-container-padding py-12 flex flex-col justify-between">
        <div>
          {/* Header Bar */}
          <Header section="Assets Catalog" />

          {/* Section Header & Filters */}
          <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <div className="font-label-mono text-label-mono text-secondary uppercase tracking-[0.2em] mb-2 flex items-center text-xs font-semibold">
                <span className="text-primary font-bold">§ 02</span>
                <span className="mx-2 opacity-30">·</span>
                INVENTORY REGISTER
              </div>
              <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                Enterprise <span className="font-display-lg-italic italic font-light text-primary font-normal">assets</span>.
              </h1>
            </div>

            {/* Quick Actions (Managers/Admin only) */}
            {(role === "ADMIN" || role === "ASSET_MANAGER") && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-primary text-on-primary px-6 py-3 font-label-mono text-xs uppercase tracking-widest hover:bg-opacity-90 transition-all flex items-center gap-2 rounded-none cursor-pointer font-bold"
              >
                <span className="material-symbols-outlined text-sm">add_circle</span>
                Add Asset
              </button>
            )}
          </div>

          {/* Filters Bar */}
          <section className="mb-8 border border-border-hairline bg-white p-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
              <input
                ref={searchInputRef}
                className="flex-1 bg-transparent border border-border-hairline px-4 py-2 text-xs font-body-md placeholder:text-outline-variant focus:border-primary focus:outline-none transition-colors"
                placeholder="Search Asset Tag, Serial, or Name... (Ctrl+K)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                type="submit"
                className="bg-surface-container-high border border-border-hairline text-secondary px-6 font-label-mono text-xs uppercase tracking-widest hover:bg-sage-hover hover:text-on-primary-container transition-colors cursor-pointer"
              >
                Search
              </button>
            </form>

            {/* Filter Dropdowns */}
            <div className="flex gap-3">
              {/* Category Selector */}
              <select
                className="bg-transparent border border-border-hairline px-4 py-2 text-xs font-label-mono uppercase tracking-wider text-secondary focus:border-primary focus:outline-none transition-colors"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>

              {/* Status Selector */}
              <select
                className="bg-transparent border border-border-hairline px-4 py-2 text-xs font-label-mono uppercase tracking-wider text-secondary focus:border-primary focus:outline-none transition-colors"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="ALLOCATED">Allocated</option>
                <option value="RESERVED">Reserved</option>
                <option value="UNDER_MAINTENANCE">Maintenance</option>
              </select>
            </div>
          </section>

          {/* Asset Listing Table */}
          <section className="bg-surface border border-border-hairline overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="border-b border-border-hairline bg-surface-container-low text-xs">
                  <th className="px-gutter py-4 font-label-mono text-label-mono text-secondary uppercase font-semibold">
                    Asset Tag
                  </th>
                  <th className="px-gutter py-4 font-label-mono text-label-mono text-secondary uppercase font-semibold">
                    Description &amp; Metadata
                  </th>
                  <th className="px-gutter py-4 font-label-mono text-label-mono text-secondary uppercase font-semibold">
                    Acquisition Cost
                  </th>
                  <th className="px-gutter py-4 font-label-mono text-label-mono text-secondary uppercase font-semibold">
                    Custodian Status
                  </th>
                  <th className="px-gutter py-4 font-label-mono text-label-mono text-secondary uppercase font-semibold">
                    Current Custody
                  </th>
                  <th className="px-gutter py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-hairline text-xs font-body-md">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-gutter py-12 text-center text-secondary font-label-mono">
                      Querying Register Directory...
                    </td>
                  </tr>
                ) : assets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-gutter py-12 text-center text-secondary">
                      No assets registered matching criteria.
                    </td>
                  </tr>
                ) : (
                  assets.map((asset) => {
                    const custodian = getCustodianInfo(asset);
                    const allocId = getCustodianAllocationId(asset);
                    const isSelfAllocated = asset.allocations?.some(
                      (a) => a.status === "ACTIVE" && a.allocatedToEmployee?.id === user?.employee?.id
                    );

                    return (
                      <tr
                        key={asset.id}
                        className="row-hover-reveal group hover:bg-surface-container-lowest transition-colors duration-150"
                      >
                        {/* Asset Tag */}
                        <td className="px-gutter py-5">
                          <span className="font-label-mono text-on-surface font-bold text-xs uppercase">
                            {asset.assetTag}
                          </span>
                        </td>

                        {/* Name & Serial */}
                        <td className="px-gutter py-5">
                          <div className="flex flex-col">
                            <span className="font-bold text-on-surface text-sm mb-1">{asset.name}</span>
                            <span className="font-label-mono text-[10px] text-secondary">
                              SN: {asset.serialNumber || "—"} · {asset.category?.name}
                            </span>
                          </div>
                        </td>

                        {/* Cost */}
                        <td className="px-gutter py-5 font-semibold text-on-surface text-sm">
                          {asset.acquisitionCost ? `$${asset.acquisitionCost.toLocaleString()}` : "—"}
                        </td>

                        {/* Status Label */}
                        <td className="px-gutter py-5">
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                              asset.status === "AVAILABLE"
                                ? "bg-status-available/20 text-on-primary-container"
                                : asset.status === "ALLOCATED"
                                ? "bg-status-allocated/20 text-on-secondary-container"
                                : "bg-status-maintenance/20 text-on-tertiary-container"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                asset.status === "AVAILABLE"
                                  ? "bg-status-available"
                                  : asset.status === "ALLOCATED"
                                  ? "bg-status-allocated"
                                  : "bg-status-maintenance"
                              }`}
                            ></span>
                            {asset.status.replace("_", " ")}
                          </div>
                        </td>

                        {/* Current Custodian */}
                        <td className="px-gutter py-5 text-secondary font-label-mono text-[11px]">
                          {custodian}
                        </td>

                        {/* Interactive Buttons */}
                        <td className="px-gutter py-5 text-right">
                          <div className="action-trigger inline-flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {/* Manager Actions */}
                            {(role === "ADMIN" || role === "ASSET_MANAGER") && (
                              <>
                                {asset.status === "AVAILABLE" && (
                                  <button
                                    onClick={() => {
                                      setActiveAsset(asset);
                                      setIsAllocateModalOpen(true);
                                    }}
                                    className="bg-primary text-white px-3 py-1 font-label-mono text-[9px] uppercase tracking-wider hover:bg-opacity-90 cursor-pointer"
                                  >
                                    Allocate
                                  </button>
                                )}
                                {asset.status === "ALLOCATED" && allocId && (
                                  <button
                                    onClick={() => handleRevokeAllocation(allocId)}
                                    className="bg-error text-white px-3 py-1 font-label-mono text-[9px] uppercase tracking-wider hover:bg-opacity-90 cursor-pointer"
                                  >
                                    Revoke
                                  </button>
                                )}
                              </>
                            )}

                            {/* Employee actions */}
                            {role === "EMPLOYEE" && (
                              <>
                                {isSelfAllocated ? (
                                  <button
                                    onClick={() => {
                                      setActiveAsset(asset);
                                      setIsReturnModalOpen(true);
                                    }}
                                    className="bg-primary text-white px-3 py-1 font-label-mono text-[9px] uppercase tracking-wider hover:bg-opacity-90 cursor-pointer"
                                  >
                                    Return
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setActiveAsset(asset);
                                      setIsTransferModalOpen(true);
                                    }}
                                    className="border border-primary text-primary px-3 py-1 font-label-mono text-[9px] uppercase tracking-wider hover:bg-sage-hover cursor-pointer"
                                  >
                                    Transfer
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalCount > limit && (
              <div className="px-gutter py-4 border-t border-border-hairline flex justify-between items-center bg-surface-container-low text-xs">
                <p className="font-label-mono text-[10px] text-secondary uppercase">
                  Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, totalCount)} of {totalCount} Assets
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="w-8 h-8 flex items-center justify-center border border-border-hairline bg-white hover:bg-surface-container-low disabled:opacity-50 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>
                  <button
                    disabled={page * limit >= totalCount}
                    onClick={() => setPage((p) => p + 1)}
                    className="w-8 h-8 flex items-center justify-center border border-border-hairline bg-white hover:bg-surface-container-low disabled:opacity-50 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Modal: Add Asset */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-border-hairline max-w-xl w-full p-8 relative animate-countUp">
              <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6">Register Asset</h2>
              <form onSubmit={handleAddAsset} className="space-y-4 text-xs">
                {formError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{formError}</div>}
                
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Asset Name</label>
                  <input required className="border border-border-hairline p-2 focus:outline-none" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g. MacBook Pro 16-inch" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Category</label>
                    <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent font-label-mono uppercase" value={addCategory} onChange={(e) => setAddCategory(e.target.value)}>
                      <option value="">Select Category</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Serial Number</label>
                    <input className="border border-border-hairline p-2 focus:outline-none" value={addSerial} onChange={(e) => setAddSerial(e.target.value)} placeholder="e.g. C02X12345" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Acquisition Cost ($)</label>
                    <input type="number" step="0.01" className="border border-border-hairline p-2 focus:outline-none" value={addCost} onChange={(e) => setAddCost(e.target.value)} placeholder="e.g. 1999" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Acquisition Date</label>
                    <input type="date" className="border border-border-hairline p-2 focus:outline-none" value={addDate} onChange={(e) => setAddDate(e.target.value)} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Location / Site</label>
                  <input className="border border-border-hairline p-2 focus:outline-none" value={addLocation} onChange={(e) => setAddLocation(e.target.value)} placeholder="e.g. London Office, Room 402" />
                </div>

                <div className="flex items-center gap-3 py-2 border-y border-border-hairline">
                  <input type="checkbox" id="shared" checked={addShared} onChange={(e) => setAddShared(e.target.checked)} />
                  <label htmlFor="shared" className="font-label-mono uppercase text-secondary font-semibold cursor-pointer">Mark as Shared / Bookable Resource</label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer">Cancel</button>
                  <button type="submit" disabled={submitting} className="bg-primary text-white px-6 py-2.5 font-label-mono uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">{submitting ? "Saving..." : "Submit Registry"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Allocate Asset */}
        {isAllocateModalOpen && activeAsset && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-border-hairline max-w-md w-full p-8 relative animate-countUp">
              <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6">Allocate Custody</h2>
              <form onSubmit={handleAllocateAsset} className="space-y-4 text-xs">
                {formError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{formError}</div>}
                
                <div className="flex justify-between items-center bg-surface-container-low p-3 font-label-mono uppercase tracking-wide text-secondary mb-4">
                  <span>Asset:</span>
                  <span className="font-bold text-on-surface">{activeAsset.assetTag} ({activeAsset.name})</span>
                </div>

                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <input type="radio" id="type-emp" name="target-type" checked={allocType === "employee"} onChange={() => { setAllocType("employee"); setAllocTarget(""); }} />
                    <label htmlFor="type-emp" className="font-label-mono uppercase text-secondary cursor-pointer">Employee</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="radio" id="type-dept" name="target-type" checked={allocType === "department"} onChange={() => { setAllocType("department"); setAllocTarget(""); }} />
                    <label htmlFor="type-dept" className="font-label-mono uppercase text-secondary cursor-pointer">Department</label>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Recipient Target</label>
                  {allocType === "employee" ? (
                    <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={allocTarget} onChange={(e) => setAllocTarget(e.target.value)}>
                      <option value="">Select Employee</option>
                      {employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>)}
                    </select>
                  ) : (
                    <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={allocTarget} onChange={(e) => setAllocTarget(e.target.value)}>
                      <option value="">Select Department</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                    </select>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Expected Return Date</label>
                  <input type="date" className="border border-border-hairline p-2 focus:outline-none" value={allocReturnDate} onChange={(e) => setAllocReturnDate(e.target.value)} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Allocation Note</label>
                  <textarea rows={3} className="border border-border-hairline p-2 focus:outline-none" value={allocNote} onChange={(e) => setAllocNote(e.target.value)} placeholder="Brief custody notes..." />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsAllocateModalOpen(false)} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer">Cancel</button>
                  <button type="submit" disabled={submitting} className="bg-primary text-white px-6 py-2.5 font-label-mono uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">{submitting ? "Processing..." : "Confirm Custody"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Return Request */}
        {isReturnModalOpen && activeAsset && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-border-hairline max-w-md w-full p-8 relative animate-countUp">
              <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6">Initiate Asset Return</h2>
              <form onSubmit={handleReturnAsset} className="space-y-4 text-xs">
                {formError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{formError}</div>}
                
                <div className="bg-surface-container-low p-3 font-label-mono uppercase tracking-wide text-secondary mb-4">
                  <span>Return Asset:</span>
                  <span className="font-bold text-on-surface block mt-1">{activeAsset.assetTag} - {activeAsset.name}</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Condition on Return</label>
                  <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={returnCondition} onChange={(e) => setReturnCondition(e.target.value)}>
                    <option value="GOOD">Good</option>
                    <option value="EXCELLENT">Excellent</option>
                    <option value="FAIR">Fair</option>
                    <option value="POOR">Poor</option>
                    <option value="DAMAGED">Damaged</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Inspection Notes</label>
                  <textarea rows={3} className="border border-border-hairline p-2 focus:outline-none" value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} placeholder="Condition details, issues found..." />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsReturnModalOpen(false)} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer">Cancel</button>
                  <button type="submit" disabled={submitting} className="bg-primary text-white px-6 py-2.5 font-label-mono uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">{submitting ? "Submitting..." : "Confirm Return"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Custody Transfer Request */}
        {isTransferModalOpen && activeAsset && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-border-hairline max-w-md w-full p-8 relative animate-countUp">
              <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6">Request Custody Transfer</h2>
              <form onSubmit={handleTransferAsset} className="space-y-4 text-xs">
                {formError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{formError}</div>}
                
                <div className="bg-surface-container-low p-3 font-label-mono uppercase tracking-wide text-secondary mb-4 flex justify-between items-center">
                  <span>Target Asset:</span>
                  <span className="font-bold text-on-surface">{activeAsset.assetTag} ({activeAsset.name})</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Transfer To (Myself)</label>
                  <input disabled className="border border-border-hairline p-2 focus:outline-none bg-surface-container-low" value={user?.employee ? `${user.employee.firstName} ${user.employee.lastName} (Self)` : user?.email} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Reason for Transfer</label>
                  <textarea required rows={4} className="border border-border-hairline p-2 focus:outline-none" value={transferReason} onChange={(e) => setTransferReason(e.target.value)} placeholder="Please explain why you need to hold this asset..." />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsTransferModalOpen(false)} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer">Cancel</button>
                  <button type="submit" disabled={submitting} className="bg-primary text-white px-6 py-2.5 font-label-mono uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">{submitting ? "Submitting..." : "Send Request"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
