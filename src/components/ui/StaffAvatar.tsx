import { staffInitials } from "@/lib/staff/avatar";

type StaffAvatarProps = {
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "staff-avatar-sm",
  md: "staff-avatar-md",
  lg: "staff-avatar-lg",
};

export function StaffAvatar({
  firstName,
  lastName,
  avatarUrl,
  size = "md",
  className = "",
}: StaffAvatarProps) {
  const initials = staffInitials(firstName, lastName);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={`staff-avatar ${sizeClasses[size]} ${className}`}
      />
    );
  }

  return (
    <span
      className={`staff-avatar staff-avatar-fallback ${sizeClasses[size]} ${className}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
