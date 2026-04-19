import React from "react";

interface WordmarkProps {
  className?: string;
}

export default function Wordmark({ className = "" }: WordmarkProps) {
  return (
    <svg
      viewBox="0 0 160 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`h-8 w-auto ${className}`}
      aria-label="porotta.in"
      role="img"
    >
      <text
        x="0"
        y="28"
        fontFamily="'Inter', sans-serif"
        fontWeight="700"
        fontSize="28"
        fill="#E8650A"
        letterSpacing="-0.5"
      >
        porotta
        <tspan fill="#A89E9A">.in</tspan>
      </text>
    </svg>
  );
}
