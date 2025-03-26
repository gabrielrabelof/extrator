
import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2 } from 'lucide-react';

// Configure the worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  fileUrl: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ fileUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const loadPDF = async () => {
      setIsLoading(true);
      
      try {
        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const pdf = await loadingTask.promise;
        
        if (isMounted) {
          setPdfDocument(pdf);
          setTotalPages(pdf.numPages);
          setCurrentPage(1);
          
          // Adjust scale based on container width
          if (containerRef.current) {
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 1.0 });
            const containerWidth = containerRef.current.clientWidth;
            const newScale = (containerWidth - 20) / viewport.width;
            setScale(newScale);
          }
        }
      } catch (error) {
        console.error('Error loading PDF:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadPDF();
    
    return () => {
      isMounted = false;
    };
  }, [fileUrl]);

  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDocument || !canvasRef.current) return;
      
      setIsLoading(true);
      
      try {
        const page = await pdfDocument.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          
          await page.render(renderContext).promise;
        }
      } catch (error) {
        console.error('Error rendering PDF page:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    renderPage();
  }, [pdfDocument, currentPage, scale]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div ref={containerRef} className="pdf-viewer flex flex-col h-full">
      <div className="relative flex-1 overflow-auto">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        <div className="flex justify-center min-h-full">
          <canvas ref={canvasRef} className="shadow-sm" />
        </div>
      </div>
      
      {totalPages > 0 && (
        <div className="flex items-center justify-between p-2 bg-secondary/30 backdrop-blur-sm">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="px-3 py-1 text-xs rounded-md bg-background hover:bg-secondary disabled:opacity-50 transition-colors"
          >
            Anterior
          </button>
          <span className="text-xs">
            {currentPage} de {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 text-xs rounded-md bg-background hover:bg-secondary disabled:opacity-50 transition-colors"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;
