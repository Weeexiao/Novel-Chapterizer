import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Merge, ArrowDown, ArrowUp, Trash2, Save } from 'lucide-react';

interface Chapter {
  title: string;
  content: string;
  wordCount: number;
  lineCount: number;
}

interface ChapterMergerProps {
  chapters: Chapter[];
  onMerge: (mergedChapters: Chapter[]) => void;
  onCancel: () => void;
}

export function ChapterMerger({ chapters, onMerge, onCancel }: ChapterMergerProps) {
  const [selectedChapters, setSelectedChapters] = useState<Set<number>>(new Set());
  const [mergedTitle, setMergedTitle] = useState<string>('');
  const [mergeMode, setMergeMode] = useState<'sequential' | 'custom'>('sequential');

  const handleChapterToggle = (index: number) => {
    const newSelected = new Set(selectedChapters);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedChapters(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedChapters.size === chapters.length) {
      setSelectedChapters(new Set());
    } else {
      setSelectedChapters(new Set(chapters.map((_, index) => index)));
    }
  };

  const handleMerge = () => {
    if (selectedChapters.size < 2) {
      return;
    }

    const selectedIndices = Array.from(selectedChapters).sort((a, b) => a - b);
    const selectedChapterData = selectedIndices.map(index => chapters[index]);
    
    const mergedContent = selectedChapterData.map(chapter => 
      `# ${chapter.title}\n\n${chapter.content}`
    ).join('\n\n---\n\n');

    const totalWords = selectedChapterData.reduce((sum, chapter) => sum + chapter.wordCount, 0);
    const totalLines = selectedChapterData.reduce((sum, chapter) => sum + chapter.lineCount, 0);

    const mergedChapter: Chapter = {
      title: mergedTitle || `合并章节 (${selectedIndices.length}个章节)`,
      content: mergedContent,
      wordCount: totalWords,
      lineCount: totalLines
    };

    // 创建新的章节列表，用合并的章节替换选中的章节
    const newChapters = [...chapters];
    const firstIndex = Math.min(...selectedIndices);
    newChapters.splice(firstIndex, selectedIndices.length, mergedChapter);

    onMerge(newChapters);
  };

  const selectedCount = selectedChapters.size;
  const totalWords = Array.from(selectedChapters).reduce((sum, index) => sum + chapters[index].wordCount, 0);

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Merge className="h-5 w-5" />
          章节合并
        </CardTitle>
        <CardDescription>
          选择要合并的章节，可以按顺序合并或自定义合并
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 合并模式选择 */}
        <div className="flex gap-4">
          <Button
            variant={mergeMode === 'sequential' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMergeMode('sequential')}
          >
            顺序合并
          </Button>
          <Button
            variant={mergeMode === 'custom' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMergeMode('custom')}
          >
            自定义合并
          </Button>
        </div>

        {/* 合并标题输入 */}
        <div className="space-y-2">
          <Label htmlFor="mergedTitle">合并后章节标题</Label>
          <Input
            id="mergedTitle"
            value={mergedTitle}
            onChange={(e) => setMergedTitle(e.target.value)}
            placeholder="输入合并后的章节标题"
          />
        </div>

        {/* 选择控制 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {selectedChapters.size === chapters.length ? '取消全选' : '全选'}
            </Button>
            <Badge variant="outline">
              已选择 {selectedCount} 个章节
            </Badge>
            {selectedCount > 0 && (
              <Badge variant="secondary">
                总字数: {totalWords.toLocaleString()}
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* 章节列表 */}
        <div className="max-h-96 overflow-y-auto space-y-2">
          {chapters.map((chapter, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                selectedChapters.has(index)
                  ? 'bg-primary/5 border-primary/20'
                  : 'bg-background hover:bg-muted/50'
              }`}
            >
              <Checkbox
                checked={selectedChapters.has(index)}
                onCheckedChange={() => handleChapterToggle(index)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium truncate">{chapter.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {chapter.wordCount} 字
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {chapter.lineCount} 行
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {chapter.content.substring(0, 100)}...
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button
            onClick={handleMerge}
            disabled={selectedChapters.size < 2}
            className="flex items-center gap-2"
          >
            <Merge className="h-4 w-4" />
            合并章节
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 