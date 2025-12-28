import { Suspense } from "react";
import { SearchPage } from "@/components/search/search-page";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Pencarian Dokumen",
  description: "Cari dokumen berdasarkan judul, deskripsi, atau konten PDF",
};

function SearchPageSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="mb-6">
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function Search() {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchPage />
    </Suspense>
  );
}
