import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Eye, Trash2, Calendar, Clock } from 'lucide-react';

interface HistoryItemProps {
  fileName: string;
  chapterCount: number;
  totalWords: number;
  timestamp: Date;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

export function HistoryItem({
  fileName,
  chapterCount,
  totalWords,
  timestamp,
  onView,
  onDownload,
  onDelete
}: HistoryItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Card 
      className={`transition-all duration-200 ${isHovered ? 'shadow-md' : 'shadow-sm'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base truncate max-w-48">{fileName}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
        <CardDescription className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(timestamp)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              {chapterCount} 章节
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {totalWords.toLocaleString()} 字
            </Badge>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onView}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 