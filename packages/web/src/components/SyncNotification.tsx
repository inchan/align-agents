import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { X, CheckCircle2, XCircle } from 'lucide-react'
import type { SyncResultItem } from '../lib/api'


interface SyncNotificationProps {
    results: SyncResultItem[]
    syncId: string
    onClose: () => void
}

export function SyncNotification({ results, syncId, onClose }: SyncNotificationProps) {
    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length
    const skippedCount = results.filter(r => r.status === 'skipped').length

    const hasErrors = errorCount > 0

    return createPortal(
        <div className="fixed top-4 right-4 z-[9999] animate-slide-in-right pointer-events-auto isolate">
            <div className="bg-card rounded-lg shadow-2xl border p-4 hover:shadow-xl hover:scale-105 transition-all max-w-md group relative">
                <Link
                    to={`/sync/${syncId}`}
                    className="absolute inset-0 z-0"
                    onClick={onClose}
                    aria-label="View sync details"
                />
                <div className="flex items-start gap-3 relative z-10 pointer-events-none">
                    <div className="flex-shrink-0 mt-0.5">
                        {hasErrors ? (
                            <XCircle className="w-5 h-5 text-destructive" />
                        ) : (
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm">
                            {hasErrors ? '동기화 완료 (일부 실패)' : '동기화 완료'}
                        </h3>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-primary" />
                                {successCount}
                            </span>
                            {errorCount > 0 && (
                                <span className="flex items-center gap-1">
                                    <XCircle className="w-3 h-3 text-destructive" />
                                    {errorCount}
                                </span>
                            )}
                            {skippedCount > 0 && (
                                <span className="text-muted-foreground">
                                    건너김 {skippedCount}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-foreground mt-2 group-hover:underline font-medium">
                            클릭하여 자세히 보기 →
                        </p>
                    </div>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onClose()
                    }}
                    className="absolute top-4 right-4 p-1 hover:bg-muted rounded-md transition-colors z-20 pointer-events-auto"
                    aria-label="Close notification"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>,
        document.body
    )
}
