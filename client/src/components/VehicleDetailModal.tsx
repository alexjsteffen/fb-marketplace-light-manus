import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import {
  Loader2, Sparkles, Image as ImageIcon, Send, Edit, Check, X,
  ChevronLeft, ChevronRight, Trash2, Plus, Link as LinkIcon,
  GripVertical, Eye, EyeOff, Upload, Facebook
} from "lucide-react";
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

/** Parse imageUrl field — supports single URL string or JSON array */
function parseImages(imageUrl: string | null | undefined): string[] {
  if (!imageUrl) return [];
  try {
    const parsed = JSON.parse(imageUrl);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {}
  return imageUrl ? [imageUrl] : [];
}

export function VehicleDetailModal({ vehicle, open, onOpenChange }: VehicleDetailModalProps) {
  const [, setLocation] = useLocation();

  // ── Image state ──────────────────────────────────────────────────────────
  const [images, setImages] = useState<string[]>([]);
  const [primaryIndex, setPrimaryIndex] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Text / description state ──────────────────────────────────────────────
  const [selectedTone, setSelectedTone] = useState<"professional" | "casual" | "enthusiast">("professional");
  const [description, setDescription] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");
  const [editedPrice, setEditedPrice] = useState("");
  const [editedTitle, setEditedTitle] = useState("");

  // ── Image enhancement (optional, collapsed by default) ───────────────────
  const [showEnhancement, setShowEnhancement] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<"flash_sale" | "premium" | "value" | "event" | "creator" | "trending">("premium");

  // ── Sync state when vehicle changes ──────────────────────────────────────
  useEffect(() => {
    if (vehicle) {
      const imgs = parseImages(vehicle.imageUrl);
      setImages(imgs);
      setPrimaryIndex(0);
      setDescription(vehicle.description || "");
      setEditedDescription(vehicle.description || "");
      setEditedPrice(vehicle.price || "");
      setEditedTitle(`${vehicle.year ? vehicle.year + " " : ""}${vehicle.brand || ""} ${vehicle.model || ""}`.trim());
      setEditMode(false);
      setShowEnhancement(false);
      setShowUrlInput(false);
      setUrlInput("");
    }
  }, [vehicle]);

  // ── Upload image file ─────────────────────────────────────────────────────
  const uploadImageMutation = trpc.uploadImage.useMutation({
    onSuccess: (data) => {
      setImages(prev => {
        const updated = [...prev, data.url];
        persistImages(updated);
        return updated;
      });
      toast.success("Photo added!");
      setIsUploadingImage(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload photo");
      setIsUploadingImage(false);
    },
  });

  const handleImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target?.result as string;
      uploadImageMutation.mutate({
        base64Data,
        mimeType: file.type,
        filename: file.name,
      });
    };
    reader.readAsDataURL(file);
  }, [uploadImageMutation]);

  // ── Add image by URL ──────────────────────────────────────────────────────
  const handleAddUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    if (!url.startsWith("http")) {
      toast.error("Please enter a valid URL starting with http");
      return;
    }
    const updated = [...images, url];
    setImages(updated);
    persistImages(updated);
    setUrlInput("");
    setShowUrlInput(false);
    toast.success("Image link added!");
  };

  // ── Delete image ──────────────────────────────────────────────────────────
  const handleDeleteImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
    persistImages(updated);
    if (primaryIndex >= updated.length) setPrimaryIndex(Math.max(0, updated.length - 1));
  };

  // ── Reorder images (drag & drop in gallery) ───────────────────────────────
  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOverThumb = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const updated = [...images];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, moved);
    setImages(updated);
    setDraggedIndex(index);
    if (primaryIndex === draggedIndex) setPrimaryIndex(index);
  };
  const handleDragEnd = () => {
    persistImages(images);
    setDraggedIndex(null);
  };

  // ── Persist images to DB ──────────────────────────────────────────────────
  const updateItem = trpc.inventory.update.useMutation();
  const persistImages = (imgs: string[]) => {
    if (!vehicle?.id) return;
    const imageUrl = imgs.length === 0 ? "" : imgs.length === 1 ? imgs[0] : JSON.stringify(imgs);
    updateItem.mutate({ id: vehicle.id, imageUrl: imageUrl || undefined });
  };

  // ── AI description ────────────────────────────────────────────────────────
  const regenerateDescription = trpc.ads.regenerateDescription.useMutation({
    onSuccess: (data) => {
      const desc = typeof data.description === "string" ? data.description : "";
      setDescription(desc);
      setEditedDescription(desc);
      toast.success("Description regenerated!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to regenerate description");
    },
  });

  // ── Image enhancement (optional) ─────────────────────────────────────────
  const enhanceImage = trpc.ads.enhanceImage.useMutation({
    onSuccess: (data) => {
      const url = (data as { imageUrl: string }).imageUrl;
      const updated = [url, ...images.filter(img => img !== url)];
      setImages(updated);
      persistImages(updated);
      toast.success("Enhanced image added to gallery!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to enhance image");
    },
  });

  // ── Send to staging ───────────────────────────────────────────────────────
  const sendToStaging = trpc.ads.sendToStaging.useMutation({
    onSuccess: () => {
      toast.success("Ad sent to staging!");
      onOpenChange(false);
      const dealerId = vehicle?.dealerId || 60001;
      setLocation(`/ads/staging/${dealerId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send to staging");
    },
  });

  const handleSendToStaging = () => {
    const primaryImage = images[primaryIndex] || images[0] || "";
    sendToStaging.mutate({
      inventoryItemId: vehicle.id,
      description: editMode ? editedDescription : description,
      imageUrl: primaryImage,
      template: selectedTemplate,
      price: editedPrice,
    });
  };

  if (!vehicle) return null;

  const displayTitle = editedTitle || `${vehicle.year ? vehicle.year + " " : ""}${vehicle.brand || ""} ${vehicle.model || ""}`.trim() || "Untitled Listing";
  const displayPrice = editedPrice ? `$${parseFloat(editedPrice).toLocaleString()}` : vehicle.price ? `$${parseFloat(vehicle.price).toLocaleString()}` : "Price TBD";
  const displayDescription = editMode ? editedDescription : description;
  const primaryImage = images[primaryIndex] || images[0] || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] w-[1400px] max-h-[95vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl flex items-center gap-2">
            {displayTitle}
            <Badge variant="outline" className="ml-2">{vehicle.condition || "used"}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 h-full">

          {/* ── LEFT COLUMN: Image Management ─────────────────────────────── */}
          <div className="lg:col-span-1 border-r px-4 pb-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide pt-2">Photos</h3>

            {/* Primary image display */}
            <div
              className={`relative border-2 border-dashed rounded-lg overflow-hidden transition-colors ${isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
              style={{ minHeight: 220 }}
              onDragOver={(e) => {
                e.preventDefault();
                // Only set drag-over if it's a file being dragged (not a thumbnail)
                if (e.dataTransfer.types.includes("Files")) setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files.length > 0) {
                  Array.from(e.dataTransfer.files).forEach(file => handleImageFile(file));
                }
              }}
            >
              {primaryImage ? (
                <img
                  src={primaryImage}
                  alt="Primary listing photo"
                  className="w-full object-cover rounded-lg"
                  style={{ maxHeight: 260 }}
                />
              ) : (
                <div
                  className="flex flex-col items-center justify-center gap-2 py-10 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="w-12 h-12 text-gray-300" />
                  <p className="text-sm text-gray-500">Drag photos here from your desktop</p>
                  <p className="text-xs text-gray-400">or click to browse</p>
                </div>
              )}
              {isDragOver && (
                <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center rounded-lg">
                  <p className="text-blue-600 font-semibold text-sm">Drop to add photo</p>
                </div>
              )}
              {isUploadingImage && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              )}
            </div>

            {/* Thumbnail gallery with reorder + delete */}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((img, i) => (
                  <div
                    key={i}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={(e) => handleDragOverThumb(e, i)}
                    onDragEnd={handleDragEnd}
                    className={`relative group cursor-grab rounded overflow-hidden border-2 transition-all ${i === primaryIndex ? "border-blue-500" : "border-transparent hover:border-gray-300"}`}
                    style={{ width: 64, height: 64 }}
                    onClick={() => setPrimaryIndex(i)}
                  >
                    <img src={img} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    {i === primaryIndex && (
                      <div className="absolute bottom-0 left-0 right-0 bg-blue-500 text-white text-[9px] text-center leading-4">COVER</div>
                    )}
                    <button
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-bl p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); handleDeleteImage(i); }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute top-0 left-0 bg-black/30 text-white rounded-br p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical className="w-3 h-3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add photo controls */}
            <div className="flex gap-2 flex-wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) Array.from(e.target.files).forEach(f => handleImageFile(f));
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="flex-1"
              >
                <Upload className="w-3 h-3 mr-1" />
                Add Photo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="flex-1"
              >
                <LinkIcon className="w-3 h-3 mr-1" />
                Add Link
              </Button>
            </div>

            {showUrlInput && (
              <div className="flex gap-2">
                <Input
                  placeholder="https://..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
                  className="text-sm flex-1"
                  autoFocus
                />
                <Button size="sm" onClick={handleAddUrl}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowUrlInput(false); setUrlInput(""); }}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            {images.length > 0 && (
              <p className="text-xs text-gray-400">
                Drag thumbnails to reorder. First image = cover photo on FB. Click thumbnail to preview.
              </p>
            )}

            {/* ── Optional Image Enhancement (collapsed by default) ── */}
            <div className="border rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium bg-gray-50 hover:bg-gray-100 transition-colors"
                onClick={() => setShowEnhancement(!showEnhancement)}
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  AI Image Enhancement
                  <Badge variant="secondary" className="text-xs">Optional</Badge>
                </span>
                {showEnhancement ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
              </button>
              {showEnhancement && (
                <div className="p-3 space-y-3">
                  <p className="text-xs text-gray-500">Select a style template and generate an AI-enhanced version of your primary photo. The enhanced image will be added to your gallery.</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {TEMPLATE_OPTIONS.map((template) => (
                      <Button
                        key={template.value}
                        variant={selectedTemplate === template.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTemplate(template.value as typeof selectedTemplate)}
                        className="flex flex-col h-auto py-1.5"
                      >
                        <span className="text-base">{template.icon}</span>
                        <span className="text-[10px]">{template.label}</span>
                      </Button>
                    ))}
                  </div>
                  <Button
                    onClick={() => enhanceImage.mutate({ inventoryItemId: vehicle.id, template: selectedTemplate })}
                    disabled={enhanceImage.isPending || images.length === 0}
                    className="w-full"
                    variant="secondary"
                    size="sm"
                  >
                    {enhanceImage.isPending ? (
                      <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Enhancing...</>
                    ) : (
                      <><Sparkles className="w-3 h-3 mr-2" />Generate Enhanced Image</>
                    )}
                  </Button>
                  {images.length === 0 && <p className="text-xs text-amber-600">Add at least one photo first</p>}
                </div>
              )}
            </div>

            {/* Item details */}
            <div className="border rounded-lg p-3 space-y-2">
              <h3 className="font-semibold text-sm">Item Details</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {vehicle.stockNumber && <div><span className="text-gray-500 text-xs">Stock #</span><p className="font-medium text-xs">{vehicle.stockNumber}</p></div>}
                {vehicle.category && <div><span className="text-gray-500 text-xs">Category</span><p className="font-medium text-xs">{vehicle.category}</p></div>}
                {vehicle.location && <div className="col-span-2"><span className="text-gray-500 text-xs">Location</span><p className="font-medium text-xs">{vehicle.location}</p></div>}
              </div>
            </div>
          </div>

          {/* ── MIDDLE COLUMN: Description & Controls ─────────────────────── */}
          <div className="lg:col-span-1 border-r px-4 pb-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide pt-2">Ad Copy</h3>

            {/* Editable title */}
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Title</Label>
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="font-semibold"
                placeholder="Listing title..."
              />
            </div>

            {/* Editable price */}
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Price ($)</Label>
              <Input
                type="number"
                value={editedPrice}
                onChange={(e) => setEditedPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>

            {/* Tone selector */}
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">AI Tone</Label>
              <div className="flex gap-2">
                {TONE_OPTIONS.map((tone) => (
                  <Button
                    key={tone.value}
                    variant={selectedTone === tone.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTone(tone.value as typeof selectedTone)}
                    className="flex-1 text-xs"
                  >
                    {tone.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Regenerate button */}
            <Button
              onClick={() => regenerateDescription.mutate({ inventoryItemId: vehicle.id, tone: selectedTone })}
              disabled={regenerateDescription.isPending}
              className="w-full"
              variant="secondary"
              size="sm"
            >
              {regenerateDescription.isPending ? (
                <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Generating...</>
              ) : (
                <><Sparkles className="w-3 h-3 mr-2" />Generate AI Description</>
              )}
            </Button>

            {/* Description editor */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-500">Description</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => {
                    if (editMode) setDescription(editedDescription);
                    else setEditedDescription(description);
                    setEditMode(!editMode);
                  }}
                >
                  {editMode ? <><Check className="w-3 h-3 mr-1" />Save</> : <><Edit className="w-3 h-3 mr-1" />Edit</>}
                </Button>
              </div>
              <Textarea
                value={editMode ? editedDescription : description}
                onChange={(e) => editMode && setEditedDescription(e.target.value)}
                readOnly={!editMode}
                className={`min-h-[280px] text-sm resize-none ${!editMode ? "bg-gray-50 cursor-default" : ""}`}
                placeholder="Description will appear here after generation, or type your own..."
              />
            </div>

            {/* Send to staging */}
            <Button
              onClick={handleSendToStaging}
              disabled={sendToStaging.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {sendToStaging.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" />Send to Ad Staging</>
              )}
            </Button>
          </div>

          {/* ── RIGHT COLUMN: Live FB Marketplace Preview ─────────────────── */}
          <div className="lg:col-span-1 px-4 pb-4 bg-gray-50">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide pt-2 pb-3 flex items-center gap-2">
              <Facebook className="w-4 h-4 text-blue-600" />
              Live Preview
            </h3>

            {/* FB Marketplace-style listing card */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 max-w-sm mx-auto">
              {/* Image area */}
              <div className="relative bg-gray-100" style={{ aspectRatio: "4/3" }}>
                {primaryImage ? (
                  <img
                    src={primaryImage}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-gray-300" />
                  </div>
                )}
                {images.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                    {primaryIndex + 1} / {images.length}
                  </div>
                )}
                {images.length > 1 && (
                  <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${i === primaryIndex ? "bg-white" : "bg-white/50"}`}
                        onClick={() => setPrimaryIndex(i)}
                      />
                    ))}
                  </div>
                )}
                {/* Navigation arrows for preview */}
                {images.length > 1 && (
                  <>
                    <button
                      className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition-colors"
                      onClick={() => setPrimaryIndex(i => (i - 1 + images.length) % images.length)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition-colors"
                      onClick={() => setPrimaryIndex(i => (i + 1) % images.length)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              {/* Listing info */}
              <div className="p-3">
                <p className="text-xl font-bold text-gray-900">{displayPrice}</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5 line-clamp-2">{displayTitle}</p>
                {vehicle.location && (
                  <p className="text-xs text-gray-500 mt-1">{vehicle.location}</p>
                )}
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-600 line-clamp-4 whitespace-pre-wrap">
                    {displayDescription || <span className="text-gray-300 italic">Description will appear here...</span>}
                  </p>
                </div>
              </div>

              {/* FB-style footer */}
              <div className="px-3 pb-3">
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-500">
                      {(vehicle.dealerName || "S").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700">{vehicle.dealerName || "Seller"}</p>
                    <p className="text-[10px] text-gray-400">Facebook Marketplace</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Thumbnail strip in preview */}
            {images.length > 1 && (
              <div className="flex gap-1.5 mt-3 justify-center flex-wrap">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setPrimaryIndex(i)}
                    className={`w-12 h-12 rounded overflow-hidden border-2 transition-all ${i === primaryIndex ? "border-blue-500" : "border-transparent opacity-60 hover:opacity-100"}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-400 text-center mt-3">
              This preview updates in real time as you edit your ad.
            </p>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
