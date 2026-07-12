import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/context/AuthContext";

interface HeaderProps {
  section: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  status: "UNREAD" | "READ" | "ARCHIVED";
  createdAt: string;
}

export default function Header({ section }: HeaderProps) {
  const { user, role, refreshUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    fileInputRef.current?.click();
  };

  const handleHeaderAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.employee) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "avatars");

      const uploadRes = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json().catch(() => ({}));
      if (uploadRes.status === 200 && uploadData.success && uploadData.secure_url) {
        const updateRes = await fetch(`/api/employees/${user.employee.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarUrl: uploadData.secure_url }),
        });
        const updateData = await updateRes.json().catch(() => ({}));
        if (updateRes.status === 200 && updateData.success) {
          alert("Profile photo updated successfully!");
          if (refreshUser) {
            await refreshUser();
          }
        } else {
          alert(`Error saving photo: ${updateData.error || "Failed to update profile"}`);
        }
      } else {
        alert(`Upload failed: ${uploadData.error || "Failed to upload photo"}`);
      }
    } catch (err: any) {
      console.error(err);
      alert("An error occurred during file upload.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const fetchNotifications = async () => {
    try {
      const countRes = await fetch("/api/notifications/unread-count");
      if (countRes.status === 200) {
        const countData = await countRes.json();
        if (countData.success) {
          setUnreadCount(countData.count);
        }
      }

      const listRes = await fetch("/api/notifications?limit=5");
      if (listRes.status === 200) {
        const listData = await listRes.json();
        if (listData.success) {
          setNotifications(listData.notifications);
        }
      }
    } catch (e) {
      console.error("Failed to load notifications", e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll every 30 seconds for new alerts
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Click outside to close notification dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      if (res.status === 200) {
        const data = await res.json();
        if (data.success) {
          fetchNotifications();
        }
      }
    } catch (e) {
      console.error("Failed to mark notification as read", e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      if (res.status === 200) {
        const data = await res.json();
        if (data.success) {
          fetchNotifications();
        }
      }
    } catch (e) {
      console.error("Failed to mark all as read", e);
    }
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  return (
    <header className="flex justify-between items-center h-20 mb-8 border-b border-border-hairline bg-transparent relative z-40">
      {/* Breadcrumb Info */}
      <div className="flex items-center gap-4">
        <span className="font-label-mono text-label-mono text-secondary text-xs font-semibold tracking-wider">
          SYSTEMS / {section.toUpperCase()}
        </span>
      </div>

      {/* Quick Action Profile & Notification controls */}
      <div className="flex items-center gap-6">
        {/* Notification Bell Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative p-1 text-secondary hover:text-primary transition-colors cursor-pointer focus:outline-none"
          >
            <span className="material-symbols-outlined text-lg">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 h-4 w-4 bg-error text-white font-label-mono text-[9px] font-bold flex items-center justify-center rounded-full leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-border-hairline shadow-md py-2 text-xs font-body-md animate-countUp">
              <div className="px-4 py-2 border-b border-border-hairline flex justify-between items-center font-label-mono uppercase tracking-widest text-secondary font-bold">
                <span>Alerts &amp; Notices</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-primary hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-secondary">
                    No active notifications
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => notif.status === "UNREAD" && handleMarkAsRead(notif.id)}
                      className={`px-4 py-3 border-b border-border-hairline cursor-pointer transition-colors ${
                        notif.status === "UNREAD" ? "bg-surface-container-low font-semibold" : "bg-white hover:bg-surface-container-lowest"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-on-surface font-semibold">{notif.title}</span>
                        <span className="text-[9px] text-secondary font-label-mono">{formatTime(notif.createdAt)}</span>
                      </div>
                      <p className="text-[11px] text-secondary leading-snug">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Info Avatar */}
        {user && (
          <div
            onClick={handleAvatarClick}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer group"
            title="Click to change Profile Photo"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleHeaderAvatarUpload}
              className="hidden"
              accept="image/*"
            />
            <div className="text-right">
              <div className="font-label-mono text-[11px] text-on-surface font-semibold leading-none mb-1 group-hover:text-primary transition-colors">
                {user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.email}
              </div>
              <div className="font-label-mono text-[9px] text-secondary uppercase tracking-widest leading-none">
                {role === "DEPARTMENT_HEAD" ? "Department Head" : (user.employee?.designation || user.role)}
              </div>
            </div>
            <div className="h-8 w-8 bg-primary-container text-on-primary-container font-section-number text-xs font-bold flex items-center justify-center rounded-full overflow-hidden border border-border-hairline group-hover:border-primary transition-colors relative">
              {uploading ? (
                <span className="text-[10px] animate-pulse">...</span>
              ) : user.employee?.avatarUrl ? (
                <img
                  className="object-cover w-full h-full"
                  alt="User profile avatar"
                  src={user.employee.avatarUrl}
                />
              ) : (
                <span>
                  {user.employee
                    ? `${user.employee.firstName[0]}${user.employee.lastName[0]}`.toUpperCase()
                    : user.email.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
