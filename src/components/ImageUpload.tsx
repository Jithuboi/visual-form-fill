import { useCallback, useRef, useState } from 'react';
import { Upload, Clipboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
}

export const ImageUpload = ({ onImageSelect }: ImageUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }
    onImageSelect(file);
  }, [onImageSelect, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const file = new File([blob], 'clipboard-image.png', { type });
            handleFile(file);
            return;
          }
        }
      }
      toast({
        title: "No image found",
        description: "Please copy an image to clipboard first",
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Clipboard access denied",
        description: "Please grant clipboard permission or use file upload",
        variant: "destructive",
      });
    }
  }, [handleFile, toast]);

  return (
    <Card
      className={`border-2 border-dashed transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'border-border'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="p-8 text-center space-y-4">
        <div className="flex justify-center">
          <Upload className="h-12 w-12 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">Upload Worksheet Image</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop an image, or click to browse
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="default"
          >
            <Upload className="h-4 w-4 mr-2" />
            Browse Files
          </Button>
          <Button
            onClick={handlePaste}
            variant="outline"
          >
            <Clipboard className="h-4 w-4 mr-2" />
            Paste from Clipboard
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
    </Card>
  );
};
