import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Copy, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface ContentGeneratorProps {
  facebookAdId: number;
}

export function ContentGenerator({ facebookAdId }: ContentGeneratorProps) {
  const [copiedBadge, setCopiedBadge] = useState(false);
  const [copiedPillar, setCopiedPillar] = useState(false);
  const [copiedBlog, setCopiedBlog] = useState(false);
  const utils = trpc.useUtils();

  const { data: content, isLoading } = trpc.content.getByAdId.useQuery({
    facebookAdId,
  });

  const generateContent = trpc.content.generateContent.useMutation({
    onSuccess: () => {
      toast.success("Content generated successfully!");
      utils.content.getByAdId.invalidate({ facebookAdId });
    },
    onError: (error) => {
      toast.error(`Failed to generate content: ${error.message}`);
    },
  });

  const handleGenerate = () => {
    generateContent.mutate({ facebookAdId });
  };

  const copyToClipboard = async (text: string, type: 'badge' | 'pillar' | 'blog') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'badge') {
        setCopiedBadge(true);
        setTimeout(() => setCopiedBadge(false), 2000);
      } else if (type === 'pillar') {
        setCopiedPillar(true);
        setTimeout(() => setCopiedPillar(false), 2000);
      } else {
        setCopiedBlog(true);
        setTimeout(() => setCopiedBlog(false), 2000);
      }
      toast.success("Copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const badgeImage = content?.find(c => c.contentType === 'badge_image');
  const pillarPage = content?.find(c => c.contentType === 'pillar_page');
  const blogPost = content?.find(c => c.contentType === 'blog_post');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!content || content.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <Sparkles className="h-12 w-12 mx-auto text-primary" />
          <h3 className="text-lg font-semibold">Generate Website Content</h3>
          <p className="text-sm text-muted-foreground">
            Create badge image, pillar page article, and blog post for this Facebook Marketplace ad
          </p>
          <Button
            onClick={handleGenerate}
            disabled={generateContent.isPending}
            className="mt-4"
          >
            {generateContent.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Content...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate All Content
              </>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Badge Image */}
      {badgeImage && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Badge Image</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(badgeImage.badgeImageUrl || '', 'badge')}
            >
              {copiedBadge ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy URL
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            "As Seen On Facebook Marketplace" badge for dealer website
          </p>
          {badgeImage.badgeImageUrl && (
            <div className="border rounded-lg overflow-hidden">
              <img
                src={badgeImage.badgeImageUrl}
                alt="Badge Image"
                className="w-full h-auto"
              />
            </div>
          )}
        </Card>
      )}

      {/* Pillar Page Content */}
      {pillarPage && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Pillar Page Article</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(pillarPage.content || '', 'pillar')}
            >
              {copiedPillar ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Content
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            Comprehensive SEO-optimized article (800-1200 words)
          </p>
          <p className="text-sm font-medium mb-4">{pillarPage.title}</p>
          <div className="border rounded-lg p-4 bg-muted/30 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm font-mono">{pillarPage.content}</pre>
          </div>
        </Card>
      )}

      {/* Blog Post */}
      {blogPost && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Blog Post</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(blogPost.content || '', 'blog')}
            >
              {copiedBlog ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Content
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            Conversational blog post (300-500 words)
          </p>
          <p className="text-sm font-medium mb-4">{blogPost.title}</p>
          <div className="border rounded-lg p-4 bg-muted/30 max-h-64 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm font-mono">{blogPost.content}</pre>
          </div>
        </Card>
      )}

      {/* Regenerate Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleGenerate}
          disabled={generateContent.isPending}
          variant="outline"
        >
          {generateContent.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Regenerate All Content
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
