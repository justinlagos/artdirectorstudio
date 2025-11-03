import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  avatar_url: string | null;
  featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const AdminTestimonials = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    content: "",
    avatar_url: "",
    featured: false,
    display_order: 0,
  });

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setTestimonials(data || []);
    } catch (error) {
      console.error("Error fetching testimonials:", error);
      toast.error("Failed to load testimonials");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedTestimonial(null);
    setFormData({
      name: "",
      role: "",
      content: "",
      avatar_url: "",
      featured: false,
      display_order: testimonials.length,
    });
    setEditDialogOpen(true);
  };

  const handleEdit = (testimonial: Testimonial) => {
    setSelectedTestimonial(testimonial);
    setFormData({
      name: testimonial.name,
      role: testimonial.role,
      content: testimonial.content,
      avatar_url: testimonial.avatar_url || "",
      featured: testimonial.featured,
      display_order: testimonial.display_order,
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (selectedTestimonial) {
        // Update existing
        const { error } = await supabase
          .from('testimonials')
          .update({
            name: formData.name,
            role: formData.role,
            content: formData.content,
            avatar_url: formData.avatar_url || null,
            featured: formData.featured,
            display_order: formData.display_order,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedTestimonial.id);

        if (error) throw error;
        toast.success("Testimonial updated successfully");
      } else {
        // Create new
        const { error } = await supabase
          .from('testimonials')
          .insert({
            name: formData.name,
            role: formData.role,
            content: formData.content,
            avatar_url: formData.avatar_url || null,
            featured: formData.featured,
            display_order: formData.display_order,
          });

        if (error) throw error;
        toast.success("Testimonial created successfully");
      }

      setEditDialogOpen(false);
      fetchTestimonials();
    } catch (error: any) {
      toast.error(error.message || "Failed to save testimonial");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this testimonial?")) return;

    try {
      const { error } = await supabase
        .from('testimonials')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Testimonial deleted successfully");
      fetchTestimonials();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete testimonial");
    }
  };

  const handleMoveOrder = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = testimonials.findIndex(t => t.id === id);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === testimonials.length - 1)
    ) {
      return;
    }

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const current = testimonials[currentIndex];
    const swap = testimonials[swapIndex];

    try {
      // Swap display orders
      await supabase
        .from('testimonials')
        .update({ display_order: swap.display_order })
        .eq('id', current.id);

      await supabase
        .from('testimonials')
        .update({ display_order: current.display_order })
        .eq('id', swap.id);

      toast.success("Order updated successfully");
      fetchTestimonials();
    } catch (error: any) {
      toast.error(error.message || "Failed to update order");
    }
  };

  if (loading) {
    return <div>Loading testimonials...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Testimonials Management</CardTitle>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Testimonial
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Content Preview</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testimonials.map((testimonial, index) => (
                  <TableRow key={testimonial.id}>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleMoveOrder(testimonial.id, 'up')}
                          disabled={index === 0}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleMoveOrder(testimonial.id, 'down')}
                          disabled={index === testimonials.length - 1}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{testimonial.name}</TableCell>
                    <TableCell>{testimonial.role}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {testimonial.content.substring(0, 60)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant={testimonial.featured ? "default" : "secondary"}>
                        {testimonial.featured ? "Featured" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(testimonial)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(testimonial.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTestimonial ? "Edit Testimonial" : "Create Testimonial"}
            </DialogTitle>
            <DialogDescription>
              Add or modify testimonial information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="Creative Director"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="This tool has transformed how we work..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar_url">Avatar URL</Label>
              <Input
                id="avatar_url"
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="featured"
                checked={formData.featured}
                onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
              />
              <Label htmlFor="featured">Featured (visible on landing pages)</Label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleSave}
                disabled={!formData.name || !formData.role || !formData.content}
              >
                Save
              </Button>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};