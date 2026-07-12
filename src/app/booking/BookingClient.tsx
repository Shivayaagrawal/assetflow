"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookingCalendar } from "@/components/BookingCalendar";
import {
  cancelBooking,
  createEmployeeBooking,
} from "@/modules/booking/actions/booking.actions";
import { formatDateTime } from "@/shared/format/date";

type BookableAsset = {
  id: string;
  assetTag: string;
  name: string;
  location: string | null;
};

type BookingRow = {
  id: string;
  assetId: string;
  startTime: Date | string;
  endTime: Date | string;
  status: string;
  asset: {
    assetTag: string;
    name: string;
    location: string | null;
  };
  bookedBy?: { name: string };
};

export function BookingClient({
  assets,
  bookings,
  calendarBookings,
}: {
  assets: BookableAsset[];
  bookings: BookingRow[];
  calendarBookings: BookingRow[];
}) {
  const [assetId, setAssetId] = useState(assets[0]?.id ?? "");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [message, setMessage] = useState<
    { kind: "success" | "error"; text: string } | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const myBookings = useMemo(
    () =>
      bookings.map((booking) => ({
        ...booking,
        startTime: booking.startTime,
        endTime: booking.endTime,
      })),
    [bookings]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      await createEmployeeBooking({
        assetId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      });
      setMessage({ kind: "success", text: "Booking created successfully." });
      setStartTime("");
      setEndTime("");
      window.location.reload();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Booking failed.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel(bookingId: string) {
    setMessage(null);
    try {
      await cancelBooking(bookingId);
      window.location.reload();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Cancel failed.",
      });
    }
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Resource booking</p>
          <h1 className="page-title">Book Shared Resource</h1>
          <p className="page-subtitle">
            {assets.length === 0
              ? "No bookable resources are available right now."
              : "Reserve rooms and shared assets in non-overlapping slots."}
          </p>
        </div>
        <nav className="nav-row">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/allocation/my">My allocations</Link>
        </nav>
      </header>

      {assets.length === 0 ? (
        <section className="card">
          <p className="muted" style={{ margin: 0 }}>
            Ask an asset manager to register a bookable resource.
          </p>
        </section>
      ) : (
        <>
          {message ? (
            <section
              className="card"
              style={{
                borderColor: message.kind === "success" ? "#1f883d" : "#cf222e",
                marginBottom: 18,
              }}
            >
              <p
                style={{
                  color: message.kind === "success" ? "#1f883d" : "#cf222e",
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                {message.text}
              </p>
            </section>
          ) : null}

          <BookingCalendar
            assets={assets}
            bookings={calendarBookings}
            onAssetChange={setAssetId}
            onSlotSelect={(start, end) => {
              setStartTime(start);
              setEndTime(end);
              setMessage(null);
            }}
            selectedAssetId={assetId}
          />

          <section className="grid two" style={{ marginTop: 18 }}>
            <form className="card form-grid" onSubmit={handleSubmit}>
              <h2 className="card-title span-full">New booking</h2>
              <label className="span-full">
                Resource
                <select
                  name="assetId"
                  onChange={(event) => setAssetId(event.target.value)}
                  required
                  value={assetId}
                >
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.assetTag} - {asset.name} - {asset.location}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Start
                <input
                  name="startTime"
                  onChange={(event) => setStartTime(event.target.value)}
                  required
                  type="datetime-local"
                  value={startTime}
                />
              </label>
              <label>
                End
                <input
                  name="endTime"
                  onChange={(event) => setEndTime(event.target.value)}
                  required
                  type="datetime-local"
                  value={endTime}
                />
              </label>
              <button className="span-full" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Creating..." : "Create booking"}
              </button>
            </form>

            <section className="card">
              <h2 className="card-title">My bookings</h2>
              <div className="list">
                {myBookings.map((booking) => (
                  <article className="list-item" key={booking.id}>
                    <strong>
                      {booking.asset.assetTag} - {booking.asset.name}
                    </strong>
                    <p className="muted" style={{ margin: "4px 0 0" }}>
                      {formatDateTime(booking.startTime)} -{" "}
                      {formatDateTime(booking.endTime)} ({booking.status})
                    </p>
                    {booking.status === "UPCOMING" ? (
                      <button
                        className="secondary danger"
                        onClick={() => handleCancel(booking.id)}
                        style={{ marginTop: 8 }}
                        type="button"
                      >
                        Cancel
                      </button>
                    ) : null}
                  </article>
                ))}
                {myBookings.length === 0 && <p className="muted">No bookings yet.</p>}
              </div>
            </section>
          </section>
        </>
      )}
    </main>
  );
}
