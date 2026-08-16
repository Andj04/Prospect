import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Duplique la scrollbar horizontale d'un tableau large en une barre "fantôme"
// collée en bas du viewport (position: sticky), synchronisée avec le scroll
// réel — évite d'avoir à descendre jusqu'au bas d'une page de 300+ lignes
// pour atteindre la scrollbar native, qui reste tout en bas du tableau.
export function DualScrollTable({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const syncSource = useRef<"content" | "bar" | null>(null);

  const [contentWidth, setContentWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const measure = measureRef.current;
    const content = contentRef.current;
    if (!measure || !content) return;
    const ro = new ResizeObserver(() => {
      setContentWidth(measure.scrollWidth);
      setContainerWidth(content.clientWidth);
    });
    ro.observe(measure);
    ro.observe(content);
    return () => ro.disconnect();
  }, []);

  const onContentScroll = () => {
    if (syncSource.current === "bar") {
      syncSource.current = null;
      return;
    }
    syncSource.current = "content";
    if (barRef.current && contentRef.current) {
      barRef.current.scrollLeft = contentRef.current.scrollLeft;
    }
  };

  const onBarScroll = () => {
    if (syncSource.current === "content") {
      syncSource.current = null;
      return;
    }
    syncSource.current = "bar";
    if (barRef.current && contentRef.current) {
      contentRef.current.scrollLeft = barRef.current.scrollLeft;
    }
  };

  const showBar = contentWidth > containerWidth + 1;

  return (
    <div className={cn("relative", className)}>
      <div
        ref={contentRef}
        onScroll={onContentScroll}
        className="overflow-x-auto overflow-y-hidden"
      >
        <div ref={measureRef} className="inline-block min-w-full align-top">
          {children}
        </div>
      </div>
      {showBar && (
        <div
          ref={barRef}
          onScroll={onBarScroll}
          className="themed-scrollbar sticky bottom-0 z-20 overflow-x-auto overflow-y-hidden border-t border-border bg-card/95 shadow-[0_-2px_6px_-2px_rgb(0_0_0_/_0.08)] backdrop-blur"
          style={{ height: 16 }}
        >
          <div style={{ width: contentWidth, height: 1 }} />
        </div>
      )}
    </div>
  );
}
