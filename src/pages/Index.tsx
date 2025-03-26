
import React from 'react';
import PDFSlicer from '@/components/PDFSlicer';
import { Scissors } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="w-full border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-7xl mx-auto py-4 px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Scissors className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-medium">PDF Slicer</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container max-w-7xl mx-auto py-8 px-4 sm:px-6 md:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-2 text-center mb-10 animate-fade-up">
            <h2 className="text-3xl font-bold tracking-tight">Fatie seus arquivos PDF e PPTX</h2>
            <p className="text-muted-foreground">
              Selecione um PDF ou PPTX, defina um intervalo de páginas e gere dois novos PDFs: um com o conteúdo selecionado e outro com as perguntas.
            </p>
          </div>
          
          <Separator className="my-8" />
          
          <PDFSlicer />
        </div>
      </main>

      <footer className="w-full border-t py-6 md:py-0">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left md:h-16">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} PDF Slicer. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
