import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Palette, Save, Eye, Copy, Trash2 } from 'lucide-react';

interface StyleTemplate {
  id: string;
  name: string;
  description: string;
  css: string;
  type: 'epub' | 'markdown' | 'html';
}

interface StyleTemplateProps {
  templates: StyleTemplate[];
  onSave: (template: StyleTemplate) => void;
  onDelete: (id: string) => void;
  onApply: (template: StyleTemplate) => void;
}

export function StyleTemplate({ templates, onSave, onDelete, onApply }: StyleTemplateProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<StyleTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    css: '',
    type: 'epub' as 'epub' | 'markdown' | 'html'
  });

  const handleSave = () => {
    const template: StyleTemplate = {
      id: editingTemplate?.id || Date.now().toString(),
      ...formData
    };
    onSave(template);
    setShowEditor(false);
    setEditingTemplate(null);
    setFormData({ name: '', description: '', css: '', type: 'epub' });
  };

  const handleEdit = (template: StyleTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      css: template.css,
      type: template.type
    });
    setShowEditor(true);
  };

  const handleNew = () => {
    setEditingTemplate(null);
    setFormData({ name: '', description: '', css: '', type: 'epub' as 'epub' | 'markdown' | 'html' });
    setShowEditor(true);
  };

  const presetTemplates = [
    {
      id: 'default-epub',
      name: '默认EPUB样式',
      description: '简洁的EPUB电子书样式',
      css: `body {
  font-family: "Microsoft YaHei", "SimSun", serif;
  line-height: 1.6;
  margin: 2em;
}

h1, h2, h3 {
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.5em;
}

p {
  text-indent: 2em;
  margin-bottom: 1em;
}`,
      type: 'epub' as const
    },
    {
      id: 'elegant-markdown',
      name: '优雅Markdown样式',
      description: '适合阅读的Markdown样式',
      css: `# 章节标题样式
h1 {
  color: #2c3e50;
  font-size: 2em;
  text-align: center;
  margin: 2em 0 1em 0;
  border-bottom: 3px solid #3498db;
  padding-bottom: 0.5em;
}

# 正文样式
p {
  font-size: 1.1em;
  line-height: 1.8;
  text-indent: 2em;
  margin-bottom: 1em;
  color: #34495e;
}

# 段落间距
p + p {
  margin-top: 1.5em;
}`,
      type: 'markdown' as const
    }
  ];

  return (
    <div className="space-y-6">
      {/* 模板列表 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Palette className="h-5 w-5" />
            样式模板
          </h3>
          <Button onClick={handleNew} size="sm">
            <Save className="mr-2 h-4 w-4" />
            新建模板
          </Button>
        </div>

        {/* 预设模板 */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">预设模板</h4>
          {presetTemplates.map((template) => (
            <Card key={template.id} className="group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onApply(template)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    {template.type.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Separator />

        {/* 自定义模板 */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">自定义模板</h4>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无自定义模板</p>
              <p className="text-sm">点击"新建模板"创建您的第一个样式模板</p>
            </div>
          ) : (
            templates.map((template) => (
              <Card key={template.id} className="group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onApply(template)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(template)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(template.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      {template.type.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* 编辑器模态框 */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{editingTemplate ? '编辑模板' : '新建模板'}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEditor(false)}
                >
                  ✕
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto max-h-96">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="templateName">模板名称</Label>
                  <Input
                    id="templateName"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="输入模板名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="templateType">模板类型</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: 'epub' | 'markdown' | 'html') => 
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger id="templateType">
                      <SelectValue placeholder="选择模板类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="epub">EPUB</SelectItem>
                      <SelectItem value="markdown">Markdown</SelectItem>
                      <SelectItem value="html">HTML</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="templateDescription">模板描述</Label>
                <Input
                  id="templateDescription"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="输入模板描述"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="templateCSS">CSS样式代码</Label>
                <Textarea
                  id="templateCSS"
                  value={formData.css}
                  onChange={(e) => setFormData({ ...formData, css: e.target.value })}
                  placeholder="输入CSS样式代码"
                  className="min-h-64 font-mono text-sm"
                />
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 border-t">
              <Button variant="outline" onClick={() => setShowEditor(false)}>
                取消
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                保存模板
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
} 