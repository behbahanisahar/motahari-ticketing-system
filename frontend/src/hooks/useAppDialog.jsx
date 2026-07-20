import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const AppDialogContext = createContext(null);

export function AppDialogProvider({ children }) {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const close = useCallback((value) => {
    setState(null);
    resolverRef.current?.(value);
    resolverRef.current = null;
  }, []);

  const confirm = useCallback(
    ({
      title = "تأیید",
      message,
      confirmLabel = "تأیید",
      cancelLabel = "انصراف",
      destructive = false,
    }) =>
      new Promise((resolve) => {
        resolverRef.current = resolve;
        setState({
          type: "confirm",
          title,
          message,
          confirmLabel,
          cancelLabel,
          destructive,
        });
      }),
    []
  );

  const prompt = useCallback(
    ({
      title = "ورودی",
      message,
      placeholder = "",
      defaultValue = "",
      multiline = false,
      inputType = "text",
      confirmLabel = "تأیید",
      cancelLabel = "انصراف",
    }) =>
      new Promise((resolve) => {
        resolverRef.current = resolve;
        setState({
          type: "prompt",
          title,
          message,
          placeholder,
          defaultValue,
          multiline,
          inputType,
          confirmLabel,
          cancelLabel,
          input: defaultValue,
        });
      }),
    []
  );

  const handleOpenChange = (open) => {
    if (!open) close(state?.type === "prompt" ? null : false);
  };

  return (
    <AppDialogContext.Provider value={{ confirm, prompt }}>
      {children}
      <Dialog open={!!state} onOpenChange={handleOpenChange}>
        <DialogContent onOpenAutoFocus={(e) => state?.type === "prompt" && e.preventDefault()}>
          {state && (
            <>
              <DialogHeader>
                <DialogTitle>{state.title}</DialogTitle>
                {state.message && <DialogDescription>{state.message}</DialogDescription>}
              </DialogHeader>

              {state.type === "prompt" && (
                <div className="mt-2">
                  {state.multiline ? (
                    <Textarea
                      value={state.input}
                      onChange={(e) => setState((s) => ({ ...s, input: e.target.value }))}
                      placeholder={state.placeholder}
                      rows={3}
                      autoFocus
                    />
                  ) : (
                    <Input
                      type={state.inputType || "text"}
                      value={state.input}
                      onChange={(e) => setState((s) => ({ ...s, input: e.target.value }))}
                      placeholder={state.placeholder}
                      autoFocus
                    />
                  )}
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => close(state.type === "prompt" ? null : false)}>
                  {state.cancelLabel}
                </Button>
                <Button
                  type="button"
                  variant={state.destructive ? "destructive" : "default"}
                  onClick={() => close(state.type === "prompt" ? state.input : true)}
                >
                  {state.confirmLabel}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppDialogContext.Provider>
  );
}

export function useAppDialog() {
  const ctx = useContext(AppDialogContext);
  if (!ctx) throw new Error("useAppDialog must be used within AppDialogProvider");
  return ctx;
}
