import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Zap, ArrowRight, X } from "lucide-react";

interface UpgradeDialogProps {
  reason: string;
  upgradeTo: string;
  onClose: () => void;
}

const PLAN_NAMES: Record<string, string> = {
  starter: "Starter", professional: "Professional", enterprise: "Enterprise",
};

export function UpgradeDialog({ reason, upgradeTo, onClose }: UpgradeDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <Card className="relative w-full max-w-sm rounded-2xl p-6 text-center shadow-xl">
        <button onClick={onClose} className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-accent">
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
          <Zap className="h-7 w-7 text-amber-600" />
        </div>

        <h2 className="text-lg font-semibold">Upgrade required</h2>
        <p className="mt-2 text-sm text-muted-foreground">{reason}</p>
        <p className="mt-1 text-sm">
          This feature requires the <span className="font-semibold text-primary">{PLAN_NAMES[upgradeTo] ?? upgradeTo}</span> plan or above.
        </p>

        <div className="mt-6 space-y-2">
          <Link to="/account/billing">
            <Button className="w-full gap-2" style={{ backgroundColor: "#0F766E" }}>
              <Zap className="h-4 w-4" /> View plans & upgrade <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" className="w-full" onClick={onClose}>Maybe later</Button>
        </div>
      </Card>
    </div>
  );
}

// Inline banner version for less intrusive prompts
export function UpgradeBanner({ reason, upgradeTo }: { reason: string; upgradeTo: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3">
      <div className="flex items-center gap-3">
        <Zap className="h-5 w-5 text-amber-600" />
        <div>
          <p className="text-sm font-medium text-amber-900">{reason}</p>
          <p className="text-xs text-amber-700">Upgrade to {PLAN_NAMES[upgradeTo] ?? upgradeTo} to unlock.</p>
        </div>
      </div>
      <Link to="/account/billing">
        <Button size="sm" variant="outline" className="gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-100">
          Upgrade <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    </div>
  );
}
