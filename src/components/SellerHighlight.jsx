import { Star, Store } from "lucide-react";

export default function SellerHighlight({ seller }) {
  if (!seller) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 mb-4 bg-yellow-50 dark:bg-yellow-900 rounded-xl shadow-md border border-yellow-200 dark:border-yellow-700 animate-fade-in">
      <div className="flex items-center gap-3">
        <Store className="text-yellow-600 dark:text-yellow-300 w-6 h-6" />
        <div>
          <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-100">
            {seller.storeName}
          </h4>
          <p className="text-xs text-yellow-700 dark:text-yellow-200">
            {seller.tagline || "Trusted OmniMarket Seller"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 text-yellow-700 dark:text-yellow-200 text-xs font-semibold">
        <Star className="w-4 h-4" />
        {seller.rating?.toFixed(1) || "5.0"}
      </div>
    </div>
  );
}
