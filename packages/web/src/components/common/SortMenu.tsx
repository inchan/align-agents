
import { Button } from '../ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ArrowDownAZ, Calendar, Clock, ListFilter, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export type SortType = 'a-z' | 'created' | 'updated';
export type SortDirection = 'asc' | 'desc';

export interface SortMode {
    type: SortType;
    direction: SortDirection;
}

interface SortMenuProps {
    currentSort: SortMode;
    onSortChange: (mode: SortMode) => void;
    className?: string;
}

export function SortMenu({ currentSort, onSortChange, className }: SortMenuProps) {

    const labelMap: Record<SortType, string> = {
        'a-z': 'A-Z',
        'created': '생성일',
        'updated': '수정일',
    };

    const handleSortClick = (type: SortType) => {
        if (currentSort.type === type) {
            // Toggle direction
            onSortChange({
                type,
                direction: currentSort.direction === 'asc' ? 'desc' : 'asc'
            });
        } else {
            // New type, default to desc
            onSortChange({ type, direction: 'desc' });
        }
    };

    const DirectionIcon = ({ type }: { type: SortType }) => {
        if (currentSort.type !== type) return null;
        return currentSort.direction === 'asc'
            ? <ArrowUp className="w-3 h-3 ml-auto" />
            : <ArrowDown className="w-3 h-3 ml-auto" />;
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={cn("h-8 w-8", className)}>
                    <ListFilter className="w-4 h-4" />
                    <span className="sr-only">정렬: {labelMap[currentSort.type]}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onClick={() => handleSortClick('created')}
                    className={cn(currentSort.type === 'created' && "bg-accent")}
                >
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>생성일</span>
                    <DirectionIcon type="created" />
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleSortClick('updated')}
                    className={cn(currentSort.type === 'updated' && "bg-accent")}
                >
                    <Clock className="w-4 h-4 mr-2" />
                    <span>수정일</span>
                    <DirectionIcon type="updated" />
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleSortClick('a-z')}
                    className={cn(currentSort.type === 'a-z' && "bg-accent")}
                >
                    <ArrowDownAZ className="w-4 h-4 mr-2" />
                    <span>A-Z</span>
                    <DirectionIcon type="a-z" />
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
