import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Building2, Plus, Settings, Package, Upload, Trash2, Edit } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

function CsvImportButton({ dealerId, onSuccess }: { dealerId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const importCsv = trpc.inventory.importCsv.useMutation({
    onSuccess: (data) => {
      toast.success(`Imported ${data.imported} new listings, updated ${data.updated} existing`);
      setOpen(false);
      setFile(null);
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to import CSV");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a CSV file");
      return;
    }

    const text = await file.text();
    importCsv.mutate({
      dealerId,
      csvContent: text,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Upload className="w-4 h-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Listings from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with listing inventory. Required column: stockNumber. Optional: make, model, year, price, mileage, vin, etc.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
            />
            {file && (
              <p className="text-sm text-gray-600">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p className="font-medium">CSV Format Example:</p>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
stockNumber,make,model,year,price,mileage
P8031,Ford,F-150,2023,45000,12500
24225,Ford,Bronco,2024,52000,8200
            </pre>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || importCsv.isPending}>
            {importCsv.isPending ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DealerManagement() {
  const { user, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState<any>(null);
  const [deletingDealer, setDeletingDealer] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    contactEmail: "",
    contactPhone: "",
    websiteUrl: "",
    brandColor: "#3b82f6",
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    slug: "",
    contactEmail: "",
    contactPhone: "",
    websiteUrl: "",
    brandColor: "#3b82f6",
  });

  const { data: dealers, isLoading, refetch } = trpc.dealers.list.useQuery();
  
  // Initialize edit form when dealer is selected
  useEffect(() => {
    if (editingDealer) {
      setEditFormData({
        name: editingDealer.name || "",
        slug: editingDealer.slug || "",
        contactEmail: editingDealer.contactEmail || "",
        contactPhone: editingDealer.contactPhone || "",
        websiteUrl: editingDealer.websiteUrl || "",
        brandColor: editingDealer.brandColor || "#3b82f6",
      });
    }
  }, [editingDealer]);

  const updateDealer = trpc.dealers.update.useMutation({
    onSuccess: () => {
      toast.success("Seller updated successfully");
      setEditingDealer(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update seller");
    },
  });

  const deleteDealer = trpc.dealers.delete.useMutation({
    onSuccess: () => {
      toast.success("Seller deleted successfully");
      setDeletingDealer(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete seller");
    },
  });

  const createDealer = trpc.dealers.create.useMutation({
    onSuccess: () => {
      toast.success("Seller created successfully");
      setOpen(false);
      setFormData({
        name: "",
        slug: "",
        contactEmail: "",
        contactPhone: "",
        websiteUrl: "",
        brandColor: "#3b82f6",
      });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create seller");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDealer.mutate(formData);
  };

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
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/">← Back</Link>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Seller Management</h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Seller
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Create New Seller</DialogTitle>
                  <DialogDescription>
                    Add a new seller account to manage their listings and ads.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Seller Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="slug">Slug (URL identifier) *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                      placeholder="dealer-name"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contactPhone">Contact Phone</Label>
                    <Input
                      id="contactPhone"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="websiteUrl">Website URL</Label>
                    <Input
                      id="websiteUrl"
                      type="url"
                      value={formData.websiteUrl}
                      onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="brandColor">Brand Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="brandColor"
                        type="color"
                        value={formData.brandColor}
                        onChange={(e) => setFormData({ ...formData, brandColor: e.target.value })}
                        className="w-20 h-10"
                      />
                      <Input
                        value={formData.brandColor}
                        onChange={(e) => setFormData({ ...formData, brandColor: e.target.value })}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createDealer.isPending}>
                    {createDealer.isPending ? "Creating..." : "Create Dealer"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {dealers && dealers.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No sellers yet</h3>
            <p className="text-gray-600 mb-6">Get started by creating your first seller account</p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Seller
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dealers?.map((dealer) => (
              <Card key={dealer.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: dealer.brandColor || '#3b82f6' }}
                      >
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {dealer.name}
                          {dealer.inventoryCount !== undefined && dealer.inventoryCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <Package className="w-3 h-3" />
                              {dealer.inventoryCount}
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription>@{dealer.slug}</CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingDealer(dealer)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Seller
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeletingDealer(dealer)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Seller
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {dealer.contactEmail && (
                      <p className="text-gray-600">
                        <span className="font-medium">Email:</span> {dealer.contactEmail}
                      </p>
                    )}
                    {dealer.contactPhone && (
                      <p className="text-gray-600">
                        <span className="font-medium">Phone:</span> {dealer.contactPhone}
                      </p>
                    )}
                    {dealer.websiteUrl && (
                      <p className="text-gray-600">
                        <span className="font-medium">Website:</span>{" "}
                        <a href={dealer.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {(() => { try { return new URL(dealer.websiteUrl).hostname; } catch { return dealer.websiteUrl; } })()}
                        </a>
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link href={`/inventory/${dealer.id}`}>
                          View Listings
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link href={`/dashboard/${dealer.id}`}>
                          Dashboard
                        </Link>
                      </Button>
                    </div>
                    <CsvImportButton dealerId={dealer.id} onSuccess={refetch} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Edit Seller Dialog */}
      <Dialog open={!!editingDealer} onOpenChange={(open) => !open && setEditingDealer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Seller</DialogTitle>
            <DialogDescription>Update seller information</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            updateDealer.mutate({
              id: editingDealer.id,
              name: editFormData.name,
              contactEmail: editFormData.contactEmail || undefined,
              contactPhone: editFormData.contactPhone || undefined,
              websiteUrl: editFormData.websiteUrl || undefined,
              brandColor: editFormData.brandColor,
            });
          }}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Seller Name *</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-slug">Slug (URL identifier) *</Label>
                <Input
                  id="edit-slug"
                  value={editFormData.slug}
                  onChange={(e) => setEditFormData({ ...editFormData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Contact Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editFormData.contactEmail}
                  onChange={(e) => setEditFormData({ ...editFormData, contactEmail: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">Contact Phone</Label>
                <Input
                  id="edit-phone"
                  value={editFormData.contactPhone}
                  onChange={(e) => setEditFormData({ ...editFormData, contactPhone: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-website">Website URL</Label>
                <Input
                  id="edit-website"
                  type="url"
                  value={editFormData.websiteUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, websiteUrl: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-color">Brand Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-color"
                    type="color"
                    value={editFormData.brandColor}
                    onChange={(e) => setEditFormData({ ...editFormData, brandColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={editFormData.brandColor}
                    onChange={(e) => setEditFormData({ ...editFormData, brandColor: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingDealer(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateDealer.isPending}>
                {updateDealer.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Seller Confirmation */}
      <AlertDialog open={!!deletingDealer} onOpenChange={(open) => !open && setDeletingDealer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Seller?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingDealer?.name}</strong>? This will also delete all associated inventory and ads. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteDealer.mutate({ id: deletingDealer.id });
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
