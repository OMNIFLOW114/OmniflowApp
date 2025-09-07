import { ShieldCheck } from "lucide-react";

export default function VerifiedBadge() {
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 text-xs font-medium shadow-sm">
      <ShieldCheck className="w-4 h-4" />
      Verified Seller
    </div>
  );
}
