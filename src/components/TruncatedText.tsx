import { useEffect, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  className?: string;
  maxWidthClass?: string;
};

/** Single-line ellipsis; full text in a tooltip when it overflows. */
export function TruncatedText({ text, className, maxWidthClass = "max-w-[14rem]" }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setOverflows(el.scrollWidth > el.clientWidth + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, maxWidthClass]);

  const triggerClass = cn("block min-w-0 truncate", maxWidthClass, className, overflows && "cursor-help");

  if (!text || !overflows) {
    return (
      <span ref={ref} className={triggerClass}>
        {text}
      </span>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span ref={ref} className={triggerClass}>
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-sm border border-border bg-card px-3 py-2 text-base text-foreground shadow-lg"
      >
        <p className="break-all font-medium">{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}