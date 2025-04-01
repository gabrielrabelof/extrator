import React, { useState, useRef, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import {
  Scissors,
  Download,
  FileText,
  Upload,
  FileQuestion,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import Quiz from "./Quiz";
import PdfViewerModal from "./PdfViewerModal";

import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { v4 as uuidv4 } from "uuid";

// Importações para o Firebase Storage
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

const API_KEY =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiMDM0OTNiYWU4OTgxZjY2M2U5YmUwZjhhZGFhMmJjZTgwYWYzNzExZDNhZTAwYTMxNGVlNjc4OGI2MWMyYWE0MTYyMGIyZTgyYTNmMjk5ODUiLCJpYXQiOjE3NDMwODA0NDMuNzgyMDE0LCJuYmYiOjE3NDMwODA0NDMuNzgyMDE1LCJleHAiOjQ4OTg3NTQwNDMuNzc3ODExLCJzdWIiOiI3MTQ2MzA0MSIsInNjb3BlcyI6WyJ1c2VyLnJlYWQiLCJ1c2VyLndyaXRlIiwidGFzay5yZWFkIiwidGFzay53cml0ZSIsIndlYmhvb2sucmVhZCIsIndlYmhvb2sud3JpdGUiLCJwcmVzZXQucmVhZCIsInByZXNldC53cml0ZSJdfQ.q9I86Vs-SvkZ-bKqOaaHOYchVF6i2JMl5f6P2MWz_WImqrGApHK7fJlllrqZiZana3YyEC1sukvANw2xT26Zd-PGEHJrKDwISEmO5-fNLUppylgDgrrvRowUyv8OHbMKMbv34WMrIux0z9YS7_AMWERA2IZoYSjPGd6wkRwjLMvQAtHcG_VrFuYgRxCtW47kuvNocvmuVK_jdljqnK79TbNdAl0FQfYEMMNfVKGNXBmBpc0CBIfRm0RbHa84ozBYxb2FRjcngEbBqMMMJzlkfUO7H4bOkR1oagnzQXM6FGjgAHVKFeetzB_MCNTnjVsuV6Rh7xPAJH8ET7vON5grpwJeGwIrv9pZeaQ47QxBxsa9vM6uq4tbt9L8ujzrDSc4jNWMX3j8NQUgAjbP5Tym0yaA5tJ_AfUzqwjUT1gCwG3mvgCsW9fL6iTOH2hvVF7vfwgQjrB0zeK1r3jVqpsQfdRIF6gRVjT53UNA7xjqtIZOmMNCoyX7z1xxirVsq32FpDWBmYzYHimM5GYUoOEqZ2ht88TKCXC8seegg-eUq4FLElFOUsuwK3xShn9ui5uO5g5q7dhG4rsUDJ8cj5G7eJfKkdgmSzJV8NPx7iuIwyijfTBhF01rpALvMCiuVVE9P6f7kKGmAp8Q-xLm7wLhya6q1taeltUnjPKU7i5yG-M";

const CLOUDCONVERT_API = "https://api.cloudconvert.com/v2/jobs";

const PDFSlicer = () => {
  const [pdfName, setPdfName] = useState<string>("");
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [pageRange, setPageRange] = useState<[number, number]>([1, 1]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Agora, as URLs armazenadas serão as permanentes do Firebase Storage
  const [contentPdfUrl, setContentPdfUrl] = useState<string | null>(null);
  const [questionsPdfUrl, setQuestionsPdfUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [fileType, setFileType] = useState<"pdf" | "pptx" | "ppt">("pdf");
  const [conversionStatus, setConversionStatus] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [isPdfPreviewModalOpen, setIsPdfPreviewModalOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Nova função: realiza upload dos PDFs para o Firebase Storage e salva as URLs no Firestore
  async function uploadAndSavePDFs(
    pdfName: string,
    contentPdfBytes: Uint8Array,
    questionsPdfBytes: Uint8Array
  ) {
    try {
      const timestamp = Date.now();
      const contentFileName = `pdfs/${pdfName}-${timestamp}-conteudo.pdf`;
      const questionsFileName = `pdfs/${pdfName}-${timestamp}-perguntas.pdf`;

      // Cria os Blobs a partir dos bytes dos PDFs
      const contentBlob = new Blob([contentPdfBytes], {
        type: "application/pdf",
      });
      const questionsBlob = new Blob([questionsPdfBytes], {
        type: "application/pdf",
      });

      // Cria referências no Firebase Storage
      const contentRef = ref(storage, contentFileName);
      const questionsRef = ref(storage, questionsFileName);

      // Realiza o upload dos arquivos
      await uploadBytes(contentRef, contentBlob);
      await uploadBytes(questionsRef, questionsBlob);

      // Obtém as URLs permanentes de download
      const contentDownloadURL = await getDownloadURL(contentRef);
      const questionsDownloadURL = await getDownloadURL(questionsRef);

      // Cria um documento no Firestore com os metadados dos PDFs
      const id = uuidv4();
      await setDoc(doc(db, "questionarios", id), {
        createdAt: new Date(),
        contentPdfUrl: contentDownloadURL,
        questionsPdfUrl: questionsDownloadURL,
      });

      // Set the questionId state
      setQuestionId(id);
      return { id, contentDownloadURL, questionsDownloadURL };
    } catch (error) {
      console.error("Erro no upload e salvamento dos PDFs:", error);
      throw error;
    }
  }

  const handleGenerateQuestionnaire = () => {
    if (!questionsPdfUrl || !questionId) {
      toast.error("Questionário não encontrado.");
      return;
    }

    const baseUrl = `${window.location.origin}/extrator/#/questionario/${questionId}`;
    window.open(baseUrl, "_blank");
  };

  const resetToInitialState = () => {
    setCurrentStep(1);
    setPdfName("");
    setPdfBytes(null);
    setPageCount(0);
    setPageRange([1, 1]);
    setContentPdfUrl(null);
    setQuestionsPdfUrl(null);
    setFileType("pdf");
    toast.success("Processo concluído com sucesso!");
  };

  const convertPPTXtoPDF = async (file: File): Promise<ArrayBuffer> => {
    return new Promise(async (resolve, reject) => {
      try {
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
        const uploadTask = jobData.data.tasks.find(
          (task: any) => task.name === "import-1"
        );

        if (!uploadTask || !uploadTask.result || !uploadTask.result.form) {
          throw new Error("Erro ao obter informações do upload");
        }

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

        const pdfUrl = await checkStatusAndGetPDF(jobData.data.id);
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

    // Reset dos PDFs gerados
    setContentPdfUrl(null);
    setQuestionsPdfUrl(null);

    // Avança para o próximo passo
    goToNextStep();
  };

  const goToPreviousStep = () => {
    setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev));
  };

  const goToNextStep = () => {
    setCurrentStep((prev) => (prev < 3 ? ((prev + 1) as 1 | 2 | 3) : prev));
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return !!pdfBytes;
      case 2:
        return true;
      default:
        return false;
    }
  };

  const StepNavigation = () => {
    return (
      <div className="flex justify-between mt-6">
        {currentStep > 1 && (
          <Button
            variant="outline"
            onClick={goToPreviousStep}
            className="flex items-center space-x-2"
          >
            Voltar
          </Button>
        )}
        {currentStep < 3 && (
          <Button
            onClick={goToNextStep}
            disabled={!canGoNext()}
            variant="outline"
            className="flex items-center space-x-2 ml-auto text-primary border-primary bg-transparent hover:bg-primary/10"
          >
            Próximo
          </Button>
        )}
      </div>
    );
  };

  // Modificação na função handleSliceClick:
  // Em vez de criar URLs temporárias com URL.createObjectURL,
  // é realizado o upload dos PDFs para o Firebase Storage e armazenadas as URLs permanentes.
  const handleSliceClick = async () => {
    if (!pdfBytes) {
      toast.error("Por favor, carregue um PDF primeiro.");
      return;
    }

    setIsLoading(true);
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);

      // Cria o PDF de conteúdo com as páginas selecionadas
      const contentPdf = await PDFDocument.create();
      const copiedContentPages = await contentPdf.copyPages(
        pdfDoc,
        Array.from(
          { length: pageRange[1] - pageRange[0] + 1 },
          (_, i) => i + pageRange[0] - 1
        )
      );
      copiedContentPages.forEach((page) => contentPdf.addPage(page));

      // Cria o PDF de perguntas com as páginas restantes
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

      // Salva os documentos como Uint8Array
      const contentPdfBytes = await contentPdf.save();
      const questionsPdfBytes = await questionsPdf.save();

      // Chama a função que realiza o upload e salva as URLs no Firestore
      const result = await uploadAndSavePDFs(
        pdfName,
        contentPdfBytes,
        questionsPdfBytes
      );
      setContentPdfUrl(result.contentDownloadURL);
      setQuestionsPdfUrl(result.questionsDownloadURL);
      goToNextStep();
      toast.success("PDFs gerados e salvos com sucesso!");
    } catch (error) {
      console.error("Error slicing PDF:", error);
      toast.error("Ocorreu um erro ao processar o PDF.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (
    url: string | null,
    type: "content" | "questions"
  ) => {
    if (!url) return;

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = downloadUrl;

      const baseName = pdfName.replace(/\.pdf$/i, "");
      const fileName =
        type === "content"
          ? `Conteúdo - ${baseName}.pdf`
          : `Perguntas - ${baseName}.pdf`;

      link.download = fileName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Erro ao baixar o arquivo");
    }
  };

  const fileNameWithoutExt = pdfName.replace(/\.pdf$/i, "");

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1:
        return "Selecione um arquivo";
      case 2:
        return "Selecione o intervalo de páginas";
      case 3:
        return "Baixe seus arquivos";
      default:
        return "";
    }
  };

  const generatePreviewUrl = () => {
    if (!pdfBytes) return;
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    return url;
  };

  const handleOpenPdf = () => {
    const url = generatePreviewUrl();
    if (url) {
      window.open(url, "_blank");
    }
  };

  useEffect(() => {
    return () => {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, [previewPdfUrl]);

  return (
    <div className="flex flex-col space-y-8 w-full max-w-4xl mx-auto animate-fade-in">
      <div className="flex flex-col justify-between sm:flex-row gap-4 items-center sm:mb-6 mb-2">
        <h2 className="text-2xl font-semibold">{getStepTitle(currentStep)}</h2>
        <div className="flex items-center">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`flex items-center ${step !== 1 && "ml-2"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === currentStep
                    ? "bg-primary text-primary-foreground"
                    : step < currentStep
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step}
              </div>
              {step < 3 && (
                <div
                  className={`h-0.5 w-8 mx-2 ${
                    step < currentStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {currentStep === 1 && (
        <>
          <div
            className={`relative flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl transition-all duration-200 ${
              isDragging ? "border-primary bg-primary/5" : "border-border"
            } hover:border-primary/50 animate-scale-in`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={async (e) => {
              // ... existing drop handler code ...
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf, .ppt, .pptx"
              onChange={handleFileChange}
              className="hidden"
            />

            {conversionStatus ? (
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <div>
                  <h3 className="text-lg font-medium">
                    Convertendo apresentação
                  </h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    {conversionStatus}
                  </p>
                </div>
              </div>
            ) : (
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
            )}
          </div>
          <StepNavigation />
        </>
      )}

      {currentStep === 2 && pdfBytes && (
        <Card className="w-full border shadow-sm animate-fade-up">
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <FileText size={20} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-shrink">
                    <h3 className="font-medium truncate max-w-[200px] sm:max-w-[300px]">
                      {pdfName}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {pageCount} páginas
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => {
                    handleOpenPdf();
                  }}
                >
                  <FileText size={16} />
                  <span>Visualizar PDF</span>
                </Button>
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
                          const value =
                            e.target.value === ""
                              ? 1
                              : parseInt(e.target.value);
                          if (
                            !isNaN(value) &&
                            value >= 1 &&
                            value <= pageRange[1]
                          ) {
                            setPageRange([value, pageRange[1]]);
                          }
                        }}
                        className="w-16 h-8 px-2 text-sm border rounded"
                        inputMode="numeric"
                        pattern="\d*"
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
                  <div className="flex flex-col sm:flex-row gap-3 justify-between mt-2 text-sm text-muted-foreground">
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
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        <span>Recortando...</span>
                      </>
                    ) : (
                      <>
                        <Scissors size={16} />
                        <span>Recortar PDF</span>
                      </>
                    )}
                  </Button>
                </div>
                <StepNavigation />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <>
          {contentPdfUrl && questionsPdfUrl ? (
            <div className="space-y-6 animate-fade-up">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            onClick={() =>
                              handleDownload(contentPdfUrl, "content")
                            }
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

              <div className="flex justify-center mt-6">
                <Button
                  onClick={handleGenerateQuestionnaire}
                  className="flex items-center space-x-2"
                >
                  <FileQuestion size={16} />
                  <span>Gerar Questionário</span>
                </Button>
              </div>

              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={goToPreviousStep}
                  className="flex items-center space-x-2"
                >
                  Voltar
                </Button>
                <Button
                  onClick={resetToInitialState}
                  variant="outline"
                  className="flex items-center space-x-2 ml-auto text-primary border-primary bg-transparent hover:bg-primary/10"
                >
                  Concluir
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl border-muted-foreground/20 animate-fade-up">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                  <Scissors size={24} className="text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">
                    Nenhum arquivo recortado
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Retorne à etapa anterior e recorte o PDF para gerar os
                    arquivos
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-between mt-6">
            {!contentPdfUrl && !questionsPdfUrl && (
              <>
                <Button
                  variant="outline"
                  onClick={goToPreviousStep}
                  className="flex items-center space-x-2"
                >
                  Voltar
                </Button>
              </>
            )}
          </div>
        </>
      )}
      <PdfViewerModal
        isOpen={isPdfPreviewModalOpen}
        onClose={() => {
          setIsPdfPreviewModalOpen(false);
          if (previewPdfUrl) {
            URL.revokeObjectURL(previewPdfUrl);
            setPreviewPdfUrl(null);
          }
        }}
        pdfUrl={previewPdfUrl || ""}
      />
    </div>
  );
};

export default PDFSlicer;
