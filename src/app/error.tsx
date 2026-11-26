"use client";

import { ErrorState } from "@/components/ui/ErrorState";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <ErrorState
        title="Terjadi Kesalahan"
        message="Maaf, terjadi kesalahan yang tidak terduga. Tim kami telah diberitahu dan akan memperbaikinya segera."
        code={error.digest}
        onRetry={reset}
        retryLabel="Coba Muat Ulang"
      />
    </div>
  );
}