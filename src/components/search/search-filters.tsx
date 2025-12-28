"use client";

import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SearchFilters {
  status?: string[];
  fileType?: string[];
  documentTypeId?: string;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  facets?: {
    statuses?: Array<{ status: string; count: number }>;
    fileTypes?: Array<{ fileType: string; count: number }>;
    documentTypes?: Array<{ id: string; name: string; count: number }>;
  };
}

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "APPROVED", label: "Disetujui" },
  { value: "PUBLISHED", label: "Diterbitkan" },
  { value: "ARCHIVED", label: "Diarsipkan" },
];

const FILE_TYPE_OPTIONS = [
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "Word" },
  { value: "xlsx", label: "Excel" },
  { value: "pptx", label: "PowerPoint" },
];

export function SearchFilters({
  filters,
  onFiltersChange,
  facets,
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleStatusChange = (status: string, checked: boolean) => {
    const currentStatuses = filters.status || [];
    const newStatuses = checked
      ? [...currentStatuses, status]
      : currentStatuses.filter((s) => s !== status);
    
    onFiltersChange({ ...filters, status: newStatuses.length > 0 ? newStatuses : undefined });
  };

  const handleFileTypeChange = (fileType: string, checked: boolean) => {
    const currentFileTypes = filters.fileType || [];
    const newFileTypes = checked
      ? [...currentFileTypes, fileType]
      : currentFileTypes.filter((f) => f !== fileType);
    
    onFiltersChange({ ...filters, fileType: newFileTypes.length > 0 ? newFileTypes : undefined });
  };

  const handleDocumentTypeChange = (documentTypeId: string) => {
    onFiltersChange({
      ...filters,
      documentTypeId: documentTypeId === "all" ? undefined : documentTypeId,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const activeFilterCount = [
    filters.status?.length || 0,
    filters.fileType?.length || 0,
    filters.documentTypeId ? 1 : 0,
    filters.dateFrom ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filter
          {activeFilterCount > 0 && (
            <Badge
              variant="default"
              className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filter Pencarian</SheetTitle>
          <SheetDescription>
            Gunakan filter untuk mempersempit hasil pencarian
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Active Filters */}
          {activeFilterCount > 0 && (
            <div className="flex items-center justify-between pb-4 border-b">
              <span className="text-sm font-medium">
                {activeFilterCount} filter aktif
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-8"
              >
                <X className="h-4 w-4 mr-1" />
                Hapus Semua
              </Button>
            </div>
          )}

          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Status</Label>
            <div className="space-y-2">
              {STATUS_OPTIONS.map((option) => {
                const facetData = facets?.statuses?.find(
                  (f) => f.status === option.value
                );
                const count = facetData?.count || 0;
                const isChecked = filters.status?.includes(option.value) || false;

                return (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${option.value}`}
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        handleStatusChange(option.value, checked as boolean)
                      }
                      disabled={!facets || count === 0}
                    />
                    <label
                      htmlFor={`status-${option.value}`}
                      className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {option.label}
                      {facets && (
                        <span className="ml-2 text-muted-foreground">
                          ({count})
                        </span>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* File Type Filter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Tipe File</Label>
            <div className="space-y-2">
              {FILE_TYPE_OPTIONS.map((option) => {
                const facetData = facets?.fileTypes?.find(
                  (f) => f.fileType === option.value
                );
                const count = facetData?.count || 0;
                const isChecked = filters.fileType?.includes(option.value) || false;

                return (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`filetype-${option.value}`}
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        handleFileTypeChange(option.value, checked as boolean)
                      }
                      disabled={!facets || count === 0}
                    />
                    <label
                      htmlFor={`filetype-${option.value}`}
                      className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {option.label}
                      {facets && (
                        <span className="ml-2 text-muted-foreground">
                          ({count})
                        </span>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Document Type Filter */}
          {facets?.documentTypes && facets.documentTypes.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Tipe Dokumen</Label>
              <Select
                value={filters.documentTypeId || "all"}
                onValueChange={handleDocumentTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  {facets.documentTypes.map((docType) => (
                    <SelectItem key={docType.id} value={docType.id}>
                      {docType.name} ({docType.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Apply Filters Button */}
          <div className="pt-4 border-t">
            <Button
              onClick={() => setIsOpen(false)}
              className="w-full"
            >
              Terapkan Filter
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
