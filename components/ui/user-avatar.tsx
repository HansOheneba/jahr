import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { avatarInitials } from "@/lib/avatars";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  src?: string | null;
  /** Kept for call-site compatibility; photo uploads replace stock abbreviations. */
  gender?: string | null;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function UserAvatar({
  name,
  src,
  size = "default",
  className,
}: UserAvatarProps) {
  const imageSrc = src?.trim() || null;

  return (
    <Avatar size={size} className={cn(className)}>
      {imageSrc ? <AvatarImage src={imageSrc} alt={name} /> : null}
      <AvatarFallback className="bg-secondary font-medium text-foreground">
        {avatarInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
