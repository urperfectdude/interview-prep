interface AvatarProps {
  name: string | null;
  email: string;
  picture: string | null;
  size?: "sm" | "lg";
}

export function Avatar({ name, email, picture, size = "sm" }: AvatarProps) {
  const sizeClass = size === "lg" ? "size-14 text-lg" : "size-8 text-sm";
  if (picture) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={picture}
        alt=""
        referrerPolicy="no-referrer"
        className={`${sizeClass} flex-none rounded-full object-cover ring-1 ring-border`}
      />
    );
  }
  return (
    <span
      className={`${sizeClass} inline-flex flex-none items-center justify-center rounded-full bg-accent font-medium text-accent-foreground`}
    >
      {(name ?? email).charAt(0).toUpperCase()}
    </span>
  );
}
