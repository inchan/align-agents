
import { Button } from '../ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ArrowDownAZ, Calendar, Clock, GripVertical, ListFilter } from 'lucide-react';
import { cn } from '../../lib/utils';

export type SortMode = 'a-z' | 'created' | 'updated' | 'custom';

interface SortMenuProps {
    currentSort: SortMode;
    onSortChange: (mode: SortMode) => void;
    className?: string;
}

export function SortMenu({ currentSort, onSortChange, className }: SortMenuProps) {

    const labelMap = {
        'a-z': 'A-Z',
        'created': '생성일',
        'updated': '수정일',
        'custom': 'Custom',
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={cn("h-8 w-8", className)}>
                    <ListFilter className="w-4 h-4" />
                    <span className="sr-only">정렬: {labelMap[currentSort]}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onSortChange('created')} className={cn(currentSort === 'created' && "bg-accent")}>
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>생성일</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSortChange('updated')} className={cn(currentSort === 'updated' && "bg-accent")}>
                    <Clock className="w-4 h-4 mr-2" />
                    <span>수정일</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSortChange('a-z')} className={cn(currentSort === 'a-z' && "bg-accent")}>
                    <ArrowDownAZ className="w-4 h-4 mr-2" />
                    <span>A-Z</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSortChange('custom')} className={cn(currentSort === 'custom' && "bg-accent")}>
                    <GripVertical className="w-4 h-4 mr-2" />
                    <span>Custom</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
