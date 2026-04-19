import React from 'react';

export default function DesktopAd() {
  return (
    <>
      {/* Left Ad Placeholder */}
      <div 
        className="hidden xl:flex fixed left-4 top-1/2 -translate-y-1/2 w-[160px] h-[600px] flex-col items-center justify-center pointer-events-none select-none z-0"
        aria-hidden="true"
      >
        <div className="w-full h-full border border-dashed border-border/40 rounded-xl bg-surface-1/20 flex items-center justify-center">
          <span className="text-[10px] text-text-muted/40 uppercase tracking-widest font-medium">Advertisement</span>
        </div>
      </div>

      {/* Right Ad Placeholder */}
      <div 
        className="hidden lg:flex fixed right-4 top-1/2 -translate-y-1/2 w-[160px] h-[600px] flex-col items-center justify-center pointer-events-none select-none z-0"
        aria-hidden="true"
      >
        <div className="w-full h-full border border-dashed border-border/40 rounded-xl bg-surface-1/20 flex items-center justify-center">
          <span className="text-[10px] text-text-muted/40 uppercase tracking-widest font-medium">Advertisement</span>
        </div>
      </div>
    </>
  );
}
