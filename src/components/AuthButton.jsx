import { Button } from "@heroui/react";
import { useAuth } from "../hooks/useAuth.js";

export default function AuthButton() {
  const { user, loading, isConfigured, signInWithGoogle, signOut } = useAuth();

  if (!isConfigured) return null;
  if (loading) return <span className="inline-block h-8" aria-hidden="true" />;

  if (user) {
    const label = user.user_metadata?.full_name || user.email;
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="max-w-32 truncate text-muted">{label}</span>
        <Button variant="outline" size="sm" onPress={signOut} className="text-xs font-bold">
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" onPress={signInWithGoogle} className="text-xs font-bold">
      Sign in with Google
    </Button>
  );
}
