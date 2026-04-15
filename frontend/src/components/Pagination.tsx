interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const renderPageNumbers = () => {
    const pages = []
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button
          key={i}
          className={`min-w-[40px] h-10 flex items-center justify-center border rounded-lg text-sm font-normal transition-all duration-200 cursor-pointer ${
            i === currentPage
              ? 'bg-accent border-accent text-white'
              : 'border-neutral-200 text-neutral-600 hover:border-primary hover:text-primary'
          }`}
          onClick={() => onPageChange(i)}
        >
          {i}
        </button>
      )
    }
    return pages
  }

  return (
    <div className="flex justify-center items-center gap-2 mt-16 pb-20">
      <button
        className="min-w-[40px] h-10 px-3 flex items-center justify-center border border-neutral-200 rounded-lg text-sm font-normal text-neutral-600 hover:border-primary hover:text-primary transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        上一页
      </button>

      {renderPageNumbers()}

      <button
        className="min-w-[40px] h-10 px-3 flex items-center justify-center border border-neutral-200 rounded-lg text-sm font-normal text-neutral-600 hover:border-primary hover:text-primary transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        下一页
      </button>
    </div>
  )
}

export default Pagination
