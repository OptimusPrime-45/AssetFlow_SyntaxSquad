"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useAuth } from "@/lib/context/AuthContext";

interface Session {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
}

export default function Profile() {
  const { user, role, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Password change states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/auth/sessions");
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions || []);
      }
    } catch {
      setError("Failed to fetch sessions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: oldPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg("Password changed successfully.");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(data.error || "Failed to change password.");
      }
    } catch {
      setError("A connection error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeSession = async (id: string) => {
    if (!confirm("Revoke this session? That device will be signed out.")) return;
    try {
      const res = await fetch(`/api/auth/sessions/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchSessions();
      } else {
        alert(data.error || "Failed to revoke session.");
      }
    } catch {
      alert("A connection error occurred.");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-label-mono text-xs uppercase tracking-widest text-secondary">
        Syncing user profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-fixed selection:text-on-primary-fixed">
      <Sidebar activePage="profile" />

      <main className="ml-64 min-h-screen px-container-padding py-12 flex flex-col justify-between">
        <div>
          <Header section="Profile Settings" />

          <header className="mb-section-margin">
            <p className="font-label-mono text-label-mono text-secondary uppercase tracking-[0.2em] mb-2 flex items-center text-xs font-semibold">
              <span className="text-primary font-bold">§ 10</span>
              <span className="mx-2 opacity-30">·</span>
              USER PROFILE
            </p>
            <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
              My <span className="font-display-lg-italic italic font-light text-primary font-normal">identity</span>.
            </h1>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Profile Card & Password change */}
            <div className="col-span-12 lg:col-span-6 space-y-6">
              {/* Profile Card */}
              {user && (
                <section className="bg-surface border border-border-hairline p-6 text-xs space-y-4">
                  <div className="border-b border-border-hairline pb-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-sm text-on-surface">
                        {user.employee?.firstName} {user.employee?.lastName}
                      </h3>
                      <div className="font-label-mono text-[10px] text-secondary uppercase tracking-widest">
                        {user.employee?.employeeCode}
                      </div>
                    </div>
                    <span className="bg-primary-container text-on-primary-container font-label-mono text-[10px] uppercase font-bold px-2 py-0.5">
                      {role?.replace("_", " ")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="font-label-mono text-[9px] uppercase text-secondary font-semibold">Email Address</div>
                      <div className="text-on-surface font-semibold">{user.email}</div>
                    </div>
                    <div>
                      <div className="font-label-mono text-[9px] uppercase text-secondary font-semibold">Designation</div>
                      <div className="text-on-surface font-semibold">{user.employee?.designation || "—"}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <div className="font-label-mono text-[9px] uppercase text-secondary font-semibold">Joined At</div>
                      <div className="text-on-surface font-semibold">
                        {user.employee?.joinedAt ? new Date(user.employee.joinedAt).toLocaleDateString() : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="font-label-mono text-[9px] uppercase text-secondary font-semibold">Account Status</div>
                      <div className="text-primary font-bold uppercase">{user.status}</div>
                    </div>
                  </div>
                </section>
              )}

              {/* Password Change Form */}
              <section className="bg-surface border border-border-hairline p-6">
                <h3 className="font-label-mono text-[10px] uppercase text-secondary tracking-widest mb-4 font-semibold">
                  Update Password Rules
                </h3>
                <form onSubmit={handleChangePassword} className="space-y-4 text-xs font-body-md">
                  {error && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{error}</div>}
                  {successMsg && <div className="p-3 bg-primary-container text-on-primary-container font-label-mono uppercase tracking-wider">{successMsg}</div>}

                  <div className="flex flex-col gap-1">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Current Password</label>
                    <input
                      type="password"
                      required
                      className="border border-border-hairline p-2.5 focus:outline-none"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-label-mono uppercase text-secondary font-semibold">New Password</label>
                    <input
                      type="password"
                      required
                      className="border border-border-hairline p-2.5 focus:outline-none"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      className="border border-border-hairline p-2.5 focus:outline-none"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-primary text-white py-3.5 font-label-mono uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold"
                  >
                    {submitting ? "Updating..." : "Commit Change"}
                  </button>
                </form>
              </section>
            </div>

            {/* Right Column: Sessions List */}
            <div className="col-span-12 lg:col-span-6 bg-surface border border-border-hairline p-6">
              <h3 className="font-label-mono text-[10px] uppercase text-secondary tracking-widest mb-4 font-semibold">
                Authorized Devices &amp; Sessions
              </h3>
              <div className="divide-y divide-border-hairline">
                {sessions.map((s) => (
                  <div key={s.id} className="py-4 text-xs flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-on-surface">IP Address: {s.ipAddress || "Unknown"}</div>
                      <p className="text-secondary text-[11px] mt-1 line-clamp-1 max-w-sm" title={s.userAgent || ""}>
                        {s.userAgent || "No Agent"}
                      </p>
                      <span className="block mt-2 font-label-mono text-[9px] text-secondary">
                        Logged In: {new Date(s.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRevokeSession(s.id)}
                      className="border border-border-hairline text-secondary hover:border-error hover:text-error px-2 py-1 text-[9.5px] font-label-mono uppercase tracking-wider transition-all cursor-pointer bg-transparent font-bold"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <div className="py-8 text-center text-secondary italic">No active sessions.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-section-margin pt-12 border-t border-border-hairline flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-12">
          <div className="space-y-1">
            <div className="font-section-number text-[18px] text-on-surface font-semibold">
              AssetFlow
            </div>
            <p className="font-label-mono text-[11px] text-secondary uppercase tracking-widest">
              © 2026 AssetFlow Systems. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
