import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Textarea } from './ui/textarea'
import { Button } from './ui/button'
import { toast } from 'sonner'
import { Spinner } from './ui/Spinner'
import { fetchConfig, saveConfig } from '../lib/api'
import { getErrorMessage } from '../lib/utils'

interface ConfigEditorModalProps {
    isOpen: boolean
    onClose: () => void
    configPath: string | null
    toolName: string
}

export function ConfigEditorModal({ isOpen, onClose, configPath, toolName }: ConfigEditorModalProps) {
    const [content, setContent] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    const loadConfig = useCallback(async () => {
        if (!configPath) return
        setIsLoading(true)
        try {
            const data = await fetchConfig(configPath)
            setContent(data.content)
        } catch (error) {
            toast.error(`설정 로드 실패: ${getErrorMessage(error)}`)
            onClose()
        } finally {
            setIsLoading(false)
        }
    }, [configPath, toast, getErrorMessage, fetchConfig, onClose, setIsLoading, setContent]) // Dependencies for useCallback

    useEffect(() => {
        if (isOpen && configPath) {
            loadConfig()
        } else {
            setContent('')
        }
    }, [isOpen, configPath, loadConfig]) // loadConfig is now a stable dependency

    const handleSave = async () => {
        if (!configPath) return
        setIsSaving(true)
        try {
            // JSON 유효성 검사 (확장자가 .json인 경우)
            if (configPath.endsWith('.json')) {
                try {
                    JSON.parse(content)
                } catch (e: unknown) {
                    const message = e instanceof Error ? e.message : 'Unknown error'
                    toast.error(`유효하지 않은 JSON 형식입니다: ${message}`)
                    setIsSaving(false)
                    return
                }
            }

            await saveConfig(configPath, content)
            toast.success('설정이 저장되었습니다.')
            onClose()
        } catch (error) {
            toast.error(`설정 저장 실패: ${getErrorMessage(error)}`)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{toolName} 설정 편집</DialogTitle>
                    <div className="text-xs text-gray-500 font-mono break-all">{configPath}</div>
                </DialogHeader>

                <div className="flex-1 min-h-[400px] relative mt-4">
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                            <Spinner size={32} />
                        </div>
                    ) : (
                        <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full h-full p-4 font-mono text-sm resize-none"
                            spellCheck={false}
                            data-testid="config-editor-textarea"
                        />
                    )}
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={onClose} disabled={isSaving} data-testid="config-editor-cancel">
                        취소
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || isLoading} data-testid="config-editor-save">
                        {isSaving ? '저장 중...' : '저장'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
