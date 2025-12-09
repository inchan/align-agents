import { ArrowRight, GitMerge, Sparkles } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTargetStore } from '@/store/targetStore'

export function SyncStrategySelector() {
    const { strategy, setStrategy } = useTargetStore()

    return (
        <Select value={strategy} onValueChange={setStrategy}>
            <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Select Strategy" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="overwrite">
                    <div className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <span>Overwrite</span>
                        <span className="text-xs text-muted-foreground ml-auto pl-2">전체 교체</span>
                    </div>
                </SelectItem>
                <SelectItem value="append">
                    <div className="flex items-center gap-2">
                        <GitMerge className="w-4 h-4 text-muted-foreground" />
                        <span>Append</span>
                        <span className="text-xs text-muted-foreground ml-auto pl-2">뒤에 추가</span>
                    </div>
                </SelectItem>
                <SelectItem value="merge">
                    <div className="flex items-center gap-2">
                        <GitMerge className="w-4 h-4 text-muted-foreground" />
                        <span>Merge</span>
                        <span className="text-xs text-muted-foreground ml-auto pl-2">병합</span>
                    </div>
                </SelectItem>
                <SelectItem value="smart-update">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-muted-foreground" />
                        <span>Smart Update</span>
                        <span className="text-xs text-muted-foreground ml-auto pl-2">AI 업데이트</span>
                    </div>
                </SelectItem>
            </SelectContent>
        </Select>
    )
}
