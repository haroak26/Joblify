import * as React from "react"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { DayPicker, type DayPickerSingleProps, type DayPickerRangeProps } from "react-day-picker"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"

export type CustomCalendarProps = (DayPickerSingleProps | DayPickerRangeProps) & {
  showTodayButton?: boolean;
  onTodayClick?: () => void;
  className?: string;
}

/**
 * Custom Calendar Component
 * 
 * An enhanced date picker component built on react-day-picker with the following features:
 * - Modern, user-friendly design matching Joblify aesthetic
 * - Month/year navigation with clear controls
 * - Optional "Today" button for quick date selection
 * - Clear visual feedback for selected dates
 * - Responsive design for mobile and desktop
 * - Keyboard navigation support for accessibility
 * - Customizable through props (min/max dates, disabled dates, etc.)
 * 
 * @example
 * ```tsx
 * // Single date selection
 * <CustomCalendar
 *   mode="single"
 *   selected={date}
 *   onSelect={setDate}
 *   showTodayButton
 * />
 * 
 * // Date range selection
 * <CustomCalendar
 *   mode="range"
 *   selected={dateRange}
 *   onSelect={setDateRange}
 *   showTodayButton
 * />
 * 
 * // With constraints
 * <CustomCalendar
 *   mode="single"
 *   selected={date}
 *   onSelect={setDate}
 *   disabled={[
 *     { before: new Date() }, // Disable past dates
 *     { dayOfWeek: [0, 6] }   // Disable weekends
 *   ]}
 *   fromDate={new Date()}
 *   toDate={new Date(2025, 11, 31)}
 * />
 * ```
 */
function CustomCalendar({
  className,
  classNames,
  showOutsideDays = true,
  showTodayButton = false,
  onTodayClick,
  ...props
}: CustomCalendarProps) {
  const handleTodayClick = () => {
    if (onTodayClick) {
      onTodayClick();
    } else if (props.mode === "single" && props.onSelect) {
      props.onSelect(new Date());
    } else if (props.mode === "range" && props.onSelect) {
      const today = new Date();
      props.onSelect({ from: today, to: today });
    }
  };

  return (
    <div className="relative">
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn("p-4", className)}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center mb-4",
          caption_label: "text-sm font-semibold text-foreground",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-8 w-8 bg-transparent p-0 opacity-60 hover:opacity-100 hover:bg-accent transition-all duration-200"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell:
            "text-muted-foreground rounded-md w-10 font-medium text-xs uppercase tracking-wider",
          row: "flex w-full mt-2",
          cell: cn(
            "h-10 w-10 text-center text-sm p-0 relative",
            "[&:has([aria-selected].day-range-end)]:rounded-r-md",
            "[&:has([aria-selected].day-outside)]:bg-accent/50",
            "[&:has([aria-selected])]:bg-accent",
            "first:[&:has([aria-selected])]:rounded-l-md",
            "last:[&:has([aria-selected])]:rounded-r-md",
            "focus-within:relative focus-within:z-20"
          ),
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-10 w-10 p-0 font-normal aria-selected:opacity-100 hover:bg-accent/80 transition-all duration-200 rounded-md"
          ),
          day_range_end: "day-range-end",
          day_selected: cn(
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
            "focus:bg-primary focus:text-primary-foreground font-semibold shadow-sm"
          ),
          day_today: cn(
            "bg-accent text-accent-foreground font-semibold",
            "ring-2 ring-primary/20 ring-inset"
          ),
          day_outside: cn(
            "day-outside text-muted-foreground/40 aria-selected:bg-accent/50",
            "aria-selected:text-muted-foreground/70"
          ),
          day_disabled: "text-muted-foreground/30 opacity-50 cursor-not-allowed",
          day_range_middle: cn(
            "aria-selected:bg-accent aria-selected:text-accent-foreground"
          ),
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          IconLeft: ({ className, ...props }) => (
            <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
          ),
          IconRight: ({ className, ...props }) => (
            <ChevronRight className={cn("h-4 w-4", className)} {...props} />
          ),
        }}
        {...props}
      />
      {showTodayButton && (
        <div className="px-4 pb-4 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full font-medium"
            onClick={handleTodayClick}
            type="button"
          >
            <CalendarIcon className="w-4 h-4 mr-2" />
            Jump to Today
          </Button>
        </div>
      )}
    </div>
  )
}
CustomCalendar.displayName = "CustomCalendar"

export { CustomCalendar }
