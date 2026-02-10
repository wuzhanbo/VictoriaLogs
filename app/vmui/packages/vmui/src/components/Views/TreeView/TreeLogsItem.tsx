import { FC, memo, useState, useCallback, useRef } from "preact/compat";
import "./style.scss";
import { Logs } from "../../../api/types";
import classNames from "classnames";
import { formatDateWithNanoseconds } from "../../../utils/time";
import { useAppState } from "../../../state/common/StateContext";
import TreeField from "./TreeField";

interface Props {
  log: Logs;
}

const TreeLogsItem: FC<Props> = ({ log }) => {
  const { isDarkTheme } = useAppState();
  const [msgView, setMsgView] = useState<'STRING' | 'TREE'>('STRING');
  const [tick, setTick] = useState(0);
  const expandedPaths = useRef<Set<string>>(new Set());

  const formattedTime = formatDateWithNanoseconds(log._time, "YYYY-MM-DD HH:mm:ss.SSS");

  const toggleMsgView = useCallback((e: Event) => {
    e.stopPropagation();
    setMsgView(prev => {
      if (prev === 'STRING') {
        expandedPaths.current.add('');
        setTick(t => t + 1);
        return 'TREE';
      }
      return 'STRING';
    });
  }, []);

  const handleLeftClick = useCallback((e: Event) => {
    // Click anywhere in left area to toggle
    toggleMsgView(e);
  }, [toggleMsgView]);

  const isExpandedPath = useCallback((path: string) => {
    return expandedPaths.current.has(path);
  }, []);

  const toggleExpandPath = useCallback((path: string) => {
    if (expandedPaths.current.has(path)) {
      expandedPaths.current.delete(path);
    } else {
      expandedPaths.current.add(path);
    }
    setTick(t => t + 1);
  }, []);

  return (
    <div className={classNames("vm-tree-logs-row", {
      "vm-tree-logs-row_dark": isDarkTheme
    })} data-testid="tree-logs-row">
      <div 
        className="vm-tree-logs-row__left"
        onClick={handleLeftClick}
      >
        <div className="vm-tree-logs-row__time">
          {formattedTime}
        </div>
        <button 
          className="vm-tree-logs-row__toggle"
          onClick={toggleMsgView}
        >
          {msgView === 'STRING' ? 'TREE' : 'STRING'}
        </button>
      </div>
        
      <div className="vm-tree-logs-row__content">
        {msgView === 'STRING' ? (
          <span className="vm-tree-logs-row__msg-string">{String(log._msg)}</span>
        ) : (
          <TreeField
            fieldKey=""
            value={log._msg}
            depth={0}
            path=""
            isExpanded={isExpandedPath}
            onToggle={toggleExpandPath}
          />
        )}
      </div>
    </div>
  );
};

export default memo(TreeLogsItem);
