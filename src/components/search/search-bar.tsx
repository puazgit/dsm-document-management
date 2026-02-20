"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Loader2, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface SearchSuggestion {
  text: string;
  frequency?: number;
}

interface RecentDocument {
  id: string;
  title: string;
  status?: string;
  documentType?: {
    name: string;
    icon?: string;
    color?: string;
  };
}

interface SearchBarProps {
  initialQuery?: string;
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  initialQuery = "",
  onSearch,
  placeholder = "Cari dokumen...",
  className,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions with debounce
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setRecentDocuments([]);
      return;
    }

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/documents/suggestions?q=${encodeURIComponent(query)}&limit=8`
        );
        
        if (response.ok) {
          const data = await response.json();
          console.log('[SEARCH BAR] Raw suggestions data:', data.suggestions);
          console.log('[SEARCH BAR] Recent documents:', data.recentDocuments);
          
          // Ensure suggestions is an array with valid data
          const validSuggestions = (data.suggestions || []).map((s: any) => ({
            text: s.text || '',
            frequency: typeof s.frequency === 'number' ? s.frequency : undefined
          })).filter((s: any) => s.text);
          
          // Map recent documents
          const validDocs = (data.recentDocuments || []).filter((d: any) => d.title);
          
          console.log('[SEARCH BAR] Mapped suggestions:', validSuggestions);
          setSuggestions(validSuggestions);
          setRecentDocuments(validDocs);
        } else {
          setSuggestions([]);
          setRecentDocuments([]);
        }
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
        setSuggestions([]);
        setRecentDocuments([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  const handleSearch = (searchQuery: string = query) => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setRecentDocuments([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1 rounded-md shadow-sm hover:shadow-md transition-shadow duration-200">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder={placeholder}
            className="pl-9 pr-9 border-input"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button onClick={() => handleSearch()} disabled={!query.trim()} className="shadow-sm">
          <Search className="h-4 w-4 mr-2" />
          Cari
        </Button>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (query.length >= 2 || suggestions.length > 0 || recentDocuments.length > 0) && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <Command>
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Mencari saran...
                  </span>
                </div>
              ) : (
                <>
                  {/* Document title matches */}
                  {recentDocuments.length > 0 && (
                    <CommandGroup heading="Dokumen">
                      {recentDocuments.map((doc) => (
                        <CommandItem
                          key={doc.id}
                          value={doc.title}
                          onSelect={() => handleSuggestionClick(doc.title)}
                          className="cursor-pointer"
                        >
                          <FileText className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate flex-1">{doc.title}</span>
                          {doc.documentType?.name && (
                            <span className="ml-2 text-xs text-muted-foreground shrink-0">
                              {doc.documentType.name}
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {/* Word suggestions */}
                  {suggestions.length > 0 && (
                    <CommandGroup heading="Saran Kata">
                      {suggestions.map((suggestion, index) => (
                        <CommandItem
                          key={index}
                          value={suggestion.text}
                          onSelect={() => handleSuggestionClick(suggestion.text)}
                          className="cursor-pointer"
                        >
                          <Search className="mr-2 h-4 w-4" />
                          <span>{suggestion.text}</span>
                          {suggestion.frequency && (
                            <span className="ml-auto text-xs text-muted-foreground">
                              {typeof suggestion.frequency === 'number'
                                ? suggestion.frequency.toFixed(0)
                                : suggestion.frequency} hasil
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {/* No results */}
                  {recentDocuments.length === 0 && suggestions.length === 0 && query.length >= 2 && (
                    <CommandEmpty>
                      Tidak ada saran untuk &quot;{query}&quot;
                    </CommandEmpty>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
