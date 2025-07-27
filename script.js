document.addEventListener('DOMContentLoaded', function() {
    const processBtn = document.getElementById('processBtn');
    const batchDownloadBtn = document.getElementById('batchDownloadBtn');
    const epubDownloadBtn = document.getElementById('epubDownloadBtn');
    const novelFileInput = document.getElementById('novelFile');
    const encodingSelect = document.getElementById('encoding');
    const presetRulesSelect = document.getElementById('presetRules');
    const customRuleSection = document.getElementById('customRuleSection');
    const customRuleInput = document.getElementById('customRule');
    const resultDiv = document.getElementById('result');
    const downloadLinksDiv = document.getElementById('downloadLinks');

    // 存储分割后的章节数据
    let chapterFiles = [];

    // 存储章节信息用于EPUB生成
    let chapterInfos = [];

    // 预设规则
    const presetRules = {
        default: /^(第[一二三四五六七八九十\d]+章)(?:\s+)(.*)$/gm,
        numberOnly: /^(第\d+章)(?:\s+)(.*)$/gm,
        chineseOnly: /^(第[一二三四五六七八九十]+章)(?:\s+)(.*)$/gm
    };

    // 监听规则选择变化
    presetRulesSelect.addEventListener('change', function() {
        if (this.value === 'custom') {
            customRuleSection.style.display = 'block';
        } else {
            customRuleSection.style.display = 'none';
        }
    });

    processBtn.addEventListener('click', processNovel);
    batchDownloadBtn.addEventListener('click', batchDownload);
    epubDownloadBtn.addEventListener('click', generateEpub);

    function processNovel() {
        const file = novelFileInput.files[0];
        if (!file) {
            alert('请先选择一个TXT文件');
            return;
        }

        const encoding = encodingSelect.value;
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const content = e.target.result;
            splitChapters(content);
        };
        
        reader.onerror = function() {
            alert('文件读取失败');
        };
        
        reader.readAsText(file, encoding);
    }

    function getChapterRegex() {
        const ruleType = presetRulesSelect.value;
        
        if (ruleType === 'custom') {
            const customRule = customRuleInput.value.trim();
            if (!customRule) {
                alert('请输入自定义正则表达式');
                return null;
            }
            try {
                return new RegExp(customRule, 'gm');
            } catch (e) {
                alert('自定义正则表达式格式错误: ' + e.message);
                return null;
            }
        }
        
        return presetRules[ruleType];
    }

    function splitChapters(content) {
        const chapterRegex = getChapterRegex();
        if (!chapterRegex) {
            return;
        }
        
        // 查找所有章节标题和位置
        const chapters = [];
        let match;
        
        // 先查找所有章节标题
        while ((match = chapterRegex.exec(content)) !== null) {
            chapters.push({
                title: match[1], // 章节标题（如"第一章"）
                chapterName: match[2], // 章节名称（如"首次灾害：大洪水"）
                index: match.index, // 章节在全文中的位置
                fullTitle: match[0] // 完整标题
            });
        }
        
        if (chapters.length === 0) {
            alert('未找到任何章节标题，请确认文件格式或调整规则');
            return;
        }
        
        // 分割章节内容
        chapterFiles = [];
        chapterInfos = [];
        for (let i = 0; i < chapters.length; i++) {
            const chapter = chapters[i];
            const nextChapter = chapters[i + 1];
            
            // 确定章节内容的结束位置
            const endPos = nextChapter ? nextChapter.index : content.length;
            
            // 提取章节内容
            const chapterContent = content.substring(chapter.index, endPos);
            
            // 生成文件名
            const fileName = generateFileName(chapter.title, chapter.chapterName);
            
            chapterFiles.push({
                name: fileName,
                content: chapterContent
            });
            
            // 存储章节信息用于EPUB生成
            chapterInfos.push({
                title: chapter.title,
                chapterName: chapter.chapterName,
                fullTitle: chapter.fullTitle,
                content: chapterContent
            });
        }
        
        // 显示下载链接
        displayDownloadLinks(chapterFiles);
    }

    function generateFileName(title, chapterName) {
        // 将中文数字转换为阿拉伯数字
        const chineseNumMap = {
            '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
            '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
        };
        
        // 提取章节号
        let chapterNum = title.replace('第', '').replace('章', '');
        
        // 如果是中文数字，转换为阿拉伯数字
        if (chapterNum in chineseNumMap) {
            chapterNum = chineseNumMap[chapterNum];
        } else if (chapterNum.includes('十')) {
            // 处理十几、二十几等复杂情况
            chapterNum = convertChineseNumber(chapterNum);
        }
        
        // 清理章节名称中的特殊字符
        const cleanChapterName = chapterName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
        
        return `第${chapterNum}章_${cleanChapterName}.md`;
    }

    function convertChineseNumber(chineseNum) {
        const chineseNumMap = {
            '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
            '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
        };
        
        // 特殊处理"十"
        if (chineseNum === '十') return 10;
        
        // 处理"十几"的情况
        if (chineseNum.startsWith('十')) {
            return 10 + chineseNumMap[chineseNum.charAt(1)];
        }
        
        // 处理"二十"、"三十"等情况
        if (chineseNum.endsWith('十')) {
            const num = chineseNumMap[chineseNum.charAt(0)];
            return num * 10;
        }
        
        // 处理"二十一"等复杂情况
        if (chineseNum.includes('十')) {
            const parts = chineseNum.split('十');
            const tens = parts[0] ? chineseNumMap[parts[0]] : 1;
            const units = parts[1] ? chineseNumMap[parts[1]] : 0;
            return tens * 10 + units;
        }
        
        return chineseNum;
    }

    function displayDownloadLinks(chapterFiles) {
        // 清空之前的下载链接
        downloadLinksDiv.innerHTML = '';
        
        // 显示结果区域
        resultDiv.style.display = 'block';
        
        // 为每个章节创建下载链接
        chapterFiles.forEach(chapter => {
            const link = document.createElement('a');
            link.href = createDownloadLink(chapter.content);
            link.download = chapter.name;
            link.className = 'chapter-link';
            link.textContent = chapter.name;
            
            downloadLinksDiv.appendChild(link);
        });
    }

    function createDownloadLink(content) {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        return URL.createObjectURL(blob);
    }

    function batchDownload() {
        if (chapterFiles.length === 0) {
            alert('没有可下载的章节文件');
            return;
        }

        // 创建 ZIP 文件
        const zip = new JSZip();
        
        // 添加所有章节文件到 ZIP
        chapterFiles.forEach(chapter => {
            zip.file(chapter.name, chapter.content);
        });
        
        // 生成 ZIP 文件并触发下载
        zip.generateAsync({ type: 'blob' })
            .then(function(content) {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = '小说章节.zip';
                link.click();
            });
    }

    function generateEpub() {
        if (chapterInfos.length === 0) {
            alert('没有可生成的章节内容，请先分割章节');
            return;
        }

        // 创建 EPUB 文件
        const zip = new JSZip();
        
        // 创建 mimetype 文件（必须是第一个文件且不压缩）
        zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
        
        // 创建 META-INF 目录和 container.xml 文件
        zip.folder('META-INF').file('container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>`);
        
        // 创建 OEBPS 目录
        const oebps = zip.folder('OEBPS');
        
        // 创建 CSS 样式文件
        oebps.file('style.css', `h1 {
    color: #333;
    text-align: center;
    margin: 20px 0;
}

h2 {
    color: #555;
    margin: 15px 0;
}`);
        
        // 创建章节文件
        const manifestItems = [];
        const spineItems = [];
        
        // 创建章节文件
        for (let i = 0; i < chapterInfos.length; i++) {
            const chapter = chapterInfos[i];
            const fileName = `chapter_${i + 1}.xhtml`;
            
            // 创建 XHTML 内容
            const xhtmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
    <title>${chapter.fullTitle}</title>
    <link rel="stylesheet" type="text/css" href="style.css" />
    <meta charset="UTF-8" />
</head>
<body>
    <h1>${chapter.fullTitle}</h1>
    <p>${chapter.content.replace(/\n/g, '</p>\n<p>')}</p>
</body>
</html>`;
            
            oebps.file(fileName, xhtmlContent);
            
            manifestItems.push(`<item id="chapter_${i + 1}" href="${fileName}" media-type="application/xhtml+xml" />`);
            spineItems.push(`<itemref idref="chapter_${i + 1}" />`);
        }
        
        // 创建 content.opf 文件
        const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:title>分割后的小说</dc:title>
        <dc:creator>小说分割工具</dc:creator>
        <dc:identifier id="book-id">urn:uuid:${generateUUID()}</dc:identifier>
        <dc:language>zh-CN</dc:language>
    </metadata>
    <manifest>
        <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml" />
        <item id="style" href="style.css" media-type="text/css" />
        ${manifestItems.join('\n        ')}
    </manifest>
    <spine toc="ncx">
        ${spineItems.join('\n        ')}
    </spine>
</package>`;
        
        oebps.file('content.opf', contentOpf);
        
        // 创建 toc.ncx 文件
        const navPoints = [];
        for (let i = 0; i < chapterInfos.length; i++) {
            const chapter = chapterInfos[i];
            navPoints.push(`<navPoint class="chapter" id="chapter_${i + 1}" playOrder="${i + 1}">
            <navLabel>
                <text>${chapter.fullTitle}</text>
            </navLabel>
            <content src="chapter_${i + 1}.xhtml" />
        </navPoint>`);
        }
        
        const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
    <head>
        <meta name="dtb:uid" content="urn:uuid:${generateUUID()}" />
        <meta name="dtb:depth" content="1" />
        <meta name="dtb:totalPageCount" content="0" />
        <meta name="dtb:maxPageNumber" content="0" />
    </head>
    <docTitle>
        <text>分割后的小说</text>
    </docTitle>
    <navMap>
        ${navPoints.join('\n        ')}
    </navMap>
</ncx>`;
        
        oebps.file('toc.ncx', tocNcx);
        
        // 生成 EPUB 文件并触发下载
        zip.generateAsync({ type: 'blob' })
            .then(function(content) {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = '小说.epub';
                link.click();
            });
    }
    
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
});