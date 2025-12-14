import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type ToolConfig } from '@/lib/api';
import { CheckCircle, XCircle, Settings, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/Skeleton';

interface ToolStatusGridProps {
    tools: ToolConfig[];
    isLoading: boolean;
}

export function ToolStatusGrid({ tools, isLoading }: ToolStatusGridProps) {
    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-[100px]" />
                            <Skeleton className="h-4 w-4 rounded-full" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-8 w-full mt-4" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (tools.length === 0) {
        return (
            <div className="tool-grid min-h-[100px] flex items-center justify-center border rounded-lg bg-muted/20">
                <div className="text-center text-muted-foreground">
                    <p>No tools configured</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-grid grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
                <Card key={tool.id} className="tool-card hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{tool.name}</CardTitle>
                        {tool.exists ? (
                            <CheckCircle className="h-4 w-4 text-primary" />
                        ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs text-muted-foreground mb-4 truncate" title={tool.configPath}>
                            {tool.configPath}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="w-full" asChild>
                                <a href="#/tools">
                                    <Settings className="mr-2 h-3 w-3" />
                                    Manage
                                </a>
                            </Button>
                            {tool.id === 'claude-desktop' && tool.exists && (
                                <Button variant="secondary" size="sm" className="w-full" asChild>
                                    <a href="#/mcp">
                                        <ExternalLink className="mr-2 h-3 w-3" />
                                        MCP
                                    </a>
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
