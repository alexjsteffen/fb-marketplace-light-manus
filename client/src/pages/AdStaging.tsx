import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Facebook, ExternalLink, Copy, Check, Trash2, Eye } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

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
      toast.success("Ad published successfully!");
      setSelectedAd(null);
      setFacebookUrl("");
      setShowUploadDialog(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to publish ad");
    },
  });

  // Delete functionality removed - use status update instead

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

  const handlePublish = () => {
    if (!selectedAd || !facebookUrl) {
      toast.error("Please enter the Facebook Marketplace URL");
      return;
    }

    updateAd.mutate({
      id: selectedAd,
      status: "published",
      facebookMarketplaceUrl: facebookUrl,
    });
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
              <Link href={`/inventory/${dealerId}`}>
                <Button variant="ghost">← Back to Inventory</Button>
              </Link>
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
                  <Link href={`/inventory/${dealerId}`}>
                    <Button className="mt-4">Go to Inventory</Button>
                  </Link>
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
                    <CardTitle className="text-lg">{ad.finalText?.split('\n')[0] || 'Untitled Ad'}</CardTitle>
                    <CardDescription className="text-xl font-bold text-blue-600">
                      Price: Contact Seller
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 line-clamp-3 mb-4">
                      {ad.finalText || ad.enhancedText || ad.originalText || 'No description'}
                    </p>
                      <p className="text-xs text-gray-500 mb-4">
                        Created: {new Date(ad.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2">
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
                          onClick={() => handlePublish()}
                        >
                          Publish
                        </Button>
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
                    <CardTitle className="text-lg">{ad.finalText?.split('\n')[0] || 'Untitled Ad'}</CardTitle>
                    <CardDescription className="text-xl font-bold text-blue-600">
                      Price: Contact Seller
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
                    <p className="text-xs text-gray-500">
                      Created: {new Date(ad.createdAt).toLocaleDateString()}
                    </p>
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
                    <h4 className="font-bold text-lg mb-2">{selectedAdData.finalText?.split('\n')[0] || 'Untitled Ad'}</h4>
                    <p className="text-2xl font-bold text-green-600 mb-3">
                      Price: Contact Seller
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
                    In Facebook Marketplace, click "Create new listing" and select "Vehicle"
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Step 3: Copy & Paste Title</h4>
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
                  <h4 className="font-semibold mb-2">Step 4: Set Price</h4>
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
                  <h4 className="font-semibold mb-2">Step 5: Copy & Paste Description</h4>
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
                  <h4 className="font-semibold mb-2">Step 6: Upload Images</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    In Facebook Marketplace, upload the images shown on the left. You can:
                  </p>
                  <ul className="text-sm text-gray-600 list-disc list-inside mb-3">
                    <li>Right click each image and select "Save image"</li>
                    <li>Drag the image directly to Facebook's upload area</li>
                  </ul>
                  {selectedAdData?.imageUrl && (
                    <Button asChild variant="outline" className="w-full">
                      <a
                        href={selectedAdData.imageUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download Image
                      </a>
                    </Button>
                  )}
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
                  onClick={handlePublish}
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
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ad Preview</DialogTitle>
            <DialogDescription>Preview how your ad will appear</DialogDescription>
          </DialogHeader>
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
                <h3 className="text-2xl font-bold mb-2">{selectedAdData.finalText?.split('\n')[0] || 'Untitled Ad'}</h3>
                <p className="text-3xl font-bold text-green-600 mb-4">
                  Price: Contact Seller
                </p>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedAdData.finalText || selectedAdData.enhancedText || selectedAdData.originalText}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowPreviewDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
