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
  disabled, // Accept disabled prop
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      disabled={disabled} // Pass disabled prop to DayPicker
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center items-center h-14 border-b relative px-8", // Increased px-4 to px-8
        caption_label: "text-lg font-semibold", // Made label larger
        nav: "flex items-center absolute inset-y-0", // Contains the buttons
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-9 w-9 bg-transparent p-0 text-muted-foreground hover:text-foreground hover:bg-muted" // Made buttons slightly larger and aligned with general button styles
        ),
        nav_button_previous: "left-4", // Positioned left with more space
        nav_button_next: "right-4", // Positioned right with more space
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-10 font-normal text-sm", // Increased width to w-10, aligned text size
        row: "flex w-full mt-0.5", // Removed justify-around, cells handle width now
        cell: cn(
          // Cell container - remove internal padding, apply on DayContent
          "h-10 w-10 text-center text-sm p-0 relative", // Base size and padding reset
          "[&:has([aria-selected].day-range-end)]:rounded-r-md",
          "[&:has([aria-selected].day-outside)]:bg-accent/50",
          "[&:has([aria-selected])]:bg-accent",
          "first:[&:has([aria-selected])]:rounded-l-md",
          "last:[&:has([aria-selected])]:rounded-r-md",
          "focus-within:relative focus-within:z-20"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground/30 aria-selected:bg-accent/50 aria-selected:text-muted-foreground", // Dimmed outside days more
        // Ensure disabled style is applied correctly and consistently
        day_disabled: "text-muted-foreground/30 opacity-50 cursor-not-allowed aria-disabled:cursor-not-allowed", // Dimmed disabled days more
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("h-5 w-5", className)} {...props} /> // Slightly larger icon
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("h-5 w-5", className)} {...props} /> // Slightly larger icon
        ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
