'use client';
import { useState } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  return (
    <div className="flex gap-2">
      {[7, 30, 90].map((days) => (
        <button
          key={days}
          onClick={() => onChange({
            startDate: startOfDay(subDays(new Date(), days)),
            endDate: endOfDay(new Date()),
          })}
          className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
        >
          Last {days} days
        </button>
      ))}
    </div>
  );
}
