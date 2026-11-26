import { LoadingState } from "@/components/ui/LoadingState";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LoadingState variant="page" text="Memuat..." />
    </div>
  );
}