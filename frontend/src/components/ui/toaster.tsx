import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useToast } from "@/hooks/useToast";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
} from "lucide-react";

const ICONS = {
  success: <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />,
  destructive: <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />,
  info: <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
  default: null,
};

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, variant, ...props }) => (
        <Toast key={id} variant={variant} {...props}>
          {ICONS[variant ?? "default"]}
          <div className="flex-1 min-w-0">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && (
              <ToastDescription>{description}</ToastDescription>
            )}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}