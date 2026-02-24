import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Facebook, ExternalLink, Copy, Check, Trash2, Eye, Pencil, Sparkles, Link as LinkIcon } from "lucide-react";
import { ContentGenerator } from "@/components/ContentGenerator";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

/** Parse imageUrl field — supports single URL string or JSON array */
function parseImages(imageUrl: string | null | undefined): string[] {
  if (!imageUrl) return [];
  try {
    const parsed = JSON.parse(imageUrl);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {}
  return imageUrl ? [imageUrl] : [];
}

export default function AdStaging() {
  const { dealerId } = useParams<{ dealerId: string }>();
  const { loading: authLoading } = useAuth();
  const [selectedAd, setSelectedAd] = useState<number | null>(null);
  const [facebookUrl, setFacebookUrl] = useState("");
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedPrice, setCopiedPrice] = useState(false);
  const [copiedDescription, setCopiedDescription] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showContentDialog, setShowContentDialog] = useState(false);
  const [contentAdId, setContentAdId] = useState<number | null>(null);
  const [editedText, setEditedText] = useState("");
  const [editingFbUrl, setEditingFbUrl] = useState<number | null>(null);
  const [tempFbUrl, setTempFbUrl] = useState("");

  const { data: ads, isLoading, refetch } = trpc.ads.list.useQuery(
    { dealerId: parseInt(dealerId || "0") },
    { enabled: !!dealerId }
  );

  const { data: dealer } = trpc.dealers.getById.useQuery(
    { id: parseInt(dealerId || "0") },
    { enabled: !!dealerId }
  );

  const updateAd = trpc.ads.update.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update ad");
    },
  });

  const deleteAd = trpc.ads.delete.useMutation({
    onSuccess: () => {
      toast.success("Ad deleted successfully!");
      setSelectedAd(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete ad");
    },
  });

  const handleDelete = (adId: number) => {
    if (confirm("Are you sure you want to delete this ad? This action cannot be undone.")) {
      deleteAd.mutate({ id: adId });
    }
  };

  const handleEdit = (ad: typeof selectedAdData) => {
    if (!ad) return;
    setSelectedAd(ad.id);
    setEditedText(ad.finalText || ad.enhancedText || ad.originalText || "");
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!selectedAd) return;
    updateAd.mutate({
      id: selectedAd,
      finalText: editedText,
    });
    setShowEditDialog(false);
    toast.success("Ad updated successfully!");
  };

  const handleCopy = (text: string, type: "title" | "price" | "description") => {
    navigator.clipboard.writeText(text);
    if (type === "title") {
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 2000);
    } else if (type === "price") {
      setCopiedPrice(true);
      setTimeout(() => setCopiedPrice(false), 2000);
    } else {
      setCopiedDescription(true);
      setTimeout(() => setCopiedDescription(false), 2000);
    }
    toast.success("Copied to clipboard!");
  };

  const handlePublish = (adId?: number) => {
    const targetId = adId ?? selectedAd;
    if (!targetId || !facebookUrl) {
      toast.error("Please enter the Facebook Marketplace URL");
      return;
    }
    updateAd.mutate(
      {
        id: targetId,
        status: "published",
        facebookMarketplaceUrl: facebookUrl,
      },
      {
        onSuccess: () => {
          toast.success("Ad marked as published!");
          setFacebookUrl("");
          setShowUploadDialog(false);
          setSelectedAd(null);
          refetch();
        },
      }
    );
  };

  const stagedAds = ads?.filter((ad) => ad.status === "staged" || ad.status === "draft");
  const publishedAds = ads?.filter((ad) => ad.status === "published");
  const selectedAdData = ads?.find((ad) => ad.id === selectedAd);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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
                <Link href={`/inventory/${dealerId}`}>← Back to Inventory</Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Facebook Ad Staging</h1>
                <p className="text-sm text-gray-600">
                  Manage and publish ads to Facebook Marketplace
                </p>
              </div>
            </div>
            <Button asChild size="lg">
              <a
                href="https://www.facebook.com/marketplace/create/item"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Facebook Marketplace
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="unprocessed">
          <TabsList className="mb-6">
            <TabsTrigger value="unprocessed">
              Unprocessed ({stagedAds?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="all">All ({ads?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="unprocessed">
            {!stagedAds || stagedAds.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">No staged ads yet. Create ads from your inventory.</p>
                  <Button className="mt-4" asChild>
                    <Link href={`/inventory/${dealerId}`}>Go to Inventory</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {stagedAds.map((ad) => (
                  <Card key={ad.id} className="overflow-hidden">
                    <div className="relative">
                      <Badge className="absolute top-3 right-3 z-10 bg-blue-600">
                        Staged
                      </Badge>
                      {ad.imageUrl && (
                        <img
                          src={ad.imageUrl}
                          alt="Ad image"
                          className="w-full h-64 object-cover"
                        />
                      )}
                    </div>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {ad.inventoryItem ? `${ad.inventoryItem.year} ${ad.inventoryItem.brand} ${ad.inventoryItem.model}` : 'Untitled Ad'}
                    </CardTitle>
                    <CardDescription className="text-xl font-bold text-blue-600">
                      {ad.inventoryItem?.price ? `$${parseFloat(ad.inventoryItem.price).toLocaleString()}` : 'Price: Contact Seller'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 line-clamp-3 mb-4">
                      {ad.finalText || ad.enhancedText || ad.originalText || 'No description'}
                    </p>
                      <p className="text-xs text-gray-500 mb-4">
                        Created: {new Date(ad.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedAd(ad.id);
                            setShowPreviewDialog(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(ad)}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedAd(ad.id);
                            setShowUploadDialog(true);
                          }}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Upload
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedAd(ad.id);
                            handlePublish(ad.id);
                          }}
                        >
                          Publish
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedAd(ad.id);
                            setContentAdId(ad.id);
                            setShowContentDialog(true);
                          }}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Content
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(ad.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {/* Facebook URL Field */}
                      <div className="mt-4 pt-4 border-t">
                        <Label className="text-xs text-gray-600 mb-2 block">Facebook Marketplace URL</Label>
                        {editingFbUrl === ad.id ? (
                          <div className="flex gap-2">
                            <Input
                              placeholder="https://www.facebook.com/marketplace/item/..."
                              value={tempFbUrl}
                              onChange={(e) => setTempFbUrl(e.target.value)}
                              className="text-sm"
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                updateAd.mutate(
                                  {
                                    id: ad.id,
                                    facebookMarketplaceUrl: tempFbUrl,
                                  },
                                  {
                                    onSuccess: () => {
                                      toast.success("Facebook URL saved!");
                                      setEditingFbUrl(null);
                                      setTempFbUrl("");
                                    },
                                  }
                                );
                              }}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingFbUrl(null);
                                setTempFbUrl("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            {ad.facebookMarketplaceUrl ? (
                              <>
                                <a
                                  href={ad.facebookMarketplaceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline flex items-center gap-1 flex-1 truncate"
                                >
                                  <LinkIcon className="w-3 h-3" />
                                  {ad.facebookMarketplaceUrl}
                                </a>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingFbUrl(ad.id);
                                    setTempFbUrl(ad.facebookMarketplaceUrl || "");
                                  }}
                                >
                                  Edit
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                  setEditingFbUrl(ad.id);
                                  setTempFbUrl("");
                                }}
                              >
                                <LinkIcon className="w-4 h-4 mr-2" />
                                Add Facebook URL
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all">
            <div className="grid md:grid-cols-2 gap-6">
              {ads?.map((ad) => (
                <Card key={ad.id} className="overflow-hidden">
                  <div className="relative">
                    <Badge
                      className={`absolute top-3 right-3 z-10 ${
                        ad.status === "published" ? "bg-green-600" : "bg-blue-600"
                      }`}
                    >
                      {ad.status === "published" ? "Published" : "Staged"}
                    </Badge>
                    {ad.imageUrl && (
                      <img
                        src={ad.imageUrl}
                        alt="Ad image"
                        className="w-full h-64 object-cover"
                      />
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {ad.inventoryItem ? `${ad.inventoryItem.year} ${ad.inventoryItem.brand} ${ad.inventoryItem.model}` : 'Untitled Ad'}
                    </CardTitle>
                    <CardDescription className="text-xl font-bold text-blue-600">
                      {ad.inventoryItem?.price ? `$${parseFloat(ad.inventoryItem.price).toLocaleString()}` : 'Price: Contact Seller'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 line-clamp-3 mb-4">
                      {ad.finalText || ad.enhancedText || ad.originalText || 'No description'}
                    </p>
                    {ad.facebookMarketplaceUrl && (
                      <a
                        href={ad.facebookMarketplaceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-4"
                      >
                        <Facebook className="w-4 h-4" />
                        View on Facebook Marketplace
                      </a>
                    )}
                    <p className="text-xs text-gray-500 mb-4">
                      Created: {new Date(ad.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAd(ad.id);
                          setShowPreviewDialog(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(ad)}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      {ad.status !== 'published' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedAd(ad.id);
                            setShowUploadDialog(true);
                          }}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Upload
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAd(ad.id);
                          setContentAdId(ad.id);
                          setShowContentDialog(true);
                        }}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Content
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(ad.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* Facebook URL Field */}
                    <div className="mt-4 pt-4 border-t">
                      <Label className="text-xs text-gray-600 mb-2 block">Facebook Marketplace URL</Label>
                      {editingFbUrl === ad.id ? (
                        <div className="flex gap-2">
                          <Input
                            placeholder="https://www.facebook.com/marketplace/item/..."
                            value={tempFbUrl}
                            onChange={(e) => setTempFbUrl(e.target.value)}
                            className="text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              updateAd.mutate(
                                {
                                  id: ad.id,
                                  facebookMarketplaceUrl: tempFbUrl,
                                },
                                {
                                  onSuccess: () => {
                                    toast.success("Facebook URL saved!");
                                    setEditingFbUrl(null);
                                    setTempFbUrl("");
                                  },
                                }
                              );
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingFbUrl(null);
                              setTempFbUrl("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          {ad.facebookMarketplaceUrl ? (
                            <>
                              <a
                                href={ad.facebookMarketplaceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline flex items-center gap-1 flex-1 truncate"
                              >
                                <LinkIcon className="w-3 h-3" />
                                {ad.facebookMarketplaceUrl}
                              </a>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingFbUrl(ad.id);
                                  setTempFbUrl(ad.facebookMarketplaceUrl || "");
                                }}
                              >
                                Edit
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => {
                                setEditingFbUrl(ad.id);
                                setTempFbUrl("");
                              }}
                            >
                              <LinkIcon className="w-4 h-4 mr-2" />
                              Add Facebook URL
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Upload to Facebook Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload to Facebook Marketplace</DialogTitle>
            <DialogDescription>
              Follow these steps to manually upload your ad to Facebook Marketplace
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Ad Preview */}
            <div>
              <h3 className="font-semibold mb-3">Staged Ad Preview</h3>
              {selectedAdData && (
                <Card>
                  {selectedAdData.imageUrl && (
                    <img
                      src={selectedAdData.imageUrl}
                      alt="Ad preview"
                      className="w-full h-64 object-cover rounded-t-lg"
                    />
                  )}
                  <CardContent className="pt-4">
                    <h4 className="font-bold text-lg mb-2">
                      {selectedAdData.inventoryItem ? `${selectedAdData.inventoryItem.year} ${selectedAdData.inventoryItem.brand} ${selectedAdData.inventoryItem.model}` : 'Untitled Ad'}
                    </h4>
                    <p className="text-2xl font-bold text-green-600 mb-3">
                      {selectedAdData.inventoryItem?.price ? `$${parseFloat(selectedAdData.inventoryItem.price).toLocaleString()}` : 'Price: Contact Seller'}
                    </p>
                    <p className="text-sm text-gray-700">{selectedAdData.finalText || selectedAdData.enhancedText || selectedAdData.originalText}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: Upload Instructions */}
            <div>
              <h3 className="font-semibold mb-3">Upload to Facebook</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> Facebook prohibits full automation. Please follow these steps
                  manually to stay compliant with their terms of service.
                </p>
              </div>

              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Step 1: Open Facebook Marketplace</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Click the button below to open Facebook Marketplace in a new window
                  </p>
                  <Button asChild className="w-full">
                    <a
                      href="https://www.facebook.com/marketplace/create/item"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open Facebook Marketplace
                    </a>
                  </Button>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Step 2: Create New Listing</h4>
                  <p className="text-sm text-gray-600">
                    In Facebook Marketplace, click "Create new listing" and select "Item"
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Step 3: Download &amp; Drag Photos to Facebook</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Right-click any photo below and save it, or click "Download" — then drag the saved photo(s) directly into Facebook Marketplace's image upload area.
                  </p>
                  {selectedAdData?.inventoryItem?.imageUrl ? (
                    <div className="space-y-2">
                      {parseImages(selectedAdData.inventoryItem.imageUrl).map((imgUrl, i) => (
                        <div key={i} className="flex items-center gap-3 border rounded-lg p-2">
                          <img
                            src={imgUrl}
                            alt={`Photo ${i + 1}`}
                            className="w-16 h-16 object-cover rounded flex-shrink-0 cursor-pointer"
                            title="Right-click to save image"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 truncate">{i === 0 ? 'Cover photo' : `Photo ${i + 1}`}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = imgUrl;
                              link.download = `listing-photo-${i + 1}.jpg`;
                              link.target = '_blank';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              toast.success(`Photo ${i + 1} download started!`);
                            }}
                          >
                            Download
                          </Button>
                        </div>
                      ))}
                      {parseImages(selectedAdData.inventoryItem.imageUrl).length === 0 && selectedAdData.imageUrl && (
                        <div className="flex items-center gap-3 border rounded-lg p-2">
                          <img src={selectedAdData.imageUrl} alt="Ad" className="w-16 h-16 object-cover rounded" />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = selectedAdData.imageUrl!;
                              link.download = `ad-image-${selectedAdData.id}.jpg`;
                              link.target = '_blank';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              toast.success('Image download started!');
                            }}
                          >
                            Download
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : selectedAdData?.imageUrl ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = selectedAdData.imageUrl!;
                        link.download = `ad-image-${selectedAdData.id}.jpg`;
                        link.target = '_blank';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        toast.success('Image download started!');
                      }}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Download Image
                    </Button>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No photos available for this listing.</p>
                  )}
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Step 4: Copy & Paste Title</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Click the copy button next to the title, then paste it into Facebook's "Title" field
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={selectedAdData?.finalText?.split('\n')[0] || ""}
                      readOnly
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={() => handleCopy(selectedAdData?.finalText?.split('\n')[0] || "", "title")}
                    >
                      {copiedTitle ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Step 5: Set Price</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Copy the price and enter it in Facebook's "Price" field
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value="Contact for price"
                      readOnly
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleCopy("Contact for price", "price")
                      }
                    >
                      {copiedPrice ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Step 6: Copy & Paste Description</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Copy the description and paste it into Facebook's "Description" field
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={selectedAdData?.finalText || selectedAdData?.enhancedText || selectedAdData?.originalText || ""}
                      readOnly
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleCopy(selectedAdData?.finalText || selectedAdData?.enhancedText || selectedAdData?.originalText || "", "description")
                      }
                    >
                      {copiedDescription ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Step 7: Complete & Publish</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    After filling in all the details and uploading the image, review your listing and click "Publish" on Facebook Marketplace.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center">
            <div className="flex-1">
              <Label className="text-sm font-medium mb-2 block">
                After publishing, paste the Facebook Marketplace URL here:
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://www.facebook.com/marketplace/item/..."
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={() => handlePublish()}
                  disabled={!facebookUrl || updateAd.isPending}
                >
                  Mark as Published
                </Button>
              </div>
            </div>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Close
            </Button>
          </DialogFooter>
          
          {/* Content Generation Section */}
          {selectedAdData && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Website Content</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Generate badge image, pillar page article, and blog post for your dealer website
              </p>
              <ContentGenerator facebookAdId={selectedAdData.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Ad Text</DialogTitle>
            <DialogDescription>Make changes to your ad description</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ad-text">Ad Description</Label>
              <Textarea
                id="ad-text"
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={15}
                className="mt-2"
                placeholder="Enter your ad description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content Generator Dialog */}
      <Dialog open={showContentDialog} onOpenChange={setShowContentDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Website Content</DialogTitle>
            <DialogDescription>
              Generate badge image, pillar page article, and blog post for your dealer website
            </DialogDescription>
          </DialogHeader>
          {contentAdId && (
            <div className="py-4">
              <ContentGenerator facebookAdId={contentAdId} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContentDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Ad Preview</DialogTitle>
            <DialogDescription>Preview how your ad will appear</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1">
            {selectedAdData && (
              <div className="bg-white border rounded-lg overflow-hidden">
                {selectedAdData.imageUrl && (
                  <img
                    src={selectedAdData.imageUrl}
                    alt="Preview"
                    className="w-full h-96 object-cover"
                  />
                )}
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-2">
                    {selectedAdData.inventoryItem ? `${selectedAdData.inventoryItem.year} ${selectedAdData.inventoryItem.brand} ${selectedAdData.inventoryItem.model}` : 'Untitled Ad'}
                  </h3>
                  <p className="text-3xl font-bold text-green-600 mb-4">
                    {selectedAdData.inventoryItem?.price ? `$${parseFloat(selectedAdData.inventoryItem.price).toLocaleString()}` : 'Price: Contact Seller'}
                  </p>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedAdData.finalText || selectedAdData.enhancedText || selectedAdData.originalText}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPreviewDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
