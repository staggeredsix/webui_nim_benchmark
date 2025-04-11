import * as React from "react"

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => {
    return (
      <select
        className={`w-full bg-gray-700 rounded-lg p-2 border border-gray-600 focus:border-[#76B900] focus:ring-1 focus:ring-[#76B900] transition-colors ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

Select.displayName = "Select";

export { Select };