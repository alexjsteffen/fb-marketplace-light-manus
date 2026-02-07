import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface MarketplaceLinkProps {
  url: string;
  title: string;
  stockNumber?: string;
  publishedAt?: Date;
  compact?: boolean;
}

/**
 * Component to display Facebook Marketplace links with copy functionality
 * Used for embedding links in blog posts and content
 */
export function MarketplaceLink({ url, title, stockNumber, publishedAt, compact = false }: MarketplaceLinkProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleOpen = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          <p className="text-xs text-gray-500 truncate">{url}</p>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleOpen}>
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-semibold text-lg mb-1">{title}</h4>
            {stockNumber && (
              <Badge variant="outline" className="mb-2">
                Stock: {stockNumber}
              </Badge>
            )}
            {publishedAt && (
              <p className="text-xs text-gray-500">
                Published {new Date(publishedAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <Badge variant="default">Published</Badge>
        </div>

        <div className="bg-gray-50 p-3 rounded border mb-3">
          <p className="text-sm text-gray-700 break-all">{url}</p>
        </div>

        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleCopy}
            className="flex-1"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </>
            )}
          </Button>
          <Button 
            size="sm" 
            variant="default" 
            onClick={handleOpen}
            className="flex-1"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in Facebook
          </Button>
        </div>

        <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-800">
          💡 Use this link in your blog posts and "As Seen On Facebook" content for SEO
        </div>
      </CardContent>
    </Card>
  );
}
