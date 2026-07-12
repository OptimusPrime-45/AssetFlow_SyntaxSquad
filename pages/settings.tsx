import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useAuth } from "@/lib/context/AuthContext";

interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  headEmployee?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface AssetCategory {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isBookable: boolean;
  hasSerialNumber: boolean;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  designation: string | null;
  departmentId: string | null;
  user?: {
    id: string;
    email: string;
    role: string;
  } | null;
}

export default function Settings() {
  const { user, role, loading: authLoading } = useAuth();

  // Lists
  const [settingsMap, setSettingsMap] = useState<Record<string, any>>({});
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // State
  const [activeTab, setActiveTab] = useState<"system" | "departments" | "categories" | "employees">("system");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal / Form States
  // Department Form
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [deptDesc, setDeptDesc] = useState("");
  const [deptHeadId, setDeptHeadId] = useState("");

  // Category Form
  const [catName, setCatName] = useState("");
  const [catCode, setCatCode] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catBookable, setCatBookable] = useState(false);
  const [catSerial, setCatSerial] = useState(true);

  // Edit Employee Profile Modal
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [empDeptId, setEmpDeptId] = useState("");
  const [empRole, setEmpRole] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch settings
      const settingsRes = await fetch("/api/settings");
      if (settingsRes.status === 200) {
        const data = await settingsRes.json();
        if (data.success) {
          setSettingsMap(data.settingsMap);
        }
      }

      // Fetch departments
      const deptRes = await fetch("/api/departments");
      if (deptRes.status === 200) {
        const data = await deptRes.json();
        if (data.success) {
          setDepartments(data.departments);
        }
      }

      // Fetch categories
      const catRes = await fetch("/api/asset-categories");
      if (catRes.status === 200) {
        const data = await catRes.json();
        if (data.success) {
          setCategories(data.categories);
        }
      }

      // Fetch employees
      const empRes = await fetch("/api/employees?limit=100");
      if (empRes.status === 200) {
        const data = await empRes.json();
        if (data.success) {
          setEmployees(data.employees);
        }
      }
    } catch (e) {
      console.error("Failed to load settings data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, role]);

  // 1. Update Global Settings
  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: settingsMap }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (res.status === 200 && data.success) {
        alert("System configurations updated successfully.");
        fetchData();
      } else {
        setFormError(data.error || "Failed to update settings");
      }
    } catch (e) {
      setSubmitting(false);
      setFormError("A network error occurred.");
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettingsMap((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // 2. Submit Department setup
  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: deptName,
          code: deptCode,
          description: deptDesc || null,
          headEmployeeId: deptHeadId || null,
        }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (res.status === 201 && data.success) {
        setDeptName("");
        setDeptCode("");
        setDeptDesc("");
        setDeptHeadId("");
        fetchData();
      } else {
        setFormError(data.error || "Failed to create department");
      }
    } catch (e) {
      setSubmitting(false);
      setFormError("A network error occurred.");
    }
  };

  // 3. Submit Category setup
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/asset-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: catName,
          code: catCode,
          description: catDesc || null,
          isBookable: catBookable,
          hasSerialNumber: catSerial,
        }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (res.status === 201 && data.success) {
        setCatName("");
        setCatCode("");
        setCatDesc("");
        setCatBookable(false);
        setCatSerial(true);
        fetchData();
      } else {
        setFormError(data.error || "Failed to create category");
      }
    } catch (e) {
      setSubmitting(false);
      setFormError("A network error occurred.");
    }
  };

  // 4. Update Employee details (Department + Role Promotion)
  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setSubmitting(true);
    setFormError(null);

    try {
      // 1. Department update
      const deptRes = await fetch(`/api/employees/${selectedEmployee.id}/department`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentId: empDeptId || null }),
      });

      // 2. Role promotion
      const roleRes = await fetch(`/api/employees/${selectedEmployee.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: empRole }),
      });

      setSubmitting(false);

      if (deptRes.status === 200 && roleRes.status === 200) {
        setSelectedEmployee(null);
        setEmpDeptId("");
        setEmpRole("");
        fetchData();
      } else {
        const deptData = await deptRes.json();
        const roleData = await roleRes.json();
        setFormError(deptData.error || roleData.error || "Failed to update profile settings");
      }
    } catch (e) {
      setSubmitting(false);
      setFormError("A network error occurred.");
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
      <Sidebar activePage="settings" />

      {/* Main Content Area */}
      <main className="ml-64 min-h-screen px-container-padding py-12 flex flex-col justify-between">
        <div>
          {/* Header Bar */}
          <Header section="Global Settings" />

          {/* Section Header */}
          <header className="mb-12">
            <p className="font-label-mono text-label-mono text-secondary uppercase tracking-[0.2em] mb-2 flex items-center text-xs font-semibold">
              <span className="text-primary font-bold">§ 07</span>
              <span className="mx-2 opacity-30">·</span>
              SYSTEM RULES
            </p>
            <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
              Settings &amp; <span className="font-display-lg-italic italic font-light text-primary font-normal">rules</span>.
            </h1>
          </header>

          {/* Tab Selector */}
          <div className="flex border-b border-border-hairline mb-8 text-xs font-label-mono uppercase tracking-widest text-secondary font-semibold">
            <button
              onClick={() => setActiveTab("system")}
              className={`px-6 py-4 border-b-2 transition-all cursor-pointer ${
                activeTab === "system" ? "border-primary text-on-surface font-bold" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              Thresholds Configuration
            </button>
            <button
              onClick={() => setActiveTab("departments")}
              className={`px-6 py-4 border-b-2 transition-all cursor-pointer ${
                activeTab === "departments" ? "border-primary text-on-surface font-bold" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              Departments
            </button>
            <button
              onClick={() => setActiveTab("categories")}
              className={`px-6 py-4 border-b-2 transition-all cursor-pointer ${
                activeTab === "categories" ? "border-primary text-on-surface font-bold" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              Category Customization
            </button>
            <button
              onClick={() => setActiveTab("employees")}
              className={`px-6 py-4 border-b-2 transition-all cursor-pointer ${
                activeTab === "employees" ? "border-primary text-on-surface font-bold" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              Employee Roles Directory
            </button>
          </div>

          {/* Tab 1: Global System Configuration */}
          {activeTab === "system" && (
            <div className="bg-white border border-border-hairline p-8 max-w-2xl">
              <form onSubmit={handleUpdateSettings} className="space-y-6 text-xs font-body-md">
                {formError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{formError}</div>}
                
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Organization Name</label>
                  <input required className="border border-border-hairline p-2.5 focus:outline-none" value={settingsMap.companyName || ""} onChange={(e) => handleSettingChange("companyName", e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Alert Overdue After (Days)</label>
                    <input type="number" required className="border border-border-hairline p-2.5 focus:outline-none" value={settingsMap.alertOverdueAfterDays || ""} onChange={(e) => handleSettingChange("alertOverdueAfterDays", parseInt(e.target.value))} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Max Maintenance Retries</label>
                    <input type="number" required className="border border-border-hairline p-2.5 focus:outline-none" value={settingsMap.maxMaintenanceRetries || ""} onChange={(e) => handleSettingChange("maxMaintenanceRetries", parseInt(e.target.value))} />
                  </div>
                </div>

                <div className="flex items-center gap-3 py-2 border-y border-border-hairline">
                  <input type="checkbox" id="mfa" checked={settingsMap.mfaRequired || false} onChange={(e) => handleSettingChange("mfaRequired", e.target.checked)} />
                  <label htmlFor="mfa" className="font-label-mono uppercase text-secondary font-semibold cursor-pointer">Enforce MFA Authentication</label>
                </div>

                <div className="flex justify-end pt-4">
                  <button type="submit" disabled={submitting} className="bg-primary text-white px-8 py-3.5 font-label-mono uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">{submitting ? "Saving..." : "Save System Config"}</button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 2: Departments */}
          {activeTab === "departments" && (
            <div className="grid grid-cols-12 gap-gutter items-start">
              {/* Department Directory */}
              <div className="col-span-12 lg:col-span-7 bg-white border border-border-hairline p-6">
                <div className="font-label-mono text-xs uppercase tracking-wider text-secondary font-bold pb-2 border-b border-border-hairline mb-4">
                  Departments Directory
                </div>
                <div className="divide-y divide-border-hairline">
                  {departments.map((d) => (
                    <div key={d.id} className="py-4 flex justify-between items-center text-xs">
                      <div>
                        <strong className="block font-bold text-on-surface text-sm mb-1">{d.name}</strong>
                        <span className="font-label-mono text-secondary">Code: {d.code} · Head: {d.headEmployee ? `${d.headEmployee.firstName} ${d.headEmployee.lastName}` : "—"}</span>
                      </div>
                      <p className="text-secondary text-[11px] max-w-xs">{d.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Create Department Form */}
              <div className="col-span-12 lg:col-span-5 bg-white border border-border-hairline p-6">
                <div className="font-label-mono text-xs uppercase tracking-wider text-secondary font-bold pb-2 border-b border-border-hairline mb-4">
                  Setup New Department
                </div>
                <form onSubmit={handleAddDepartment} className="space-y-4 text-xs font-body-md">
                  {formError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{formError}</div>}
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Department Name</label>
                    <input required className="border border-border-hairline p-2 focus:outline-none" value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="e.g. Treasury Operations" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Short Code</label>
                    <input required className="border border-border-hairline p-2 focus:outline-none" value={deptCode} onChange={(e) => setDeptCode(e.target.value.toUpperCase())} placeholder="e.g. TREAS-OPS" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Department Head</label>
                    <select className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={deptHeadId} onChange={(e) => setDeptHeadId(e.target.value)}>
                      <option value="">Select Personnel</option>
                      {employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Description</label>
                    <textarea rows={3} className="border border-border-hairline p-2 focus:outline-none" value={deptDesc} onChange={(e) => setDeptDesc(e.target.value)} placeholder="Scope parameters..." />
                  </div>

                  <button type="submit" disabled={submitting} className="w-full bg-primary text-white py-3.5 font-label-mono uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">{submitting ? "Saving..." : "Create Department"}</button>
                </form>
              </div>
            </div>
          )}

          {/* Tab 3: Category Customization */}
          {activeTab === "categories" && (
            <div className="grid grid-cols-12 gap-gutter items-start">
              {/* Category list */}
              <div className="col-span-12 lg:col-span-7 bg-white border border-border-hairline p-6">
                <div className="font-label-mono text-xs uppercase tracking-wider text-secondary font-bold pb-2 border-b border-border-hairline mb-4">
                  Asset Classes Categories
                </div>
                <div className="divide-y divide-border-hairline">
                  {categories.map((c) => (
                    <div key={c.id} className="py-4 flex justify-between items-center text-xs">
                      <div>
                        <strong className="block font-bold text-on-surface text-sm mb-1">{c.name}</strong>
                        <span className="font-label-mono text-secondary">Code: {c.code}</span>
                      </div>
                      <div className="flex gap-4 font-label-mono text-[10px] uppercase text-secondary font-semibold">
                        <span>{c.isBookable ? "Shared/Bookable" : "Allocated Only"}</span>
                        <span>{c.hasSerialNumber ? "Serial Tracked" : "No Serial"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Create Category form */}
              <div className="col-span-12 lg:col-span-5 bg-white border border-border-hairline p-6">
                <div className="font-label-mono text-xs uppercase tracking-wider text-secondary font-bold pb-2 border-b border-border-hairline mb-4">
                  Add Asset Class Category
                </div>
                <form onSubmit={handleAddCategory} className="space-y-4 text-xs font-body-md">
                  {formError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{formError}</div>}
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Category Name</label>
                    <input required className="border border-border-hairline p-2 focus:outline-none" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Executive Vehicles" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Unique Prefix Code</label>
                    <input required className="border border-border-hairline p-2 focus:outline-none" value={catCode} onChange={(e) => setCatCode(e.target.value.toUpperCase())} placeholder="e.g. E-VEH" />
                  </div>

                  <div className="flex flex-col gap-3 py-2 border-y border-border-hairline">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="cat-bookable" checked={catBookable} onChange={(e) => setCatBookable(e.target.checked)} />
                      <label htmlFor="cat-bookable" className="font-label-mono uppercase text-secondary cursor-pointer">Mark as Shared / Bookable class</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="cat-serial" checked={catSerial} onChange={(e) => setCatSerial(e.target.checked)} />
                      <label htmlFor="cat-serial" className="font-label-mono uppercase text-secondary cursor-pointer">Require Serial Number registry</label>
                    </div>
                  </div>

                  <button type="submit" disabled={submitting} className="w-full bg-primary text-white py-3.5 font-label-mono uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">{submitting ? "Saving..." : "Register Category"}</button>
                </form>
              </div>
            </div>
          )}

          {/* Tab 4: Employee Roles Directory */}
          {activeTab === "employees" && (
            <div className="bg-white border border-border-hairline overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-max text-xs font-body-md">
                <thead>
                  <tr className="border-b border-border-hairline bg-surface-container-low text-secondary font-label-mono uppercase font-bold">
                    <th className="px-gutter py-4">Employee Code</th>
                    <th className="px-gutter py-4">Full Name</th>
                    <th className="px-gutter py-4">Email</th>
                    <th className="px-gutter py-4">Designation</th>
                    <th className="px-gutter py-4">Department</th>
                    <th className="px-gutter py-4">System Role</th>
                    <th className="px-gutter py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-hairline">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="px-gutter py-4 font-label-mono font-bold uppercase">{emp.employeeCode}</td>
                      <td className="px-gutter py-4 font-bold">{emp.firstName} {emp.lastName}</td>
                      <td className="px-gutter py-4 font-label-mono">{emp.user?.email || "—"}</td>
                      <td className="px-gutter py-4 text-secondary">{emp.designation || "—"}</td>
                      <td className="px-gutter py-4 font-label-mono">
                        {departments.find((d) => d.id === emp.departmentId)?.name || "—"}
                      </td>
                      <td className="px-gutter py-4">
                        <span className={`px-2 py-0.5 font-label-mono text-[9px] uppercase font-bold ${
                          emp.user?.role === "ADMIN" ? "bg-error-container text-on-error-container" :
                          emp.user?.role === "ASSET_MANAGER" ? "bg-status-available/20 text-on-primary-container" :
                          emp.user?.role === "DEPARTMENT_HEAD" ? "bg-status-allocated/20 text-on-secondary-container" : "bg-surface-container-high text-secondary"
                        }`}>
                          {emp.user?.role || "EMPLOYEE"}
                        </span>
                      </td>
                      <td className="px-gutter py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setEmpDeptId(emp.departmentId || "");
                            setEmpRole(emp.user?.role || "EMPLOYEE");
                          }}
                          className="text-primary font-label-mono text-[10px] hover:underline cursor-pointer uppercase font-semibold"
                        >
                          Modify Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Modify Employee Profile */}
        {selectedEmployee && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-border-hairline max-w-sm w-full p-8 relative animate-countUp">
              <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6">Modify Profile &amp; Role</h2>
              <form onSubmit={handleUpdateEmployee} className="space-y-4 text-xs font-body-md">
                {formError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{formError}</div>}

                <div className="bg-surface-container-low p-3 font-label-mono uppercase tracking-wide text-secondary mb-4 flex justify-between items-center">
                  <span>Target profile:</span>
                  <span className="font-bold text-on-surface">{selectedEmployee.firstName} {selectedEmployee.lastName} ({selectedEmployee.employeeCode})</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Assign Department</label>
                  <select className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={empDeptId} onChange={(e) => setEmpDeptId(e.target.value)}>
                    <option value="">No Department</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Promote/Demote Role</label>
                  <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent font-label-mono uppercase" value={empRole} onChange={(e) => setEmpRole(e.target.value)}>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="DEPARTMENT_HEAD">Department Head</option>
                    <option value="ASSET_MANAGER">Asset Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setSelectedEmployee(null)} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer">Cancel</button>
                  <button type="submit" disabled={submitting} className="bg-primary text-white px-6 py-2.5 font-label-mono uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">{submitting ? "Updating..." : "Save Profile"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
