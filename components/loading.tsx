import { Loader2 } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner />
    </div>
  );
}

export function LoadingSpinner({ className = "" }: { className?: string }) {
  return <Loader2 className={`h-5 w-5 animate-spin ${className}`} />;
}
