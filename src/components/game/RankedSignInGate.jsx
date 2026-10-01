import { Button } from "@heroui/react";

export default function RankedSignInGate({ onSignIn, loading }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <span aria-hidden="true" className="text-4xl">
        🏆
      </span>
      <h2 className="m-0 text-lg font-bold">Sign in to play ranked</h2>
      <p className="m-0 max-w-80 text-sm text-muted">
        Ranked games require a free account so your rating can follow you across devices.
      </p>
      <div className="w-full max-w-80">
        <Button
          variant="primary"
          onPress={onSignIn}
          isDisabled={loading}
          className="min-h-14 w-full text-lg font-extrabold"
        >
          {loading ? "Signing in…" : "Sign in with Google"}
        </Button>
      </div>
    </div>
  );
}
