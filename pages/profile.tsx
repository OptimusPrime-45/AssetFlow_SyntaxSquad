"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useAuth } from "@/lib/context/AuthContext";

export default function Profile() {
  const { user, refreshUser, loading: authLoading } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [designation, setDesignation] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user && user.employee) {
      setFirstName(user.employee.firstName || "");
      setLastName(user.employee.lastName || "");
      setPhone(user.employee.phone || "");
      setAvatarUrl(user.employee.avatarUrl || "");
      setDesignation(user.employee.designation || "");
      setNotes((user.employee as any).notes || "");
    }
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "avatars");

      const uploadRes = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json().catch(() => ({}));

      if (uploadRes.status !== 200 || !uploadData.success) {
        throw new Error(uploadData.error || "Failed to upload profile picture");
      }

      if (uploadData.secure_url) {
        setAvatarUrl(uploadData.secure_url);
        setSuccessMsg("Profile picture uploaded successfully. Click save parameters to apply changes.");
      } else {
        throw new Error("No URL returned from upload provider");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to upload photograph.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-label-mono text-xs uppercase tracking-widest text-secondary">
        Initializing Profile...
      </div>
    );
  }

  if (!user || !user.employee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-label-mono text-xs uppercase tracking-widest text-error">
        Access Denied: No Employee Profile Linked.
      </div>
    );
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.employee) return;
    setSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/employees/${user.employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phone: phone || null,
          avatarUrl: avatarUrl || null,
          designation: designation || null,
          notes: notes || null,
        }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (res.status === 200 && data.success) {
        setSuccessMsg("Identity parameters updated successfully.");
        await refreshUser();
      } else {
        setErrorMsg(data.error || "Failed to update profile info.");
      }
    } catch (err) {
      setSubmitting(false);
      setErrorMsg("A network error occurred. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Sidebar Navigation */}
      <Sidebar activePage="profile" />

      {/* Main Content Area */}
      <main className="ml-64 min-h-screen px-container-padding py-12 flex flex-col justify-between">
        <div>
          {/* Header */}
          <Header section="Profile" />

          {/* Header Section */}
          <header className="mb-section-margin">
            <div className="font-label-mono text-label-mono text-secondary uppercase tracking-[0.2em] mb-2 flex items-center text-xs font-semibold">
              <span className="text-primary font-bold">§ 06</span>
              <span className="mx-2 opacity-30">·</span>
              IDENTITY SETTINGS
            </div>
            <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
              My <span className="font-display-lg-italic italic font-light text-primary font-normal">profile</span>.
            </h1>
          </header>

          <div className="grid grid-cols-12 gap-gutter items-start">
            {/* Form Section (8 columns) */}
            <form onSubmit={handleUpdate} className="col-span-12 lg:col-span-8 bg-white border border-border-hairline p-10 space-y-8">
              {successMsg && (
                <div className="p-4 bg-primary/10 text-primary font-label-mono text-xs uppercase tracking-wider border border-primary/20">
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="p-4 bg-error/10 text-error font-label-mono text-xs uppercase tracking-wider border border-error/20">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div className="flex flex-col gap-2">
                  <label className="font-label-mono text-label-mono text-secondary uppercase tracking-widest text-[10px] font-semibold">
                    First Name
                  </label>
                  <input
                    required
                    className="bg-transparent border border-border-hairline p-3 font-body-md text-on-surface focus:border-primary focus:outline-none transition-all"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>

                {/* Last Name */}
                <div className="flex flex-col gap-2">
                  <label className="font-label-mono text-label-mono text-secondary uppercase tracking-widest text-[10px] font-semibold">
                    Last Name
                  </label>
                  <input
                    required
                    className="bg-transparent border border-border-hairline p-3 font-body-md text-on-surface focus:border-primary focus:outline-none transition-all"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Phone */}
                <div className="flex flex-col gap-2">
                  <label className="font-label-mono text-label-mono text-secondary uppercase tracking-widest text-[10px] font-semibold">
                    Contact Phone
                  </label>
                  <input
                    className="bg-transparent border border-border-hairline p-3 font-body-md text-on-surface focus:border-primary focus:outline-none transition-all"
                    type="text"
                    placeholder="e.g. +1 555-0199"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                {/* Designation */}
                <div className="flex flex-col gap-2">
                  <label className="font-label-mono text-label-mono text-secondary uppercase tracking-widest text-[10px] font-semibold">
                    Designation / Position
                  </label>
                  <input
                    className="bg-transparent border border-border-hairline p-3 font-body-md text-on-surface focus:border-primary focus:outline-none transition-all"
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                  />
                </div>
              </div>

              {/* Avatar URL */}
              <div className="flex flex-col gap-2">
                <label className="font-label-mono text-label-mono text-secondary uppercase tracking-widest text-[10px] font-semibold">
                  Avatar / Photograph URL
                </label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-transparent border border-border-hairline p-3 font-body-md text-on-surface focus:border-primary focus:outline-none transition-all"
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                  />
                  <label className="bg-surface-container-high border border-border-hairline text-on-surface px-4 py-3 font-label-mono text-xs uppercase tracking-widest hover:bg-sage-hover transition-colors cursor-pointer flex items-center justify-center font-bold">
                    {uploading ? "Uploading..." : "Upload File"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-2">
                <label className="font-label-mono text-label-mono text-secondary uppercase tracking-widest text-[10px] font-semibold">
                  About / Bio
                </label>
                <textarea
                  className="bg-transparent border border-border-hairline p-3 font-body-md text-on-surface focus:border-primary focus:outline-none transition-all min-h-[100px] resize-y"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary text-on-primary px-8 py-4 font-label-mono text-xs uppercase tracking-widest hover:bg-opacity-90 transition-all cursor-pointer font-bold disabled:opacity-50"
                >
                  {submitting ? "Saving Parameters..." : "Save Identity Parameters"}
                </button>
              </div>
            </form>

            {/* Read-Only Details Panel (4 columns) */}
            <div className="col-span-12 lg:col-span-4 bg-surface-container-low border border-border-hairline p-8 space-y-6">
              <div className="text-center pb-6 border-b border-border-hairline">
                <div className="w-24 h-24 rounded-full bg-primary-fixed flex items-center justify-center text-primary text-3xl font-bold mx-auto mb-4 overflow-hidden border border-border-hairline relative group">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{firstName[0] || ""}{lastName[0] || ""}</span>
                  )}
                  <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-label-mono uppercase tracking-wider cursor-pointer transition-opacity">
                    <span>{uploading ? "..." : "Change"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>
                <h3 className="font-display-lg text-lg font-bold text-on-surface">{firstName} {lastName}</h3>
                <p className="font-label-mono text-[10px] uppercase text-secondary tracking-wider mt-1">
                  {user.role !== "EMPLOYEE" ? user.role.replace("_", " ") : (designation || "Staff Member")}
                </p>
              </div>

              <div className="space-y-4 text-xs font-label-mono text-secondary uppercase">
                <div className="flex justify-between">
                  <span>Employee Code</span>
                  <span className="text-on-surface font-bold">{user.employee.employeeCode}</span>
                </div>
                <div className="flex justify-between">
                  <span>Role Classification</span>
                  <span className="text-on-surface font-bold">{user.role}</span>
                </div>
                <div className="flex justify-between">
                  <span>System Email</span>
                  <span className="text-on-surface font-bold lowercase">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Joined Date</span>
                  <span className="text-on-surface font-bold">
                    {new Date(user.employee.joinedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-section-margin pt-12 border-t border-border-hairline flex justify-between items-center pb-12 text-secondary text-xs">
          <div>
            <div className="font-section-number text-sm text-on-surface font-semibold">AssetFlow</div>
            <p className="font-label-mono text-[10px] uppercase tracking-widest mt-1">© 2026 AssetFlow Systems.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
