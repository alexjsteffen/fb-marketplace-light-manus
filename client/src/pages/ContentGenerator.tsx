import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { FileText, Download, Sparkles, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function ContentGenerator() {
  const { adId } = useParams<{ adId: string }>();
  const { loading: authLoading } = useAuth();
  const [contentType, setContentType] = useState<"pillar_page" | "blog_post" | "badge_image">("pillar_page");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: ad, isLoading: adLoading } = trpc.ads.getById.useQuery(
    { id: parseInt(adId || "0") },
    { enabled: !!adId }
  );

  const { data: existingContent, refetch } = trpc.content.getByAdId.useQuery(
    { facebookAdId: parseInt(adId || "0") },
    { enabled: !!adId }
  );

  const createContent = trpc.content.create.useMutation({
    onSuccess: () => {
      toast.success("Content saved successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save content");
    },
  });

  const handleGenerateContent = () => {
    if (!ad) return;
    
    setIsGenerating(true);
    
    // Simulate content generation (in real app, this would call an AI endpoint)
    setTimeout(() => {
      let content = "";
      
      if (contentType === "pillar_page") {
        content = `# As Seen On Facebook Marketplace\n\n## Featured Vehicle: ${ad.finalText?.split('\n')[0] || 'Vehicle'}\n\n${ad.finalText || ''}\n\n### Why Buy From Us?\n\nOur dealership is committed to providing quality vehicles and exceptional customer service. This vehicle is currently featured on our Facebook Marketplace and available for immediate purchase.\n\n[View on Facebook Marketplace](${ad.facebookMarketplaceUrl || '#'})\n\n### Contact Us\n\nInterested in this vehicle? Contact us today to schedule a test drive or learn more about financing options.`;
      } else if (contentType === "blog_post") {
        content = `# New Arrival: ${ad.finalText?.split('\n')[0] || 'Featured Vehicle'}\n\nWe're excited to announce a new addition to our inventory! ${ad.finalText || ''}\n\n## Features & Highlights\n\nThis vehicle offers exceptional value and reliability. Visit our Facebook Marketplace listing to see more photos and details.\n\n## Available Now\n\nDon't miss out on this opportunity! This vehicle is available for immediate purchase and test drives.\n\n[See Full Listing on Facebook](${ad.facebookMarketplaceUrl || '#'})`;
      } else {
        content = "Badge image generation coming soon...";
      }
      
      setGeneratedContent(content);
      setIsGenerating(false);
      toast.success("Content generated!");
    }, 1500);
  };

  const handleSaveContent = () => {
    if (!ad || !generatedContent) {
      toast.error("Please generate content first");
      return;
    }

    createContent.mutate({
      dealerId: ad.dealerId,
      facebookAdId: ad.id,
      contentType,
      title: ad.finalText?.split('\n')[0] || "Facebook Ad Content",
      content: generatedContent,
      exportFormat: "markdown",
    });
  };

  const handleDownload = () => {
    if (!generatedContent) return;
    
    const blob = new Blob([generatedContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `facebook-content-${adId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Content downloaded!");
  };

  if (authLoading || adLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Ad not found</p>
          <Button className="mt-4" asChild>
            <Link href="/dealers">Back to Dealers</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" asChild>
                <Link href={`/dashboard/${ad.dealerId}`}>← Back to Dashboard</Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Content Generator</h1>
                <p className="text-sm text-gray-600">As Seen On Facebook</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={!generatedContent}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={handleSaveContent}
                disabled={!generatedContent || createContent.isPending}
              >
                Save Content
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Ad Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Facebook Ad</CardTitle>
                <CardDescription>Source material for content generation</CardDescription>
              </CardHeader>
              <CardContent>
                {ad.imageUrl && (
                  <img
                    src={ad.imageUrl}
                    alt="Ad"
                    className="w-full rounded-lg shadow-lg mb-4"
                  />
                )}
                {ad.finalText && (
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {ad.finalText}
                  </div>
                )}
                {ad.facebookMarketplaceUrl && (
                  <Button asChild variant="outline" size="sm" className="w-full mt-4">
                    <a href={ad.facebookMarketplaceUrl} target="_blank" rel="noopener noreferrer">
                      View on Facebook
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>

            {existingContent && existingContent.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Saved Content</CardTitle>
                  <CardDescription>Previously generated content</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {existingContent.map((content) => (
                      <div key={content.id} className="p-3 bg-gray-50 rounded border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{content.title}</span>
                          <Badge variant="outline">{content.contentType}</Badge>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(content.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Content Generation */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  Generate Content
                </CardTitle>
                <CardDescription>
                  Create SEO-optimized content for your dealer website
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Content Type</label>
                  <Select value={contentType} onValueChange={(value: any) => setContentType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pillar_page">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Pillar Page
                        </div>
                      </SelectItem>
                      <SelectItem value="blog_post">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Blog Post
                        </div>
                      </SelectItem>
                      <SelectItem value="badge_image">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          Badge Image
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleGenerateContent}
                  disabled={isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate {contentType === "pillar_page" ? "Pillar Page" : contentType === "blog_post" ? "Blog Post" : "Badge Image"}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {generatedContent && (
              <Card>
                <CardHeader>
                  <CardTitle>Generated Content</CardTitle>
                  <CardDescription>
                    Edit as needed, then save or download
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={generatedContent}
                    onChange={(e) => setGeneratedContent(e.target.value)}
                    rows={20}
                    className="font-mono text-sm"
                  />
                </CardContent>
              </Card>
            )}

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-blue-900 mb-2">
                  About "As Seen On Facebook"
                </h3>
                <p className="text-sm text-blue-800 mb-4">
                  This feature generates SEO-optimized content for your dealer website that references your Facebook Marketplace listings. This cross-promotion strategy enhances your dealership's visibility in search engines and AI-powered search results.
                </p>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li><strong>Pillar Pages:</strong> Comprehensive landing pages for featured vehicles</li>
                  <li><strong>Blog Posts:</strong> News-style articles about new inventory arrivals</li>
                  <li><strong>Badge Images:</strong> "As Seen On Facebook" graphics for your website</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
