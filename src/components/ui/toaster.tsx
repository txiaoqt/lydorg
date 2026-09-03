import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastIcon, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

const DEFAULT_TOAST_DURATION = 3000;

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider duration={DEFAULT_TOAST_DURATION}>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <ToastIcon variant={variant} />
            <div className="grid flex-1 gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
