import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Sparkles, Image as ImageIcon, ArrowRight, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { toast } from "sonner";

export default function AdCreator() {
  const { inventoryId } = useParams<{ inventoryId: string }>();
  const [, setLocation] = useLocation();
  const { loading: authLoading } = useAuth();
  
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [tone, setTone] = useState("professional");
  const [originalText, setOriginalText] = useState("");
  const [enhancedText, setEnhancedText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  const { data: item, isLoading: itemLoading } = trpc.inventory.getById.useQuery(
    { id: parseInt(inventoryId || "0") },
    { enabled: !!inventoryId }
  );

  const { data: templates, isLoading: templatesLoading } = trpc.templates.list.useQuery();

  const TONE_OPTIONS = [
    { value: "professional", label: "Professional Tone" },
    { value: "casual", label: "Casual & Friendly" },
    { value: "exciting", label: "Exciting & Energetic" },
    { value: "luxury", label: "Luxury & Premium" },
    { value: "value", label: "Value-Focused" },
  ];

  const TEMPLATE_ICONS: Record<string, { icon: string; description: string }> = {
    "Flash Sale": { icon: "⚡", description: "Red/orange urgency with countdown timer" },
    Premium: { icon: "✨", description: "Luxury styling with gold accents" },
    Value: { icon: "💰", description: "Green background emphasizing savings" },
    Event: { icon: "📅", description: "Professional event marketing style" },
    Creator: { icon: "🎬", description: "Trendy social media aesthetic" },
    Trending: { icon: "🚀", description: "Modern contemporary design" },
  };

  const enhanceText = trpc.enhance.text.useMutation({
    onSuccess: (data) => {
      setEnhancedText(data.enhancedText);
      setFinalText(data.enhancedText);
      toast.success("Text enhanced successfully!");
      setIsEnhancing(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to enhance text");
      setIsEnhancing(false);
    },
  });

  const generateImage = trpc.enhance.generateImage.useMutation({
    onSuccess: (data) => {
      setGeneratedImageUrl(data.url);
      toast.success("Image generated successfully!");
      setIsGenerating(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate image");
      setIsGenerating(false);
    },
  });

  const createAd = trpc.ads.create.useMutation({
    onSuccess: () => {
      toast.success("Ad created successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create ad");
    },
  });

  // Auto-generate original text from item details
  useEffect(() => {
    if (item && !originalText) {
      const parts = [];
      if (item.year) parts.push(item.year);
      if (item.brand) parts.push(item.brand);
      if (item.model) parts.push(item.model);
      if (item.description) parts.push(`\n\n${item.description}`);
      setOriginalText(parts.join(" "));
    }
  }, [item]);

  const handleEnhanceText = () => {
    if (!item) return;
    setIsEnhancing(true);
    enhanceText.mutate({
      brand: item.brand || undefined,
      model: item.model || undefined,
      year: item.year || undefined,
      category: item.category || undefined,
      price: item.price || undefined,
      description: item.description || undefined,
      condition: item.condition || undefined,
    });
  };

  const handleGenerateImage = async () => {
    if (!item?.imageUrl || !selectedTemplate) {
      toast.error("Please select a template and ensure vehicle has an image");
      return;
    }

    const template = templates?.find((t) => t.id === selectedTemplate);
    if (!template) return;

    setIsGenerating(true);

    const title = `${item.year || ""} ${item.brand || ""} ${item.model || ""}`.trim();
    const price = item.price ? `$${parseFloat(item.price).toLocaleString()}` : undefined;

    generateImage.mutate({
      vehicleImageUrl: item.imageUrl,
      templateType: template.templateType as any,
      overlayText: {
        title,
        price,
        subtitle: item.category || undefined,
      },
    });
  };

  const handleSaveAndStage = async () => {
    if (!item || !generatedImageUrl) {
      toast.error("Please generate an image first");
      return;
    }

    try {
      await createAd.mutateAsync({
        dealerId: item.dealerId,
        inventoryItemId: item.id,
        templateId: selectedTemplate || undefined,
        originalText,
      });
      
      setLocation(`/ads/staging/${item.dealerId}`);
    } catch (error) {
      console.error("Failed to save ad:", error);
    }
  };

  if (authLoading || itemLoading || templatesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Inventory item not found</p>
          <Link href="/dealers">
            <Button className="mt-4">Back to Dealers</Button>
          </Link>
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
              <Link href={`/inventory/${item.dealerId}`}>
                <Button variant="ghost">← Back to Inventory</Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create Facebook Ad</h1>
                <p className="text-sm text-gray-600">
                  {item.year} {item.brand} {item.model} - Stock #{item.stockNumber}
                </p>
              </div>
            </div>
            <Button
              onClick={handleSaveAndStage}
              disabled={!generatedImageUrl || createAd.isPending}
              size="lg"
            >
              {createAd.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Save & Stage Ad
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Text Enhancement */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  AI Text Enhancement
                </CardTitle>
                <CardDescription>
                  Generate compelling ad copy using AI, then edit as needed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Original Description</Label>
                  <Textarea
                    value={originalText}
                    onChange={(e) => setOriginalText(e.target.value)}
                    rows={4}
                    className="mt-2"
                  />
                </div>

                <Button
                  onClick={handleEnhanceText}
                  disabled={isEnhancing || !originalText}
                  className="w-full"
                >
                  {isEnhancing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enhancing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Regenerate
                    </>
                  )}
                </Button>

                {enhancedText && (
                  <div className="space-y-2">
                    <Label>Enhanced Ad Copy (Editable)</Label>
                    <Textarea
                      value={finalText}
                      onChange={(e) => setFinalText(e.target.value)}
                      rows={8}
                      className="mt-2"
                    />
                    <p className="text-sm text-gray-500">
                      {finalText.length} characters
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vehicle Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Stock Number:</span>
                  <span className="font-medium">{item.stockNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium">{item.category || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Condition:</span>
                  <span className="font-medium capitalize">{item.condition}</span>
                </div>
                {item.price && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-medium text-lg text-blue-600">
                      ${parseFloat(item.price).toLocaleString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Image Generation */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-blue-600" />
                  Background Template
                </CardTitle>
                <CardDescription>
                  Choose a professional background template for your ad image
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {templates?.map((template) => {
                    const iconData = TEMPLATE_ICONS[template.name] || {
                      icon: "🎨",
                      description: template.name,
                    };
                    return (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template.id)}
                        className={`p-4 border-2 rounded-lg text-left transition-all hover:border-blue-500 ${
                          selectedTemplate === template.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{iconData.icon}</span>
                          <span className="font-semibold text-sm">{template.name}</span>
                        </div>
                        <p className="text-xs text-gray-600">{iconData.description}</p>
                      </button>
                    );
                  })}
                </div>

                <Button
                  onClick={handleGenerateImage}
                  disabled={isGenerating || !selectedTemplate || !item.imageUrl}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Image...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Generate Ad Image
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Enhanced Preview</CardTitle>
                  {generatedImageUrl && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                      Ready
                    </span>
                  )}
                </div>
                <CardDescription>
                  {generatedImageUrl
                    ? "Download this image to drag and drop to Facebook Marketplace"
                    : "Generate an enhanced image with your selected template"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-4">
                  {generatedImageUrl ? (
                    <img
                      src={generatedImageUrl}
                      alt="Enhanced ad"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <p className="text-sm">Select a template and click Generate</p>
                    </div>
                  )}
                </div>
                {generatedImageUrl && (
                  <div className="space-y-2">
                    <Button asChild className="w-full">
                      <a href={generatedImageUrl} download target="_blank" rel="noopener noreferrer">
                        Download Image
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleGenerateImage}
                      disabled={isGenerating}
                      className="w-full"
                    >
                      Regenerate
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Original Image for Comparison */}
            {item.imageUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Original Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt="Original"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
