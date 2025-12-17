import { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface EnvEditorProps {
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
}

interface EnvEntry {
  key: string;
  value: string;
  visible: boolean;
}

export function EnvEditor({ value, onChange }: EnvEditorProps) {
  const [entries, setEntries] = useState<EnvEntry[]>([]);

  // Initialize entries from value prop
  // Initialize entries from value prop
  useEffect(() => {
    // Convert entries to object to compare
    const currentEntriesObj = entries.reduce((acc, entry) => {
      if (entry.key) acc[entry.key] = entry.value;
      return acc;
    }, {} as Record<string, string>);

    // Use JSON stringify for simple deep comparison (keys order might matter but usually consistent enough for this simple case if derived similarly)
    // Actually, comparing key-value pairs is safer.

    if (value) {
      const hasChanges = Object.entries(value).some(([k, v]) => currentEntriesObj[k] !== v) ||
        Object.keys(value).length !== Object.keys(currentEntriesObj).length;

      if (!hasChanges && entries.length > 0) return;

      if (Object.keys(value).length > 0) {
        setEntries(
          Object.entries(value).map(([key, val]) => ({
            key,
            value: val,
            visible: false
          }))
        );
      } else if (entries.length === 0) {
        setEntries([{ key: '', value: '', visible: true }]);
      }
    } else if (entries.length === 0) {
      setEntries([{ key: '', value: '', visible: true }]);
    }
  }, [value]);

  const handleAdd = () => {
    setEntries([...entries, { key: '', value: '', visible: true }]);
  };

  const handleRemove = (index: number) => {
    const newEntries = entries.filter((_, i) => i !== index);
    setEntries(newEntries);
    updateParent(newEntries);
  };

  const handleKeyChange = (index: number, newKey: string) => {
    const newEntries = [...entries];
    newEntries[index].key = newKey;
    setEntries(newEntries);
    updateParent(newEntries);
  };

  const handleValueChange = (index: number, newValue: string) => {
    const newEntries = [...entries];
    newEntries[index].value = newValue;
    setEntries(newEntries);
    updateParent(newEntries);
  };

  const toggleVisibility = (index: number) => {
    const newEntries = [...entries];
    newEntries[index].visible = !newEntries[index].visible;
    setEntries(newEntries);
  };

  const updateParent = (newEntries: EnvEntry[]) => {
    const envObject = newEntries
      .filter(entry => entry.key.trim() !== '')
      .reduce((acc, entry) => {
        acc[entry.key] = entry.value;
        return acc;
      }, {} as Record<string, string>);
    onChange(envObject);
  };

  // Validation helpers
  const isValidKey = (key: string): boolean => {
    if (!key) return true; // Empty keys are handled separately
    return /^[A-Z_][A-Z0-9_]*$/.test(key);
  };

  const hasDuplicateKey = (key: string, index: number): boolean => {
    if (!key.trim()) return false;
    return entries.some((entry, i) =>
      i !== index && entry.key.trim() !== '' && entry.key === key
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Environment Variables</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="h-7"
          data-testid="add-env-var-button"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Variable
        </Button>
      </div>

      {entries.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
          No environment variables. Click "Add Variable" to add one.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => {
            const keyInvalid = entry.key.trim() !== '' && !isValidKey(entry.key);
            const keyDuplicate = hasDuplicateKey(entry.key, index);
            const hasError = keyInvalid || keyDuplicate;

            return (
              <div key={index} className="space-y-1">
                <div className="flex gap-2 items-start">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <Input
                        placeholder="KEY"
                        value={entry.key}
                        onChange={(e) => handleKeyChange(index, e.target.value.toUpperCase())}
                        className={cn(
                          "font-mono text-sm",
                          hasError && "border-destructive focus-visible:ring-destructive"
                        )}
                        data-testid={`env-key-input-${index}`}
                      />
                    </div>
                    <div className="relative">
                      <Input
                        type={entry.visible ? 'text' : 'password'}
                        placeholder="value"
                        value={entry.value}
                        onChange={(e) => handleValueChange(index, e.target.value)}
                        className="font-mono text-sm pr-8"
                        data-testid={`env-value-input-${index}`}
                      />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full w-8"
                              onClick={() => toggleVisibility(index)}
                              tabIndex={-1}
                            >
                              {entry.visible ? (
                                <EyeOff className="w-3 h-3" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{entry.visible ? "숨기기" : "표시"}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive hover:text-destructive"
                          onClick={() => handleRemove(index)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>삭제</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {hasError && (
                  <p className="text-xs text-destructive pl-1">
                    {keyDuplicate
                      ? 'Duplicate key'
                      : 'Key must start with A-Z or _ and contain only A-Z, 0-9, or _'
                    }
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
