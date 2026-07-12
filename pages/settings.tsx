import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useAuth } from "@/lib/context/AuthContext";

interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
  parentDepartmentId: string | null;
  parentDepartment?: {
    id: string;
    name: string;
    code: string;
  } | null;
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
  status: "ACTIVE" | "INACTIVE";
  isBookable: boolean;
  hasSerialNumber: boolean;
  warrantyMonths?: number | null;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  designation: string | null;
  departmentId: string | null;
  status: string;
  user?: {
    id: string;
    email: string;
    role: string;
    status: string;
  } | null;
}

interface CustomField {
  id: string;
  categoryId: string;
  key: string;
  label: string;
  dataType: "STRING" | "NUMBER" | "BOOLEAN" | "DATE" | "JSON";
  isRequired: boolean;
  sortOrder: number;
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
  const [deptParentId, setDeptParentId] = useState("");

  // Department Edit Modal
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editDeptName, setEditDeptName] = useState("");
  const [editDeptCode, setEditDeptCode] = useState("");
  const [editDeptDesc, setEditDeptDesc] = useState("");
  const [editDeptHeadId, setEditDeptHeadId] = useState("");
  const [editDeptParentId, setEditDeptParentId] = useState("");

  // Category Form
  const [catName, setCatName] = useState("");
  const [catCode, setCatCode] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catBookable, setCatBookable] = useState(false);
  const [catSerial, setCatSerial] = useState(true);

  // Category Edit Modal
  const [editingCategory, setEditingCategory] = useState<AssetCategory | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatCode, setEditCatCode] = useState("");
  const [editCatDesc, setEditCatDesc] = useState("");
  const [editCatBookable, setEditCatBookable] = useState(false);
  const [editCatSerial, setEditCatSerial] = useState(true);
  const [editCatStatus, setEditCatStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  // Category Custom Fields Modal
  const [selectedCategoryForFields, setSelectedCategoryForFields] = useState<AssetCategory | null>(null);
  const [catFields, setCatFields] = useState<CustomField[]>([]);
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldDataType, setNewFieldDataType] = useState<"STRING" | "NUMBER" | "BOOLEAN" | "DATE" | "JSON">("STRING");
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  // Edit Employee Profile Modal
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [empDeptId, setEmpDeptId] = useState("");
  const [empRole, setEmpRole] = useState("");
  const [empStatus, setEmpStatus] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);

      // Independent of each other — awaiting them in turn cost a round trip per tab.
      const [settingsRes, deptRes, catRes, empRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/departments"),
        fetch("/api/asset-categories"),
        fetch("/api/employees?limit=100"),
      ]);

      if (settingsRes.status === 200) {
        const data = await settingsRes.json();
        if (data.success) {
          setSettingsMap(data.settingsMap);
        }
      }

      if (deptRes.status === 200) {
        const data = await deptRes.json();
        if (data.success) {
          setDepartments(data.departments);
        }
      }

      if (catRes.status === 200) {
        const data = await catRes.json();
        if (data.success) {
          setCategories(data.categories);
        }
      }

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

  // Fetch category fields when category custom fields modal is opened
  const fetchCategoryFields = async (categoryId: string) => {
    try {
      const res = await fetch(`/api/asset-categories/${categoryId}/fields`);
      if (res.status === 200) {
        const data = await res.json();
        if (data.success) {
          setCatFields(data.fields || []);
        }
      }
    } catch (e) {
      console.error("Failed to load category fields", e);
    }
  };

  useEffect(() => {
    if (selectedCategoryForFields) {
      fetchCategoryFields(selectedCategoryForFields.id);
    }
  }, [selectedCategoryForFields]);

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
          parentDepartmentId: deptParentId || null,
        }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (res.status === 201 && data.success) {
        setDeptName("");
        setDeptCode("");
        setDeptDesc("");
        setDeptHeadId("");
        setDeptParentId("");
        fetchData();
      } else {
        setFormError(data.error || "Failed to create department");
      }
    } catch (e) {
      setSubmitting(false);
      setFormError("A network error occurred.");
    }
  };

  // Update Department details
  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    setSubmitting(true);
    setFormError(null);

    try {
      // 1. Core data update
      const res = await fetch(`/api/departments/${editingDept.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editDeptName,
          code: editDeptCode,
          description: editDeptDesc || null,
          parentDepartmentId: editDeptParentId || null,
        }),
      });

      // 2. Head update
      const headRes = await fetch(`/api/departments/${editingDept.id}/head`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headEmployeeId: editDeptHeadId || null }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (res.status === 200 && headRes.status === 200 && data.success) {
        setEditingDept(null);
        fetchData();
      } else {
        const headData = await headRes.json();
        setFormError(data.error || headData.error || "Failed to update department");
      }
    } catch (e) {
      setSubmitting(false);
      setFormError("A network error occurred.");
    }
  };

  // Toggle Department Status (Active/Inactive)
  const handleToggleDeptStatus = async (dept: Department) => {
    const nextStatus = dept.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (!confirm(`Are you sure you want to set department status to ${nextStatus}?`)) return;
    try {
      const res = await fetch(`/api/departments/${dept.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (res.status === 200 && data.success) {
        fetchData();
      } else {
        alert(data.error || "Failed to toggle status");
      }
    } catch (e) {
      alert("A network error occurred.");
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

  // Update Category details
  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/asset-categories/${editingCategory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editCatName,
          code: editCatCode,
          description: editCatDesc || null,
          isBookable: editCatBookable,
          hasSerialNumber: editCatSerial,
          status: editCatStatus,
        }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (res.status === 200 && data.success) {
        setEditingCategory(null);
        fetchData();
      } else {
        setFormError(data.error || "Failed to update category");
      }
    } catch (e) {
      setSubmitting(false);
      setFormError("A network error occurred.");
    }
  };

  // Custom Fields Operations
  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryForFields) return;
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/asset-categories/${selectedCategoryForFields.id}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: newFieldKey,
          label: newFieldLabel,
          dataType: newFieldDataType,
          isRequired: newFieldRequired,
          sortOrder: catFields.length + 1,
        }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (res.status === 201 && data.success) {
        setNewFieldKey("");
        setNewFieldLabel("");
        setNewFieldDataType("STRING");
        setNewFieldRequired(false);
        fetchCategoryFields(selectedCategoryForFields.id);
      } else {
        setFormError(data.error || "Failed to add field");
      }
    } catch (e) {
      setSubmitting(false);
      setFormError("A network error occurred.");
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!selectedCategoryForFields) return;
    if (!confirm("Are you sure you want to delete this custom field? All past asset values for this field may be orphaned.")) return;
    try {
      const res = await fetch(`/api/asset-categories/${selectedCategoryForFields.id}/fields/${fieldId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.status === 200 && data.success) {
        fetchCategoryFields(selectedCategoryForFields.id);
      } else {
        alert(data.error || "Failed to delete field");
      }
    } catch (e) {
      alert("A network error occurred.");
    }
  };

  // 4. Update Employee details (Department + Role Promotion + Status Account Status)
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

      // 3. Status update
      const statusRes = await fetch(`/api/employees/${selectedEmployee.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: empStatus }),
      });

      setSubmitting(false);

      if (deptRes.status === 200 && roleRes.status === 200 && statusRes.status === 200) {
        setSelectedEmployee(null);
        setEmpDeptId("");
        setEmpRole("");
        setEmpStatus("");
        fetchData();
      } else {
        const deptData = await deptRes.json();
        const roleData = await roleRes.json();
        const statusData = await statusRes.json();
        setFormError(deptData.error || roleData.error || statusData.error || "Failed to update profile settings");
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

  if (role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-label-mono text-xs uppercase tracking-widest text-error">
        Access Denied: Administrator Credentials Required
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
                        <div className="flex items-center gap-2 mb-1">
                          <strong className="font-bold text-on-surface text-sm">{d.name}</strong>
                          <span className={`px-2 py-0.5 text-[8px] font-label-mono font-bold ${
                            d.status === "ACTIVE" ? "bg-status-available/20 text-on-primary-container" : "bg-surface-container-high text-secondary"
                          }`}>{d.status}</span>
                        </div>
                        <span className="font-label-mono text-secondary">Code: {d.code} · Head: {d.headEmployee ? `${d.headEmployee.firstName} ${d.headEmployee.lastName}` : "—"}</span>
                        {d.parentDepartment && <span className="block text-[10px] text-secondary font-label-mono uppercase mt-1">Parent: {d.parentDepartment.name} ({d.parentDepartment.code})</span>}
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <p className="text-secondary text-[11px] max-w-xs text-right mb-1">{d.description}</p>
                        <div className="flex gap-3 text-[10px] font-label-mono">
                          <button
                            onClick={() => {
                              setEditingDept(d);
                              setEditDeptName(d.name);
                              setEditDeptCode(d.code);
                              setEditDeptDesc(d.description || "");
                              setEditDeptHeadId(d.headEmployee?.id || "");
                              setEditDeptParentId(d.parentDepartmentId || "");
                            }}
                            className="text-primary hover:underline uppercase font-bold cursor-pointer bg-transparent border-0"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleDeptStatus(d)}
                            className="text-secondary hover:text-primary uppercase font-bold cursor-pointer bg-transparent border-0"
                          >
                            {d.status === "ACTIVE" ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </div>
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
                    <label className="font-label-mono uppercase text-secondary font-semibold">Parent Department</label>
                    <select className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={deptParentId} onChange={(e) => setDeptParentId(e.target.value)}>
                      <option value="">No Parent (Root Department)</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
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
                        <div className="flex items-center gap-2 mb-1">
                          <strong className="font-bold text-on-surface text-sm">{c.name}</strong>
                          <span className={`px-2 py-0.5 text-[8px] font-label-mono font-bold ${
                            c.status === "ACTIVE" ? "bg-status-available/20 text-on-primary-container" : "bg-surface-container-high text-secondary"
                          }`}>{c.status}</span>
                        </div>
                        <span className="font-label-mono text-secondary">Code: {c.code}</span>
                        <div className="flex gap-4 font-label-mono text-[9px] uppercase text-secondary font-semibold mt-1">
                          <span>{c.isBookable ? "Shared/Bookable" : "Allocated Only"}</span>
                          <span>{c.hasSerialNumber ? "Serial Tracked" : "No Serial"}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <p className="text-secondary text-[11px] max-w-xs">{c.description}</p>
                        <div className="flex gap-3 text-[10px] font-label-mono">
                          <button
                            onClick={() => {
                              setEditingCategory(c);
                              setEditCatName(c.name);
                              setEditCatCode(c.code);
                              setEditCatDesc(c.description || "");
                              setEditCatBookable(c.isBookable);
                              setEditCatSerial(c.hasSerialNumber);
                              setEditCatStatus(c.status);
                            }}
                            className="text-primary hover:underline uppercase font-bold cursor-pointer bg-transparent border-0 font-semibold"
                          >
                            Edit Class
                          </button>
                          <button
                            onClick={() => setSelectedCategoryForFields(c)}
                            className="text-primary hover:underline uppercase font-bold cursor-pointer bg-transparent border-0 font-semibold"
                          >
                            Custom Fields
                          </button>
                        </div>
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
                    <th className="px-gutter py-4 text-center">Status</th>
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
                      <td className="px-gutter py-4 text-center">
                        <span className={`px-2 py-0.5 font-label-mono text-[9px] uppercase font-bold ${
                          emp.status === "ACTIVE" ? "text-status-available" :
                          emp.status === "ON_LEAVE" ? "text-status-maintenance" : "text-secondary"
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-gutter py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setEmpDeptId(emp.departmentId || "");
                            setEmpRole(emp.user?.role || "EMPLOYEE");
                            setEmpStatus(emp.status);
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

        {/* Modal: Edit Department */}
        {editingDept && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-border-hairline max-w-sm w-full p-8 relative animate-countUp">
              <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6">Modify Department details</h2>
              <form onSubmit={handleUpdateDepartment} className="space-y-4 text-xs font-body-md">
                {formError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{formError}</div>}

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Department Name</label>
                  <input required className="border border-border-hairline p-2 focus:outline-none" value={editDeptName} onChange={(e) => setEditDeptName(e.target.value)} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Short Code</label>
                  <input required className="border border-border-hairline p-2 focus:outline-none" value={editDeptCode} onChange={(e) => setEditDeptCode(e.target.value.toUpperCase())} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Department Head</label>
                  <select className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={editDeptHeadId} onChange={(e) => setEditDeptHeadId(e.target.value)}>
                    <option value="">No Department Head</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Parent Department</label>
                  <select className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={editDeptParentId} onChange={(e) => setEditDeptParentId(e.target.value)}>
                    <option value="">No Parent (Root Department)</option>
                    {departments.filter(d => d.id !== editingDept.id).map((d) => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Description</label>
                  <textarea rows={3} className="border border-border-hairline p-2 focus:outline-none" value={editDeptDesc} onChange={(e) => setEditDeptDesc(e.target.value)} />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setEditingDept(null)} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer">Cancel</button>
                  <button type="submit" disabled={submitting} className="bg-primary text-white px-6 py-2.5 font-label-mono uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">{submitting ? "Updating..." : "Save Department"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Asset Category */}
        {editingCategory && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-border-hairline max-w-sm w-full p-8 relative animate-countUp">
              <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6">Modify Category details</h2>
              <form onSubmit={handleUpdateCategory} className="space-y-4 text-xs font-body-md">
                {formError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{formError}</div>}

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Category Name</label>
                  <input required className="border border-border-hairline p-2 focus:outline-none" value={editCatName} onChange={(e) => setEditCatName(e.target.value)} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Short Code</label>
                  <input required className="border border-border-hairline p-2 focus:outline-none" value={editCatCode} onChange={(e) => setEditCatCode(e.target.value.toUpperCase())} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Category Status</label>
                  <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={editCatStatus} onChange={(e) => setEditCatStatus(e.target.value as any)}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                <div className="flex flex-col gap-3 py-2 border-y border-border-hairline">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="edit-cat-bookable" checked={editCatBookable} onChange={(e) => setEditCatBookable(e.target.checked)} />
                    <label htmlFor="edit-cat-bookable" className="font-label-mono uppercase text-secondary cursor-pointer">Mark as Shared / Bookable class</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="edit-cat-serial" checked={editCatSerial} onChange={(e) => setEditCatSerial(e.target.checked)} />
                    <label htmlFor="edit-cat-serial" className="font-label-mono uppercase text-secondary cursor-pointer">Require Serial Number registry</label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setEditingCategory(null)} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer">Cancel</button>
                  <button type="submit" disabled={submitting} className="bg-primary text-white px-6 py-2.5 font-label-mono uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">{submitting ? "Updating..." : "Save Category"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Category Custom Fields Manager */}
        {selectedCategoryForFields && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-border-hairline max-w-2xl w-full p-8 relative animate-countUp flex flex-col md:flex-row gap-8">
              {/* Left Side: Fields List */}
              <div className="flex-1 min-w-[280px]">
                <h2 className="font-display-lg text-lg font-bold text-on-surface mb-2">Category Custom Fields</h2>
                <p className="font-label-mono text-[10px] text-secondary uppercase tracking-widest mb-4">Class: {selectedCategoryForFields.name}</p>
                
                <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                  {catFields.length === 0 ? (
                    <p className="text-secondary text-xs italic py-6">No custom fields defined for this category.</p>
                  ) : (
                    catFields.map((f) => (
                      <div key={f.id} className="p-3 border border-border-hairline bg-surface flex justify-between items-center text-xs font-body-md">
                        <div>
                          <strong className="block font-bold text-on-surface">{f.label}</strong>
                          <span className="font-label-mono text-[10px] text-secondary uppercase">
                            Key: {f.key} · Type: {f.dataType} {f.isRequired && "· Required"}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteField(f.id)}
                          className="text-error font-label-mono text-[10px] uppercase font-bold hover:underline cursor-pointer bg-transparent border-0"
                        >
                          Delete
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Side: Add Field Form */}
              <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-border-hairline pt-6 md:pt-0 md:pl-8">
                <h3 className="font-label-mono text-xs uppercase tracking-wider text-secondary font-bold mb-4 pb-2 border-b border-border-hairline">Add Custom Attribute</h3>
                <form onSubmit={handleAddField} className="space-y-4 text-xs font-body-md">
                  {formError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{formError}</div>}

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Attribute Label</label>
                    <input required className="border border-border-hairline p-2 focus:outline-none" value={newFieldLabel} onChange={(e) => setNewFieldLabel(e.target.value)} placeholder="e.g. Screen Size" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Unique DB Key</label>
                    <input required className="border border-border-hairline p-2 focus:outline-none" value={newFieldKey} onChange={(e) => setNewFieldKey(e.target.value)} placeholder="e.g. screen_size" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Data Type</label>
                    <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={newFieldDataType} onChange={(e) => setNewFieldDataType(e.target.value as any)}>
                      <option value="STRING">Text String</option>
                      <option value="NUMBER">Number</option>
                      <option value="BOOLEAN">Boolean Toggle</option>
                      <option value="DATE">Calendar Date</option>
                      <option value="JSON">Structured JSON</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 py-2">
                    <input type="checkbox" id="field-required" checked={newFieldRequired} onChange={(e) => setNewFieldRequired(e.target.checked)} />
                    <label htmlFor="field-required" className="font-label-mono uppercase text-secondary cursor-pointer">Required field</label>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => setSelectedCategoryForFields(null)} className="border border-border-hairline px-4 py-2 font-label-mono uppercase tracking-wider text-secondary cursor-pointer">Close</button>
                    <button type="submit" disabled={submitting} className="bg-primary text-white px-5 py-2 font-label-mono uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">{submitting ? "Adding..." : "Add Attribute"}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Modify Employee Profile */}
        {selectedEmployee && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-border-hairline max-w-sm w-full p-8 relative animate-countUp">
              <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6">Modify Profile &amp; Role</h2>
              <form onSubmit={handleUpdateEmployee} className="space-y-4 text-xs font-body-md">
                {formError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{formError}</div>}

                <div className="bg-surface-container-low p-3 font-label-mono uppercase tracking-wide text-secondary mb-4 flex justify-between items-center text-[10px]">
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

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Account Status</label>
                  <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent font-label-mono uppercase" value={empStatus} onChange={(e) => setEmpStatus(e.target.value)}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="TERMINATED">Terminated (Login Suspended)</option>
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
