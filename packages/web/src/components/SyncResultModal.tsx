import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react'

interface SyncResult {
    toolId: string
    status: 'success' | 'error' | 'skipped'
    message?: string
    path?: string
}

interface SyncResultModalProps {
    isOpen: boolean
    onClose: () => void
    results: SyncResult[] | null
    title?: string
}

export function SyncResultModal({ isOpen, onClose, results, title = '동기화 결과' }: SyncResultModalProps) {
    if (!isOpen) return null

    const successCount = results?.filter(r => r.status === 'success').length || 0
    const errorCount = results?.filter(r => r.status === 'error').length || 0
    const skippedCount = results?.filter(r => r.status === 'skipped').length || 0

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    {!results || results.length === 0 ? (
                        <div className="py-8 text-center text-gray-500">
                            동기화 결과가 없습니다.
                        </div>
                    ) : (
                        <>
                            {/* Summary */}
                            <div className="flex gap-4 mb-4 text-sm">
                                <div className="flex items-center gap-1 text-primary">
                                    <CheckCircle2 size={16} />
                                    <span>성공: {successCount}</span>
                                </div>
                                {errorCount > 0 && (
                                    <div className="flex items-center gap-1 text-destructive">
                                        <XCircle size={16} />
                                        <span>실패: {errorCount}</span>
                                    </div>
                                )}
                                {skippedCount > 0 && (
                                    <div className="flex items-center gap-1 text-gray-500">
                                        <AlertTriangle size={16} />
                                        <span>건너뜀: {skippedCount}</span>
                                    </div>
                                )}
                            </div>

                            {/* Results List */}
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                {results.map((result, index) => (
                                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-md border text-sm">
                                        <div className="mt-0.5">
                                            {result.status === 'success' && <CheckCircle2 size={16} className="text-primary" />}
                                            {result.status === 'error' && <XCircle size={16} className="text-destructive" />}
                                            {result.status === 'skipped' && <AlertTriangle size={16} className="text-gray-400" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">{result.toolId}</div>
                                            {result.message && (
                                                <div className="text-gray-500 text-xs mt-1 break-all">
                                                    {result.message}
                                                </div>
                                            )}
                                            {result.path && (
                                                <div className="text-gray-400 text-xs mt-0.5 font-mono truncate">
                                                    {result.path}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end p-4 border-t">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    )
}
