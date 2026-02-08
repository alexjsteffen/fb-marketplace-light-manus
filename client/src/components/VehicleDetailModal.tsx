import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, Sparkles, Image as ImageIcon, Send, Edit, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface VehicleDetailModalProps {
  vehicle: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TONE_OPTIONS = [
  { value: "professional", label: "Pro", description: "Professional and detailed" },
  { value: "casual", label: "Casual", description: "Friendly and conversational" },
  { value: "enthusiast", label: "Enthusiast", description: "Passionate and exciting" },
];

const TEMPLATE_OPTIONS = [
  { value: "flash_sale", label: "Flash Sale", icon: "⚡" },
  { value: "premium", label: "Premium", icon: "✨" },
  { value: "value", label: "Value", icon: "💰" },
  { value: "event", label: "Event", icon: "🎉" },
  { value: "creator", label: "Creator", icon: "🎨" },
  { value: "trending", label: "Trending", icon: "🔥" },
];

export function VehicleDetailModal({ vehicle, open, onOpenChange }: VehicleDetailModalProps) {
  const [, setLocation] = useLocation();
  const [selectedTone, setSelectedTone] = useState<"professional" | "casual" | "enthusiast">("professional");
  const [selectedTemplate, setSelectedTemplate] = useState<"flash_sale" | "premium" | "value" | "event" | "creator" | "trending">("premium");
  const [enhancedDescription, setEnhancedDescription] = useState("");
  const [enhancedImageUrl, setEnhancedImageUrl] = useState("");
  const [imageExpanded, setImageExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedPrice, setEditedPrice] = useState("");
  const [editedDescription, setEditedDescription] = useState("");

  // Sync state when vehicle changes
  useEffect(() => {
    if (vehicle) {
      setEnhancedDescription(vehicle.description || "");
      setEnhancedImageUrl(vehicle.imageUrl || "");
      setEditedPrice(vehicle.price || "");
      setEditedDescription(vehicle.description || "");
      setEditMode(false);
    }
  }, [vehicle]);

  const regenerateDescription = trpc.ads.regenerateDescription.useMutation({
    onSuccess: (data) => {
      const desc = typeof data.description === 'string' ? data.description : '';
      setEnhancedDescription(desc);
      toast.success("Description regenerated!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to regenerate description");
    },
  });

  const enhanceImage = trpc.ads.enhanceImage.useMutation({
    onSuccess: (data) => {
      setEnhancedImageUrl((data as { imageUrl: string }).imageUrl);
      toast.success("Image enhanced!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to enhance image");
    },
  });

  const sendToStaging = trpc.ads.sendToStaging.useMutation({
    onSuccess: () => {
      toast.success("Ad sent to staging!");
      onOpenChange(false);
      // Navigate to ad staging with dealer ID
      const dealerId = vehicle?.dealerId || 60001;
      setLocation(`/ads/staging/${dealerId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send to staging");
    },
  });

  const handleRegenerateDescription = () => {
    regenerateDescription.mutate({
      inventoryItemId: vehicle.id,
      tone: selectedTone,
    });
  };

  const handleEnhanceImage = () => {
    enhanceImage.mutate({
      inventoryItemId: vehicle.id,
      template: selectedTemplate,
    });
  };

  const handleSendToStaging = () => {
    sendToStaging.mutate({
      inventoryItemId: vehicle.id,
      description: editMode ? editedDescription : enhancedDescription,
      imageUrl: enhancedImageUrl,
      template: selectedTemplate,
      price: editedPrice,
    });
  };

  if (!vehicle) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {vehicle.year} {vehicle.brand} {vehicle.model}
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column - Image and Enhancement */}
          <div className="space-y-4">
            <div className="relative">
              {enhancedImageUrl ? (
                <img
                  src={enhancedImageUrl}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  className="w-full h-80 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setImageExpanded(true)}
                />
              ) : (
                <div className="w-full h-80 bg-gray-200 flex items-center justify-center rounded-lg">
                  <ImageIcon className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </div>

            {/* Image Lightbox */}
            <Dialog open={imageExpanded} onOpenChange={setImageExpanded}>
              <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
                <DialogTitle className="sr-only">
                  Enhanced Image: {vehicle.year} {vehicle.brand} {vehicle.model}
                </DialogTitle>
                <img
                  src={enhancedImageUrl}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  className="w-full h-full object-contain"
                />
              </DialogContent>
            </Dialog>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Image Enhancement
                </h3>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {TEMPLATE_OPTIONS.map((template) => (
                    <Button
                      key={template.value}
                      variant={selectedTemplate === template.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTemplate(template.value as typeof selectedTemplate)}
                      className="flex flex-col h-auto py-2"
                    >
                      <span className="text-lg mb-1">{template.icon}</span>
                      <span className="text-xs">{template.label}</span>
                    </Button>
                  ))}
                </div>
                <Button
                  onClick={handleEnhanceImage}
                  disabled={enhanceImage.isPending}
                  className="w-full"
                  variant="secondary"
                >
                  {enhanceImage.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enhancing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Enhance Image
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Vehicle Details */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Stock Number:</span>
                  <span className="font-medium">{vehicle.stockNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Condition:</span>
                  <Badge>{vehicle.condition}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <Badge variant={vehicle.status === "active" ? "default" : "secondary"}>
                    {vehicle.status}
                  </Badge>
                </div>
                {vehicle.price && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Price:</span>
                    {editMode ? (
                      <Input
                        type="number"
                        value={editedPrice}
                        onChange={(e) => setEditedPrice(e.target.value)}
                        className="w-32 h-8 text-right"
                      />
                    ) : (
                      <span className="text-xl font-bold text-blue-600">
                        ${parseFloat(editedPrice || vehicle.price).toLocaleString()}
                      </span>
                    )}
                  </div>
                )}
                {vehicle.category && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Category:</span>
                    <span className="font-medium">{vehicle.category}</span>
                  </div>
                )}
                {vehicle.location && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Location:</span>
                    <span className="font-medium">{vehicle.location}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Description and Regeneration */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Description
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (editMode) {
                        // Save changes
                        setEnhancedDescription(editedDescription);
                      } else {
                        // Enter edit mode
                        setEditedDescription(enhancedDescription || vehicle.description || "");
                      }
                      setEditMode(!editMode);
                    }}
                  >
                    {editMode ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Save
                      </>
                    ) : (
                      <>
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex gap-2 mb-3">
                  {TONE_OPTIONS.map((tone) => (
                    <Button
                      key={tone.value}
                      variant={selectedTone === tone.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTone(tone.value as typeof selectedTone)}
                      className="flex-1"
                    >
                      {tone.label}
                    </Button>
                  ))}
                </div>
                <Button
                  onClick={handleRegenerateDescription}
                  disabled={regenerateDescription.isPending}
                  className="w-full mb-4"
                  variant="secondary"
                >
                  {regenerateDescription.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Regenerate Description
                    </>
                  )}
                </Button>
                {editMode ? (
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="min-h-[200px] max-h-[400px]"
                    placeholder="Enter description..."
                  />
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {enhancedDescription || vehicle.description || "No description available"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Send to Staging Button */}
            <Button
              onClick={handleSendToStaging}
              disabled={sendToStaging.isPending}
              className="w-full"
              size="lg"
            >
              {sendToStaging.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send to Ad Staging
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
