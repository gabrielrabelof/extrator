import React, { useState, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import {
  Scissors,
  Download,
  FileText,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

const API_KEY =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiMDM0OTNiYWU4OTgxZjY2M2U5YmUwZjhhZGFhMmJjZTgwYWYzNzExZDNhZTAwYTMxNGVlNjc4OGI2MWMyYWE0MTYyMGIyZTgyYTNmMjk5ODUiLCJpYXQiOjE3NDMwODA0NDMuNzgyMDE0LCJuYmYiOjE3NDMwODA0NDMuNzgyMDE1LCJleHAiOjQ4OTg3NTQwNDMuNzc3ODExLCJzdWIiOiI3MTQ2MzA0MSIsInNjb3BlcyI6WyJ1c2VyLnJlYWQiLCJ1c2VyLndyaXRlIiwidGFzay5yZWFkIiwidGFzay53cml0ZSIsIndlYmhvb2sucmVhZCIsIndlYmhvb2sud3JpdGUiLCJwcmVzZXQucmVhZCIsInByZXNldC53cml0ZSJdfQ.q9I86Vs-SvkZ-bKqOaaHOYchVF6i2JMl5f6P2MWz_WImqrGApHK7fJlllrqZiZana3YyEC1sukvANw2xT26Zd-PGEHJrKDwISEmO5-fNLUppylgDgrrvRowUyv8OHbMKMbv34WMrIux0z9YS7_AMWERA2IZoYSjPGd6wkRwjLMvQAtHcG_VrFuYgRxCtW47kuvNocvmuVK_jdljqnK79TbNdAl0FQfYEMMNfVKGNXBmBpc0CBIfRm0RbHa84ozBYxb2FRjcngEbBqMMMJzlkfUO7H4bOkR1oagnzQXM6FGjgAHVKFeetzB_MCNTnjVsuV6Rh7xPAJH8ET7vON5grpwJeGwIrv9pZeaQ47QxBxsa9vM6uq4tbt9L8ujzrDSc4jNWMX3j8NQUgAjbP5Tym0yaA5tJ_AfUzqwjUT1gCwG3mvgCsW9fL6iTOH2hvVF7vfwgQjrB0zeK1r3jVqpsQfdRIF6gRVjT53UNA7xjqtIZOmMNCoyX7z1xxirVsq32FpDWBmYzYHimM5GYUoOEqZ2ht88TKCXC8seegg-eUq4FLElFOUsuwK3xShn9ui5uO5g5q7dhG4rsUDJ8cj5G7eJfKkdgmSzJV8NPx7iuIwyijfTBhF01rpALvMCiuVVE9P6f7kKGmAp8Q-xLm7wLhya6q1taeltUnjPKU7i5yG-M";
const CLOUDCONVERT_API = "https://api.cloudconvert.com/v2/jobs";

const PDFSlicer = () => {
  const [pdfName, setPdfName] = useState<string>("");
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [pageRange, setPageRange] = useState<[number, number]>([1, 1]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [contentPdfUrl, setContentPdfUrl] = useState<string | null>(null);
  const [questionsPdfUrl, setQuestionsPdfUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [fileType, setFileType] = useState<"pdf" | "pptx" | "ppt">("pdf");
  const [conversionStatus, setConversionStatus] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const convertPPTXtoPDF = async (file: File): Promise<ArrayBuffer> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Determine input format based on file extension
        const inputFormat = file.name.toLowerCase().endsWith(".ppt")
          ? "ppt"
          : "pptx";

        const createJobResponse = await fetch(CLOUDCONVERT_API, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tasks: {
              "import-1": {
                operation: "import/upload",
              },
              "convert-1": {
                operation: "convert",
                input: ["import-1"],
                output_format: "pdf",
                input_format: inputFormat,
              },
              "export-1": {
                operation: "export/url",
                input: ["convert-1"],
              },
            },
            tag: `${inputFormat}-to-pdf`,
          }),
        });

        if (!createJobResponse.ok) {
          throw new Error("Erro ao criar job de conversão");
        }

        const jobData = await createJobResponse.json();

        setConversionStatus("Enviando arquivo para conversão...");
        // Encontra a task de upload
        const uploadTask = jobData.data.tasks.find(
          (task: any) => task.name === "import-1"
        );

        if (!uploadTask || !uploadTask.result || !uploadTask.result.form) {
          throw new Error("Erro ao obter informações do upload");
        }

        // Upload do arquivo
        const formData = new FormData();
        Object.entries(uploadTask.result.form.parameters || {}).forEach(
          ([key, value]) => {
            formData.append(key, String(value));
          }
        );
        formData.append("file", file);

        const uploadResponse = await fetch(uploadTask.result.form.url, {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Erro no upload do arquivo");
        }

        // Função para verificar o status do job
        const checkStatusAndGetPDF = async (jobId: string): Promise<string> => {
          return new Promise((resolveStatus, rejectStatus) => {
            const statusCheck = async () => {
              try {
                setConversionStatus("Convertendo apresentação para PDF...");
                const statusResponse = await fetch(
                  `${CLOUDCONVERT_API}/${jobId}`,
                  {
                    headers: {
                      Authorization: `Bearer ${API_KEY}`,
                    },
                  }
                );

                const statusData = await statusResponse.json();

                if (statusData.data.status === "finished") {
                  setConversionStatus("Baixando PDF convertido...");
                  const exportTask = statusData.data.tasks.find(
                    (task: any) => task.name === "export-1"
                  );
                  if (exportTask?.result?.files?.[0]?.url) {
                    resolveStatus(exportTask.result.files[0].url);
                  } else {
                    rejectStatus(
                      new Error("Não foi possível obter URL do PDF")
                    );
                  }
                } else if (statusData.data.status === "error") {
                  setConversionStatus("");
                  rejectStatus(
                    new Error(
                      `Erro na conversão: ${
                        statusData.data.message || "Erro desconhecido"
                      }`
                    )
                  );
                } else {
                  setTimeout(statusCheck, 2000);
                }
              } catch (error) {
                setConversionStatus("");
                rejectStatus(error);
              }
            };

            statusCheck();
          });
        };

        // Obtém a URL do PDF convertido
        const pdfUrl = await checkStatusAndGetPDF(jobData.data.id);

        // Baixa o PDF convertido
        const pdfResponse = await fetch(pdfUrl);
        const pdfArrayBuffer = await pdfResponse.arrayBuffer();

        setConversionStatus("");
        resolve(pdfArrayBuffer);
      } catch (error) {
        setConversionStatus("");
        reject(error);
      }
    });
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      let finalPdfBytes: ArrayBuffer;

      // Check file type
      if (file.type === "application/pdf") {
        setFileType("pdf");
        finalPdfBytes = await file.arrayBuffer();
      } else if (
        file.type ===
          "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
        file.type === "application/vnd.ms-powerpoint" ||
        file.name.endsWith(".ppt") ||
        file.name.endsWith(".pptx")
      ) {
        setFileType(file.name.endsWith(".ppt") ? "ppt" : "pptx");
        finalPdfBytes = await convertPPTXtoPDF(file);
      } else {
        toast.error("Formato de arquivo não suportado. Use PDF, PPT ou PPTX.");
        return;
      }

      await loadPDF(file, finalPdfBytes);
      toast.success("Arquivo carregado com sucesso!");
    } catch (error) {
      console.error("Error loading file:", error);
      toast.error("Erro ao carregar o arquivo. Verifique o arquivo.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadPDF = async (file: File, arrayBuffer: ArrayBuffer) => {
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    setPdfName(file.name);
    setPdfBytes(arrayBuffer);
    const count = pdfDoc.getPageCount();
    setPageCount(count);
    setPageRange([1, count > 1 ? Math.floor(count / 2) : 1]);

    // Reset generated PDFs
    setContentPdfUrl(null);
    setQuestionsPdfUrl(null);
  };

  // Resto do código mantido igual ao componente original
  // (handleDrop, handleSliceClick, handleDownload, etc.)

  // No render, adicione uma indicação do tipo de arquivo
  const renderFileTypeIcon = () => {
    switch (fileType) {
      case "pdf":
        return <FileText size={20} className="text-primary" />;
      case "pptx":
        return <FileSpreadsheet size={20} className="text-primary" />;
      default:
        return <FileText size={20} className="text-primary" />;
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    const isValidFile =
      file.type.includes("pdf") ||
      file.type.includes("powerpoint") ||
      file.name.endsWith(".ppt") ||
      file.name.endsWith(".pptx");

    if (!isValidFile) {
      toast.error("Por favor, carregue apenas arquivos PDF, PPT ou PPTX.");
      return;
    }

    setIsLoading(true);
    try {
      let finalPdfBytes: ArrayBuffer;

      if (file.type.includes("pdf")) {
        setFileType("pdf");
        finalPdfBytes = await file.arrayBuffer();
      } else {
        setFileType(file.name.endsWith(".ppt") ? "ppt" : "pptx");
        finalPdfBytes = await convertPPTXtoPDF(file);
      }

      await loadPDF(file, finalPdfBytes);
      toast.success("Arquivo carregado com sucesso!");
    } catch (error) {
      console.error("Error loading file:", error);
      toast.error(
        "Erro ao carregar o arquivo. Verifique se o arquivo é válido."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSliceClick = async () => {
    if (!pdfBytes) {
      toast.error("Por favor, carregue um PDF primeiro.");
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
        Array.from(
          { length: pageRange[1] - pageRange[0] + 1 },
          (_, i) => i + pageRange[0] - 1
        )
      );
      copiedContentPages.forEach((page) => contentPdf.addPage(page));

      // Create a new document for question pages (remaining pages)
      const questionsPdf = await PDFDocument.create();
      const remainingPagesIndices = [
        ...Array.from({ length: pageRange[0] - 1 }, (_, i) => i),
        ...Array.from(
          { length: pageCount - pageRange[1] },
          (_, i) => i + pageRange[1]
        ),
      ];

      const copiedQuestionsPages = await questionsPdf.copyPages(
        pdfDoc,
        remainingPagesIndices
      );
      copiedQuestionsPages.forEach((page) => questionsPdf.addPage(page));

      // Save the documents to Uint8Array
      const contentPdfBytes = await contentPdf.save();
      const questionsPdfBytes = await questionsPdf.save();

      // Create URLs for the PDFs
      const contentUrl = URL.createObjectURL(
        new Blob([contentPdfBytes], { type: "application/pdf" })
      );
      const questionsUrl = URL.createObjectURL(
        new Blob([questionsPdfBytes], { type: "application/pdf" })
      );

      setContentPdfUrl(contentUrl);
      setQuestionsPdfUrl(questionsUrl);

      toast.success("PDFs gerados com sucesso!");
    } catch (error) {
      console.error("Error slicing PDF:", error);
      toast.error("Ocorreu um erro ao processar o PDF.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (
    url: string | null,
    type: "content" | "questions"
  ) => {
    if (!url) return;

    const link = document.createElement("a");
    link.href = url;

    const baseName = pdfName.replace(/\.pdf$/i, "");
    const fileName =
      type === "content"
        ? `Conteúdo - ${baseName}.pdf`
        : `Perguntas - ${baseName}.pdf`;

    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fileNameWithoutExt = pdfName.replace(/\.pdf$/i, "");

  return (
    <div className="flex flex-col space-y-8 w-full max-w-4xl mx-auto animate-fade-in">
      <div
        className={`relative flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl transition-all duration-200 ${
          isDragging ? "border-primary bg-primary/5" : "border-border"
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
          accept=".pdf, .ppt, .pptx"
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
              Arraste e solte seu arquivo aqui ou
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
                    {renderFileTypeIcon()}
                  </div>
                  <div>
                    <h3 className="font-medium">{pdfName}</h3>
                    <p className="text-xs text-muted-foreground">
                      {pageCount} páginas
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-3">
                    Selecione o intervalo de páginas para o conteúdo:
                  </h4>
                  <div className="flex items-center gap-4 px-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={pageCount}
                        value={pageRange[0]}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (value >= 1 && value <= pageRange[1]) {
                            setPageRange([value, pageRange[1]]);
                          }
                        }}
                        className="w-16 h-8 px-2 text-sm border rounded"
                      />
                      <span className="text-sm text-muted-foreground">até</span>
                      <input
                        type="number"
                        min={pageRange[0]}
                        max={pageCount}
                        value={pageRange[1]}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (value >= pageRange[0] && value <= pageCount) {
                            setPageRange([pageRange[0], value]);
                          }
                        }}
                        className="w-16 h-8 px-2 text-sm border rounded"
                      />
                    </div>
                  </div>
                  <div className="px-2">
                    <Slider
                      value={[pageRange[0], pageRange[1]]}
                      min={1}
                      max={pageCount}
                      step={1}
                      onValueChange={(value) =>
                        setPageRange([value[0], value[1]])
                      }
                      className="mt-4"
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                    <span>
                      Páginas {pageRange[0]} até {pageRange[1]}
                    </span>
                    <span>
                      {pageRange[1] - pageRange[0] + 1} páginas selecionadas
                    </span>
                  </div>
                </div>

                <div className="flex justify-center mt-6">
                  <Button
                    onClick={handleSliceClick}
                    disabled={isLoading || !pdfBytes}
                    className="flex items-center space-x-2"
                  >
                    <Scissors size={16} />
                    <span>Recortar PDF</span>
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
                  <h3 className="font-medium">
                    Conteúdo - {fileNameWithoutExt}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(contentPdfUrl, "content")}
                    >
                      <Download size={18} />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden card-hover">
            <CardContent className="p-5">
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">
                    Perguntas - {fileNameWithoutExt}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        handleDownload(questionsPdfUrl, "questions")
                      }
                    >
                      <Download size={18} />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {conversionStatus && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-lg flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm">{conversionStatus}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFSlicer;
