import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useAuth } from "@/lib/context/AuthContext";

interface Asset {
  id: string;
  assetTag: string;
  name: string;
  sharedBookable: boolean;
  category: {
    name: string;
    isBookable: boolean;
  };
}

interface Booking {
  id: string;
  title: string;
  purpose: "ROOM" | "VEHICLE" | "EQUIPMENT" | "SPACE" | "OTHER";
  audience: "INDIVIDUAL" | "DEPARTMENT";
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "COMPLETED" | "ACTIVE" | "NOSHOW";
  startAt: string;
  endAt: string;
  notes: string | null;
  asset: Asset;
  bookedBy: {
    firstName: string;
    lastName: string;
    employeeCode: string;
  };
}

export default function Bookings() {
  const { user, role, loading: authLoading } = useAuth();
  
  // Date context
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Lists
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [bookableAssets, setBookableAssets] = useState<Asset[]>([]);

  // State
  const [activeTab, setActiveTab] = useState<"calendar" | "my-list">("calendar");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modals Open
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [addAssetId, setAddAssetId] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addPurpose, setAddPurpose] = useState<"ROOM" | "VEHICLE" | "EQUIPMENT" | "SPACE" | "OTHER">("EQUIPMENT");
  const [addAudience, setAddAudience] = useState<"INDIVIDUAL" | "DEPARTMENT">("INDIVIDUAL");
  const [addDate, setAddDate] = useState("");
  const [addStartTime, setAddStartTime] = useState("09:00");
  const [addEndTime, setAddEndTime] = useState("10:00");
  const [addNotes, setAddNotes] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch all bookings for the calendar (scope handled by backend)
      const allRes = await fetch("/api/bookings?limit=100");
      if (allRes.status === 200) {
        const data = await allRes.json();
        if (data.success) {
          setAllBookings(data.bookings);
        }
      }

      // Fetch my bookings
      const myRes = await fetch("/api/bookings/my?limit=50");
      if (myRes.status === 200) {
        const data = await myRes.json();
        if (data.success) {
          setMyBookings(data.bookings);
        }
      }

      // Fetch bookable assets
      const assetRes = await fetch("/api/assets?limit=100");
      if (assetRes.status === 200) {
        const data = await assetRes.json();
        if (data.success) {
          // Filter to bookable category or explicit bookable flag
          const filtered = data.assets.filter(
            (a: any) => a.sharedBookable || a.category?.isBookable
          );
          setBookableAssets(filtered);
        }
      }
    } catch (e) {
      console.error("Failed to load reservation registry", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, role]);

  // Create new booking
  const handleAddBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const startDateTime = new Date(`${addDate}T${addStartTime}:00`);
    const endDateTime = new Date(`${addDate}T${addEndTime}:00`);

    if (endDateTime <= startDateTime) {
      setFormError("End time must be after start time");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: addAssetId,
          title: addTitle,
          purpose: addPurpose,
          audience: addAudience,
          startAt: startDateTime.toISOString(),
          endAt: endDateTime.toISOString(),
          notes: addNotes || null,
        }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (res.status === 201 && data.success) {
        setIsAddModalOpen(false);
        // Reset form
        setAddAssetId("");
        setAddTitle("");
        setAddPurpose("EQUIPMENT");
        setAddAudience("INDIVIDUAL");
        setAddDate("");
        setAddStartTime("09:00");
        setAddEndTime("10:00");
        setAddNotes("");
        fetchData();
      } else {
        setFormError(data.error || "Booking failed");
      }
    } catch (e) {
      setSubmitting(false);
      setFormError("A network error occurred.");
    }
  };

  // Cancel active booking
  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, { method: "POST" });
      if (res.status === 200) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Cancellation failed");
      }
    } catch (e) {
      alert("A network error occurred.");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-label-mono text-xs uppercase tracking-widest text-secondary">
        Constructing scheduler...
      </div>
    );
  }

  // Calendar Helper Math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = new Date(year, month, 0).getDate();

  const daysGrid: Date[] = [];
  // Fill leading days of previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    daysGrid.push(new Date(year, month - 1, prevMonthDays - i));
  }
  // Fill current month days
  for (let i = 1; i <= totalDays; i++) {
    daysGrid.push(new Date(year, month, i));
  }
  // Fill trailing days of next month
  const totalCells = 42; // 6 rows * 7 days
  const remaining = totalCells - daysGrid.length;
  for (let i = 1; i <= remaining; i++) {
    daysGrid.push(new Date(year, month + 1, i));
  }

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(year, month + offset, 1));
  };

  const getBookingsForDay = (date: Date) => {
    return allBookings.filter((b) => {
      const start = new Date(b.startAt);
      return (
        start.getDate() === date.getDate() &&
        start.getMonth() === date.getMonth() &&
        start.getFullYear() === date.getFullYear() &&
        b.status !== "CANCELLED"
      );
    });
  };

  const activeDayBookings = getBookingsForDay(selectedDate);

  const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Sidebar Navigation */}
      <Sidebar activePage="bookings" />

      {/* Main Content Area */}
      <main className="ml-64 min-h-screen px-container-padding py-12 flex flex-col justify-between">
        <div>
          {/* Header Bar */}
          <Header section="Shared Reservation" />

          {/* Section Header */}
          <div className="mb-12 flex justify-between items-end">
            <div>
              <div className="font-label-mono text-label-mono text-secondary uppercase tracking-[0.2em] mb-2 flex items-center text-xs font-semibold">
                <span className="text-primary font-bold">§ 03</span>
                <span className="mx-2 opacity-30">·</span>
                BOOKINGS CALENDAR
              </div>
              <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                Resource <span className="font-display-lg-italic italic font-light text-primary font-normal">scheduling</span>.
              </h1>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-primary text-on-primary px-6 py-3 font-label-mono text-xs uppercase tracking-widest hover:bg-opacity-90 transition-all flex items-center gap-2 rounded-none cursor-pointer font-bold"
            >
              <span className="material-symbols-outlined text-sm">calendar_today</span>
              Book Resource
            </button>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-border-hairline mb-8 text-xs font-label-mono uppercase tracking-widest text-secondary font-semibold">
            <button
              onClick={() => setActiveTab("calendar")}
              className={`px-6 py-4 border-b-2 transition-all cursor-pointer ${
                activeTab === "calendar" ? "border-primary text-on-surface font-bold" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              Month Calendar View
            </button>
            <button
              onClick={() => setActiveTab("my-list")}
              className={`px-6 py-4 border-b-2 transition-all cursor-pointer ${
                activeTab === "my-list" ? "border-primary text-on-surface font-bold" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              My Bookings ({myBookings.length})
            </button>
          </div>

          {/* Tab 1: Month Calendar Grid */}
          {activeTab === "calendar" && (
            <div className="grid grid-cols-12 gap-gutter items-start">
              {/* Calendar Body (8 columns) */}
              <div className="col-span-12 lg:col-span-8 bg-white border border-border-hairline p-6">
                {/* Calendar Month Header */}
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-label-mono text-xs uppercase font-bold tracking-widest text-on-surface">
                    {monthsList[month]} {year}
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center border border-border-hairline bg-white hover:bg-surface-container-low cursor-pointer">
                      <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    </button>
                    <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center border border-border-hairline bg-white hover:bg-surface-container-low cursor-pointer">
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                  </div>
                </div>

                {/* Grid Header Days */}
                <div className="grid grid-cols-7 text-center font-label-mono text-[9px] font-bold text-secondary uppercase tracking-widest border-b border-border-hairline pb-3 mb-3">
                  <div>Sun</div>
                  <div>Mon</div>
                  <div>Tue</div>
                  <div>Wed</div>
                  <div>Thu</div>
                  <div>Fri</div>
                  <div>Sat</div>
                </div>

                {/* Month Grid Cells */}
                <div className="grid grid-cols-7 gap-1">
                  {daysGrid.map((date, idx) => {
                    const isCurrentMonth = date.getMonth() === month;
                    const isSelected = date.getDate() === selectedDate.getDate() && date.getMonth() === selectedDate.getMonth() && date.getFullYear() === selectedDate.getFullYear();
                    const dayBookings = getBookingsForDay(date);

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedDate(date)}
                        className={`min-h-[90px] border p-2 flex flex-col justify-between transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary bg-surface-container-low"
                            : "border-border-hairline hover:bg-surface-container-lowest bg-white"
                        } ${!isCurrentMonth ? "opacity-30" : ""}`}
                      >
                        <span className="font-label-mono text-xs font-semibold self-end">{date.getDate()}</span>
                        
                        {/* Day Booking Indicators */}
                        <div className="space-y-1">
                          {dayBookings.slice(0, 2).map((b) => (
                            <div key={b.id} className="text-[9px] px-1.5 py-0.5 font-semibold bg-primary-container text-on-primary-container font-label-mono truncate">
                              {b.title}
                            </div>
                          ))}
                          {dayBookings.length > 2 && (
                            <div className="text-[8px] text-secondary font-label-mono font-bold text-right px-1">
                              +{dayBookings.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Booking Drawer Details (4 columns) */}
              <div className="col-span-12 lg:col-span-4 bg-white border border-border-hairline p-6">
                <div className="font-label-mono text-xs uppercase tracking-wider text-secondary font-bold mb-4 pb-2 border-b border-border-hairline">
                  Bookings: {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
                {activeDayBookings.length === 0 ? (
                  <p className="text-secondary text-xs italic py-6">No resources booked for this date.</p>
                ) : (
                  <div className="space-y-4">
                    {activeDayBookings.map((b) => (
                      <div key={b.id} className="border border-border-hairline p-4 text-xs font-body-md relative">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-on-surface text-sm">{b.title}</span>
                          <span className="bg-surface-container-high px-1.5 py-0.5 text-[8px] font-label-mono uppercase text-secondary">{b.purpose}</span>
                        </div>
                        <p className="text-secondary text-[11px] mb-3">Asset: {b.asset.name} ({b.asset.assetTag})</p>
                        <div className="flex justify-between items-center text-[10px] text-secondary font-label-mono pt-3 border-t border-border-hairline">
                          <span>
                            {new Date(b.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(b.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span>By: {b.bookedBy.firstName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: My Active Bookings */}
          {activeTab === "my-list" && (
            <div className="bg-white border border-border-hairline overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-max text-xs font-body-md">
                <thead>
                  <tr className="border-b border-border-hairline bg-surface-container-low text-secondary font-label-mono uppercase font-bold">
                    <th className="px-gutter py-4">Title</th>
                    <th className="px-gutter py-4">Resource Asset</th>
                    <th className="px-gutter py-4">Purpose</th>
                    <th className="px-gutter py-4">Start Time</th>
                    <th className="px-gutter py-4">End Time</th>
                    <th className="px-gutter py-4">Status</th>
                    <th className="px-gutter py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-hairline">
                  {myBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-gutter py-12 text-center text-secondary">
                        No active shared resource bookings found.
                      </td>
                    </tr>
                  ) : (
                    myBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-surface-container-lowest transition-colors">
                        <td className="px-gutter py-4 font-bold">{b.title}</td>
                        <td className="px-gutter py-4 font-label-mono">{b.asset.name} ({b.asset.assetTag})</td>
                        <td className="px-gutter py-4 font-label-mono uppercase">{b.purpose}</td>
                        <td className="px-gutter py-4">{new Date(b.startAt).toLocaleString()}</td>
                        <td className="px-gutter py-4">{new Date(b.endAt).toLocaleString()}</td>
                        <td className="px-gutter py-4">
                          <span className={`px-2 py-0.5 font-label-mono text-[9px] uppercase font-bold ${
                            b.status === "APPROVED" || b.status === "ACTIVE" ? "bg-status-available/20 text-on-primary-container" :
                            b.status === "PENDING" ? "bg-status-maintenance/20 text-on-tertiary-container" : "bg-surface-container-high text-secondary"
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-gutter py-4 text-right">
                          {(b.status === "PENDING" || b.status === "APPROVED" || b.status === "ACTIVE") && (
                            <button
                              onClick={() => handleCancelBooking(b.id)}
                              className="text-error font-label-mono text-[10px] hover:underline cursor-pointer uppercase font-semibold"
                            >
                              Cancel Booking
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Book Resource */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-border-hairline max-w-md w-full p-8 relative animate-countUp">
              <h2 className="font-display-lg text-lg font-bold text-on-surface mb-6">Schedule Reservation</h2>
              <form onSubmit={handleAddBooking} className="space-y-4 text-xs">
                {formError && <div className="p-3 bg-error-container text-on-error-container font-label-mono uppercase tracking-wider">{formError}</div>}
                
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Select Shared Resource</label>
                  <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent" value={addAssetId} onChange={(e) => setAddAssetId(e.target.value)}>
                    <option value="">Select Resource</option>
                    {bookableAssets.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Booking Title</label>
                  <input required className="border border-border-hairline p-2 focus:outline-none" value={addTitle} onChange={(e) => setAddTitle(e.target.value)} placeholder="e.g. Planning Sync or Field Testing" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Resource Class</label>
                    <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent font-label-mono" value={addPurpose} onChange={(e) => setAddPurpose(e.target.value as any)}>
                      <option value="EQUIPMENT">Equipment</option>
                      <option value="ROOM">Meeting Room</option>
                      <option value="VEHICLE">Fleet Vehicle</option>
                      <option value="SPACE">Lab / Workspace</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Audience Scope</label>
                    <select required className="border border-border-hairline p-2 focus:outline-none bg-transparent font-label-mono" value={addAudience} onChange={(e) => setAddAudience(e.target.value as any)}>
                      <option value="INDIVIDUAL">Individual</option>
                      {role === "DEPARTMENT_HEAD" && <option value="DEPARTMENT">Department Sync</option>}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Date</label>
                  <input required type="date" className="border border-border-hairline p-2 focus:outline-none" value={addDate} onChange={(e) => setAddDate(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">Start Time</label>
                    <input required type="time" className="border border-border-hairline p-2 focus:outline-none" value={addStartTime} onChange={(e) => setAddStartTime(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-mono uppercase text-secondary font-semibold">End Time</label>
                    <input required type="time" className="border border-border-hairline p-2 focus:outline-none" value={addEndTime} onChange={(e) => setAddEndTime(e.target.value)} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-mono uppercase text-secondary font-semibold">Additional Notes</label>
                  <textarea rows={3} className="border border-border-hairline p-2 focus:outline-none" value={addNotes} onChange={(e) => setAddNotes(e.target.value)} placeholder="Usage details..." />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="border border-border-hairline px-5 py-2.5 font-label-mono uppercase tracking-wider text-secondary cursor-pointer">Cancel</button>
                  <button type="submit" disabled={submitting} className="bg-primary text-white px-6 py-2.5 font-label-mono uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 cursor-pointer font-bold">{submitting ? "Booking..." : "Schedule Booking"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
