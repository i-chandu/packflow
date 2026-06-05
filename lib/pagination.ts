export const DEFAULT_PAGE_SIZE = 20;

export type PaginationParams = {
  page?: number;
  pageSize?: number;
};

export function getPagination({ page = 1, pageSize = DEFAULT_PAGE_SIZE }: PaginationParams) {
  const safePage = Math.max(1, page);
  const safeSize = Math.min(100, Math.max(1, pageSize));
  return {
    page: safePage,
    pageSize: safeSize,
    skip: (safePage - 1) * safeSize,
    take: safeSize,
  };
}

export function paginationMeta(total: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { total, page, pageSize, totalPages };
}
