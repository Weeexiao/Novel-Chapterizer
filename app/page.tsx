"use client";

import { useState, useRef, ChangeEvent, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ChapterMerger } from '@/components/ui/chapter-merger';
import { StyleTemplate } from '@/components/ui/style-template';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Upload, FileText, Download, BookOpen, Settings, Eye, EyeOff, Save, Loader2, History, Palette, Merge, Trash2 } from 'lucide-react';
import JSZip from 'jszip';

interface Chapter {
  title: string;
  content: string;
  wordCount: number;
  lineCount: number;
}

interface Settings {
  encoding: string;
  ruleType: string;
  customRule: string;
  autoSave: boolean;
  showWordCount: boolean;
  showLineCount: boolean;
  defaultOutputFormat: 'md' | 'txt' | 'epub';
}

export default function Home() {
  const [novelFile, setNovelFile] = useState<File | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [previewChapter, setPreviewChapter] = useState<Chapter | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [settings, setSettings] = useState<Settings>({
    encoding: "utf-8",
    ruleType: "default",
    customRule: "",
    autoSave: true,
    showWordCount: true,
    showLineCount: true,
    defaultOutputFormat: 'md'
  });
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchResults, setBatchResults] = useState<{fileName: string, chapters: Chapter[]}[]>([]);
  const [processingHistory, setProcessingHistory] = useState<{
    id: string;
    fileName: string;
    chapters: Chapter[];
    timestamp: Date;
  }[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showMerger, setShowMerger] = useState<boolean>(false);
  const [styleTemplates, setStyleTemplates] = useState<{
    id: string;
    name: string;
    description: string;
    css: string;
    type: 'epub' | 'markdown' | 'html';
  }[]>([]);
  const [showStyleTemplates, setShowStyleTemplates] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // 保存设置到本地存储
  useEffect(() => {
    if (settings.autoSave) {
      localStorage.setItem('novel-chapterizer-settings', JSON.stringify(settings));
    }
  }, [settings]);

  // 加载设置
  useEffect(() => {
    const savedSettings = localStorage.getItem('novel-chapterizer-settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }, []);

  // 处理文件拖拽
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const txtFiles = files.filter(file => file.name.endsWith('.txt'));
    
    if (txtFiles.length > 0) {
      if (txtFiles.length === 1) {
        setNovelFile(txtFiles[0]);
        toast({
          title: "文件已选择",
          description: `已选择文件: ${txtFiles[0].name}`,
        });
      } else {
        setBatchFiles(txtFiles);
        toast({
          title: "批量文件已选择",
          description: `已选择 ${txtFiles.length} 个文件进行批量处理`,
        });
      }
    } else {
      toast({
        title: "文件格式错误",
        description: "请选择TXT格式的文件",
        variant: "destructive",
      });
    }
  }, [toast]);

  // 处理文件选择
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      if (files.length === 1) {
        setNovelFile(files[0]);
        toast({
          title: "文件已选择",
          description: `已选择文件: ${files[0].name}`,
        });
      } else {
        setBatchFiles(files);
        toast({
          title: "批量文件已选择",
          description: `已选择 ${files.length} 个文件进行批量处理`,
        });
      }
    }
  };

  // 处理编码选择
  const handleEncodingChange = (value: string) => {
    setSettings(prev => ({ ...prev, encoding: value }));
  };

  // 处理规则类型选择
  const handleRuleTypeChange = (value: string) => {
    setSettings(prev => ({ ...prev, ruleType: value }));
  };

  // 处理自定义规则输入
  const handleCustomRuleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({ ...prev, customRule: e.target.value }));
  };

  // 处理设置变更
  const handleSettingChange = (key: keyof Settings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // 计算字数
  const calculateWordCount = (text: string): number => {
    return text.replace(/\s+/g, '').length;
  };

  // 计算行数
  const calculateLineCount = (text: string): number => {
    return text.split('\n').length;
  };

  // 处理章节分割
  const handleProcessNovel = async () => {
    if (!novelFile) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    
    try {
      // 读取文件内容
      const fileContent = await readFile(novelFile, settings.encoding);
      
      // 根据选择的规则分割章节
      const chapterRegex = getChapterRegex();
      const splitChapters = splitNovelIntoChapters(fileContent, chapterRegex);
      
      // 计算统计信息
      const chaptersWithStats = splitChapters.map(chapter => ({
        ...chapter,
        wordCount: calculateWordCount(chapter.content),
        lineCount: calculateLineCount(chapter.content)
      }));
      
      setChapters(chaptersWithStats);
      setShowResults(true);
      
      // 保存到历史记录
      saveToHistory(novelFile.name, chaptersWithStats);
      
      toast({
        title: "处理成功",
        description: `已成功分割 ${chaptersWithStats.length} 个章节`,
      });
    } catch (error) {
      console.error("处理小说文件时出错:", error);
      toast({
        title: "处理失败",
        description: "处理小说文件时出错，请检查文件格式和编码设置。",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  // 批量处理文件
  const handleBatchProcess = async () => {
    if (batchFiles.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    const results: {fileName: string, chapters: Chapter[]}[] = [];

    try {
      for (let i = 0; i < batchFiles.length; i++) {
        const file = batchFiles[i];
        setProcessingProgress((i / batchFiles.length) * 100);
        
        const fileContent = await readFile(file, settings.encoding);
        const chapterRegex = getChapterRegex();
        const splitChapters = splitNovelIntoChapters(fileContent, chapterRegex);
        
        const chaptersWithStats = splitChapters.map(chapter => ({
          ...chapter,
          wordCount: calculateWordCount(chapter.content),
          lineCount: calculateLineCount(chapter.content)
        }));
        
        results.push({
          fileName: file.name,
          chapters: chaptersWithStats
        });
      }
      
      setBatchResults(results);
      toast({
        title: "批量处理成功",
        description: `已处理 ${batchFiles.length} 个文件`,
      });
    } catch (error) {
      toast({
        title: "批量处理失败",
        description: "处理文件时出错",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  // 获取章节正则表达式
  const getChapterRegex = (): RegExp => {
    switch (settings.ruleType) {
      case "default":
        return /^(第[一二三四五六七八九十\d]+章)(?:\s+)(.*)$/m;
      case "numberOnly":
        return /^(第\d+章)$/m;
      case "chineseOnly":
        return /^(第[一二三四五六七八九十百千万]+章)$/m;
      case "custom":
        try {
          return new RegExp(settings.customRule, "m");
        } catch (e) {
          toast({
            title: "正则表达式错误",
            description: "自定义正则表达式格式错误，请检查。",
            variant: "destructive",
          });
          return /^(第[一二三四五六七八九十\d]+章)(?:\s+)(.*)$/m;
        }
      default:
        return /^(第[一二三四五六七八九十\d]+章)(?:\s+)(.*)$/m;
    }
  };

  // 读取文件内容
  const readFile = (file: File, encoding: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if (e.target && typeof e.target.result === 'string') {
          resolve(e.target.result);
        } else {
          reject(new Error("读取文件失败"));
        }
      };
      
      reader.onerror = () => {
        reject(new Error("读取文件时发生错误"));
      };
      
      reader.readAsText(file, encoding);
    });
  };

  // 分割小说为章节
  const splitNovelIntoChapters = (content: string, chapterRegex: RegExp): Chapter[] => {
    const lines = content.split('\n');
    const chapters: Chapter[] = [];
    let currentChapter: Chapter | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(chapterRegex);
      
      if (match) {
        if (currentChapter) {
          chapters.push(currentChapter);
        }
        
        const chapterTitle = match[2] ? `${match[1]} ${match[2]}` : match[1];
        currentChapter = { 
          title: chapterTitle, 
          content: line + '\n',
          wordCount: 0,
          lineCount: 0
        };
      } else if (currentChapter) {
        currentChapter.content += line + '\n';
      } else if (i === 0) {
        currentChapter = { 
          title: "开始部分", 
          content: line + '\n',
          wordCount: 0,
          lineCount: 0
        };
      }
    }
    
    if (currentChapter) {
      chapters.push(currentChapter);
    }
    
    return chapters;
  };

  // 预览章节
  const handlePreviewChapter = (chapter: Chapter) => {
    setPreviewChapter(chapter);
    setShowPreview(true);
  };

  // 下载单个章节
  const downloadChapter = (chapter: Chapter, format: 'md' | 'txt' = 'md') => {
    const extension = format === 'md' ? '.md' : '.txt';
    const mimeType = format === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';
    
    const blob = new Blob([chapter.content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chapter.title.replace(/[\\/:*?"<>|]/g, '_')}${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "下载成功",
      description: `已下载章节: ${chapter.title}`,
    });
  };

  // 批量下载所有章节
  const downloadAllChapters = async (format: 'md' | 'txt' | 'zip' = 'zip') => {
    try {
      if (format === 'zip') {
        const zip = new JSZip();
        
        chapters.forEach((chapter) => {
          const fileName = `${chapter.title.replace(/[\\/:*?"<>|]/g, '_')}.md`;
          zip.file(fileName, chapter.content);
        });
        
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = '小说章节.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // 下载单个文件
        const allContent = chapters.map(chapter => 
          `# ${chapter.title}\n\n${chapter.content}`
        ).join('\n\n---\n\n');
        
        const extension = format === 'md' ? '.md' : '.txt';
        const mimeType = format === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';
        
        const blob = new Blob([allContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `完整小说${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      toast({
        title: "下载成功",
        description: `已下载所有章节`,
      });
    } catch (error) {
      toast({
        title: "下载失败",
        description: "打包章节时出错",
        variant: "destructive",
      });
    }
  };

  // 生成EPUB电子书
  const generateEpub = async () => {
    if (!novelFile || chapters.length === 0) return;
    
    try {
      const zip = new JSZip();
      
      zip.file('mimetype', 'application/epub+zip');
      
      const metaInf = zip.folder('META-INF');
      metaInf?.file('container.xml', `<?xml version="1.0" encoding="UTF-8"?>
      <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
        <rootfiles>
          <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
        </rootfiles>
      </container>`);
      
      const oebps = zip.folder('OEBPS');
      
      chapters.forEach((chapter, index) => {
        oebps?.file(`chapter_${index + 1}.xhtml`, `<?xml version="1.0" encoding="UTF-8"?>
        <html xmlns="http://www.w3.org/1999/xhtml">
          <head>
            <title>${chapter.title}</title>
          </head>
          <body>
            <h2>${chapter.title}</h2>
            <div>${chapter.content.replace(/\n/g, '<br/>')}</div>
          </body>
        </html>`);
      });
      
      oebps?.file('toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>
      <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
        <head>
          <meta name="dtb:uid" content="urn:uuid:${generateUUID()}"/>
          <meta name="dtb:depth" content="1"/>
          <meta name="dtb:totalPageCount" content="0"/>
          <meta name="dtb:maxPageNumber" content="0"/>
        </head>
        <docTitle>
          <text>${novelFile.name.replace(/\.txt$/, '')}</text>
        </docTitle>
        <navMap>
          ${chapters.map((chapter, index) => `
            <navPoint id="navpoint-${index + 1}" playOrder="${index + 1}">
              <navLabel>
                <text>${chapter.title}</text>
              </navLabel>
              <content src="chapter_${index + 1}.xhtml"/>
            </navPoint>
          `).join('')}
        </navMap>
      </ncx>`);
      
      oebps?.file('content.opf', `<?xml version="1.0" encoding="UTF-8"?>
      <package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0">
        <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
          <dc:title>${novelFile.name.replace(/\.txt$/, '')}</dc:title>
          <dc:language>zh-CN</dc:language>
          <dc:identifier id="BookID">urn:uuid:${generateUUID()}</dc:identifier>
          <dc:creator>小说章节分割工具生成</dc:creator>
        </metadata>
        <manifest>
          <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
          ${chapters.map((_, index) => `
            <item id="chapter_${index + 1}" href="chapter_${index + 1}.xhtml" media-type="application/xhtml+xml"/>
          `).join('')}
        </manifest>
        <spine toc="ncx">
          ${chapters.map((_, index) => `
            <itemref idref="chapter_${index + 1}"/>
          `).join('')}
        </spine>
      </package>`);
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${novelFile.name.replace(/\.txt$/, '')}.epub`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "EPUB生成成功",
        description: `已生成电子书: ${novelFile.name.replace(/\.txt$/, '')}.epub`,
      });
    } catch (error) {
      toast({
        title: "EPUB生成失败",
        description: "生成电子书时出错",
        variant: "destructive",
      });
    }
  };

  // 生成UUID
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // 重置所有数据
  const handleReset = () => {
    setNovelFile(null);
    setChapters([]);
    setShowResults(false);
    setPreviewChapter(null);
    setShowPreview(false);
    setBatchFiles([]);
    setBatchResults([]);
    setShowHistory(false);
    setShowMerger(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 保存到历史记录
  const saveToHistory = (fileName: string, chapters: Chapter[]) => {
    const historyItem = {
      id: Date.now().toString(),
      fileName,
      chapters,
      timestamp: new Date()
    };
    setProcessingHistory(prev => [historyItem, ...prev.slice(0, 9)]); // 保留最近10条记录
  };

  // 从历史记录加载
  const loadFromHistory = (historyItem: typeof processingHistory[0]) => {
    setChapters(historyItem.chapters);
    setShowResults(true);
    setShowHistory(false);
    toast({
      title: "已加载历史记录",
      description: `已加载 ${historyItem.fileName} 的处理结果`,
    });
  };

  // 删除历史记录
  const deleteHistoryItem = (id: string) => {
    setProcessingHistory(prev => prev.filter(item => item.id !== id));
    toast({
      title: "已删除",
      description: "历史记录已删除",
    });
  };

  // 章节合并
  const handleChapterMerge = (mergedChapters: Chapter[]) => {
    setChapters(mergedChapters);
    setShowMerger(false);
    toast({
      title: "章节合并成功",
      description: `已合并章节，现在共有 ${mergedChapters.length} 个章节`,
    });
  };

  // 保存样式模板
  const handleSaveStyleTemplate = (template: {
    id: string;
    name: string;
    description: string;
    css: string;
    type: 'epub' | 'markdown' | 'html';
  }) => {
    setStyleTemplates(prev => {
      const existingIndex = prev.findIndex(t => t.id === template.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = template;
        return updated;
      }
      return [...prev, template];
    });
    toast({
      title: "样式模板已保存",
      description: `模板 "${template.name}" 已保存`,
    });
  };

  // 删除样式模板
  const handleDeleteStyleTemplate = (id: string) => {
    setStyleTemplates(prev => prev.filter(t => t.id !== id));
    toast({
      title: "样式模板已删除",
      description: "样式模板已从列表中删除",
    });
  };

  // 应用样式模板
  const handleApplyStyleTemplate = (template: {
    id: string;
    name: string;
    description: string;
    css: string;
    type: 'epub' | 'markdown' | 'html';
  }) => {
    // 这里可以根据模板类型应用不同的样式
    toast({
      title: "样式模板已应用",
      description: `已应用模板 "${template.name}"`,
    });
  };

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="container max-w-6xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center relative">
            <div className="absolute top-4 right-4">
              <ThemeToggle />
            </div>
            <CardTitle className="text-3xl flex items-center justify-center gap-2">
              <BookOpen className="h-8 w-8" />
              小说章节分割工具
            </CardTitle>
            <CardDescription>将TXT小说按章节分割成多种格式，并支持生成EPUB电子书</CardDescription>
          </CardHeader>
          
          <Tabs defaultValue="single" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="single">单文件处理</TabsTrigger>
              <TabsTrigger value="batch">批量处理</TabsTrigger>
              <TabsTrigger value="history">历史记录</TabsTrigger>
              <TabsTrigger value="merger">章节合并</TabsTrigger>
              <TabsTrigger value="templates">样式模板</TabsTrigger>
              <TabsTrigger value="settings">设置</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-6">
              <CardContent className="space-y-6">
                {/* 文件上传区域 */}
                <div className="space-y-2">
                  <Label>选择TXT小说文件</Label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">
                      拖拽文件到此处，或点击选择文件
                    </p>
                    <Input 
                      type="file" 
                      ref={fileInputRef}
                      accept=".txt" 
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                    >
                      选择文件
                    </Button>
                  </div>
                  {novelFile && (
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">{novelFile.name}</span>
                      <Badge variant="secondary">{novelFile.size} bytes</Badge>
                    </div>
                  )}
                </div>

                {/* 处理选项 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="encoding">文件编码</Label>
                    <Select value={settings.encoding} onValueChange={handleEncodingChange}>
                      <SelectTrigger id="encoding">
                        <SelectValue placeholder="选择文件编码" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utf-8">UTF-8</SelectItem>
                        <SelectItem value="gbk">GBK</SelectItem>
                        <SelectItem value="gb2312">GB2312</SelectItem>
                        <SelectItem value="ascii">ASCII</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ruleType">章节标题规则</Label>
                    <Select value={settings.ruleType} onValueChange={handleRuleTypeChange}>
                      <SelectTrigger id="ruleType">
                        <SelectValue placeholder="选择章节标题规则" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">默认规则（第1章 标题）</SelectItem>
                        <SelectItem value="numberOnly">数字章节（第1章）</SelectItem>
                        <SelectItem value="chineseOnly">中文数字章节（第一章）</SelectItem>
                        <SelectItem value="custom">自定义规则</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {settings.ruleType === "custom" && (
                  <div className="space-y-2">
                    <Label htmlFor="customRule">自定义正则表达式</Label>
                    <Input
                      id="customRule"
                      type="text"
                      placeholder="请输入正则表达式，例如：^(第[一二三四五六七八九十\d]+章)(?:\s+)(.*)$"
                      value={settings.customRule}
                      onChange={handleCustomRuleChange}
                    />
                    <p className="text-xs text-muted-foreground">提示：使用捕获组()来定义章节标题和章节名称部分</p>
                  </div>
                )}
                
                <div className="flex gap-4">
                  <Button 
                    onClick={handleProcessNovel}
                    disabled={!novelFile || isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        处理中...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        分割章节
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleReset}
                    disabled={isProcessing}
                  >
                    重置
                  </Button>
                </div>

                {/* 处理进度 */}
                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>处理进度</span>
                      <span>{Math.round(processingProgress)}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${processingProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
              
              {/* 结果展示 */}
              {showResults && chapters.length > 0 && (
                <div className="border-t border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>分割结果</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{chapters.length} 章节</Badge>
                        {settings.showWordCount && (
                          <Badge variant="secondary">
                            总字数: {chapters.reduce((sum, ch) => sum + ch.wordCount, 0).toLocaleString()}
                          </Badge>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        onClick={() => downloadAllChapters('zip')}
                        variant="secondary"
                        size="sm"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        批量下载ZIP
                      </Button>
                      <Button 
                        onClick={() => downloadAllChapters('md')}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        下载完整MD
                      </Button>
                      <Button 
                        onClick={generateEpub}
                        variant="outline"
                        size="sm"
                      >
                        <BookOpen className="mr-2 h-4 w-4" />
                        生成EPUB
                      </Button>
                      <Button 
                        onClick={() => setShowMerger(true)}
                        variant="outline"
                        size="sm"
                        disabled={chapters.length < 2}
                      >
                        <Merge className="mr-2 h-4 w-4" />
                        章节合并
                      </Button>
                    </div>
                    
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {chapters.map((chapter, index) => (
                        <div 
                          key={index}
                          className="p-4 bg-muted/50 rounded-lg flex justify-between items-center"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{chapter.title}</span>
                              {settings.showWordCount && (
                                <Badge variant="outline" className="text-xs">
                                  {chapter.wordCount} 字
                                </Badge>
                              )}
                              {settings.showLineCount && (
                                <Badge variant="outline" className="text-xs">
                                  {chapter.lineCount} 行
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {chapter.content.substring(0, 100)}...
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handlePreviewChapter(chapter)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => downloadChapter(chapter, 'md')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </div>
              )}
            </TabsContent>

            <TabsContent value="batch" className="space-y-6">
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>批量处理文件</Label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">
                      拖拽多个TXT文件到此处进行批量处理
                    </p>
                    <Input 
                      type="file" 
                      multiple
                      accept=".txt" 
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                    >
                      选择多个文件
                    </Button>
                  </div>
                  
                  {batchFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">已选择 {batchFiles.length} 个文件：</p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {batchFiles.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                            <FileText className="h-4 w-4" />
                            <span>{file.name}</span>
                            <Badge variant="secondary">{file.size} bytes</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleBatchProcess}
                  disabled={batchFiles.length === 0 || isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      批量处理中...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      开始批量处理
                    </>
                  )}
                </Button>

                {batchResults.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">批量处理结果</h3>
                    {batchResults.map((result, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="text-base">{result.fileName}</CardTitle>
                          <CardDescription>
                            成功分割 {result.chapters.length} 个章节
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {result.chapters.slice(0, 3).map((chapter, chIndex) => (
                              <div key={chIndex} className="text-sm text-muted-foreground">
                                {chapter.title}
                              </div>
                            ))}
                            {result.chapters.length > 3 && (
                              <div className="text-sm text-muted-foreground">
                                ... 还有 {result.chapters.length - 3} 个章节
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <History className="h-5 w-5" />
                      处理历史记录
                    </h3>
                    <Badge variant="outline">
                      {processingHistory.length} 条记录
                    </Badge>
                  </div>
                  
                  {processingHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>暂无处理历史记录</p>
                      <p className="text-sm">处理文件后会自动保存历史记录</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {processingHistory.map((item) => (
                        <div key={item.id} className="group">
                          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{item.fileName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.timestamp.toLocaleString('zh-CN')} • {item.chapters.length} 章节 • {item.chapters.reduce((sum, ch) => sum + ch.wordCount, 0).toLocaleString()} 字
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => loadFromHistory(item)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteHistoryItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </TabsContent>

            <TabsContent value="merger" className="space-y-6">
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Merge className="h-5 w-5" />
                    章节合并工具
                  </h3>
                  <p className="text-muted-foreground">
                    选择要合并的章节，可以按顺序合并或自定义合并。合并后的章节将替换原有的章节。
                  </p>
                  
                  {chapters.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Merge className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>暂无章节可合并</p>
                      <p className="text-sm">请先处理文件生成章节</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">
                          {chapters.length} 个章节
                        </Badge>
                        <Button
                          onClick={() => setShowMerger(true)}
                          disabled={chapters.length < 2}
                        >
                          <Merge className="mr-2 h-4 w-4" />
                          开始合并
                        </Button>
                      </div>
                      
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {chapters.map((chapter, index) => (
                          <div 
                            key={index}
                            className="p-3 bg-muted/50 rounded-md flex justify-between items-center"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{chapter.title}</span>
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
                    </div>
                  )}
                </div>
              </CardContent>
            </TabsContent>

            <TabsContent value="templates" className="space-y-6">
              <CardContent className="space-y-6">
                <StyleTemplate
                  templates={styleTemplates}
                  onSave={handleSaveStyleTemplate}
                  onDelete={handleDeleteStyleTemplate}
                  onApply={handleApplyStyleTemplate}
                />
              </CardContent>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">应用设置</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>自动保存设置</Label>
                        <p className="text-sm text-muted-foreground">
                          自动保存设置到本地存储
                        </p>
                      </div>
                      <Switch
                        checked={settings.autoSave}
                        onCheckedChange={(checked) => handleSettingChange('autoSave', checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>显示字数统计</Label>
                        <p className="text-sm text-muted-foreground">
                          在章节列表中显示字数统计
                        </p>
                      </div>
                      <Switch
                        checked={settings.showWordCount}
                        onCheckedChange={(checked) => handleSettingChange('showWordCount', checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>显示行数统计</Label>
                        <p className="text-sm text-muted-foreground">
                          在章节列表中显示行数统计
                        </p>
                      </div>
                      <Switch
                        checked={settings.showLineCount}
                        onCheckedChange={(checked) => handleSettingChange('showLineCount', checked)}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>默认输出格式</Label>
                      <Select 
                        value={settings.defaultOutputFormat} 
                        onValueChange={(value: 'md' | 'txt' | 'epub') => handleSettingChange('defaultOutputFormat', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择默认输出格式" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="md">Markdown (.md)</SelectItem>
                          <SelectItem value="txt">纯文本 (.txt)</SelectItem>
                          <SelectItem value="epub">EPUB电子书 (.epub)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </TabsContent>
          </Tabs>
          
          <CardFooter className="flex justify-center border-t border-border pt-6">
            <p className="text-xs text-muted-foreground">
              本工具完全在浏览器端运行，不会上传任何文件到服务器
            </p>
          </CardFooter>
        </Card>
      </div>

      {/* 章节预览模态框 */}
      {showPreview && previewChapter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{previewChapter.title}</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowPreview(false)}
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription>
                字数: {previewChapter.wordCount} | 行数: {previewChapter.lineCount}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-y-auto max-h-96">
              <Textarea 
                value={previewChapter.content}
                readOnly
                className="min-h-64 font-mono text-sm"
              />
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button 
                variant="outline"
                onClick={() => downloadChapter(previewChapter, 'md')}
              >
                <Download className="mr-2 h-4 w-4" />
                下载MD
              </Button>
              <Button 
                variant="outline"
                onClick={() => downloadChapter(previewChapter, 'txt')}
              >
                <Download className="mr-2 h-4 w-4" />
                下载TXT
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* 章节合并模态框 */}
      {showMerger && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <ChapterMerger
            chapters={chapters}
            onMerge={handleChapterMerge}
            onCancel={() => setShowMerger(false)}
          />
        </div>
      )}
    </main>
  );
} 