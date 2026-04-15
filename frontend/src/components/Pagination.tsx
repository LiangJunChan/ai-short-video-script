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
          className={`min-w-[40px] h-10 flex items-center justify-center border rounded-lg text-sm font-normal transition-all ${
            i === currentPage
              ? 'bg-black border-black text-white'
              : 'border-[#e5e5e5] text-[#666] hover:border-black hover:text-black'
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
    <div className="flex justify-center items-center gap-1 mt-16 pb-20">
      <button
        className="min-w-[40px] h-10 px-3 flex items-center justify-center border border-[#e5e5e5] rounded-lg text-sm font-normal text-[#666] hover:border-black hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        上一页
      </button>

      {renderPageNumbers()}

      <button
        className="min-w-[40px] h-10 px-3 flex items-center justify-center border border-[#e5e5e5] rounded-lg text-sm font-normal text-[#666] hover:border-black hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        下一页
      </button>
    </div>
  )
}

export default Pagination
