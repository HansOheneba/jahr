import { PageHeaderSkeleton } from "@/components/ui/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function PettyCashLoading() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeaderSkeleton withAction />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
