import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Package, Plus, Upload, Search, Filter } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function Inventory() {
  const { dealerId } = useParams<{ dealerId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [openManual, setOpenManual] = useState(false);
  const [openBulk, setOpenBulk] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    stockNumber: "",
    brand: "",
    category: "",
    year: new Date().getFullYear(),
    model: "",
    description: "",
    price: "",
    location: "",
    imageUrl: "",
    condition: "used" as "new" | "used",
  });

  const [bulkData, setBulkData] = useState("");

  const { data: inventory, isLoading, refetch } = trpc.inventory.list.useQuery(
    { dealerId: parseInt(dealerId || "0") },
    { enabled: !!dealerId }
  );

  const { data: dealer } = trpc.dealers.getById.useQuery(
    { id: parseInt(dealerId || "0") },
    { enabled: !!dealerId }
  );

  const createItem = trpc.inventory.create.useMutation({
    onSuccess: () => {
      toast.success("Inventory item added successfully");
      setOpenManual(false);
      setFormData({
        stockNumber: "",
        brand: "",
        category: "",
        year: new Date().getFullYear(),
        model: "",
        description: "",
        price: "",
        location: "",
        imageUrl: "",
        condition: "used",
      });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add inventory item");
    },
  });

  const bulkImport = trpc.inventory.bulkImport.useMutation({
    onSuccess: (data) => {
      toast.success(`Successfully imported ${data.imported} items`);
      setOpenBulk(false);
      setBulkData("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to import inventory");
    },
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createItem.mutate({
      dealerId: parseInt(dealerId || "0"),
      ...formData,
    });
  };

  const handleBulkImport = () => {
    try {
      const items = JSON.parse(bulkData);
      if (!Array.isArray(items)) {
        toast.error("Data must be an array of items");
        return;
      }
      bulkImport.mutate({
        dealerId: parseInt(dealerId || "0"),
        items,
      });
    } catch (error) {
      toast.error("Invalid JSON format");
    }
  };

  const filteredInventory = inventory?.filter((item) => {
    const matchesSearch =
      item.stockNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/dealers">
                <Button variant="ghost">← Back to Dealers</Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
                <p className="text-sm text-gray-600">{dealer?.name}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog open={openBulk} onOpenChange={setOpenBulk}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Bulk Import
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Bulk Import Inventory</DialogTitle>
                    <DialogDescription>
                      Paste JSON array of inventory items. Items not in this import will be marked as sold.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Textarea
                      value={bulkData}
                      onChange={(e) => setBulkData(e.target.value)}
                      placeholder={`[\n  {\n    "stockNumber": "T2408B",\n    "brand": "BOBCAT",\n    "category": "Compact Tractor",\n    "year": 2014,\n    "model": "TC230",\n    "price": "25900",\n    "condition": "used",\n    "imageUrl": "https://..."\n  }\n]`}
                      className="min-h-[300px] font-mono text-sm"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpenBulk(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleBulkImport} disabled={bulkImport.isPending}>
                      {bulkImport.isPending ? "Importing..." : "Import Items"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={openManual} onOpenChange={setOpenManual}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <form onSubmit={handleManualSubmit}>
                    <DialogHeader>
                      <DialogTitle>Add Inventory Item</DialogTitle>
                      <DialogDescription>
                        Manually add a single inventory item
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="stockNumber">Stock Number *</Label>
                          <Input
                            id="stockNumber"
                            value={formData.stockNumber}
                            onChange={(e) => setFormData({ ...formData, stockNumber: e.target.value })}
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="condition">Condition *</Label>
                          <Select
                            value={formData.condition}
                            onValueChange={(value: "new" | "used") => setFormData({ ...formData, condition: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="used">Used</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="brand">Brand</Label>
                          <Input
                            id="brand"
                            value={formData.brand}
                            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="category">Category</Label>
                          <Input
                            id="category"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="year">Year</Label>
                          <Input
                            id="year"
                            type="number"
                            value={formData.year}
                            onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="price">Price</Label>
                          <Input
                            id="price"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            placeholder="25900.00"
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="model">Model</Label>
                        <Input
                          id="model"
                          value={formData.model}
                          onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="imageUrl">Image URL</Label>
                        <Input
                          id="imageUrl"
                          type="url"
                          value={formData.imageUrl}
                          onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setOpenManual(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createItem.isPending}>
                        {createItem.isPending ? "Adding..." : "Add Item"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by stock number, brand, or model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {filteredInventory && filteredInventory.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No inventory items</h3>
            <p className="text-gray-600 mb-6">Add items manually or import from your inventory system</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => setOpenManual(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
              <Button variant="outline" onClick={() => setOpenBulk(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Bulk Import
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredInventory?.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="p-0">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={`${item.brand} ${item.model}`}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 flex items-center justify-center rounded-t-lg">
                      <Package className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {item.year} {item.brand} {item.model}
                      </h3>
                      <p className="text-sm text-gray-600">Stock: {item.stockNumber}</p>
                    </div>
                    <Badge variant={item.status === "active" ? "default" : item.status === "sold" ? "secondary" : "outline"}>
                      {item.status}
                    </Badge>
                  </div>
                  {item.category && (
                    <p className="text-sm text-gray-600 mb-2">{item.category}</p>
                  )}
                  {item.price && (
                    <p className="text-xl font-bold text-blue-600 mb-2">
                      ${parseFloat(item.price).toLocaleString()}
                    </p>
                  )}
                  <div className="flex gap-2 mt-4">
                    <Link href={`/ads/create/${item.id}`}>
                      <Button size="sm" className="w-full" disabled={item.status !== "active"}>
                        Create Ad
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
