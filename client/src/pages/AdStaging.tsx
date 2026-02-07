import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Facebook, ExternalLink, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function AdStaging() {
  const { dealerId } = useParams<{ dealerId: string }>();
  const { loading: authLoading } = useAuth();
  const [selectedAd, setSelectedAd] = useState<number | null>(null);
  const [facebookUrl, setFacebookUrl] = useState("");
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

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
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to publish ad");
    },
  });

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    toast.success("Text copied to clipboard!");
    setTimeout(() => setCopiedText(false), 2000);
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
                <h1 className="text-2xl font-bold text-gray-900">Ad Staging Area</h1>
                <p className="text-sm text-gray-600">{dealer?.name}</p>
              </div>
            </div>
            <Button asChild>
              <a
                href="https://www.facebook.com/marketplace/create/item"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook className="w-4 h-4 mr-2" />
                Open Facebook Marketplace
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!stagedAds || stagedAds.length === 0 ? (
          <div className="text-center py-16">
            <Facebook className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No staged ads</h3>
            <p className="text-gray-600 mb-6">Create ads from your inventory to get started</p>
            <Link href={`/inventory/${dealerId}`}>
              <Button>Go to Inventory</Button>
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Panel - Staged Ads */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Staged Ads ({stagedAds.length})</h2>
              <p className="text-sm text-gray-600 mb-4">
                Click an ad to view details and publish to Facebook Marketplace
              </p>
              {stagedAds.map((ad) => (
                <Card
                  key={ad.id}
                  className={`cursor-pointer transition-all ${
                    selectedAd === ad.id ? "ring-2 ring-blue-600" : "hover:shadow-lg"
                  }`}
                  onClick={() => setSelectedAd(ad.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {ad.imageUrl ? (
                        <img
                          src={ad.imageUrl}
                          alt="Ad preview"
                          className="w-32 h-20 object-cover rounded"
                        />
                      ) : (
                        <div className="w-32 h-20 bg-gray-200 rounded flex items-center justify-center">
                          <Facebook className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">Ad #{ad.id}</p>
                            <p className="text-sm text-gray-600">
                              Created {new Date(ad.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={ad.status === "staged" ? "default" : "secondary"}>
                            {ad.status}
                          </Badge>
                        </div>
                        {ad.finalText && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {ad.finalText}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Right Panel - Ad Details & Publishing */}
            <div className="space-y-6">
              {selectedAdData ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Ad Preview</CardTitle>
                      <CardDescription>
                        Copy the text and download the image to post on Facebook Marketplace
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedAdData.imageUrl && (
                        <div>
                          <img
                            src={selectedAdData.imageUrl}
                            alt="Ad image"
                            className="w-full rounded-lg shadow-lg mb-4"
                          />
                          <div className="flex gap-2">
                            <Button asChild className="flex-1">
                              <a
                                href={selectedAdData.imageUrl}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Download Image
                              </a>
                            </Button>
                          </div>
                        </div>
                      )}

                      {selectedAdData.finalText && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium">Ad Copy</label>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopyText(selectedAdData.finalText || "")}
                            >
                              {copiedText ? (
                                <>
                                  <Check className="w-4 h-4 mr-2" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4 mr-2" />
                                  Copy Text
                                </>
                              )}
                            </Button>
                          </div>
                          <div className="p-4 bg-gray-50 rounded border border-gray-200 text-sm whitespace-pre-wrap">
                            {selectedAdData.finalText}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Publish to Facebook</CardTitle>
                      <CardDescription>
                        After posting on Facebook Marketplace, paste the listing URL here
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Facebook Marketplace URL</label>
                        <Input
                          type="url"
                          placeholder="https://www.facebook.com/marketplace/item/..."
                          value={facebookUrl}
                          onChange={(e) => setFacebookUrl(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={handlePublish}
                        disabled={!facebookUrl || updateAd.isPending}
                        className="w-full"
                        size="lg"
                      >
                        {updateAd.isPending ? "Publishing..." : "Mark as Published"}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-blue-900 mb-2">
                        How to Post on Facebook Marketplace
                      </h3>
                      <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                        <li>Click "Open Facebook Marketplace" button above</li>
                        <li>Download the ad image using the button</li>
                        <li>Copy the ad text using the copy button</li>
                        <li>Upload the image to Facebook Marketplace</li>
                        <li>Paste the ad copy into the description</li>
                        <li>Complete the listing and publish</li>
                        <li>Copy the listing URL and paste it here to track</li>
                      </ol>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Facebook className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">
                      Select an ad from the left to view details and publish
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
