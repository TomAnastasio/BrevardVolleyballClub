import { Button } from "@heroui/react";

// Shown instead of an empty list when data couldn't be fetched, so a bad
// connection doesn't look like "nothing here".
export default function LoadError({ what, onRetry, className = "" }) {
  return (
    <div role="alert" className={`flex flex-col items-center gap-3 px-4 py-8 text-center ${className}`}>
      <p className="m-0 font-bold">Couldn&apos;t load {what}.</p>
      <p className="m-0 text-sm text-muted">Check your connection and try again.</p>
      {onRetry && (
        <Button variant="primary" onPress={onRetry} className="h-12 min-w-40 rounded-full font-bold">
          Retry
        </Button>
      )}
    </div>
  );
}
