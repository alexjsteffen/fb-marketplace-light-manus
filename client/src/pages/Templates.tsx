import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { Palette, Plus, Pencil, Trash2, Eye } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

type TemplateType = "gradient_modern" | "gradient_sunset" | "solid_professional" | "textured_premium" | "branded_dealer" | "seasonal_special";

const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  gradient_modern: "Modern Gradient",
  gradient_sunset: "Sunset Gradient",
  solid_professional: "Professional Solid",
  textured_premium: "Premium Textured",
  branded_dealer: "Branded Dealer",
  seasonal_special: "Seasonal Special",
};

export default function Templates() {
  const { user, loading: authLoading } = useAuth();
  const [openCreate, setOpenCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    templateType: "gradient_modern" as TemplateType,
    previewUrl: "",
    config: JSON.stringify({
      type: "gradient",
      colors: ["#3b82f6", "#8b5cf6"],
      opacity: 0.9,
    }, null, 2),
    sortOrder: 0,
  });

  const { data: templates, isLoading, refetch } = trpc.templates.list.useQuery();

  const createTemplate = trpc.templates.create.useMutation({
    onSuccess: () => {
      toast.success("Template created successfully");
      setOpenCreate(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create template");
    },
  });

  const updateTemplate = trpc.templates.update.useMutation({
    onSuccess: () => {
      toast.success("Template updated successfully");
      setEditingTemplate(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update template");
    },
  });

  const deleteTemplate = trpc.templates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete template");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      templateType: "gradient_modern",
      previewUrl: "",
      config: JSON.stringify({
        type: "gradient",
        colors: ["#3b82f6", "#8b5cf6"],
        opacity: 0.9,
      }, null, 2),
      sortOrder: 0,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate JSON config
    try {
      JSON.parse(formData.config);
    } catch (error) {
      toast.error("Invalid JSON configuration");
      return;
    }

    if (editingTemplate) {
      updateTemplate.mutate({
        id: editingTemplate.id,
        ...formData,
      });
    } else {
      createTemplate.mutate(formData);
    }
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      templateType: template.templateType,
      previewUrl: template.previewUrl || "",
      config: template.config,
      sortOrder: template.sortOrder || 0,
    });
  };

  const handleDelete = (id: number) => {
    deleteTemplate.mutate({ id });
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" asChild>
                <Link href="/">← Back to Home</Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Background Templates</h1>
                <p className="text-sm text-gray-600">Manage ad background templates</p>
              </div>
            </div>
            <Dialog open={openCreate || !!editingTemplate} onOpenChange={(open) => {
              if (!open) {
                setOpenCreate(false);
                setEditingTemplate(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => setOpenCreate(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingTemplate ? "Edit Template" : "Create New Template"}</DialogTitle>
                    <DialogDescription>
                      {editingTemplate ? "Update template settings" : "Add a new background template for ad generation"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Template Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="e.g., Blue Gradient Modern"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={2}
                        placeholder="Describe when to use this template..."
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="templateType">Template Type *</Label>
                      <Select
                        value={formData.templateType}
                        onValueChange={(value: TemplateType) => setFormData({ ...formData, templateType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TEMPLATE_TYPE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="previewUrl">Preview Image URL</Label>
                      <Input
                        id="previewUrl"
                        type="url"
                        value={formData.previewUrl}
                        onChange={(e) => setFormData({ ...formData, previewUrl: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="config">Configuration (JSON) *</Label>
                      <Textarea
                        id="config"
                        value={formData.config}
                        onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                        rows={10}
                        className="font-mono text-sm"
                        placeholder={`{\n  "type": "gradient",\n  "colors": ["#3b82f6", "#8b5cf6"],\n  "opacity": 0.9\n}`}
                      />
                      <p className="text-xs text-gray-500">
                        JSON configuration for template rendering (colors, gradients, opacity, etc.)
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="sortOrder">Sort Order</Label>
                      <Input
                        id="sortOrder"
                        type="number"
                        value={formData.sortOrder}
                        onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setOpenCreate(false);
                        setEditingTemplate(null);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createTemplate.isPending || updateTemplate.isPending}
                    >
                      {editingTemplate ? "Update Template" : "Create Template"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {templates && templates.length === 0 ? (
          <div className="text-center py-16">
            <Palette className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No templates yet</h3>
            <p className="text-gray-600 mb-6">Create your first background template</p>
            <Button onClick={() => setOpenCreate(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates?.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="p-0">
                  {template.previewUrl ? (
                    <img
                      src={template.previewUrl}
                      alt={template.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  ) : (
                    <div 
                      className="w-full h-48 rounded-t-lg flex items-center justify-center"
                      style={{
                        background: template.templateType.includes('gradient') 
                          ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                          : '#3b82f6'
                      }}
                    >
                      <Palette className="w-12 h-12 text-white opacity-50" />
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  <div className="mb-3">
                    <h3 className="font-semibold text-lg mb-1">{template.name}</h3>
                    <p className="text-sm text-gray-600">{TEMPLATE_TYPE_LABELS[template.templateType as TemplateType]}</p>
                    {template.description && (
                      <p className="text-sm text-gray-500 mt-2">{template.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleEdit(template)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove "{template.name}" from available templates. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(template.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
