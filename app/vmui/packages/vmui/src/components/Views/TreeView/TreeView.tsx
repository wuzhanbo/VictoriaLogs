import { FC, memo } from "preact/compat";
import { ViewProps } from "../../pages/QueryPage/QueryPageBody/types";
import TreeLogs from "./TreeLogs";

const TreeView: FC<ViewProps> = ({ data }) => {
  return <TreeLogs logs={data} />;
};

export default memo(TreeView);
