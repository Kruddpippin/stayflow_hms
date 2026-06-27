import { cn } from "@/lib/utils";

export function getPasswordStrength(pw: string) {
  if (!pw) return { level: 0, label: "", color: "" };
  if (pw.length < 8) return { level: 0, label: "Too short", color: "bg-destructive" };

  let score = 0;
  if (/[a-z]/.test(pw)) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z\d]/.test(pw)) score++;

  if (score <= 1) return { level: 1, label: "Weak", color: "bg-destructive" };
  if (score === 2) return { level: 2, label: "Fair", color: "bg-amber-500" };
  if (score === 3) return { level: 3, label: "Good", color: "bg-emerald-500" };
  return { level: 4, label: "Strong", color: "bg-emerald-600" };
}

export function PasswordStrengthBar({ password }: { password: string }) {
  const strength = getPasswordStrength(password);
  if (!password) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= strength.level ? strength.color : "bg-border"
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{strength.label}</p>
    </div>
  );
}
