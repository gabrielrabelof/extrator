
import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Scissors, Download, Eye, FileText, Upload, ChevronUp, ChevronDown, Presentation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import PDFViewer from './PDFViewer';
import pptxgen from 'pptxgenjs';
import { convertPptxToPdf } from '@/utils/pptxUtils';

const PDFSlicer = () => {
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<'pdf' | 'pptx'>('pdf');
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [pageRange, setPageRange] = useState<[number, number]>([1, 1]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [contentPdfUrl, setContentPdfUrl] = useState<string | null>(null);
  const [questionsPdfUrl, setQuestionsPdfUrl] = useState<string | null>(null);
  const [activePreview, setActivePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExt === 'pdf') {
        setFileType('pdf');
        await loadPDF(file);
      } else if (fileExt === 'pptx') {
        setFileType('pptx');
        await loadPPTX(file);
      } else {
        throw new Error('Formato de arquivo não suportado. Por favor, use PDF ou PPTX.');
      }
      
      toast.success('Arquivo carregado com sucesso!');
    } catch (error) {
      console.error('Error loading file:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar o arquivo. Verifique se o arquivo é válido.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPDF = async (file: File) => {
    const reader = new FileReader();
    
    return new Promise<void>((resolve, reject) => {
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          
          setFileName(file.name);
          setPdfBytes(arrayBuffer);
          const count = pdfDoc.getPageCount();
          setPageCount(count);
          setPageRange([1, count > 1 ? Math.floor(count / 2) : 1]);
          
          // Reset generated PDFs
          setContentPdfUrl(null);
          setQuestionsPdfUrl(null);
          setActivePreview(null);
          
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Falha ao ler o arquivo PDF'));
      reader.readAsArrayBuffer(file);
    });
  };

  const loadPPTX = async (file: File) => {
    const reader = new FileReader();
    
    return new Promise<void>((resolve, reject) => {
      reader.onload = async (e) => {
        try {
          setIsLoading(true);
          const arrayBuffer = e.target?.result as ArrayBuffer;
          
          // Converter PPTX para PDF
          const pdfBytes = await convertPptxToPdf(arrayBuffer);
          
          // Carregar o PDF gerado
          const pdfDoc = await PDFDocument.load(pdfBytes);
          
          setFileName(file.name);
          setPdfBytes(pdfBytes);
          const count = pdfDoc.getPageCount();
          setPageCount(count);
          setPageRange([1, count > 1 ? Math.floor(count / 2) : 1]);
          
          // Reset generated PDFs
          setContentPdfUrl(null);
          setQuestionsPdfUrl(null);
          setActivePreview(null);
          
          resolve();
        } catch (error) {
          reject(new Error('Falha ao processar o arquivo PPTX. ' + (error instanceof Error ? error.message : '')));
        }
      };
      
      reader.onerror = () => reject(new Error('Falha ao ler o arquivo PPTX'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (!file) return;
    
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt !== 'pdf' && fileExt !== 'pptx') {
      toast.error('Por favor, carregue apenas arquivos PDF ou PPTX.');
      return;
    }
    
    setIsLoading(true);
    try {
      if (fileExt === 'pdf') {
        setFileType('pdf');
        await loadPDF(file);
      } else if (fileExt === 'pptx') {
        setFileType('pptx');
        await loadPPTX(file);
      }
      toast.success('Arquivo carregado com sucesso!');
    } catch (error) {
      console.error('Error loading file:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar o arquivo. Verifique se o arquivo é válido.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSliceClick = async () => {
    if (!pdfBytes) {
      toast.error('Por favor, carregue um arquivo primeiro.');
      return;
    }

    setIsLoading(true);
    try {
      // Load the original PDF document
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Create a new document for content pages (selected range)
      const contentPdf = await PDFDocument.create();
      const copiedContentPages = await contentPdf.copyPages(
        pdfDoc, 
        Array.from({ length: pageRange[1] - pageRange[0] + 1 }, (_, i) => i + pageRange[0] - 1)
      );
      copiedContentPages.forEach(page => contentPdf.addPage(page));
      
      // Create a new document for question pages (remaining pages)
      const questionsPdf = await PDFDocument.create();
      const remainingPagesIndices = [
        ...Array.from({ length: pageRange[0] - 1 }, (_, i) => i),
        ...Array.from({ length: pageCount - pageRange[1] }, (_, i) => i + pageRange[1])
      ];
      
      const copiedQuestionsPages = await questionsPdf.copyPages(pdfDoc, remainingPagesIndices);
      copiedQuestionsPages.forEach(page => questionsPdf.addPage(page));
      
      // Save the documents to Uint8Array
      const contentPdfBytes = await contentPdf.save();
      const questionsPdfBytes = await questionsPdf.save();
      
      // Create URLs for the PDFs
      const contentUrl = URL.createObjectURL(new Blob([contentPdfBytes], { type: 'application/pdf' }));
      const questionsUrl = URL.createObjectURL(new Blob([questionsPdfBytes], { type: 'application/pdf' }));
      
      setContentPdfUrl(contentUrl);
      setQuestionsPdfUrl(questionsUrl);
      
      toast.success('PDFs gerados com sucesso!');
    } catch (error) {
      console.error('Error slicing PDF:', error);
      toast.error('Ocorreu um erro ao processar o PDF.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (url: string | null, type: 'content' | 'questions') => {
    if (!url) return;
    
    const link = document.createElement('a');
    link.href = url;
    
    const baseName = fileName.replace(/\.(pdf|pptx)$/i, '');
    const downloadFileName = type === 'content' 
      ? `Conteúdo - ${baseName}.pdf` 
      : `Perguntas - ${baseName}.pdf`;
      
    link.download = downloadFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = (url: string | null, type: 'content' | 'questions') => {
    if (activePreview === type) {
      setActivePreview(null);
    } else {
      setActivePreview(type);
    }
  };

  const fileNameWithoutExt = fileName.replace(/\.(pdf|pptx)$/i, '');
  const fileIcon = fileType === 'pdf' ? <FileText size={20} className="text-primary" /> : <Presentation size={20} className="text-primary" />;

  return (
    <div className="flex flex-col space-y-8 w-full max-w-4xl mx-auto animate-fade-in">
      <div 
        className={`relative flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl transition-all duration-200 ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border'
        } hover:border-primary/50 animate-scale-in`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept=".pdf,.pptx"
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload size={24} className="text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-medium">Selecione um arquivo</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Arraste e solte seu arquivo PDF ou PPTX aqui ou
            </p>
          </div>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="mt-2"
            disabled={isLoading}
          >
            Selecionar Arquivo
          </Button>
        </div>
      </div>

      {pdfBytes && (
        <Card className="w-full border shadow-sm animate-fade-up">
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    {fileIcon}
                  </div>
                  <div>
                    <h3 className="font-medium">{fileName}</h3>
                    <p className="text-xs text-muted-foreground">{pageCount} páginas</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-3">Selecione o intervalo de páginas para o conteúdo:</h4>
                  <div className="px-2">
                    <Slider
                      value={[pageRange[0], pageRange[1]]}
                      min={1}
                      max={pageCount}
                      step={1}
                      onValueChange={(value) => setPageRange([value[0], value[1]])}
                      className="mt-4"
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                    <span>Páginas {pageRange[0]} até {pageRange[1]}</span>
                    <span>{pageRange[1] - pageRange[0] + 1} páginas selecionadas</span>
                  </div>
                </div>

                <div className="flex justify-center mt-6">
                  <Button
                    onClick={handleSliceClick}
                    disabled={isLoading || !pdfBytes}
                    className="flex items-center space-x-2"
                  >
                    <Scissors size={16} />
                    <span>Recortar Arquivo</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {contentPdfUrl && questionsPdfUrl && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-up">
          <Card className="overflow-hidden card-hover">
            <CardContent className="p-5">
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Conteúdo - {fileNameWithoutExt}</h3>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePreview(contentPdfUrl, 'content')}
                    >
                      {activePreview === 'content' ? <ChevronUp size={18} /> : <Eye size={18} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(contentPdfUrl, 'content')}
                    >
                      <Download size={18} />
                    </Button>
                  </div>
                </div>
                
                {activePreview === 'content' && (
                  <div className="h-[400px] mt-2">
                    <PDFViewer fileUrl={contentPdfUrl} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden card-hover">
            <CardContent className="p-5">
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Perguntas - {fileNameWithoutExt}</h3>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePreview(questionsPdfUrl, 'questions')}
                    >
                      {activePreview === 'questions' ? <ChevronUp size={18} /> : <Eye size={18} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(questionsPdfUrl, 'questions')}
                    >
                      <Download size={18} />
                    </Button>
                  </div>
                </div>
                
                {activePreview === 'questions' && (
                  <div className="h-[400px] mt-2">
                    <PDFViewer fileUrl={questionsPdfUrl} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PDFSlicer;
