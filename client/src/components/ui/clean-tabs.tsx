import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

const CleanTabs = TabsPrimitive.Root

const CleanTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const [indicatorStyle, setIndicatorStyle] = React.useState({ left: 0, width: 0 });
  const tabsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const updateIndicator = () => {
      if (!tabsRef.current) {
        return;
      }

      const activeButton = tabsRef.current.querySelector('[data-state="active"]') as HTMLElement | null;
      if (!activeButton) {
        return;
      }

      const listRect = tabsRef.current.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      setIndicatorStyle({
        left: buttonRect.left - listRect.left + tabsRef.current.scrollLeft,
        width: buttonRect.width,
      });
    };

    updateIndicator();
    window.addEventListener("resize", updateIndicator);

    const observer = new MutationObserver(updateIndicator);
    const resizeObserver = new ResizeObserver(updateIndicator);

    if (tabsRef.current) {
      resizeObserver.observe(tabsRef.current);
      const buttons = tabsRef.current.querySelectorAll('[role="tab"]');
      buttons.forEach((button) => {
        observer.observe(button, { attributes: true, attributeFilter: ["data-state"] });
        resizeObserver.observe(button as Element);
      });
    }

    return () => {
      window.removeEventListener("resize", updateIndicator);
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, [children]);

  return (
    <div className="relative">
      <TabsPrimitive.List
        ref={tabsRef}
        className={cn(
          "flex h-auto w-full items-center justify-start border-b border-border relative",
          className
        )}
        {...props}
      >
        {children}
      </TabsPrimitive.List>
      {indicatorStyle.width > 0 && (
        <motion.div
          className="absolute bottom-0 h-0.5 bg-primary"
          initial={false}
          animate={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
        />
      )}
    </div>
  );
})
CleanTabsList.displayName = "CleanTabsList"

const CleanTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
      className={cn(
        "inline-flex flex-1 items-center justify-center whitespace-nowrap px-4 py-3 text-sm font-medium transition-all sm:flex-none",
        "text-muted-foreground hover:text-foreground",
        "border border-transparent bg-transparent",
        "data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:border-transparent",
        "sm:border-b-2 sm:border-x-0 sm:border-t-0 sm:-mb-[1px]",
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
