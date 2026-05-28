import type { PaginationMeta } from '@brick/types';
import { Button } from './button';

export function Pagination({
  meta,
  onPage,
}: {
  meta: PaginationMeta;
  onPage: (page: number) => void;
}) {
  if (meta.total === 0) return null;
  return (
    <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
      <span>
        {meta.total} total · page {meta.page}/{meta.totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page <= 1}
          onClick={() => onPage(meta.page - 1)}
        >
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPage(meta.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
