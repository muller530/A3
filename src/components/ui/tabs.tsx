import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined)

interface TabsProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

const Tabs = ({ value: controlledValue, defaultValue, onValueChange, children, className }: TabsProps) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  const value = controlledValue !== undefined ? controlledValue : internalValue
  const handleValueChange = React.useCallback((newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
  }, [controlledValue, onValueChange])

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    const childrenArray = React.Children.toArray(children);
    const activeIndex = context ? childrenArray.findIndex((child: any) => 
      React.isValidElement(child) && child.props.value === context.value
    ) : -1;
    const totalTabs = childrenArray.length;
    
    return (
      <div
        ref={ref}
        className={cn(
          "relative inline-flex h-12 items-center justify-center rounded-xl bg-white/60 backdrop-blur-sm p-1.5 text-muted-foreground border border-white/40 shadow-lg",
          className
        )}
        {...props}
      >
        {/* 滑动指示器 */}
        {context && activeIndex >= 0 && totalTabs > 0 && (
          <div
            className="absolute h-9 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg transition-all duration-300 ease-out shadow-md shadow-blue-500/50 z-0"
            style={{
              width: `calc(${100 / totalTabs}% - 0.375rem)`,
              left: `calc(${activeIndex * (100 / totalTabs)}% + 0.1875rem)`,
            }}
          />
        )}
        {children}
      </div>
    );
  }
)
TabsList.displayName = "TabsList"

interface TabsTriggerProps {
  value: string
  children: React.ReactNode
  className?: string
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, children, ...props }, ref) => {
    const context = React.useContext(TabsContext)
    if (!context) {
      throw new Error("TabsTrigger must be used within Tabs")
    }
    const isActive = context.value === value

    return (
      <button
        ref={ref}
        type="button"
        onClick={() => context.onValueChange(value)}
        className={cn(
          "relative z-10 inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ring-offset-background transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          isActive && "text-white",
          !isActive && "text-gray-600 hover:text-gray-900",
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
TabsTrigger.displayName = "TabsTrigger"

interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, children, ...props }, ref) => {
    const context = React.useContext(TabsContext)
    if (!context) {
      throw new Error("TabsContent must be used within Tabs")
    }
    if (context.value !== value) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
