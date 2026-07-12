"use client";

import { useMemo, useState } from "react";
import {
  formatCalendarDay,
  formatDateTime,
  formatTime,
  toAppDate,
} from "@/shared/format/date";

type BookableAsset = {
  id: string;
  assetTag: string;
  name: string;
  location: string | null;
};

type CalendarBooking = {
  id: string;
  assetId: string;
  startTime: string | Date;
  endTime: string | Date;
  bookedBy?: { name: string };
};

const HOURS = Array.from({ length: 12 }, (_, index) => index + 8);

function toDateTimeLocalValue(date: Date) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function bookingOverlapsHour(booking: CalendarBooking, day: Date, hour: number) {
  const slotStart = new Date(day);
  slotStart.setHours(hour, 0, 0, 0);
  const slotEnd = new Date(day);
  slotEnd.setHours(hour + 1, 0, 0, 0);
  const start = toAppDate(booking.startTime);
  const end = toAppDate(booking.endTime);
  return start < slotEnd && end > slotStart;
}

function bookingForSlot(
  bookings: CalendarBooking[],
  day: Date,
  hour: number
) {
  return bookings.find((booking) => bookingOverlapsHour(booking, day, hour));
}

export function BookingCalendar({
  assets,
  bookings,
  selectedAssetId,
  onAssetChange,
  onSlotSelect,
}: {
  assets: BookableAsset[];
  bookings: CalendarBooking[];
  selectedAssetId: string;
  onAssetChange: (assetId: string) => void;
  onSlotSelect: (start: string, end: string) => void;
}) {
  const [weekStart] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + index);
        return day;
      }),
    [weekStart]
  );

  const assetBookings = useMemo(
    () => bookings.filter((booking) => booking.assetId === selectedAssetId),
    [bookings, selectedAssetId]
  );

  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId);

  return (
    <section className="card booking-calendar">
      <div className="page-header" style={{ marginBottom: 12 }}>
        <div>
          <h2 className="card-title" style={{ margin: 0 }}>
            Resource calendar
          </h2>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            {selectedAsset
              ? `${selectedAsset.assetTag} · ${selectedAsset.name} · next 7 days`
              : "Select a bookable resource"}
          </p>
        </div>
        <label style={{ minWidth: 240 }}>
          <span className="muted" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
            Resource
          </span>
          <select
            onChange={(event) => onAssetChange(event.target.value)}
            value={selectedAssetId}
          >
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.assetTag} - {asset.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="calendar-scroll">
        <table className="calendar-grid">
          <thead>
            <tr>
              <th>Time</th>
              {days.map((day) => (
                <th key={day.toISOString()}>
                  {formatCalendarDay(day)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour) => (
              <tr key={hour}>
                <th>
                  {`${String(hour).padStart(2, "0")}:00`}
                </th>
                {days.map((day) => {
                  const booking = bookingForSlot(assetBookings, day, hour);
                  const slotStart = new Date(day);
                  slotStart.setHours(hour, 0, 0, 0);
                  const slotEnd = new Date(day);
                  slotEnd.setHours(hour + 1, 0, 0, 0);
                  const isPast = slotStart < new Date();

                  return (
                    <td key={`${day.toISOString()}-${hour}`}>
                      {booking ? (
                        <div
                          className="calendar-slot booked"
                          title={`${formatDateTime(booking.startTime)} - ${formatDateTime(booking.endTime)}`}
                        >
                          <strong>{booking.bookedBy?.name ?? "Booked"}</strong>
                          <span>
                            {formatTime(booking.startTime)}
                            {" - "}
                            {formatTime(booking.endTime)}
                          </span>
                        </div>
                      ) : (
                        <button
                          className="calendar-slot available"
                          disabled={isPast || !selectedAssetId}
                          onClick={() =>
                            onSlotSelect(
                              toDateTimeLocalValue(slotStart),
                              toDateTimeLocalValue(slotEnd)
                            )
                          }
                          type="button"
                        >
                          {isPast ? "Past" : "Available"}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="muted" style={{ margin: "12px 0 0" }}>
        Click an available slot to pre-fill the booking form. Overlaps are blocked by PostgreSQL EXCLUDE.
      </p>
    </section>
  );
}
