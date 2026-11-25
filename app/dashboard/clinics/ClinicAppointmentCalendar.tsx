"use client";

import { useState } from "react";

type CalendarAppointment = {
  id: string;
  date: string;
  time: string | null;
  status: string;
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const headingFormat = new Intl.DateTimeFormat("en-PK", {
  month: "long", year: "numeric", timeZone: "UTC",
});
const dayFormat = new Intl.DateTimeFormat("en-PK", {
  weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
});

function shiftDate(date: Date, days: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function monday(date: Date) {
  return shiftDate(date, -((date.getUTCDay() + 6) % 7));
}

export default function ClinicAppointmentCalendar({
  appointments, today,
}: {
  appointments: CalendarAppointment[];
  today: string;
}) {
  const [view, setView] = useState<"week" | "month">("week");
  const [cursor, setCursor] = useState(() => new Date(today + "T00:00:00Z"));
  const first = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1));
  const start = monday(view === "month" ? first : cursor);
  const last = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
  const days = view === "week" ? 7 : Math.ceil((last.getUTCDate() + (first.getUTCDay() + 6) % 7) / 7) * 7;
  const byDate = new Map<string, CalendarAppointment[]>();
  for (const appointment of appointments) {
    const entries = byDate.get(appointment.date) ?? [];
    entries.push(appointment);
    byDate.set(appointment.date, entries);
  }

  function move(direction: number) {
    setCursor(view === "week"
      ? shiftDate(cursor, direction * 7)
      : new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + direction, 1)));
  }

  return (
    <div className="vcx-appointment-calendar">
      <div className="vcx-appointment-calendar-controls">
        <button type="button" onClick={() => move(-1)}>Previous</button>
        <button type="button" onClick={() => move(1)}>Next</button>
        <button type="button" onClick={() => setCursor(new Date(today + "T00:00:00Z"))}>Today</button>
        <button type="button" aria-pressed={view === "week"} onClick={() => setView("week")}>Week</button>
        <button type="button" aria-pressed={view === "month"} onClick={() => setView("month")}>Month</button>
      </div>
      <h3 aria-live="polite">{view === "month" ? headingFormat.format(cursor) : dayFormat.format(start) + " to " + dayFormat.format(shiftDate(start, 6))}</h3>
      <p className="form-help">Pakistan time. Confirmed times take precedence over requested times. The calendar covers the 50 most recent requests.</p>
      <div className="vcx-appointment-weekdays" aria-hidden="true">
        {weekdays.map(day => <span key={day}>{day}</span>)}
      </div>
      <ol className="vcx-appointment-days">
        {Array.from({ length: days }, (_, index) => {
          const day = shiftDate(start, index);
          const date = day.toISOString().slice(0, 10);
          const entries = byDate.get(date) ?? [];
          return (
            <li key={date} className={date === today ? "is-today" : undefined}>
              <time dateTime={date} aria-current={date === today ? "date" : undefined} aria-label={dayFormat.format(day)}>{day.getUTCDate()}</time>
              {entries.sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99")).map(entry =>
                <a key={entry.id} href={"#appointment-" + entry.id}>
                  {entry.time?.slice(0, 5) || "Time pending"} · {entry.status.replaceAll("_", " ")}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
