import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
}

const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  pdfUrl,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[90vw] h-[90vh]">
        <DialogHeader>
          <DialogTitle>Gabarito</DialogTitle>
        </DialogHeader>
        <div className="flex-1 w-full h-[calc(90vh-80px)]">
          <iframe
            src={`${pdfUrl}#toolbar=0&navpanes=0`}
            className="w-full h-full"
            title="PDF Viewer"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PdfViewerModal;
