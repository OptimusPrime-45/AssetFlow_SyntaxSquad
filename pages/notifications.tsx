"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useAuth } from "@/lib/context/AuthContext";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "UNREAD" | "READ" | "ARCHIVED";
  sentAt: string;
}

export default function Notifications() {
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "ARCHIVED">("ALL");

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      let query = "/api/notifications?limit=50";
      if (filter === "UNREAD") {
        query += "&status=UNREAD";
      } else if (filter === "ARCHIVED") {
        query += "&status=ARCHIVED";
      } else {
        // Return UNREAD and READ
        query += "&status=ALL";
      }

      const res = await fetch(query);
      if (res.status === 200) {
        const data = await res.json();
        if (data.success) {
          setNotifications(data.notifications);
        }
      }
    } catch (e) {
      console.error("Failed to load notifications", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, filter]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
      });
      if (res.status === 200) {
        // Update local state instead of refetching for responsiveness
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, status: "READ" } : n))
        );
      }
    } catch (e) {
      console.error("Failed to mark notification as read", e);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/archive`, {
        method: "PATCH",
      });
      if (res.status === 200) {
        // Remove from list or change status
        setNotifications((prev) =>
          prev.filter((n) => n.id !== id)
        );
      }
    } catch (e) {
      console.error("Failed to archive notification", e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      if (res.status === 200) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, status: "READ" }))
        );
      }
    } catch (e) {
      console.error("Failed to mark all as read", e);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-label-mono text-xs uppercase tracking-widest text-secondary">
        Initializing Notifications...
      </div>
    );
  }

  // Format priority styling
  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "URGENT": return "bg-error/15 text-error border border-error/20";
      case "HIGH": return "bg-status-maintenance/20 text-on-tertiary-container border border-status-maintenance/35";
      case "MEDIUM": return "bg-primary/10 text-primary border border-primary/20";
      default: return "bg-surface-container-high text-secondary border border-border-hairline";
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Sidebar Navigation */}
      <Sidebar activePage="notifications" />

      {/* Main Content Area */}
      <main className="ml-64 min-h-screen px-container-padding py-12 flex flex-col justify-between">
        <div>
          {/* Header */}
          <Header section="Notifications" />

          {/* Header Section */}
          <header className="mb-section-margin flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <div className="font-label-mono text-label-mono text-secondary uppercase tracking-[0.2em] mb-2 flex items-center text-xs font-semibold">
                <span className="text-primary font-bold">§ 05</span>
                <span className="mx-2 opacity-30">·</span>
                SYSTEM ALERTS
              </div>
              <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                My <span className="font-display-lg-italic italic font-light text-primary font-normal">notifications</span>.
              </h1>
            </div>

            {/* Mark All Read Button */}
            {notifications.some((n) => n.status === "UNREAD") && (
              <button
                onClick={handleMarkAllRead}
                className="bg-transparent border border-border-hairline hover:border-primary text-secondary hover:text-on-surface px-6 py-3 font-label-mono text-xs uppercase tracking-widest transition-all cursor-pointer font-bold"
              >
                Mark All Read
              </button>
            )}
          </header>

          {/* Tabs Filter */}
          <section className="mb-8 border-b border-border-hairline flex gap-8">
            <button
              onClick={() => setFilter("ALL")}
              className={`pb-4 text-xs font-label-mono uppercase tracking-widest font-bold border-b-2 cursor-pointer transition-all ${
                filter === "ALL" ? "border-primary text-on-surface" : "border-transparent text-secondary hover:text-on-surface"
              }`}
            >
              All Alerts
            </button>
            <button
              onClick={() => setFilter("UNREAD")}
              className={`pb-4 text-xs font-label-mono uppercase tracking-widest font-bold border-b-2 cursor-pointer transition-all ${
                filter === "UNREAD" ? "border-primary text-on-surface" : "border-transparent text-secondary hover:text-on-surface"
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter("ARCHIVED")}
              className={`pb-4 text-xs font-label-mono uppercase tracking-widest font-bold border-b-2 cursor-pointer transition-all ${
                filter === "ARCHIVED" ? "border-primary text-on-surface" : "border-transparent text-secondary hover:text-on-surface"
              }`}
            >
              Archived
            </button>
          </section>

          {/* Notifications List */}
          <div className="bg-white border border-border-hairline divide-y divide-border-hairline">
            {loading ? (
              <div className="p-12 text-center text-secondary text-xs uppercase font-label-mono tracking-widest">
                Syncing Notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center text-secondary text-xs italic">
                No notifications to display in this register.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex flex-col md:flex-row p-8 transition-colors ${
                    n.status === "UNREAD" ? "bg-surface-container-lowest font-medium border-l-2 border-primary" : "bg-white"
                  }`}
                >
                  <div className="flex-1 space-y-2 pr-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`px-2 py-0.5 text-[8px] font-label-mono uppercase font-bold ${getPriorityBadge(n.priority)}`}>
                        {n.priority}
                      </span>
                      <span className="font-label-mono text-[10px] text-secondary">
                        {new Date(n.sentAt).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-on-surface">{n.title}</h3>
                    <p className="text-secondary text-xs leading-relaxed max-w-3xl">{n.message}</p>
                  </div>

                  <div className="mt-4 md:mt-0 flex items-center gap-4 flex-shrink-0 self-end md:self-center">
                    {n.status === "UNREAD" && (
                      <button
                        onClick={() => handleMarkAsRead(n.id)}
                        className="text-primary hover:underline font-label-mono text-[10px] uppercase font-bold cursor-pointer"
                      >
                        Mark Read
                      </button>
                    )}
                    {n.status !== "ARCHIVED" && (
                      <button
                        onClick={() => handleArchive(n.id)}
                        className="text-secondary hover:text-error hover:underline font-label-mono text-[10px] uppercase font-bold cursor-pointer"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
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
