import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { pdfjsLib } from "@/lib/pdf";
import { Copy, FileText, ArrowUp } from "lucide-react";
import PdfViewerModal from "./PdfViewerModal";

interface Alternative {
  letra: string;
  texto: string;
}

interface Question {
  pergunta: string;
  alternativas: Alternative[];
}

interface QuizProps {
  pdfUrl: string;
  onRespostaChange: (id: string, resposta: string) => void;
}

const Quiz: React.FC<QuizProps> = ({ pdfUrl, onRespostaChange }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const localStorageKey = `quiz-answers-${btoa(encodeURIComponent(pdfUrl))}`; // Chave única baseada no PDF

  // Carregar respostas salvas do localStorage
  useEffect(() => {
    if (pdfUrl) {
      const saved = localStorage.getItem(localStorageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setAnswers(parsed);
        } catch {
          console.warn("Respostas salvas corrompidas");
          localStorage.removeItem(localStorageKey); // Remove invalid data
        }
      } else {
        setAnswers({}); // Reset answers if no saved data exists
      }
    }

    return () => {
      // Optional: Clear answers when component unmounts
      setAnswers({});
    };
  }, [pdfUrl]);

  // Salvar respostas no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem(localStorageKey, JSON.stringify(answers));
  }, [answers]);

  useEffect(() => {
    if (pdfUrl) {
      extractQuestionsFromPDF(pdfUrl);
    }
  }, [pdfUrl]);

  const extractQuestionsFromPDF = async (url: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        fullText += pageText + " ";
      }

      const extractedQuestions = extractQuestions(fullText);
      setQuestions(extractedQuestions);
    } catch (error) {
      console.error("Error extracting questions:", error);
      toast.error("Erro ao extrair questões do PDF");
    } finally {
      setIsLoading(false);
    }
  };

  const extractQuestions = (text: string): Question[] => {
    const cleanText = text
      .replace(
        /ATIVIDADE\s+PRÁTICA\s+REUNIÃO\s+DE\s+JOVENS\s+ICM\s+PORTO\s+DA\s+ALDEIA/gi,
        ""
      )
      .replace(/página\s+\d+\s+de\s+\d+/gi, "")
      .replace(/\[.*?\]/g, "")
      .trim();

    const questionRegex = /(\d+\.\s*[^?:]+[?:][\s\S]*?)(?=\d+\.|$)/g;
    const matches = cleanText.match(questionRegex);
    const questionsArr: Question[] = [];
    const seenQuestions = new Set();

    if (matches) {
      matches.forEach((block) => {
        const cleanBlock = block.replace(/\s+/g, " ").trim();

        const indexInterrogacao = cleanBlock.indexOf("?");
        const indexDoisPontos = cleanBlock.indexOf(":");
        let splitIndex;

        if (indexInterrogacao === -1 && indexDoisPontos === -1) return;
        splitIndex =
          indexInterrogacao === -1
            ? indexDoisPontos
            : indexDoisPontos === -1
            ? indexInterrogacao
            : Math.min(indexInterrogacao, indexDoisPontos);

        const questionText = cleanBlock.substring(0, splitIndex + 1).trim();
        const alternativesText = cleanBlock.substring(splitIndex + 1).trim();

        if (!questionText || seenQuestions.has(questionText)) return;
        seenQuestions.add(questionText);

        const altRegex = /([a-d])\)\s*((?:(?![a-d]\))[\s\S])*)/g;
        const alternatives: Alternative[] = [];
        let altMatch;

        while ((altMatch = altRegex.exec(alternativesText)) !== null) {
          const altText = altMatch[2].trim();
          if (altText && !altText.match(/ATIVIDADE|REUNIÃO|ICM/i)) {
            alternatives.push({
              letra: altMatch[1],
              texto: altText,
            });
          }
        }

        if (alternatives.length > 0) {
          questionsArr.push({
            pergunta: questionText,
            alternativas: alternatives,
          });
        }
      });
    }

    return questionsArr;
  };

  const handleAnswerChange = (questionIndex: number, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: value,
    }));
    onRespostaChange(String(questionIndex), value); // atualiza também no componente pai
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Questionário</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setIsPdfModalOpen(true)}
          >
            <FileText size={16} />
            <span>Ver Gabarito</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("Link copiado para a área de transferência!");
            }}
          >
            <Copy size={16} />
            <span>Copiar Link</span>
          </Button>
        </div>
      </div>

      {questions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Nenhuma questão encontrada no PDF.
          </CardContent>
        </Card>
      ) : (
        <>
          {questions.map((question, index) => (
            <Card key={index} className="mb-6">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <h3 className="font-medium">{question.pergunta}</h3>

                  <RadioGroup
                    value={answers[index] || ""}
                    onValueChange={(value) => handleAnswerChange(index, value)}
                  >
                    {question.alternativas.map((alt) => (
                      <div
                        key={alt.letra}
                        className="flex items-center space-x-2 py-2"
                      >
                        <RadioGroupItem
                          value={alt.letra}
                          id={`q${index}-${alt.letra}`}
                        />
                        <Label htmlFor={`q${index}-${alt.letra}`}>
                          {alt.letra}) {alt.texto}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-end">
            <Button
              onClick={() => {
                const total = questions.length;
                const answered = Object.keys(answers).length;
                toast.success(
                  `Respostas salvas! (${answered}/${total} respondidas)`
                );
              }}
            >
              Salvar Respostas
            </Button>
          </div>
        </>
      )}

      {showBackToTop && (
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 right-4 rounded-full w-10 h-10 shadow-md hover:shadow-lg transition-all"
          onClick={scrollToTop}
          aria-label="Voltar ao topo"
        >
          <ArrowUp size={20} />
        </Button>
      )}

      <PdfViewerModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        pdfUrl={pdfUrl}
      />
    </div>
  );
};

export default Quiz;
