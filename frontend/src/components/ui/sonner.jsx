import { Toaster as Sonner } from "sonner";

function Toaster(props) {
  return (
    <Sonner
      dir="rtl"
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "glass-strong text-foreground rounded-xl text-sm font-sans",
          success: "!text-low",
          error: "!text-urgent",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
