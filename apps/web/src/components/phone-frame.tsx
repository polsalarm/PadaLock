import type { ReactNode } from "react";

/**
 * Device mockup bezel — wraps content (or a screenshot) in a phone frame
 * with rounded black body, side buttons, and a soft drop shadow.
 * Used on marketing/demo surfaces and to composite doc screenshots.
 */
export function PhoneFrame({
  children,
  className = "",
  bg = "bg-primary-container",
}: {
  children: ReactNode;
  /** extra classes on the outer padded wrapper */
  className?: string;
  /** background behind the device (Tailwind bg-* class) */
  bg?: string;
}) {
  return (
    <div className={`flex items-center justify-center p-8 ${bg} ${className}`}>
      <div className="relative">
        {/* side buttons */}
        <span className="absolute -left-[3px] top-[110px] h-8 w-[3px] rounded-l bg-neutral-800" />
        <span className="absolute -left-[3px] top-[160px] h-14 w-[3px] rounded-l bg-neutral-800" />
        <span className="absolute -right-[3px] top-[140px] h-20 w-[3px] rounded-r bg-neutral-800" />

        {/* phone body */}
        <div className="relative rounded-[2.75rem] bg-neutral-900 p-[10px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.45),0_8px_20px_-8px_rgba(0,0,0,0.3)] ring-1 ring-black/40">
          {/* screen */}
          <div className="relative w-[300px] overflow-hidden rounded-[2.1rem] bg-surface">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
