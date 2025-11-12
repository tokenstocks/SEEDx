import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ZoomIn, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentGalleryProps {
  documents: {
    idCard?: string;
    selfie?: string;
    addressProof?: string;
  };
}

interface DocumentItem {
  label: string;
  url: string;
  testId: string;
}

export function DocumentGallery({ documents }: DocumentGalleryProps) {
  const [lightboxImage, setLightboxImage] = useState<DocumentItem | null>(null);

  const documentItems: DocumentItem[] = [
    { label: "ID Card", url: documents.idCard || "", testId: "id-card" },
    { label: "Selfie", url: documents.selfie || "", testId: "selfie" },
    { label: "Address Proof", url: documents.addressProof || "", testId: "address-proof" },
  ].filter(item => item.url);

  if (documentItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No documents uploaded</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documentItems.map((doc) => (
          <div key={doc.testId} className="space-y-2">
            <Label className="text-xs text-muted-foreground">{doc.label}</Label>
            <div
              className="relative group cursor-pointer rounded-md overflow-hidden border"
              onClick={() => setLightboxImage(doc)}
              data-testid={`thumbnail-${doc.testId}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setLightboxImage(doc);
                }
              }}
              aria-label={`View ${doc.label} in full size`}
            >
              <img
                src={doc.url}
                alt={doc.label}
                className="w-full h-32 object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <ZoomIn className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
        <DialogContent className="max-w-4xl p-0">
          {lightboxImage && (
            <div className="relative">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold">{lightboxImage.label}</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    data-testid={`button-download-${lightboxImage.testId}`}
                  >
                    <a
                      href={lightboxImage.url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLightboxImage(null)}
                    data-testid="button-close-lightbox"
                    aria-label="Close lightbox"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-muted/30">
                <img
                  src={lightboxImage.url}
                  alt={lightboxImage.label}
                  className="w-full h-auto max-h-[70vh] object-contain rounded-md"
                  data-testid={`lightbox-img-${lightboxImage.testId}`}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
