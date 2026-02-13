import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const CleanTabs = TabsPrimitive.Root

const CleanTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const [indicatorStyle, setIndicatorStyle] = React.useState({ left: 0, width: 0 })
  const listRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const updateIndicator = () => {
      const list = listRef.current
      if (!list) return

      const activeTab = list.querySelector('[data-state="active"]') as HTMLElement
      if (activeTab) {
        const listRect = list.getBoundingClientRect()
        const tabRect = activeTab.getBoundingClientRect()
        setIndicatorStyle({
          left: tabRect.left - listRect.left,
          width: tabRect.width,
        })
      }
    }

    // Initial update
    updateIndicator()

    // Update on mutations (when active state changes)
    const observer = new MutationObserver(updateIndicator)
    if (listRef.current) {
      observer.observe(listRef.current, {
        attributes: true,
        subtree: true,
        attributeFilter: ['data-state'],
      })
    }

    // Update on resize
    window.addEventListener('resize', updateIndicator)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateIndicator)
    }
  }, [])

  React.useImperativeHandle(ref, () => listRef.current as HTMLDivElement)

  return (
    <div className="relative">
      <TabsPrimitive.List
        ref={listRef}
        className={cn(
          "inline-flex h-auto items-center justify-start w-full border-b border-border",
          className
        )}
        {...props}
      />
      <div
        className="absolute bottom-0 h-0.5 bg-primary transition-all duration-300 ease-in-out rounded-full"
        style={{
          left: `${indicatorStyle.left}px`,
          width: `${indicatorStyle.width}px`,
        }}
      />
    </div>
  )
})
CleanTabsList.displayName = "CleanTabsList"

const CleanTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap px-4 py-3 text-sm font-medium transition-all",
      "text-muted-foreground hover:text-foreground",
      "data-[state=active]:text-foreground",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
))
CleanTabsTrigger.displayName = "CleanTabsTrigger"

const CleanTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-6 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
CleanTabsContent.displayName = "CleanTabsContent"

export { CleanTabs, CleanTabsList, CleanTabsTrigger, CleanTabsContent }
