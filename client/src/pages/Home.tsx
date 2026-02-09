import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sidebar } from "@/components/Sidebar";
import { getLoginUrl } from "@/const";
import { Package, Image, Facebook } from "lucide-react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Facebook Ad Accelerator Light
            </h1>
            <p className="text-xl text-gray-700 mb-8">
              Streamline your vehicle and equipment advertising on Facebook Marketplace with AI-powered tools, professional templates, and automated content generation.
            </p>
            <Button size="lg" asChild>
              <a href={getLoginUrl()}>Get Started</a>
            </Button>

            <div className="grid md:grid-cols-3 gap-6 mt-16">
              <Card>
                <CardHeader>
                  <Package className="w-12 h-12 text-blue-600 mb-2" />
                  <CardTitle>Inventory Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Import and manage your vehicle or equipment inventory with automatic sold tracking
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Image className="w-12 h-12 text-blue-600 mb-2" />
                  <CardTitle>AI Enhancement</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Generate compelling ad copy and apply professional background templates to your images
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Facebook className="w-12 h-12 text-blue-600 mb-2" />
                  <CardTitle>Facebook Integration</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Stage ads with downloadable images for easy drag-and-drop to Facebook Marketplace
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1">
        <header className="bg-white shadow-sm border-b">
          <div className="px-8 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
              <p className="text-sm text-gray-600">Welcome back, {user?.name}</p>
            </div>
          </div>
        </header>

        <main className="p-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-600">Total Dealers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">1</div>
                  <p className="text-xs text-gray-500 mt-1">Active dealerships</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-600">Total Inventory</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">62</div>
                  <p className="text-xs text-gray-500 mt-1">Vehicles available</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-600">Staged Ads</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">4</div>
                  <p className="text-xs text-gray-500 mt-1">Ready for Facebook</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
                <CardDescription>
                  Use the navigation on the left to access different features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold flex-shrink-0">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold">Manage Dealers</h4>
                      <p className="text-sm text-gray-600">Start by selecting or adding a dealer from Dealer Management</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold flex-shrink-0">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold">View Inventory</h4>
                      <p className="text-sm text-gray-600">Check your vehicle inventory and create ads for individual items</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold flex-shrink-0">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold">Stage & Publish</h4>
                      <p className="text-sm text-gray-600">Use Facebook Ad Staging to prepare and publish ads to Facebook Marketplace</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
