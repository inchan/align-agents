import { useParams, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, ArrowLeft, Clock } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import type { SyncResultItem } from '../lib/api'

export function SyncDetailPage() {
    const { syncId } = useParams<{ syncId: string }>()
    const navigate = useNavigate()
    const syncDetail = useMemo(() => {
        if (!syncId) return null;
        const stored = sessionStorage.getItem(`sync-${syncId}`)
        if (stored) {
            try {
                return JSON.parse(stored) as SyncResultItem[]
            } catch (e) {
                console.error("Failed to parse sync details", e)
            }
        }
        return null
    }, [syncId])

    if (!syncDetail) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <p className="text-muted-foreground">동기화 결과를 찾을 수 없습니다.</p>
                    <Button onClick={() => navigate('/rules')} className="mt-4">
                        Rules 페이지로 돌아가기
                    </Button>
                </div>
            </div>
        )
    }

    const successCount = syncDetail.filter(r => r.status === 'success').length
    const errorCount = syncDetail.filter(r => r.status === 'error').length
    const skippedCount = syncDetail.filter(r => r.status === 'skipped').length

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">동기화 결과</h1>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {new Date().toLocaleString('ko-KR')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">성공</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                            <span className="text-2xl font-bold">{successCount}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">실패</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-destructive" />
                            <span className="text-2xl font-bold">{errorCount}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">건너뜀</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-muted-foreground" />
                            <span className="text-2xl font-bold">{skippedCount}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Results */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">도구별 상세 결과</h2>
                {syncDetail.map((result, index) => (
                    <Card key={index} className={result.status === 'error' ? 'border-destructive/50' : ''}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {result.status === 'success' && <CheckCircle2 className="w-5 h-5 text-primary" />}
                                    {result.status === 'error' && <XCircle className="w-5 h-5 text-destructive" />}
                                    {result.status === 'skipped' && <AlertTriangle className="w-5 h-5 text-muted-foreground" />}
                                    <CardTitle className="text-base">{result.name || result.toolId}</CardTitle>
                                </div>
                                <Badge variant={result.status === 'success' ? 'default' : result.status === 'error' ? 'destructive' : 'secondary'}>
                                    {result.status === 'success' ? '성공' : result.status === 'error' ? '실패' : '건너뜀'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {result.ruleName && (
                                <div>
                                    <span className="text-sm font-medium text-muted-foreground">적용된 룰</span>
                                    <p className="mt-1 text-sm font-medium">{result.ruleName}</p>
                                </div>
                            )}

                            {result.strategy && (
                                <div>
                                    <span className="text-sm font-medium text-muted-foreground">동기화 전략</span>
                                    <Badge variant="outline" className="mt-1 ml-2">
                                        {result.strategy === 'overwrite' ? '덮어쓰기' :
                                            result.strategy === 'append' ? '추가' :
                                                result.strategy === 'merge' ? '병합' : result.strategy}
                                    </Badge>
                                </div>
                            )}

                            {result.path && (
                                <div>
                                    <span className="text-sm font-medium text-muted-foreground">CLI 설정 파일 경로</span>
                                    <code className="block mt-1 p-2 bg-muted rounded text-xs font-mono break-all">
                                        {result.path}
                                    </code>
                                </div>
                            )}

                            {result.message && (
                                <div>
                                    <span className="text-sm font-medium text-muted-foreground">상태 메시지</span>
                                    <p className="mt-1 text-sm">{result.message}</p>
                                </div>
                            )}

                            {result.servers && result.servers.length > 0 && (
                                <div>
                                    <span className="text-sm font-medium text-muted-foreground">동기화된 MCP 서버</span>
                                    <ul className="mt-1 ml-6 list-disc text-sm space-y-1">
                                        {result.servers.map((server: string, idx: number) => (
                                            <li key={idx} className="font-mono text-xs">{server}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {result.ruleContent && (
                                <div>
                                    <span className="text-sm font-medium text-muted-foreground">룰 내용 미리보기</span>
                                    <pre className="mt-1 p-3 bg-muted rounded text-xs font-mono max-h-40 overflow-y-auto">
                                        {result.ruleContent.substring(0, 300)}{result.ruleContent.length > 300 ? '...' : ''}
                                    </pre>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
