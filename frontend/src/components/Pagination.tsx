interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const prevDisabled = currentPage === 1
  const nextDisabled = currentPage === totalPages

  // 计算要显示的页码窗口
  const getPageNumbers = (): number[] => {
    const maxVisible = 5
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    let start = Math.max(1, currentPage - 2)
    const end = Math.min(totalPages, start + maxVisible - 1)
    start = Math.max(1, end - maxVisible + 1)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className="flex items-center justify-center gap-3 mt-10">
      <button
        className="page-btn"
        disabled={prevDisabled}
        onClick={() => onPageChange(currentPage - 1)}
      >
        上一页
      </button>

      {pageNumbers.map((num) => (
        <button
          key={num}
          className={`page-btn page-num-btn ${num === currentPage ? 'active-page' : ''}`}
          onClick={() => onPageChange(num)}
        >
          {num}
        </button>
      ))}

      <span className="page-info">/ {totalPages}</span>

      <button
        className="page-btn"
        disabled={nextDisabled}
        onClick={() => onPageChange(currentPage + 1)}
      >
        下一页
      </button>
    </div>
  )
}

export default Pagination
