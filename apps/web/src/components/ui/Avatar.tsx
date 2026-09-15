interface AvatarProps {
  name: string | null;
  email: string;
  picture: string | null;
  size?: "sm" | "lg";
}

export function Avatar({ name, email, picture, size = "sm" }: AvatarProps) {
  const sizeClass = size === "lg" ? "h-14 w-14 text-lg" : "h-8 w-8 text-sm";
  if (picture) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={picture}
        alt=""
        referrerPolicy="no-referrer"
        className={`${sizeClass} flex-none rounded-full object-cover`}
      />
    );
  }
  return (
    <span
      className={`${sizeClass} inline-flex flex-none items-center justify-center rounded-full bg-accent-soft font-semibold text-accent`}
    >
      {(name ?? email).charAt(0).toUpperCase()}
    </span>
  );
}
