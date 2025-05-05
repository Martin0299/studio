"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  disabled,
  components,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-0", className)} // Remove outer padding
      disabled={disabled}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full", // Ensure month takes full width
        caption: "hidden", // Use CustomCaption component instead
        nav: "hidden", // Use CustomCaption component instead
        table: 'w-full border-collapse', // Remove default table spacing
        head_row: 'flex justify-around items-center h-10 border-b bg-muted/30', // Add background and border
        head_cell:
          "text-muted-foreground rounded-md w-10 font-medium text-[0.8rem]", // Use medium weight
        row: 'flex w-full mt-0.5 justify-around',
        cell: cn(
          // Cell container - control spacing and focus outline here
          'h-10 w-10 text-center text-sm p-0 relative', // Reset padding
          'focus-within:relative focus-within:z-20 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 rounded-md' // Focus outline on cell
        ),
        day: 'h-10 w-10 p-0 font-normal', // Base size for layout, content handles styling
        // Reset internal styles handled by DayContent
        day_selected: ' ',
        day_today: ' ',
        day_outside: ' ',
        day_range_start: ' ',
        day_range_end: ' ',
        day_range_middle: ' ',
        // Apply consistent disabled style
        day_disabled: 'text-muted-foreground/30 opacity-50 cursor-not-allowed aria-disabled:cursor-not-allowed',
        day_hidden: 'invisible',
        ...classNames, // Allow overriding specific classes
      }}
      components={{
        // Pass through default icons if needed by CustomCaption or others
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("h-5 w-5", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("h-5 w-5", className)} {...props} />
        ),
         ...components // Merge provided components (like DayContent, Caption)
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
