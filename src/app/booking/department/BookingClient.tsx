"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  bookResourceForDepartment,
  cancelBooking,
  rescheduleBooking,
} from "@/modules/booking/actions/booking.actions";
import { formatDateTime } from "@/shared/format/date";

type Asset = {
  id: string;
  name: string;
  assetTag: string;
  location: string | null;
  status: string;
};

type Booking = {
  id: string;
  startTime: Date;
  endTime: Date;
  asset: {
    id: string;
    name: string;
    assetTag: string;
    location: string | null;
  };
};

type Message = { kind: "success" | "error"; text: string } | null;

function friendlyError(error: unknown): string {
  if (!(error instanceof Error)) return "Something went wrong. Try again.";
  const msg = error.message;

  if (msg === "BOOK_001" || msg === "BOOKING_003") {
    return "End time must be after start time.";
  }
  if (msg === "BOOK_002" || msg === "BOOKING_004") {
    return "This resource is not marked as bookable.";
  }
  if (msg === "BOOK_003" || msg === "BOOKING_002") {
    return "An overlapping booking already exists for this resource in the selected timeframe.";
  }
  if (msg === "FORBIDDEN" || msg === "AUTH_007") {
    return "You do not have permission to book for this department.";
  }
  if (msg === "UNAUTHORIZED" || msg === "AUTH_002") {
    return "Your session expired. Sign in again and retry.";
  }
  return msg || "Something went wrong. Try again.";
}

function toDatetimeLocalValue(value: Date | string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function BookingClient({
  assets,
  bookings,
  departmentId,
}: {
  assets: Asset[];
  bookings: Booking[];
  departmentId: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<Message>(null);
  const [isPending, startTransition] = useTransition();
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleStart, setRescheduleStart] = useState("");
  const [rescheduleEnd, setRescheduleEnd] = useState("");

  function runAction(action: () => Promise<unknown>, successText: string) {
    setMessage(null);
    startTransition(async () => {
      try {
        await action();
        setMessage({ kind: "success", text: successText });
        setReschedulingId(null);
        router.refresh();
      } catch (error) {
        setMessage({ kind: "error", text: friendlyError(error) });
      }
    });
  }

  return (
    <>
      {message && (
        <div className={`notice ${message.kind}`} role="status" aria-live="polite">
          {message.text}
        </div>
      )}

      <section className="grid two">
        <form
          action={(formData) =>
            runAction(
              () =>
                bookResourceForDepartment({
                  assetId: String(formData.get("assetId")),
                  departmentId: departmentId,
                  startTime: new Date(String(formData.get("startTime"))),
                  endTime: new Date(String(formData.get("endTime"))),
                }),
              "Booking created successfully."
            )
          }
          className="card form-grid"
        >
          <input type="hidden" name="departmentId" value={departmentId} />

          <label className="span-full">
            Resource
            <select disabled={isPending} name="assetId" required>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.assetTag} — {asset.name} ({asset.location ?? "No location"})
                </option>
              ))}
            </select>
          </label>

          <label>
            Start
            <input disabled={isPending} name="startTime" required type="datetime-local" />
          </label>

          <label>
            End
            <input disabled={isPending} name="endTime" required type="datetime-local" />
          </label>

          <button disabled={isPending} className="span-full" type="submit">
            {isPending ? "Reserving…" : "Create booking"}
          </button>
        </form>

        <section className="card">
          <h2 className="card-title">Upcoming department bookings</h2>
          <div className="list">
            {bookings.map((booking) => (
              <article className="list-item" key={booking.id}>
                <strong>
                  {booking.asset.assetTag} — {booking.asset.name}
                </strong>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  {formatDateTime(booking.startTime)} — {formatDateTime(booking.endTime)}
                </p>
                <div className="actions-row" style={{ marginTop: 8 }}>
                  <button
                    className="secondary"
                    disabled={isPending}
                    onClick={() => {
                      setReschedulingId(booking.id);
                      setRescheduleStart(toDatetimeLocalValue(booking.startTime));
                      setRescheduleEnd(toDatetimeLocalValue(booking.endTime));
                    }}
                    type="button"
                  >
                    Reschedule
                  </button>
                  <button
                    className="secondary danger"
                    disabled={isPending}
                    onClick={() =>
                      runAction(
                        () => cancelBooking(booking.id),
                        "Booking cancelled."
                      )
                    }
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
                {reschedulingId === booking.id ? (
                  <div className="form-grid" style={{ marginTop: 12 }}>
                    <label>
                      New start
                      <input
                        disabled={isPending}
                        onChange={(e) => setRescheduleStart(e.target.value)}
                        required
                        type="datetime-local"
                        value={rescheduleStart}
                      />
                    </label>
                    <label>
                      New end
                      <input
                        disabled={isPending}
                        onChange={(e) => setRescheduleEnd(e.target.value)}
                        required
                        type="datetime-local"
                        value={rescheduleEnd}
                      />
                    </label>
                    <div className="actions-row span-full">
                      <button
                        disabled={isPending}
                        onClick={() =>
                          runAction(
                            () =>
                              rescheduleBooking({
                                bookingId: booking.id,
                                startTime: new Date(rescheduleStart),
                                endTime: new Date(rescheduleEnd),
                              }),
                            "Booking rescheduled."
                          )
                        }
                        type="button"
                      >
                        Save new slot
                      </button>
                      <button
                        className="secondary"
                        disabled={isPending}
                        onClick={() => setReschedulingId(null)}
                        type="button"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
            {bookings.length === 0 && <p className="muted">No bookings yet.</p>}
          </div>
        </section>
      </section>
    </>
  );
}
