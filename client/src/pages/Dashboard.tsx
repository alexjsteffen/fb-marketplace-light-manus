import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Facebook, ExternalLink, Package, Image as ImageIcon, TrendingUp } from "lucide-react";
import { Link, useParams } from "wouter";

export default function Dashboard() {
  const { dealerId } = useParams<{ dealerId: string }>();
  const { loading: authLoading } = useAuth();

  const { data: dealer, isLoading: dealerLoading } = trpc.dealers.getById.useQuery(
    { id: parseInt(dealerId || "0") },
    { enabled: !!dealerId }
  );

  const { data: inventory, isLoading: inventoryLoading } = trpc.inventory.list.useQuery(
    { dealerId: parseInt(dealerId || "0") },
    { enabled: !!dealerId }
  );

  const { data: publishedAds, isLoading: adsLoading } = trpc.ads.published.useQuery(
    { dealerId: parseInt(dealerId || "0") },
    { enabled: !!dealerId }
  );

  const activeInventory = inventory?.filter((item) => item.status === "active") || [];
  const soldInventory = inventory?.filter((item) => item.status === "sold") || [];

  if (authLoading || dealerLoading || inventoryLoading || adsLoading) {
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
                <Link href="/dealers">← Back to Dealers</Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-600">{dealer?.name}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href={`/inventory/${dealerId}`}>View Inventory</Link>
              </Button>
              <Button asChild>
                <Link href={`/ads/staging/${dealerId}`}>Ad Staging</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{activeInventory.length}</span>
                <Package className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Sold Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{soldInventory.length}</span>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Published Ads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{publishedAds?.length || 0}</span>
                <Facebook className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{inventory?.length || 0}</span>
                <ImageIcon className="w-8 h-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Published Ads */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Published Facebook Ads</h2>
          {publishedAds && publishedAds.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publishedAds.map((ad) => (
                <Card key={ad.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="p-0">
                    {ad.imageUrl ? (
                      <img
                        src={ad.imageUrl}
                        alt="Ad"
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 flex items-center justify-center rounded-t-lg">
                        <Facebook className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">Ad #{ad.id}</p>
                        <p className="text-sm text-gray-600">
                          Published {new Date(ad.publishedAt || ad.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge>Published</Badge>
                    </div>
                    {ad.finalText && (
                      <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                        {ad.finalText}
                      </p>
                    )}
                    {ad.facebookMarketplaceUrl && (
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <a
                          href={ad.facebookMarketplaceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View on Facebook
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Facebook className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No published ads yet</h3>
                <p className="text-gray-600 mb-6">
                  Create and publish your first Facebook Marketplace ad
                </p>
                <Button asChild>
                  <Link href={`/inventory/${dealerId}`}>Go to Inventory</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Inventory Activity</h2>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {inventory?.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-4">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.stockNumber}
                          className="w-16 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-12 bg-gray-200 rounded flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">
                          {item.year} {item.brand} {item.model}
                        </p>
                        <p className="text-sm text-gray-600">Stock: {item.stockNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={item.status === "active" ? "default" : "secondary"}>
                        {item.status}
                      </Badge>
                      {item.price && (
                        <p className="text-sm font-semibold text-blue-600 mt-1">
                          ${parseFloat(item.price).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
