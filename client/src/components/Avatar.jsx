// Circular avatar: image if present, else colored initials.
export default function Avatar({ user, size = 40 }) {
  const name = user?.name || "?";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const style = { width: size, height: size, fontSize: size * 0.4 };
  if (user?.avatar_url) {
    return (
      <img className="avatar" src={user.avatar_url} alt={name} style={style} />
    );
  }
  return (
    <span className="avatar" style={style} title={name}>
      {initials}
    </span>
  );
}
