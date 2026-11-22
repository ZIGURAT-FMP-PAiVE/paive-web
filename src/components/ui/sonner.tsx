import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toast]:border-l-4 group-[.toast]:border-l-success group-[.toast]:border-success/30",
          error: "group-[.toast]:border-l-4 group-[.toast]:border-l-destructive group-[.toast]:border-destructive/30",
          warning: "group-[.toast]:border-l-4 group-[.toast]:border-l-warning group-[.toast]:border-warning/30",
          info: "group-[.toast]:border-l-4 group-[.toast]:border-l-primary group-[.toast]:border-primary/30",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
