import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Quiz from "@/components/Quiz";

type Respostas = Record<string, string>;

const QuestionarioPage = () => {
  const params = useParams<{ id: string }>();
  const questionarioId = params.id;

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [respostas, setRespostas] = useState<Respostas>({});

  // Carrega PDF
  useEffect(() => {
    const fetchQuiz = async () => {
      if (!questionarioId) return;
      const ref = doc(db, "questionarios", questionarioId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setPdfUrl(snap.data().questionsPdfUrl);
      }
      setLoading(false);
    };
    fetchQuiz();
  }, [questionarioId]);

  // Carrega respostas salvas
  useEffect(() => {
    if (questionarioId) {
      const saved = localStorage.getItem(`respostas-${questionarioId}`);
      if (saved) {
        setRespostas(JSON.parse(saved));
      }
    }
  }, [questionarioId]);

  // Salva respostas no localStorage sempre que mudarem
  useEffect(() => {
    if (questionarioId) {
      localStorage.setItem(
        `respostas-${questionarioId}`,
        JSON.stringify(respostas)
      );
    }
  }, [respostas, questionarioId]);

  // Exemplo de função para atualizar uma resposta
  const handleRespostaChange = (perguntaId: string, resposta: string) => {
    setRespostas((prev) => ({
      ...prev,
      [perguntaId]: resposta,
    }));
  };

  if (loading) return <p className="p-4">Carregando questionário...</p>;
  if (!pdfUrl) return <p className="p-4">Questionário não encontrado.</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Quiz pdfUrl={pdfUrl} onRespostaChange={handleRespostaChange} />
    </div>
  );
};

export default QuestionarioPage;
