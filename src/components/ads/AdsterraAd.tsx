"use client";

import React, { useEffect, useState } from "react";

interface AdsterraAdProps {
  type: "banner-320x50" | "banner-300x250" | "banner-160x600" | "native";
  className?: string;
}

export default function AdsterraAd({ type, className = "" }: AdsterraAdProps) {
  // We use a state to ensure the ad only loads on the client side
  // This prevents hydration mismatches with Next.js
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder of the exact size to prevent layout shift
    if (type === "banner-320x50") return <div className={`w-[320px] h-[50px] bg-neutral-900/10 animate-pulse ${className}`} />;
    if (type === "banner-300x250") return <div className={`w-[300px] h-[250px] bg-neutral-900/10 animate-pulse ${className}`} />;
    if (type === "native") return <div className={`w-full h-[250px] bg-neutral-900/10 animate-pulse ${className}`} />;
    return null;
  }

  let adHtml = "";
  let width = "100%";
  let height = "100%";

  if (type === "banner-320x50") {
    width = "320";
    height = "50";
    adHtml = `
      <html>
        <head>
          <style>body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: transparent; overflow: hidden; }</style>
        </head>
        <body>
          <script>
            atOptions = {
              'key' : '1d138c4930d763a003c7735dfd4d5ff7',
              'format' : 'iframe',
              'height' : 50,
              'width' : 320,
              'params' : {}
            };
          </script>
          <script src="https://www.highperformanceformat.com/1d138c4930d763a003c7735dfd4d5ff7/invoke.js"></script>
        </body>
      </html>
    `;
  } else if (type === "banner-300x250") {
    width = "300";
    height = "250";
    adHtml = `
      <html>
        <head>
          <style>body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: transparent; overflow: hidden; }</style>
        </head>
        <body>
          <script>
            atOptions = {
              'key' : '1c7ad0e6ed6a4705e42c10e8d6352eed',
              'format' : 'iframe',
              'height' : 250,
              'width' : 300,
              'params' : {}
            };
          </script>
          <script src="https://www.highperformanceformat.com/1c7ad0e6ed6a4705e42c10e8d6352eed/invoke.js"></script>
        </body>
      </html>
    `;
  } else if (type === "banner-160x600") {
    width = "160";
    height = "600";
    adHtml = `
      <html>
        <head>
          <style>body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: transparent; overflow: hidden; }</style>
        </head>
        <body>
          <script>
            atOptions = {
              'key' : '62a66023500c7492ed900ba8c7f9ffb3',
              'format' : 'iframe',
              'height' : 600,
              'width' : 160,
              'params' : {}
            };
          </script>
          <script src="https://www.highperformanceformat.com/62a66023500c7492ed900ba8c7f9ffb3/invoke.js"></script>
        </body>
      </html>
    `;
  } else if (type === "native") {
    width = "100%";
    height = "250"; // Native ads usually adapt, but an iframe needs a height. 250 is standard for 4:1 layouts.
    adHtml = `
      <html>
        <head>
          <style>body { margin: 0; padding: 0; display: flex; justify-content: center; background: transparent; overflow: hidden; }</style>
        </head>
        <body>
          <script async="async" data-cfasync="false" src="https://pl29198001.profitablecpmratenetwork.com/c612a029cc0da841e23f052648e3eef8/invoke.js"></script>
          <div id="container-c612a029cc0da841e23f052648e3eef8"></div>
        </body>
      </html>
    `;
  }

  // We use an iframe to isolate the ad network's document.write calls from React.
  // If we don't do this, Adsterra will wipe out the entire React application!
  return (
    <div className={`flex justify-center items-center overflow-hidden z-10 ${className}`} style={{ width: width === '100%' ? '100%' : `${width}px`, height: `${height}px` }}>
      <iframe
        title="Advertisement"
        srcDoc={adHtml}
        width={width}
        height={height}
        frameBorder="0"
        scrolling="no"
        className="max-w-full"
        style={{ border: "none", overflow: "hidden" }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
}
