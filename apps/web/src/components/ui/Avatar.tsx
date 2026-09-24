interface AvatarProps {
  name: string | null;
  email: string;
  size?: "sm" | "lg";
}

export function Avatar({ name, email, size = "sm" }: AvatarProps) {
  const sizeClass = size === "lg" ? "size-14 text-lg" : "size-8 text-sm";
  return (
    <span
      className={`${sizeClass} inline-flex flex-none items-center justify-center rounded-full bg-accent font-medium text-accent-foreground`}
    >
      {(name ?? email).charAt(0).toUpperCase()}
    </span>
  );
}
