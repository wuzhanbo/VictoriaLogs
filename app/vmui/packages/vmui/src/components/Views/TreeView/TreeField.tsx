import { FC, useState, useCallback } from "preact/compat";
import "./style.scss";
import classNames from "classnames";

interface TreeFieldProps {
  fieldKey: string;
  value: unknown;
  depth?: number;
  isJson?: boolean;
  defaultExpanded?: boolean;
  path?: string;
  isExpanded?: (path: string) => boolean;
  onToggle?: (path: string) => void;
}

const TreeField: FC<TreeFieldProps> = ({ 
  fieldKey, 
  value, 
  depth = 0, 
  isJson = false, 
  defaultExpanded = false,
  path = '',
  isExpanded: isExpandedProp,
  onToggle: onToggleProp
}) => {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const currentPath = path ? `${path}.${fieldKey}` : fieldKey;
  
  const expanded = isExpandedProp ? isExpandedProp(currentPath) : internalExpanded;
  const indentWidth = depth * 20;

  const setExpanded = useCallback((newVal: boolean) => {
    if (isExpandedProp && onToggleProp) {
      onToggleProp(currentPath);
    } else {
      setInternalExpanded(newVal);
    }
  }, [currentPath, isExpandedProp, onToggleProp]);

  const parseJsonString = useCallback((str: string): unknown => {
    try {
      const parsed = JSON.parse(str);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    } catch {
      return null;
    }
    return null;
  }, []);

  const isExpandable = (() => {
    if (typeof value === 'object' && value !== null) {
      return Array.isArray(value) 
        ? value.length > 0 
        : Object.keys(value).length > 0;
    }
    if (typeof value === 'string') {
      const parsed = parseJsonString(value);
      if (parsed !== null) {
        return Array.isArray(parsed)
          ? parsed.length > 0
          : Object.keys(parsed).length > 0;
      }
    }
    return false;
  })();

  const toggle = useCallback((e: Event) => {
    e.stopPropagation();
    setExpanded(!expanded);
  }, [expanded, setExpanded]);

  const isSystemField = fieldKey.startsWith('_');

  const getEntries = (): [string, unknown][] => {
    if (typeof value === 'string') {
      const parsed = parseJsonString(value);
      if (parsed !== null) {
        return Object.entries(parsed);
      }
    }
    if (typeof value === 'object' && value !== null) {
      return Object.entries(value);
    }
    return [];
  };

  const entries = getEntries();

  return (
    <div 
      className={classNames("vm-tree-field", {
        "vm-tree-field_system": isSystemField,
        "vm-tree-field_expanded": expanded
      })}
    >
      <div className="vm-tree-field__line">
        {depth > 0 && <span className="vm-tree-field__indent" style={{ width: `${indentWidth}px` }}></span>}
        {fieldKey && <span className="vm-tree-field__key">{fieldKey}</span>}
        
        {isExpandable ? (
          <span>
            {fieldKey && <span className="vm-tree-field__separator">: </span>}
            <span className="vm-tree-field__expander">
              <button
                className="vm-tree-field__toggle"
                onClick={toggle}
              >
                {expanded ? <>&nbsp;&nbsp;▼</> : '▶'}
              </button>
            </span>
          </span>
        ) : fieldKey && (
          <span className="vm-tree-field__separator">: </span>
        )}
        
        {!isExpandable && fieldKey && (
          <span className="vm-tree-field__value">
            {value === null ? (
              <span className="vm-tree-field__value-null">null</span>
            ) : typeof value === 'string' ? (
              <span className="vm-tree-field__value-string">"{value}"</span>
            ) : typeof value === 'number' ? (
              <span className="vm-tree-field__value-number">{String(value)}</span>
            ) : typeof value === 'boolean' ? (
              <span className="vm-tree-field__value-boolean">{String(value)}</span>
            ) : (
              String(value)
            )}
          </span>
        )}
      </div>

      {isExpandable && expanded && (
        <div className="vm-tree-field__children">
          {entries.map(([key, val]) => (
            <TreeField
              key={key}
              fieldKey={key}
              value={val}
              depth={depth + 1}
              isJson={typeof val === 'object' && val !== null}
              path={currentPath}
              isExpanded={isExpandedProp}
              onToggle={onToggleProp}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TreeField;
