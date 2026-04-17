import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, FolderOpen, ChevronRight, ChevronDown, Boxes, Tag, Edit } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { useI18n } from '../contexts/I18nContext';
import { useSharedState } from '../contexts/SharedStateContext';
import { ConfirmDialog } from './ui/confirm-dialog';
import { productsService } from '../services/products.service';

interface Category { id: string; name: string; subcategories: string[]; dbId?: number; subDbIds?: Record<string, number>; }

interface ProductManagementProps {
  productCategories?: Category[];
  onCategoriesChange?: (categories: Category[]) => void;
  sharedProducts?: any[];
  onProductsChange?: (products: any[]) => void;
}

export default function ProductManagement({ productCategories = [], onCategoriesChange }: ProductManagementProps) {
  const { t } = useI18n();
  const { currentUser } = useSharedState();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>(productCategories);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddSubcategory, setShowAddSubcategory] = useState(false);
  const [addSubTarget, setAddSubTarget] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; type: 'category' | 'subcategory'; id: string; parentId?: string; dbId?: number }>({ open: false, type: 'category', id: '', dbId: undefined });
  const [editingCat, setEditingCat] = useState<{ id: string; name: string; dbId?: number } | null>(null);
  const [editingSub, setEditingSub] = useState<{ parentId: string; oldName: string; newName: string; dbId?: number } | null>(null);

  useEffect(() => { if (productCategories.length > 0) setCategories(productCategories); }, [productCategories]);

  const updateLocal = (cats: Category[]) => { setCategories(cats); onCategoriesChange?.(cats); };

  const toggle = (id: string) => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleAddCategory = async () => {
    const name = newCatName.trim();
    if (!name) { toast.error('Category name is required'); return; }
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) { toast.error('Category already exists'); return; }
    try {
      const created = await productsService.createCategory(name);
      updateLocal([...categories, { id: created.id, name: created.name, dbId: created.dbId, subcategories: [], subDbIds: {} }]);
      setNewCatName(''); setShowAddCategory(false); toast.success('Category added');
    } catch (err: any) { toast.error(err.message || 'Failed to add category'); }
  };

  const handleAddSub = async () => {
    if (!addSubTarget) return;
    const parts = newSubName.split(',').map(s => s.trim()).filter(Boolean);
    if (!parts.length) { toast.error('Subcategory name is required'); return; }
    const parentCat = categories.find(c => c.id === addSubTarget);
    if (!parentCat?.dbId) { toast.error('Parent category not found'); return; }
    try {
      const created = await productsService.addSubcategories(parentCat.dbId, parts);
      const newSubDbIds = { ...(parentCat.subDbIds || {}) };
      created.forEach((s: any) => { newSubDbIds[s.name] = s.id; });
      const newSubs = [...parentCat.subcategories, ...parts.filter(p => !parentCat.subcategories.includes(p))];
      updateLocal(categories.map(c => c.id !== addSubTarget ? c : { ...c, subcategories: newSubs, subDbIds: newSubDbIds }));
      setNewSubName(''); setShowAddSubcategory(false); setAddSubTarget(null);
      toast.success(parts.length > 1 ? parts.length + ' subcategories added' : 'Subcategory added');
    } catch (err: any) { toast.error(err.message || 'Failed to add subcategories'); }
  };

  const handleRename = async () => {
    if (!editingCat || !editingCat.name.trim() || !editingCat.dbId) return;
    try {
      await productsService.updateCategory(editingCat.dbId, editingCat.name.trim());
      const newSlug = editingCat.name.trim().toLowerCase().replace(/\s+/g, '-');
      updateLocal(categories.map(c => c.id === editingCat.id ? { ...c, id: newSlug, name: editingCat.name.trim() } : c));
      setEditingCat(null); toast.success('Category renamed');
    } catch (err: any) { toast.error(err.message || 'Failed to rename category'); }
  };

  const handleRenameSub = async () => {
    if (!editingSub || !editingSub.newName.trim() || !editingSub.dbId) return;
    try {
      await productsService.updateCategory(editingSub.dbId, editingSub.newName.trim());
      updateLocal(categories.map(c => c.id !== editingSub.parentId ? c : {
        ...c,
        subcategories: c.subcategories.map(s => s === editingSub.oldName ? editingSub.newName.trim() : s),
        subDbIds: Object.fromEntries(Object.entries(c.subDbIds || {}).map(([k, v]) => [k === editingSub.oldName ? editingSub.newName.trim() : k, v])),
      }));
      setEditingSub(null); toast.success('Subcategory renamed');
    } catch (err: any) { toast.error(err.message || 'Failed to rename subcategory'); }
  };

  const handleDelete = async () => {
    const { type, id, parentId, dbId } = deleteConfirm;
    setDeleteConfirm(prev => ({ ...prev, open: false }));
    if (!dbId) { toast.error('Cannot delete: missing ID'); return; }
    try {
      await productsService.deleteCategory(dbId);
      if (type === 'category') { updateLocal(categories.filter(c => c.id !== id)); toast.success('Category deleted'); }
      else if (parentId) { updateLocal(categories.map(c => c.id === parentId ? { ...c, subcategories: c.subcategories.filter(s => s !== id) } : c)); toast.success('Subcategory deleted'); }
    } catch (err: any) { toast.error(err.message || 'Failed to delete'); }
  };

  const totalSub = categories.reduce((s, c) => s + c.subcategories.length, 0);

  return (
    <div className="p-4 space-y-4 max-w-[1000px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/stock')}>← Back to Stock</Button>
          <h1 className="text-xl font-bold">Categories & Subcategories</h1>
        </div>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowAddCategory(true)}><Plus className="w-4 h-4 mr-1" /> Add Category</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-sm"><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><FolderOpen className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{categories.length}</p><p className="text-xs text-gray-500">Categories</p></div></CardContent></Card>
        <Card className="shadow-sm"><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center"><Tag className="w-5 h-5 text-violet-600" /></div><div><p className="text-2xl font-bold">{totalSub}</p><p className="text-xs text-gray-500">Subcategories</p></div></CardContent></Card>
        <Card className="shadow-sm"><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center"><Boxes className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{categories.length + totalSub}</p><p className="text-xs text-gray-500">Total</p></div></CardContent></Card>
      </div>

      <div className="space-y-2">
        {categories.length === 0 ? (
          <Card className="shadow-sm"><CardContent className="py-12 text-center"><FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 font-medium">No categories yet</p><p className="text-xs text-gray-400 mt-1">Click "Add Category" to get started</p></CardContent></Card>
        ) : categories.map(cat => {
          const isOpen = expanded.has(cat.id);
          return (
            <Card key={cat.id} className="shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggle(cat.id)}>
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  <FolderOpen className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold text-sm">{cat.name}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{cat.subcategories.length} sub</Badge>
                </div>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50" onClick={() => { setAddSubTarget(cat.id); setNewSubName(''); setShowAddSubcategory(true); }}><Plus className="w-3 h-3 mr-1" /> Sub</Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-500 hover:bg-gray-100" onClick={() => setEditingCat({ id: cat.id, name: cat.name, dbId: (cat as any).dbId })}>Rename</Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={() => setDeleteConfirm({ open: true, type: 'category', id: cat.id, dbId: (cat as any).dbId })}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
              {isOpen && (
                <div className="border-t bg-gray-50/50">
                  {cat.subcategories.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-gray-400 text-center italic">No subcategories — click "+ Sub" to add</div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {cat.subcategories.map(sub => (
                        <div key={sub} className="flex items-center justify-between px-4 py-2 pl-12 hover:bg-gray-100/50 transition-colors">
                          <div className="flex items-center gap-2"><Tag className="w-3.5 h-3.5 text-violet-400" /><span className="text-sm text-gray-700">{sub}</span></div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100" onClick={() => setEditingSub({ parentId: cat.id, oldName: sub, newName: sub, dbId: (cat as any).subDbIds?.[sub] })}><Edit className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteConfirm({ open: true, type: 'subcategory', id: sub, parentId: cat.id, dbId: (cat as any).subDbIds?.[sub] })}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
          <div className="py-2"><Label className="text-xs text-gray-500">Category Name *</Label><Input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="e.g. Paper Envelope" className="h-9" onKeyDown={e => e.key === 'Enter' && handleAddCategory()} autoFocus /></div>
          <DialogFooter><Button variant="outline" size="sm" onClick={() => setShowAddCategory(false)}>Cancel</Button><Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAddCategory}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddSubcategory} onOpenChange={setShowAddSubcategory}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Subcategory</DialogTitle></DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-xs text-gray-500">Adding to: <span className="font-semibold text-gray-700">{categories.find(c => c.id === addSubTarget)?.name}</span></p>
            <div><Label className="text-xs text-gray-500">Subcategory Name(s) *</Label><Input value={newSubName} onChange={e => setNewSubName(e.target.value)} placeholder="A4 Size, A5 Size (comma separated)" className="h-9" onKeyDown={e => e.key === 'Enter' && handleAddSub()} autoFocus /><p className="text-[10px] text-gray-400 mt-1">Separate multiple with commas</p></div>
          </div>
          <DialogFooter><Button variant="outline" size="sm" onClick={() => setShowAddSubcategory(false)}>Cancel</Button><Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAddSub}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingCat} onOpenChange={open => !open && setEditingCat(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rename Category</DialogTitle></DialogHeader>
          <div className="py-2"><Label className="text-xs text-gray-500">Category Name *</Label><Input value={editingCat?.name || ''} onChange={e => setEditingCat(p => p ? { ...p, name: e.target.value } : null)} className="h-9" onKeyDown={e => e.key === 'Enter' && handleRename()} autoFocus /></div>
          <DialogFooter><Button variant="outline" size="sm" onClick={() => setEditingCat(null)}>Cancel</Button><Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleRename}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSub} onOpenChange={open => !open && setEditingSub(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rename Subcategory</DialogTitle></DialogHeader>
          <div className="py-2"><Label className="text-xs text-gray-500">Subcategory Name *</Label><Input value={editingSub?.newName || ''} onChange={e => setEditingSub(p => p ? { ...p, newName: e.target.value } : null)} className="h-9" onKeyDown={e => e.key === 'Enter' && handleRenameSub()} autoFocus /></div>
          <DialogFooter><Button variant="outline" size="sm" onClick={() => setEditingSub(null)}>Cancel</Button><Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleRenameSub}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteConfirm.open} onOpenChange={open => !open && setDeleteConfirm(p => ({ ...p, open: false }))} title={deleteConfirm.type === 'category' ? 'Delete Category' : 'Delete Subcategory'} description={deleteConfirm.type === 'category' ? 'Are you sure? This removes the category and all its subcategories.' : 'Are you sure you want to delete this subcategory?'} onConfirm={handleDelete} onCancel={() => setDeleteConfirm(p => ({ ...p, open: false }))} confirmLabel="Delete" variant="danger" />
    </div>
  );
}
