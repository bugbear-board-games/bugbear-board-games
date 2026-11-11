"use client";

import { useState } from "react";

/**
 * Starts and Ends, each as a date + time. The end date follows the start date until
 * someone changes it by hand, e.g. for an event that runs past midnight.
 * Values are Pittsburgh-local strings: "YYYY-MM-DD" and "HH:mm".
 */
export function StartEndFields({ startLabel, startDate, startTime, endDate, endTime }: {
  startLabel: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}) {
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate || startDate);
  // Editing an event that already ends on a different day counts as a manual choice.
  const [endDateTouched, setEndDateTouched] = useState(!!endDate && endDate !== startDate);

  return (
    <div className="start-end">
      <div className="field-group">
        <span className="field-label">{startLabel}</span>
        <div className="date-time">
          <input
            type="date"
            name="startDate"
            aria-label={`${startLabel} date`}
            required
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              if (!endDateTouched && e.target.value) setEnd(e.target.value);
            }}
          />
          <input type="time" name="startTime" aria-label={`${startLabel} time`} required defaultValue={startTime} />
        </div>
      </div>

      <div className="field-group">
        <span className="field-label">Ends</span>
        <div className="date-time">
          <input
            type="date"
            name="endDate"
            aria-label="End date"
            value={end}
            onChange={(e) => { setEnd(e.target.value); setEndDateTouched(true); }}
          />
          <input type="time" name="endTime" aria-label="End time" required defaultValue={endTime} />
        </div>
      </div>
    </div>
  );
}
