import useGetPositions from "@/hooks/position/useGetPositions";
import PaginationComponent from "@/components/common/PaginationComponent";
import DesktopView from "./DesktopView";
import MobileView from "./MobileView";
import NoOfficeFound from "../../offices/table/NoOfficeFound";

interface PositionsTableProps {
  debouncedSearch: string;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  setSearch: (value: string) => void;
}

const PositionsTable = ({
  debouncedSearch,
  currentPage,
  setCurrentPage,
  setSearch,
}: PositionsTableProps) => {
  const { positions } = useGetPositions(currentPage, debouncedSearch);

  const clearFilters = () => {
    setSearch("");
    setCurrentPage(1);
  };

  if (!positions || positions.data.length === 0) {
    return (
      <NoOfficeFound
        hasFilters={Boolean(debouncedSearch)}
        onClearFilters={clearFilters}
      />
    );
  }

  return (
    <div className='rounded-lg border flex flex-col'>
      {/* DesktopView */}
      <div className='hidden md:block'>
        <DesktopView positions={positions.data} />
      </div>

      {/* MobileView */}
      <div className='divide-y md:hidden'>
        <MobileView positions={positions.data} />
      </div>

      {positions.pagination.totalPages > 1 && (
        <div className='self-end'>
          <PaginationComponent
            totalPages={positions.pagination.totalPages}
            setCurrentPage={setCurrentPage}
            currentPage={currentPage}
          />
        </div>
      )}
    </div>
  );
};

export default PositionsTable;
