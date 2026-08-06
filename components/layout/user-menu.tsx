"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { UserAvatar } from "@/components/ui/user-avatar";
import { signOut } from "@/lib/auth/actions";
import { displayName, type ProfileWithOrg } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  profile: ProfileWithOrg;
}

export function UserMenu({ profile }: UserMenuProps) {
  const router = useRouter();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const name = displayName(profile);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex max-w-[220px] items-center gap-2.5 rounded-md px-1.5 py-1 text-left outline-none transition-colors",
            "hover:bg-[#EEF2F7] focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
          aria-label="Account menu"
        >
          <UserAvatar
            name={name}
            src={profile.avatar_url}
            gender={profile.gender}
            size="sm"
            className="size-8 shrink-0"
          />
          <span className="min-w-0 hidden sm:block">
            <span className="block truncate text-sm font-medium leading-tight text-[#171717]">
              {name}
            </span>
            <span className="mt-0.5 block truncate text-xs leading-tight text-[#667085]">
              {profile.email}
            </span>
          </span>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" sideOffset={8} className="min-w-56">
          <DropdownMenuItem
            onClick={() => {
              router.push("/settings");
            }}
          >
            <Settings className="size-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              setSignOutOpen(true);
            }}
          >
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ll need to sign in again to access your workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <form action={signOut}>
              <SignOutConfirmButton />
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SignOutConfirmButton() {
  const { pending } = useFormStatus();

  return (
    <AlertDialogAction
      type="submit"
      variant="destructive"
      disabled={pending}
      className="w-full sm:w-auto"
    >
      {pending ? <Spinner className="mr-1" /> : null}
      Sign out
    </AlertDialogAction>
  );
}
