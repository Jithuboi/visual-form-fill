import { useState } from 'react';
import { ImageUpload } from '@/components/ImageUpload';
import { WorksheetTable, TableRow } from '@/components/WorksheetTable';
import { processImageWithOCR } from '@/utils/ocrProcessor';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const Index = () => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleImageSelect = async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setIsProcessing(true);
    setProgress(0);

    try {
      toast({
        title: "Processing image",
        description: "Extracting text using OCR...",
      });

      const extractedData = await processImageWithOCR(file, setProgress);
      setTableData(extractedData);

      toast({
        title: "Success",
        description: "Worksheet data extracted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setTableData([]);
    setProgress(0);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold text-primary">Accounting Worksheet Parser</h1>
          <p className="text-muted-foreground mt-1">
            Upload or paste worksheet images to extract and edit table data
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {!imagePreview ? (
          <ImageUpload onImageSelect={handleImageSelect} />
        ) : (
          <>
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="p-4 relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleReset}
                >
                  <X className="h-4 w-4" />
                </Button>
                <h3 className="text-lg font-semibold mb-4">Source Image</h3>
                <img
                  src={imagePreview}
                  alt="Uploaded worksheet"
                  className="w-full h-auto rounded border"
                />
              </Card>

              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Processing Status</h3>
                {isProcessing ? (
                  <div className="space-y-4">
                    <Progress value={progress} />
                    <p className="text-sm text-muted-foreground text-center">
                      Processing image... {progress}%
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-success font-semibold mb-2">✓ Processing complete</p>
                    <p className="text-sm text-muted-foreground">
                      Review and edit the extracted data below
                    </p>
                  </div>
                )}
              </Card>
            </div>

            {tableData.length > 0 && (
              <WorksheetTable data={tableData} onDataChange={setTableData} />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
