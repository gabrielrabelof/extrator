import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { pdfjsLib } from "@/lib/pdf";

interface Alternative {
  letra: string;
  texto: string;
}

interface Question {
  pergunta: string;
  alternativas: Alternative[];
}

interface QuizProps {
  pdfUrl: string | null;
}

const Quiz: React.FC<QuizProps> = ({ pdfUrl }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

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
    // Remove common headers and unwanted text
    const cleanText = text
      .replace(
        /ATIVIDADE\s+PRÁTICA\s+REUNIÃO\s+DE\s+JOVENS\s+ICM\s+PORTO\s+DA\s+ALDEIA/gi,
        ""
      )
      .replace(/página\s+\d+\s+de\s+\d+/gi, "")
      .replace(/\[.*?\]/g, "") // Remove content in square brackets
      .trim();

    const questionRegex = /(\d+\.\s*[^?:]+[?:][\s\S]*?)(?=\d+\.|$)/g;
    const matches = cleanText.match(questionRegex);
    const questionsArr: Question[] = [];
    const seenQuestions = new Set();

    if (matches) {
      matches.forEach((block) => {
        // Clean up the question block
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

        // Skip if question is empty or already seen
        if (!questionText || seenQuestions.has(questionText)) return;
        seenQuestions.add(questionText);

        // Improved regex for alternatives that handles multiple lines
        const altRegex = /([a-d])\)\s*((?:(?![a-d]\))[\s\S])*)/g;
        const alternatives: Alternative[] = [];
        let altMatch;

        while ((altMatch = altRegex.exec(alternativesText)) !== null) {
          const altText = altMatch[2].trim();
          // Skip empty alternatives or ones that look like headers
          if (altText && !altText.match(/ATIVIDADE|REUNIÃO|ICM/i)) {
            alternatives.push({
              letra: altMatch[1],
              texto: altText,
            });
          }
        }

        // Only add questions with valid alternatives
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
      <h2 className="text-2xl font-semibold mb-6">Questionário</h2>

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
                    value={answers[index]}
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
                const totalQuestions = questions.length;
                const answeredQuestions = Object.keys(answers).length;
                toast.success(
                  `Respostas salvas! (${answeredQuestions}/${totalQuestions} respondidas)`
                );
              }}
            >
              Salvar Respostas
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default Quiz;
