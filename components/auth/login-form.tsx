"use client";

import { useActionState, useState } from "react";
import {
  sendLoginOtp,
  verifyLoginOtp,
  type AuthActionState,
} from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

const initialState: AuthActionState = {
  error: null,
  success: false,
};

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [sendState, sendAction, sendPending] = useActionState(
    async (prev: AuthActionState, formData: FormData) => {
      const result = await sendLoginOtp(prev, formData);
      if (result.success) {
        setOtpSent(true);
      }
      return result;
    },
    initialState,
  );

  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyLoginOtp,
    initialState,
  );

  const error = otpSent ? verifyState.error : sendState.error;
  const pending = sendPending || verifyPending;

  if (!otpSent) {
    return (
      <form action={sendAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@jagroup.co"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11"
          />
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={pending} className="h-11 w-full">
          {pending ? <Spinner className="mr-1" /> : null}
          Continue
        </Button>
      </form>
    );
  }

  return (
    <form action={verifyAction} className="flex flex-col gap-4">
      <input type="hidden" name="email" value={email} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="token">Verification code</Label>
        <Input
          id="token"
          name="token"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          placeholder="6-digit code"
          maxLength={8}
          className="h-11"
        />
        <p className="text-sm text-muted-foreground">
          We sent a code to <span className="text-foreground">{email}</span>
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending ? <Spinner className="mr-1" /> : null}
        Sign in
      </Button>

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        disabled={pending}
        onClick={() => {
          setOtpSent(false);
        }}
      >
        Use a different email
      </Button>
    </form>
  );
}
