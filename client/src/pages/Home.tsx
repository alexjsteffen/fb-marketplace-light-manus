import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { Building2, Package, Image, BarChart3, FileText, Facebook } from "lucide-react";
import { Link } from "wouter";

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Facebook Ad Accelerator</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Quick Access</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/dealers">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <Building2 className="w-10 h-10 text-blue-600 mb-2" />
                  <CardTitle>Dealer Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Manage dealer accounts, branding, and settings for multi-tenant operations
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75">
              <CardHeader>
                <Package className="w-10 h-10 text-blue-600 mb-2" />
                <CardTitle>Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  View and manage inventory items. Select a dealer first to access inventory.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75">
              <CardHeader>
                <Image className="w-10 h-10 text-blue-600 mb-2" />
                <CardTitle>Ad Creator</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Create Facebook ads with AI text enhancement and professional templates
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75">
              <CardHeader>
                <Facebook className="w-10 h-10 text-blue-600 mb-2" />
                <CardTitle>Ad Staging</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Stage and publish ads with split-screen interface for Facebook Marketplace
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75">
              <CardHeader>
                <BarChart3 className="w-10 h-10 text-blue-600 mb-2" />
                <CardTitle>Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Track published ads, inventory status, and performance analytics
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75">
              <CardHeader>
                <FileText className="w-10 h-10 text-blue-600 mb-2" />
                <CardTitle>Content Generator</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Generate "As Seen On Facebook" content for your dealer website
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
