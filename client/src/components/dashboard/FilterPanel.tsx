import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Filter, 
  X, 
  Calendar as CalendarIcon,
  Search,
  RotateCcw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface FilterOption {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'range' | 'date' | 'daterange' | 'search' | 'toggle';
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

interface FilterValue {
  [key: string]: any;
}

interface FilterPanelProps {
  filters: FilterOption[];
  values: FilterValue;
  onChange: (values: FilterValue) => void;
  onApply?: () => void;
  onReset?: () => void;
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
  showApplyButton?: boolean;
  className?: string;
}

export function FilterPanel({
  filters,
  values,
  onChange,
  onApply,
  onReset,
  isCollapsible = true,
  defaultCollapsed = false,
  showApplyButton = true,
  className
}: FilterPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [localValues, setLocalValues] = useState<FilterValue>(values);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalValues(values);
    setHasChanges(false);
  }, [values]);

  const updateValue = (filterId: string, value: any) => {
    const newValues = { ...localValues, [filterId]: value };
    setLocalValues(newValues);
    setHasChanges(true);
    
    if (!showApplyButton) {
      onChange(newValues);
    }
  };

  const handleApply = () => {
    onChange(localValues);
    setHasChanges(false);
    onApply?.();
  };

  const handleReset = () => {
    const resetValues: FilterValue = {};
    filters.forEach(filter => {
      switch (filter.type) {
        case 'range':
          resetValues[filter.id] = [filter.min || 0, filter.max || 100];
          break;
        case 'multiselect':
          resetValues[filter.id] = [];
          break;
        case 'toggle':
          resetValues[filter.id] = false;
          break;
        default:
          resetValues[filter.id] = '';
      }
    });
    setLocalValues(resetValues);
    onChange(resetValues);
    setHasChanges(false);
    onReset?.();
  };

  const getActiveFilterCount = () => {
    return Object.entries(localValues).filter(([key, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') return value.trim() !== '';
      return value != null;
    }).length;
  };

  const renderFilter = (filter: FilterOption) => {
    const value = localValues[filter.id];

    switch (filter.type) {
      case 'select':
        return (
          <Select value={value || ''} onValueChange={(val) => updateValue(filter.id, val)}>
            <SelectTrigger>
              <SelectValue placeholder={filter.placeholder || `Select ${filter.label}`} />
            </SelectTrigger>
            <SelectContent>
              {filter.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            <Select onValueChange={(val) => {
              if (!selectedValues.includes(val)) {
                updateValue(filter.id, [...selectedValues, val]);
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder={filter.placeholder || `Select ${filter.label}`} />
              </SelectTrigger>
              <SelectContent>
                {filter.options?.filter(option => !selectedValues.includes(option.value)).map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedValues.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedValues.map((val: string) => {
                  const option = filter.options?.find(opt => opt.value === val);
                  return (
                    <Badge key={val} variant="secondary" className="text-xs">
                      {option?.label || val}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 ml-1"
                        onClick={() => updateValue(filter.id, selectedValues.filter(v => v !== val))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'range':
        const rangeValue = Array.isArray(value) ? value : [filter.min || 0, filter.max || 100];
        return (
          <div className="space-y-2">
            <Slider
              value={rangeValue}
              onValueChange={(val) => updateValue(filter.id, val)}
              min={filter.min || 0}
              max={filter.max || 100}
              step={filter.step || 1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{rangeValue[0]}</span>
              <span>{rangeValue[1]}</span>
            </div>
          </div>
        );

      case 'search':
        return (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={value || ''}
              onChange={(e) => updateValue(filter.id, e.target.value)}
              placeholder={filter.placeholder || `Search ${filter.label}`}
              className="pl-9"
            />
          </div>
        );

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), 'PPP') : filter.placeholder || 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => updateValue(filter.id, date?.toISOString())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case 'toggle':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={Boolean(value)}
              onCheckedChange={(checked) => updateValue(filter.id, checked)}
            />
            <Label className="text-sm">{filter.placeholder || 'Enable'}</Label>
          </div>
        );

      default:
        return null;
    }
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Card className={cn("transition-all duration-200", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-base">Filters</CardTitle>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            {isCollapsible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="space-y-4">
          {filters.map(filter => (
            <div key={filter.id} className="space-y-2">
              <Label className="text-sm font-medium">{filter.label}</Label>
              {renderFilter(filter)}
            </div>
          ))}
          
          {showApplyButton && (
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                onClick={handleApply} 
                disabled={!hasChanges}
                className="flex-1"
              >
                Apply Filters
              </Button>
              <Button 
                variant="outline" 
                onClick={handleReset}
                disabled={activeFilterCount === 0}
              >
                Reset
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}