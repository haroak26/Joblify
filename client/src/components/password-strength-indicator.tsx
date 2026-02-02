import { CheckCircle2, XCircle } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const checks = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "One uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "One lowercase letter", valid: /[a-z]/.test(password) },
    { label: "One number", valid: /\d/.test(password) },
  ];

  return (
    <div className="grid gap-2 rounded-lg border border-muted p-3 text-sm">
      {checks.map((check) => (
        <div key={check.label} className="flex items-center gap-2">
          {check.valid ? (
            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
          <span className={check.valid ? "text-foreground" : "text-muted-foreground"}>
            {check.label}
          </span>
        </div>
      ))}
    </div>
  );
}
