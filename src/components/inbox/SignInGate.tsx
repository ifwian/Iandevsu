import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface SignInGateProps {
  password: string;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
  error: string | null;
}

/**
 * The signed-out state: the same shell, holding a form instead of two panes.
 *
 * The password is never persisted, and the copy says so -- this is a page that
 * is kept open all day in a tab, so "closing the tab signs you out" is
 * information rather than boilerplate.
 */
export default function SignInGate({ password, onPasswordChange, onSubmit, busy, error }: SignInGateProps) {
  return (
    <div className="inbox-gate">
      <Card className="inbox-gate-card">
        <CardHeader>
          <CardTitle>
            <span className="inbox-gate-title">
              <MessageCircle size={16} aria-hidden="true" />
              Admin access
            </span>
          </CardTitle>
          <CardDescription>
            Enter the admin password to read and reply to visitor conversations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="inbox-gate-form"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            <Input
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="admin password"
              aria-label="Admin password"
              autoComplete="current-password"
              autoFocus
              disabled={busy}
            />
            <Button type="submit" disabled={busy || !password.trim()}>
              {busy ? "checking..." : "unlock"}
            </Button>
          </form>

          {error ? (
            <p className="inbox-error" role="alert">
              {error}
            </p>
          ) : null}

          <p className="inbox-gate-note">
            Set <code>CHAT_ADMIN_PASSWORD</code> on the server. Sessions last 12 hours and are kept
            in this tab only, so closing the browser signs you out.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
