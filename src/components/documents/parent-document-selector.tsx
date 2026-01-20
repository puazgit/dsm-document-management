"use client";

// ParentDocumentSelector removed — placeholder module kept for cleanup

export function ParentDocumentSelector() {
  return null;
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (!open) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlighted((h) => Math.min(h + 1, results.length));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlighted((h) => Math.max(h - 1, -1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (highlighted === -1) {
                    onChange(null);
                  } else {
                    const sel = results[highlighted];
                    if (sel) onChange(sel.id);
                  }
                  setOpen(false);
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              placeholder="Search parent document or leave as root"
              disabled={disabled}
              className="pl-10"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear"
                className="absolute p-1 -translate-y-1/2 right-2 top-1/2"
                onClick={() => {
                  setQuery("");
                  setResults(documents);
                  setOpen(false);
                  setHighlighted(-1);
                  inputRef.current?.focus();
                }}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}

            {/* Dropdown */}
            {open && (
              <div className="absolute z-50 w-full mt-1 overflow-auto border rounded-md shadow-md max-h-60 bg-popover">
                <div className="p-2 text-sm text-muted-foreground">{documents.length} document{documents.length !== 1 ? 's' : ''} available</div>
                {isSearching && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
                )}
                {error && (
                  <div className="px-3 py-2 text-sm text-destructive">{error}</div>
                )}
                <ul role="listbox">
                  <li
                    role="option"
                    aria-selected={value === null}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(null);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 cursor-pointer',
                      highlighted === -1 ? 'bg-muted' : 'hover:bg-accent/50'
                    )}
                  >
                    <FolderTree className="w-4 h-4 text-muted-foreground" />
                    <span>No Parent (Root Level)</span>
                  </li>
                  {results.map((doc, idx) => (
                    <li
                      key={doc.id}
                      role="option"
                      aria-selected={value === doc.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onChange(doc.id);
                        setOpen(false);
                      }}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 cursor-pointer',
                        highlighted === idx ? 'bg-muted' : 'hover:bg-accent/50',
                        value === doc.id ? 'font-medium' : ''
                      )}
                    >
                      <FolderTree className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">
                        {getIndentation(doc.hierarchyLevel)}
                        {doc.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {documents.length} document{documents.length !== 1 ? 's' : ''} available
      </p>
    </div>
  );
}



