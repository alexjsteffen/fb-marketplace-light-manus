import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Package, Plus, Upload, Search, Globe, Loader2, LayoutGrid, List, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { VehicleDetailModal } from "@/components/VehicleDetailModal";

export default function Inventory() {
  const { dealerId } = useParams<{ dealerId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [openManual, setOpenManual] = useState(false);
  const [openBulk, setOpenBulk] = useState(false);
  const [openScrape, setOpenScrape] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [adStatusFilter, setAdStatusFilter] = useState<string>("all");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"box" | "line">("box");
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [batchEnhancing, setBatchEnhancing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  
  // URL Scraping state
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scrapedItems, setScrapedItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  
  // Fetch descriptions state
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<Set<number>>(new Set());
  const [fetchingDescriptions, setFetchingDescriptions] = useState(false);
  const [fetchProgress, setFetchProgress] = useState({ current: 0, total: 0 });

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

  const scrapeUrlMutation = trpc.inventory.scrapeUrl.useMutation({
    onSuccess: (data) => {
      setScrapedItems(data.items);
      toast.success(`Found ${data.items.length} items!`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to scrape URL");
    },
  });

  const deleteAllMutation = trpc.inventory.deleteAll.useMutation({
    onSuccess: () => {
      toast.success("All inventory deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete inventory");
    },
  });

  const deleteSingleMutation = trpc.inventory.deleteSingle.useMutation({
    onSuccess: () => {
      toast.success("Vehicle deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete vehicle");
    },
  });

  const fetchDescriptionMutation = trpc.inventory.fetchFullDescription.useMutation();

  const batchEnhanceMutation = trpc.inventory.batchEnhance.useMutation({
    onSuccess: () => {
      toast.success("All vehicles enhanced successfully!");
      setBatchEnhancing(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to enhance vehicles");
      setBatchEnhancing(false);
    },
  });

  const handleFetchDescriptions = async () => {
    if (selectedVehicleIds.size === 0) {
      toast.error("Please select at least one vehicle");
      return;
    }

    setFetchingDescriptions(true);
    const vehicleIds = Array.from(selectedVehicleIds);
    setFetchProgress({ current: 0, total: vehicleIds.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < vehicleIds.length; i++) {
      try {
        await fetchDescriptionMutation.mutateAsync({ inventoryItemId: vehicleIds[i] });
        successCount++;
      } catch (error) {
        failCount++;
      }
      setFetchProgress({ current: i + 1, total: vehicleIds.length });
    }

    setFetchingDescriptions(false);
    setSelectedVehicleIds(new Set());
    refetch();

    if (successCount > 0) {
      toast.success(`Fetched ${successCount} descriptions successfully${failCount > 0 ? `, ${failCount} failed` : ''}`);
    } else {
      toast.error("Failed to fetch descriptions");
    }
  };

  const handleBatchEnhance = async () => {
    const newVehicles = inventory?.filter((item: any) => item.condition === 'new') || [];
    if (newVehicles.length === 0) {
      toast.error("No new vehicles to enhance");
      return;
    }

    setBatchEnhancing(true);
    setBatchProgress({ current: 0, total: newVehicles.length });

    // Call batch enhance mutation
    batchEnhanceMutation.mutate({
      dealerId: parseInt(dealerId || "0"),
      template: "premium", // Default template
    });
  };

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

  const handleScrapeUrl = () => {
    if (!scrapeUrl) {
      toast.error("Please enter a URL");
      return;
    }
    scrapeUrlMutation.mutate({ url: scrapeUrl });
  };

  const toggleItemSelection = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const handleImportSelected = () => {
    const itemsToImport = scrapedItems
      .filter((_, index) => selectedItems.has(index))
      .map((item) => ({
        stockNumber: item.stockNumber,
        brand: item.brand || "",
        category: item.category || "",
        year: item.year,
        model: item.model || "",
        price: item.price?.replace(/[$,]/g, "") || "",
        location: item.location || "",
        imageUrl: item.imageUrl || "",
        description: item.description || "",
        mileage: item.mileage || "",
        condition: "used" as const,
      }));

    if (itemsToImport.length === 0) {
      toast.error("Please select at least one item");
      return;
    }

    bulkImport.mutate({
      dealerId: parseInt(dealerId || "0"),
      items: itemsToImport,
    });
    
    setOpenScrape(false);
    setScrapedItems([]);
    setSelectedItems(new Set());
    setScrapeUrl("");
  };

  const filteredInventory = inventory?.filter((item) => {
    const matchesSearch =
      item.stockNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesCondition = conditionFilter === "all" || item.condition === conditionFilter;
    const matchesAdStatus = 
      adStatusFilter === "all" ||
      (adStatusFilter === "with-ads" && (item.adCount || 0) > 0) ||
      (adStatusFilter === "without-ads" && (item.adCount || 0) === 0);
    
    return matchesSearch && matchesStatus && matchesCondition && matchesAdStatus;
  });

  const inventoryCounts = {
    total: inventory?.length || 0,
    new: inventory?.filter(i => i.condition === 'new').length || 0,
    used: inventory?.filter(i => i.condition === 'used').length || 0,
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
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" asChild>
                <Link href="/dealers">← Back to Dealers</Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
                <p className="text-sm text-gray-600">{dealer?.name}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm(`Delete all ${inventoryCounts.total} vehicles from ${dealer?.name}? This cannot be undone.`)) {
                    deleteAllMutation.mutate({ dealerId: parseInt(dealerId || "0") });
                  }
                }}
                disabled={!inventory || inventory.length === 0 || deleteAllMutation.isPending}
              >
                {deleteAllMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete All"
                )}
              </Button>
              <Dialog open={openScrape} onOpenChange={setOpenScrape}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Globe className="w-4 h-4 mr-2" />
                    Scrape URL
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Import from Website</DialogTitle>
                    <DialogDescription>
                      Enter a dealer inventory page URL to automatically extract items
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://novlanbros.com/agriculture/inventory/..."
                        value={scrapeUrl}
                        onChange={(e) => setScrapeUrl(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleScrapeUrl} 
                        disabled={scrapeUrlMutation.isPending}
                      >
                        {scrapeUrlMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Scraping...
                          </>
                        ) : (
                          "Scrape"
                        )}
                      </Button>
                    </div>

                    {scrapedItems.length > 0 && (
                      <div className="border rounded-lg">
                        <div className="p-4 border-b bg-gray-50">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              Found {scrapedItems.length} items - Select items to import
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (selectedItems.size === scrapedItems.length) {
                                  setSelectedItems(new Set());
                                } else {
                                  setSelectedItems(new Set(scrapedItems.map((_, i) => i)));
                                }
                              }}
                            >
                              {selectedItems.size === scrapedItems.length ? "Deselect All" : "Select All"}
                            </Button>
                          </div>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12"></TableHead>
                                <TableHead>Stock #</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Year</TableHead>
                                <TableHead>Brand</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Price</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {scrapedItems.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedItems.has(index)}
                                      onCheckedChange={() => toggleItemSelection(index)}
                                    />
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">
                                    {item.stockNumber}
                                  </TableCell>
                                  <TableCell className="max-w-xs truncate">
                                    {item.title}
                                  </TableCell>
                                  <TableCell>{item.year || "-"}</TableCell>
                                  <TableCell>{item.brand || "-"}</TableCell>
                                  <TableCell>{item.category || "-"}</TableCell>
                                  <TableCell>{item.price || "-"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setOpenScrape(false);
                        setScrapedItems([]);
                        setSelectedItems(new Set());
                        setScrapeUrl("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleImportSelected} 
                      disabled={selectedItems.size === 0 || bulkImport.isPending}
                    >
                      {bulkImport.isPending ? "Importing..." : `Import ${selectedItems.size} Selected`}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

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

          {/* Inventory Counts Summary */}
          <div className="flex gap-4 mb-4">
            <Card className="flex-1">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{inventoryCounts.total}</p>
                  <p className="text-sm text-gray-600">Total Vehicles</p>
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{inventoryCounts.new}</p>
                  <p className="text-sm text-gray-600">New</p>
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{inventoryCounts.used}</p>
                  <p className="text-sm text-gray-600">Used</p>
                </div>
              </CardContent>
            </Card>
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
            <Select value={conditionFilter} onValueChange={setConditionFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vehicles</SelectItem>
                <SelectItem value="new">New Only</SelectItem>
                <SelectItem value="used">Used Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={adStatusFilter} onValueChange={setAdStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="with-ads">With Ads</SelectItem>
                <SelectItem value="without-ads">Without Ads</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === "box" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("box")}
                className="rounded-r-none"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "line" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("line")}
                className="rounded-l-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={handleFetchDescriptions}
              disabled={fetchingDescriptions || selectedVehicleIds.size === 0}
            >
              {fetchingDescriptions ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Fetching {fetchProgress.current}/{fetchProgress.total}...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 mr-2" />
                  Fetch Descriptions ({selectedVehicleIds.size})
                </>
              )}
            </Button>
            <Button 
              variant="default"
              size="sm"
              onClick={handleBatchEnhance}
              disabled={batchEnhancing || !inventory?.filter((item: any) => item.condition === 'new').length}
            >
              {batchEnhancing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enhancing {batchProgress.current}/{batchProgress.total}...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Batch Enhance
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {filteredInventory && filteredInventory.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No inventory items</h3>
            <p className="text-gray-600 mb-6">Add items manually, import from JSON, or scrape from a website</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => setOpenScrape(true)}>
                <Globe className="w-4 h-4 mr-2" />
                Scrape URL
              </Button>
              <Button variant="outline" onClick={() => setOpenManual(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
              <Button variant="outline" onClick={() => setOpenBulk(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Bulk Import
              </Button>
            </div>
          </div>
        ) : viewMode === "box" ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredInventory?.map((item) => (
              <Card 
                key={item.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer relative"
                onClick={() => setSelectedVehicle(item)}
              >
                <div 
                  className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-white/90 px-2 py-1 rounded shadow-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={selectedVehicleIds.has(item.id)}
                    onCheckedChange={(checked) => {
                      const newSelected = new Set(selectedVehicleIds);
                      if (checked) {
                        newSelected.add(item.id);
                      } else {
                        newSelected.delete(item.id);
                      }
                      setSelectedVehicleIds(newSelected);
                    }}
                  />
                  <span className="text-xs text-gray-600">add desc+</span>
                </div>
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
                    <div className="flex gap-2">
                      <Badge variant={item.status === "active" ? "default" : item.status === "sold" ? "secondary" : "outline"}>
                        {item.status}
                      </Badge>
                      {item.adCount > 0 && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                          {item.adCount} {item.adCount === 1 ? 'Ad' : 'Ads'}
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete ${item.year} ${item.brand} ${item.model}?`)) {
                            deleteSingleMutation.mutate({ id: item.id });
                          }
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                  {item.category && (
                    <p className="text-sm text-gray-600 mb-2">{item.category}</p>
                  )}
                  <p className="text-xl font-bold text-blue-600 mb-2">
                    {item.price ? `$${parseFloat(item.price).toLocaleString()}` : 'Call for Pricing'}
                  </p>
                  {item.location && (
                    <p className="text-xs text-gray-500">{item.location}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInventory?.map((item) => (
              <Card 
                key={item.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedVehicle(item)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div 
                      className="flex flex-col items-start pt-2 gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedVehicleIds.has(item.id)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedVehicleIds);
                          if (checked) {
                            newSelected.add(item.id);
                          } else {
                            newSelected.delete(item.id);
                          }
                          setSelectedVehicleIds(newSelected);
                        }}
                      />
                      <span className="text-[10px] text-gray-500 leading-none">add<br/>desc+</span>
                    </div>
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={`${item.brand} ${item.model}`}
                        className="w-32 h-32 object-cover rounded-lg flex-shrink-0"
                      />
                    ) : (
                      <div className="w-32 h-32 bg-gray-200 flex items-center justify-center rounded-lg flex-shrink-0">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-xl">
                            {item.year} {item.brand} {item.model}
                          </h3>
                          <p className="text-sm text-gray-600">Stock: {item.stockNumber}</p>
                          {item.category && (
                            <p className="text-sm text-gray-600">{item.category}</p>
                          )}
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <div className="flex gap-2 items-center">
                            <Badge variant={item.status === "active" ? "default" : item.status === "sold" ? "secondary" : "outline"}>
                              {item.status}
                            </Badge>
                            {item.adCount > 0 && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                                {item.adCount} {item.adCount === 1 ? 'Ad' : 'Ads'}
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete ${item.year} ${item.brand} ${item.model}?`)) {
                                  deleteSingleMutation.mutate({ id: item.id });
                                }
                              }}
                            >
                              ×
                            </Button>
                          </div>
                          <p className="text-2xl font-bold text-blue-600">
                            {item.price ? `$${parseFloat(item.price).toLocaleString()}` : 'Call for Pricing'}
                          </p>
                        </div>
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-700 line-clamp-2">{item.description}</p>
                      )}
                      {item.location && (
                        <p className="text-xs text-gray-500 mt-2">{item.location}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Vehicle Detail Modal */}
      <VehicleDetailModal
        vehicle={selectedVehicle}
        open={!!selectedVehicle}
        onOpenChange={(open) => !open && setSelectedVehicle(null)}
      />
    </div>
  );
}
