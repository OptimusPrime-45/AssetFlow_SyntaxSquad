"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useAuth } from "@/lib/context/AuthContext";

interface Notification {
  id: string;
  type: string;
  priority: string;
  status: "UNREAD" | "READ" | "ARCHIVED";
  title: string;
  message: string;
  sentAt: string;
}

export default function Notifications() {
  const { user, role, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch("/api/notifications?limit=50");
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      } else {
        setError(data.error || "Failed to load notifications.");
      }

      const countRes = await fetch("/api/notifications/unread-count");
      const countData = await countRes.json();
      if (countData.success) {
        setUnreadCount(countData.count || 0);
      }
    } catch {
      setError("A connection error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchNotifications();
      } else {
        alert(data.error || "Failed to mark notifications as read.");
      }
    } catch {
      alert("A network error occurred.");
    }
  };

  const handleRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchNotifications();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/archive`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchNotifications();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-label-mono text-xs uppercase tracking-widest text-secondary">
        Syncing alerts system...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-fixed selection:text-on-primary-fixed">
      <Sidebar activePage="notifications" />

      <main className="ml-64 min-h-screen px-container-padding py-12 flex flex-col justify-between">
        <div>
          <Header section="Notifications Center" />

          <header className="mb-section-margin flex justify-between items-end">
            <div>
              <p className="font-label-mono text-label-mono text-secondary uppercase tracking-[0.2em] mb-2 flex items-center text-xs font-semibold">
                <span className="text-primary font-bold">§ 09</span>
                <span className="mx-2 opacity-30">·</span>
                SYSTEM ALERTS ({unreadCount} UNREAD)
              </p>
              <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                System <span className="font-display-lg-italic italic font-light text-primary font-normal">notifications</span>.
              </h1>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="bg-primary text-white px-6 py-3 font-label-mono text-xs uppercase tracking-widest hover:bg-opacity-90 transition-all cursor-pointer font-bold"
              >
                Mark All Read
              </button>
            )}
          </header>

          {/* List display */}
          <section className="bg-surface border border-border-hairline p-6 max-w-3xl">
            <div className="space-y-4">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => n.status === "UNREAD" && handleRead(n.id)}
                  className={`p-5 border border-border-hairline transition-all duration-150 flex items-start justify-between cursor-pointer ${
                    n.status === "UNREAD" ? "bg-surface-bright border-primary" : "opacity-75 bg-surface hover:bg-surface-container-low"
                  }`}
                >
                  <div className="flex gap-4">
                    <span className={`material-symbols-outlined mt-0.5 ${n.status === "UNREAD" ? "text-primary" : "text-secondary"}`}>
                      {n.type === "OVERDUE_RETURN" ? "warning" : n.type === "ASSET_ASSIGNED" ? "sync_alt" : "notifications"}
                    </span>
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-2">
                        {n.title}
                        {n.status === "UNREAD" && (
                          <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full"></span>
                        )}
                      </h4>
                      <p className="text-secondary text-xs">{n.message}</p>
                      <span className="block mt-2 font-label-mono text-[9px] text-secondary">
                        {new Date(n.sentAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleArchive(n.id); }}
                    className="text-secondary hover:text-error transition-colors p-1"
                    title="Archive Alert"
                  >
                    <span className="material-symbols-outlined text-[18px]">archive</span>
                  </button>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="py-12 text-center text-secondary italic text-xs">
                  No notifications in your inbox.
                </div>
              )}
            </div>
          </section>
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
