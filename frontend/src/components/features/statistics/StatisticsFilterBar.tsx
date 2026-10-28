import { FIRE_INCIDENT_STATUSES } from "@/constants/fireIncident";
import { CATEGORY_TYPES } from "@/interface/statistics/statistics";
import { ALL, yearToDate, type FilterState } from "@/utils/statisticsFilters";
import { formatEnum } from "@/utils/formatEnum";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StatisticsFilterBarProps {
  value: FilterState;
  onChange: (value: FilterState) => void;
  // The report and map filter by status; the summary shows all statuses.
  showStatus?: boolean;
}

// Shared by Statistics, Incident Reports and the Incident Map. The incident
// date is the fire's date, or the recording date when it was left blank.
const StatisticsFilterBar = ({
  value,
  onChange,
  showStatus = true,
}: StatisticsFilterBarProps) => {
  const set = (patch: Partial<FilterState>) => onChange({ ...value, ...patch });

  return (
    <div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center'>
      <label className='flex items-center gap-2 text-sm text-muted-foreground'>
        From
        <Input
          type='date'
          value={value.from}
          max={value.to || undefined}
          onChange={(event) => set({ from: event.target.value })}
          className='w-auto'
        />
      </label>
      <label className='flex items-center gap-2 text-sm text-muted-foreground'>
        to
        <Input
          type='date'
          value={value.to}
          min={value.from || undefined}
          onChange={(event) => set({ to: event.target.value })}
          className='w-auto'
        />
      </label>

      {showStatus && (
        <Select
          value={value.status}
          onValueChange={(status) => set({ status: status ?? ALL })}
        >
          <SelectTrigger className='sm:w-52' aria-label='Status'>
            <SelectValue>
              {value.status === ALL ? "All statuses" : formatEnum(value.status)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {FIRE_INCIDENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {formatEnum(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={value.categoryType}
        onValueChange={(categoryType) =>
          set({ categoryType: categoryType ?? ALL })
        }
      >
        <SelectTrigger className='sm:w-52' aria-label='Category type'>
          <SelectValue>
            {value.categoryType === ALL
              ? "All category types"
              : formatEnum(value.categoryType)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All category types</SelectItem>
          {CATEGORY_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {formatEnum(type)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant='ghost' size='sm' onClick={() => onChange(yearToDate())}>
        This year
      </Button>
    </div>
  );
};

export default StatisticsFilterBar;
