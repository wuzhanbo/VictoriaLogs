import { FC, useMemo, useState } from "preact/compat";
import "./style.scss";
import { Logs } from "../../../api/types";
import TreeLogsItem from "./TreeLogsItem";
import Pagination from "../../Main/Pagination/Pagination";
import SelectLimit from "../../Main/Pagination/SelectLimit/SelectLimit";
import { useSearchParams } from "react-router-dom";
import { LOGS_URL_PARAMS } from "../../../constants/logs";
import useDeviceDetect from "../../../hooks/useDeviceDetect";

interface Props {
  logs: Logs[];
}

const TreeLogs: FC<Props> = ({ logs }) => {
  const { isMobile } = useDeviceDetect();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);

  const rowsPerPageRaw = searchParams.get(LOGS_URL_PARAMS.ROWS_PER_PAGE);
  const rowsPerPageNum = rowsPerPageRaw ? Number(rowsPerPageRaw) : 100;
  const rowsPerPage = isNaN(rowsPerPageNum) ? 100 : rowsPerPageNum;

  const paginatedLogs = useMemo(() => {
    const limit = rowsPerPage || 100;
    const start = (page - 1) * limit;
    const end = start + limit;
    return logs.slice(start, end);
  }, [logs, page, rowsPerPage]);

  const handleSetRowsPerPage = (limit?: number) => {
    if (limit) {
      searchParams.set(LOGS_URL_PARAMS.ROWS_PER_PAGE, String(limit));
    } else {
      searchParams.set(LOGS_URL_PARAMS.ROWS_PER_PAGE, "100");
    }
    setSearchParams(searchParams);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <div className="vm-tree-logs">
      {paginatedLogs.map((log, index) => (
        <TreeLogsItem
          key={`${index}_${log._time}`}
          log={log}
        />
      ))}

      <Pagination
        currentPage={page}
        totalItems={logs.length}
        itemsPerPage={rowsPerPage || 100}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default TreeLogs;
