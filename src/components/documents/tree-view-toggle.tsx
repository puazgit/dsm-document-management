'use client';

import { useState } from 'react';
import { List, Network } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ViewMode = 'list' | 'tree';

interface TreeViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

export function TreeViewToggle({ value, onChange, className }: TreeViewToggleProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as ViewMode)} className={className}>
      <TabsList>
        <TabsTrigger value="list" className="gap-2">
          <List className="h-4 w-4" />
          List View
        </TabsTrigger>
        <TabsTrigger value="tree" className="gap-2">
          <Network className="h-4 w-4" />
          Tree View
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
