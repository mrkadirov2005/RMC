import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { buildPageNumbers } from './pagination';

interface SimplePaginationBarProps {
  total: number;
  currentPage: number;
  totalPages: number;
  start: number;
  end: number;
  pageSize: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export const SimplePaginationBar = ({
  total,
  currentPage,
  totalPages,
  start,
  end,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: SimplePaginationBarProps) => {
  const { t } = useLanguage();

  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-border dark:bg-card sm:flex-row sm:items-center sm:justify-between">
      <div className="text-muted-foreground">
        {t('Showing')} {start + 1}-{end} {t('of')} {total}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger className="h-8 w-[92px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option} / {t('page')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t('Prev')}
        </Button>

        <div className="flex items-center gap-1">
          {buildPageNumbers(currentPage, totalPages).map((page, index, pages) => (
            <div key={page} className="flex items-center gap-1">
              {index > 0 && page - pages[index - 1] > 1 && (
                <span className="px-1 text-muted-foreground">...</span>
              )}
              <Button
                type="button"
                variant={page === currentPage ? 'default' : 'outline'}
                size="sm"
                className="h-8 min-w-8 px-2"
                onClick={() => onPageChange(page)}
              >
                {page}
              </Button>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          {t('Next')}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
