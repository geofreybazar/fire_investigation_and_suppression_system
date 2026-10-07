import { useState } from "react";
import { Flame, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const FireIncidents = () => {
  const [search, setSearch] = useState("");

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-3'>
          <div className='flex size-10 items-center justify-center rounded-lg border bg-muted/50'>
            <Flame className='size-5' />
          </div>

          <div>
            <h1 className='text-2xl font-semibold tracking-tight'>
              Fire Incidents
            </h1>

            <p className='text-sm text-muted-foreground'>
              Manage and monitor reported fire incidents.
            </p>
          </div>
        </div>

        <Button>
          <Plus className='mr-2 size-4' />
          Record Fire Incident
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className='p-4'>
          <div className='flex flex-col gap-3 md:flex-row'>
            <div className='relative flex-1'>
              <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder='Search incident number or location...'
                className='pl-9'
              />
            </div>

            {/* Add Incident Status Select */}
            {/* Add Incident Type Select */}
            {/* Add Office Select */}
            {/* Add Date Range */}
          </div>
        </CardContent>
      </Card>

      {/* Desktop Table */}
      <div className='hidden md:block'>
        <div className='rounded-lg border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Incident No.</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Office</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='w-12' />
              </TableRow>
            </TableHeader>

            <TableBody>{/* incidents */}</TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile */}
      <div className='space-y-3 md:hidden'>{/* Fire incident cards */}</div>
    </div>
  );
};

export default FireIncidents;
