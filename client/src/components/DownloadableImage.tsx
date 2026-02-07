import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface DownloadableImageProps {
  imageUrl: string;
  filename: string;
  alt?: string;
  className?: string;
}

/**
 * Component that displays an image and provides download functionality
 * The image can be dragged directly to Facebook Marketplace
 */
export function DownloadableImage({ imageUrl, filename, alt, className }: DownloadableImageProps) {
  const handleDownload = async () => {
    try {
      // Fetch the image
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Image downloaded successfully");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download image");
    }
  };

  return (
    <div className="relative group">
      <img
        src={imageUrl}
        alt={alt || filename}
        className={className || "w-full h-auto rounded-lg shadow-lg"}
        draggable={true}
        onDragStart={(e) => {
          // Set the image URL as the drag data
          e.dataTransfer.setData('text/uri-list', imageUrl);
          e.dataTransfer.setData('text/plain', imageUrl);
          e.dataTransfer.effectAllowed = 'copy';
        }}
      />
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleDownload}
          className="shadow-lg"
        >
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      </div>
      <div className="mt-2 text-sm text-gray-600 text-center">
        💡 Drag this image directly to Facebook Marketplace or click Download
      </div>
    </div>
  );
}
