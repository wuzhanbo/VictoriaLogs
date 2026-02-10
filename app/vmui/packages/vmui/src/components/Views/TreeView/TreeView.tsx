import { FC, memo } from "preact/compat";
import { Logs } from "../../../api/types";
import TreeLogs from "./TreeLogs";

interface Props {
  logs: Logs[];
}

const TreeView: FC<Props> = ({ logs }) => {
  return <TreeLogs logs={logs} />;
};

export default memo(TreeView);
