import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search, Plus, ChevronRight, ChevronDown, MapPin, Mountain, Building, TreePine, Crosshair,
  Pencil, ToggleLeft, ToggleRight, Folder, FolderOpen, FileText
} from 'lucide-react';

type LevelType = 'county' | 'subcounty' | 'block' | 'station' | 'beat';

interface TreeNode {
  id: string;
  name: string;
  code?: string;
  level: LevelType;
  is_active: boolean;
  children?: TreeNode[];
  data?: any;
}

const LEVEL_CONFIG: Record<LevelType, { label: string; childLabel: string; icon: any; color: string }> = {
  county: { label: 'County', childLabel: 'Sub-County', icon: MapPin, color: 'text-blue-600' },
  subcounty: { label: 'Sub-County', childLabel: 'Block', icon: Mountain, color: 'text-green-600' },
  block: { label: 'Block', childLabel: 'Station', icon: Folder, color: 'text-amber-600' },
  station: { label: 'Station', childLabel: 'Beat', icon: Building, color: 'text-purple-600' },
  beat: { label: 'Beat', childLabel: '', icon: TreePine, color: 'text-emerald-600' },
};

const CHILD_LEVEL: Record<LevelType, LevelType | null> = {
  county: 'subcounty', subcounty: 'block', block: 'station', station: 'beat', beat: null,
};

export function StakeholderForestLocations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState<{ id: string; level: LevelType } | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [formLevel, setFormLevel] = useState<LevelType>('county');
  const [formParentId, setFormParentId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [activeTab, setActiveTab] = useState('details');

  // Fetch all location data
  const { data: counties = [] } = useQuery({
    queryKey: ['mdm_counties'],
    queryFn: async () => {
      const { data, error } = await supabase.from('mdm_location_counties' as any).select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: subcounties = [] } = useQuery({
    queryKey: ['mdm_subcounties'],
    queryFn: async () => {
      const { data, error } = await supabase.from('mdm_location_subcounties' as any).select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: blocks = [] } = useQuery({
    queryKey: ['mdm_blocks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('mdm_location_blocks' as any).select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: stations = [] } = useQuery({
    queryKey: ['mdm_stations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('mdm_location_stations' as any).select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: beats = [] } = useQuery({
    queryKey: ['mdm_beats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('mdm_location_beats' as any).select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['mdm_audit_log', 'mdm_locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mdm_audit_log' as any)
        .select('*')
        .eq('module_id', 'mdm_locations')
        .order('changed_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Build tree structure
  const tree = useMemo(() => {
    const buildChildren = (parentId: string, level: LevelType): TreeNode[] => {
      if (level === 'subcounty') {
        return (subcounties as any[])
          .filter((s: any) => s.county_id === parentId)
          .map((s: any) => ({
            id: s.id, name: s.name, code: s.code, level: 'subcounty' as LevelType,
            is_active: s.is_active, data: s,
            children: buildChildren(s.id, 'block'),
          }));
      }
      if (level === 'block') {
        return (blocks as any[])
          .filter((b: any) => b.subcounty_id === parentId)
          .map((b: any) => ({
            id: b.id, name: b.name, code: b.code, level: 'block' as LevelType,
            is_active: b.is_active, data: b,
            children: buildChildren(b.id, 'station'),
          }));
      }
      if (level === 'station') {
        return (stations as any[])
          .filter((st: any) => st.block_id === parentId)
          .map((st: any) => ({
            id: st.id, name: st.name, code: st.code, level: 'station' as LevelType,
            is_active: st.is_active, data: st,
            children: buildChildren(st.id, 'beat'),
          }));
      }
      if (level === 'beat') {
        return (beats as any[])
          .filter((bt: any) => bt.station_id === parentId)
          .map((bt: any) => ({
            id: bt.id, name: bt.name, code: bt.beat_code, level: 'beat' as LevelType,
            is_active: bt.is_active, data: bt,
          }));
      }
      return [];
    };

    return (counties as any[]).map((c: any) => ({
      id: c.id, name: c.name, code: c.code, level: 'county' as LevelType,
      is_active: c.is_active, data: c,
      children: buildChildren(c.id, 'subcounty'),
    }));
  }, [counties, subcounties, blocks, stations, beats]);

  // Search for beats by name/code and expand path
  const filteredTree = useMemo(() => {
    if (!searchTerm) return tree;
    const term = searchTerm.toLowerCase();

    const filterNode = (node: TreeNode): TreeNode | null => {
      const nameMatch = node.name.toLowerCase().includes(term);
      const codeMatch = node.code?.toLowerCase().includes(term);
      if (nameMatch || codeMatch) return node;
      if (node.children) {
        const matchingChildren = node.children.map(filterNode).filter(Boolean) as TreeNode[];
        if (matchingChildren.length > 0) return { ...node, children: matchingChildren };
      }
      return null;
    };
    return tree.map(filterNode).filter(Boolean) as TreeNode[];
  }, [tree, searchTerm]);

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
      return next;
    });
  };

  const getSelectedData = () => {
    if (!selectedNode) return null;
    const { id, level } = selectedNode;
    const list = level === 'county' ? counties : level === 'subcounty' ? subcounties : level === 'block' ? blocks : level === 'station' ? stations : beats;
    return (list as any[]).find((item: any) => item.id === id);
  };

  const TABLE_MAP: Record<LevelType, string> = {
    county: 'mdm_location_counties',
    subcounty: 'mdm_location_subcounties',
    block: 'mdm_location_blocks',
    station: 'mdm_location_stations',
    beat: 'mdm_location_beats',
  };

  const PARENT_KEY: Record<LevelType, string> = {
    county: '',
    subcounty: 'county_id',
    block: 'subcounty_id',
    station: 'block_id',
    beat: 'station_id',
  };

  const QUERY_KEY: Record<LevelType, string> = {
    county: 'mdm_counties',
    subcounty: 'mdm_subcounties',
    block: 'mdm_blocks',
    station: 'mdm_stations',
    beat: 'mdm_beats',
  };

  const openAddForm = (level: LevelType, parentId: string | null) => {
    setFormLevel(level);
    setFormParentId(parentId);
    setFormMode('add');
    setFormData({});
    setFormOpen(true);
  };

  const openEditForm = (level: LevelType, data: any) => {
    setFormLevel(level);
    setFormMode('edit');
    setFormData(data);
    setFormOpen(true);
  };

  const handleSave = async () => {
    const table = TABLE_MAP[formLevel];
    const parentKey = PARENT_KEY[formLevel];

    try {
      if (formMode === 'add') {
        const insertData: any = { name: formData.name, code: formData.code || formData.beat_code, is_active: true };
        if (parentKey && formParentId) insertData[parentKey] = formParentId;
        if (formLevel === 'block') { insertData.total_area_ha = formData.total_area_ha; insertData.description = formData.description; }
        if (formLevel === 'station') { insertData.station_officer_name = formData.station_officer_name; insertData.station_officer_phone = formData.station_officer_phone; }
        if (formLevel === 'beat') {
          insertData.beat_code = formData.beat_code || formData.code;
          insertData.area_ha = formData.area_ha;
          insertData.centroid_latitude = formData.centroid_latitude;
          insertData.centroid_longitude = formData.centroid_longitude;
          insertData.target_trees = formData.target_trees || 0;
          insertData.description = formData.description;
          delete insertData.code;
        }

        const { data: inserted, error } = await supabase.from(table as any).insert(insertData).select().single();
        if (error) throw error;

        // Audit log
        await supabase.from('mdm_audit_log' as any).insert({
          module_id: 'mdm_locations', record_id: (inserted as any).id, action: 'CREATE',
          changed_by_user_id: user?.id, new_values: insertData,
        });

        toast.success(`${LEVEL_CONFIG[formLevel].label} created`);
      } else {
        const updateData: any = { name: formData.name };
        if (formLevel !== 'beat') updateData.code = formData.code;
        if (formLevel === 'block') { updateData.total_area_ha = formData.total_area_ha; updateData.description = formData.description; }
        if (formLevel === 'station') { updateData.station_officer_name = formData.station_officer_name; updateData.station_officer_phone = formData.station_officer_phone; }
        if (formLevel === 'beat') {
          updateData.beat_code = formData.beat_code;
          updateData.area_ha = formData.area_ha;
          updateData.centroid_latitude = formData.centroid_latitude;
          updateData.centroid_longitude = formData.centroid_longitude;
          updateData.target_trees = formData.target_trees;
          updateData.description = formData.description;
        }

        const { error } = await supabase.from(table as any).update(updateData).eq('id', formData.id);
        if (error) throw error;

        await supabase.from('mdm_audit_log' as any).insert({
          module_id: 'mdm_locations', record_id: formData.id, action: 'UPDATE',
          changed_by_user_id: user?.id, old_values: formData, new_values: updateData,
        });

        toast.success(`${LEVEL_CONFIG[formLevel].label} updated`);
      }

      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY[formLevel]] });
      queryClient.invalidateQueries({ queryKey: ['mdm_audit_log'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
  };

  const toggleActive = async (level: LevelType, id: string, currentActive: boolean) => {
    const table = TABLE_MAP[level];
    try {
      const { error } = await supabase.from(table as any).update({ is_active: !currentActive }).eq('id', id);
      if (error) throw error;
      await supabase.from('mdm_audit_log' as any).insert({
        module_id: 'mdm_locations', record_id: id,
        action: currentActive ? 'DEACTIVATE' : 'REACTIVATE',
        changed_by_user_id: user?.id,
      });
      toast.success(currentActive ? 'Deactivated' : 'Reactivated');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY[level]] });
      queryClient.invalidateQueries({ queryKey: ['mdm_audit_log'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle');
    }
  };

  const selectedData = getSelectedData();
  const selectedConfig = selectedNode ? LEVEL_CONFIG[selectedNode.level] : null;
  const childLevel = selectedNode ? CHILD_LEVEL[selectedNode.level] : null;

  // Summary stats
  const totalCounties = counties.length;
  const totalBeats = beats.length;
  const totalTargetTrees = (beats as any[]).reduce((sum: number, b: any) => sum + (b.target_trees || 0), 0);
  const totalPlantedTrees = (beats as any[]).reduce((sum: number, b: any) => sum + (b.trees_planted || 0), 0);

  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const config = LEVEL_CONFIG[node.level];
    const Icon = config.icon;
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id) || !!searchTerm;
    const isSelected = selectedNode?.id === node.id;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1 py-1.5 px-2 cursor-pointer rounded-md text-sm transition-colors ${
            isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            setSelectedNode({ id: node.id, level: node.level });
            setActiveTab('details');
          }}
        >
          {hasChildren ? (
            <button onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }} className="p-0.5">
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${config.color}`} />
          <span className="truncate">{node.name}</span>
          {node.code && <span className="text-[10px] text-muted-foreground ml-auto">{node.code}</span>}
          {!node.is_active && <Badge variant="outline" className="text-[9px] px-1 ml-1">Inactive</Badge>}
        </div>
        {hasChildren && isExpanded && node.children!.map(child => renderTreeNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Forest Locations</h1>
          <p className="text-sm text-muted-foreground">Hierarchical registry of MFC-ICLIP planting locations</p>
        </div>
        <Button onClick={() => openAddForm('county', null)}>
          <Plus className="h-4 w-4 mr-1" /> Add County
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Counties</p>
          <p className="text-xl font-bold">{totalCounties}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Beats</p>
          <p className="text-xl font-bold">{totalBeats}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Target Trees</p>
          <p className="text-xl font-bold">{totalTargetTrees.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Trees Planted</p>
          <p className="text-xl font-bold">{totalPlantedTrees.toLocaleString()}</p>
        </CardContent></Card>
      </div>

      {/* Main content: tree + detail panel */}
      <div className="grid grid-cols-12 gap-4" style={{ minHeight: '500px' }}>
        {/* Left: Tree browser */}
        <Card className="col-span-4">
          <CardHeader className="p-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[440px] px-2 pb-2">
              {filteredTree.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">No locations found. Add a county to get started.</p>
              ) : (
                filteredTree.map(node => renderTreeNode(node))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right: Detail panel */}
        <Card className="col-span-8">
          {!selectedNode || !selectedData ? (
            <CardContent className="flex items-center justify-center h-full">
              <p className="text-muted-foreground text-sm">Select a location from the tree to view details</p>
            </CardContent>
          ) : (
            <>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedConfig && <selectedConfig.icon className={`h-5 w-5 ${selectedConfig.color}`} />}
                    <CardTitle className="text-lg">{selectedData.name}</CardTitle>
                    <Badge variant={selectedData.is_active ? 'default' : 'secondary'}>
                      {selectedData.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditForm(selectedNode.level, selectedData)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActive(selectedNode.level, selectedNode.id, selectedData.is_active)}
                    >
                      {selectedData.is_active ? <ToggleRight className="h-3.5 w-3.5 mr-1" /> : <ToggleLeft className="h-3.5 w-3.5 mr-1" />}
                      {selectedData.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    {childLevel && (
                      <Button size="sm" onClick={() => openAddForm(childLevel, selectedNode.id)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add {LEVEL_CONFIG[childLevel].label}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    {childLevel && <TabsTrigger value="children">{LEVEL_CONFIG[childLevel].label}s</TabsTrigger>}
                    <TabsTrigger value="audit">Audit Log</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-3 mt-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Code:</span> <span className="font-medium ml-1">{selectedData.code || selectedData.beat_code || '-'}</span></div>
                      {selectedNode.level === 'block' && selectedData.total_area_ha && (
                        <div><span className="text-muted-foreground">Area:</span> <span className="font-medium ml-1">{selectedData.total_area_ha} ha</span></div>
                      )}
                      {selectedNode.level === 'station' && (
                        <>
                          <div><span className="text-muted-foreground">Officer:</span> <span className="font-medium ml-1">{selectedData.station_officer_name || '-'}</span></div>
                          <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium ml-1">{selectedData.station_officer_phone || '-'}</span></div>
                        </>
                      )}
                      {selectedNode.level === 'beat' && (
                        <>
                          <div><span className="text-muted-foreground">Area:</span> <span className="font-medium ml-1">{selectedData.area_ha || '-'} ha</span></div>
                          <div><span className="text-muted-foreground">GPS:</span> <span className="font-medium ml-1">
                            {selectedData.centroid_latitude && selectedData.centroid_longitude
                              ? `${selectedData.centroid_latitude}, ${selectedData.centroid_longitude}`
                              : '-'}
                          </span></div>
                          <div className="col-span-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-muted-foreground">Planting Progress</span>
                              <span className="font-medium">{selectedData.trees_planted || 0} / {selectedData.target_trees || 0}</span>
                            </div>
                            <Progress
                              value={selectedData.target_trees ? (selectedData.trees_planted / selectedData.target_trees) * 100 : 0}
                              className="h-2"
                            />
                          </div>
                        </>
                      )}
                      {selectedData.description && (
                        <div className="col-span-2"><span className="text-muted-foreground">Description:</span> <p className="mt-1">{selectedData.description}</p></div>
                      )}
                    </div>
                  </TabsContent>

                  {childLevel && (
                    <TabsContent value="children" className="mt-3">
                      {(() => {
                        const childList = childLevel === 'subcounty'
                          ? (subcounties as any[]).filter((s: any) => s.county_id === selectedNode.id)
                          : childLevel === 'block'
                          ? (blocks as any[]).filter((b: any) => b.subcounty_id === selectedNode.id)
                          : childLevel === 'station'
                          ? (stations as any[]).filter((st: any) => st.block_id === selectedNode.id)
                          : (beats as any[]).filter((bt: any) => bt.station_id === selectedNode.id);

                        return childList.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">No {LEVEL_CONFIG[childLevel].label.toLowerCase()}s yet</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Code</TableHead>
                                {childLevel === 'beat' && <TableHead>Target</TableHead>}
                                {childLevel === 'beat' && <TableHead>Planted</TableHead>}
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {childList.map((item: any) => (
                                <TableRow key={item.id} className="cursor-pointer" onClick={() => {
                                  setSelectedNode({ id: item.id, level: childLevel });
                                  setExpandedNodes(prev => new Set([...prev, selectedNode.id]));
                                }}>
                                  <TableCell className="font-medium">{item.name}</TableCell>
                                  <TableCell>{item.code || item.beat_code || '-'}</TableCell>
                                  {childLevel === 'beat' && <TableCell>{item.target_trees || 0}</TableCell>}
                                  {childLevel === 'beat' && <TableCell>{item.trees_planted || 0}</TableCell>}
                                  <TableCell>
                                    <Badge variant={item.is_active ? 'default' : 'secondary'} className="text-[10px]">
                                      {item.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEditForm(childLevel, item); }}>
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        );
                      })()}
                    </TabsContent>
                  )}

                  <TabsContent value="audit" className="mt-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Action</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Record ID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(auditLogs as any[]).filter((l: any) => l.record_id === selectedNode.id).slice(0, 20).map((log: any) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">{log.action}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">{new Date(log.changed_at).toLocaleString()}</TableCell>
                            <TableCell className="text-xs font-mono">{log.record_id?.slice(0, 8)}</TableCell>
                          </TableRow>
                        ))}
                        {(auditLogs as any[]).filter((l: any) => l.record_id === selectedNode.id).length === 0 && (
                          <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground text-sm py-4">No audit entries</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* Add/Edit Sheet */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{formMode === 'add' ? 'Add' : 'Edit'} {LEVEL_CONFIG[formLevel].label}</SheetTitle>
            <SheetDescription>
              {formMode === 'add' ? `Create a new ${LEVEL_CONFIG[formLevel].label.toLowerCase()}` : `Update ${formData.name || ''}`}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Name *</Label>
              <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={`${LEVEL_CONFIG[formLevel].label} name`} />
            </div>
            {formLevel !== 'beat' && (
              <div>
                <Label>Code</Label>
                <Input value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="e.g. NKR" />
              </div>
            )}
            {formLevel === 'beat' && (
              <>
                <div>
                  <Label>Beat Code *</Label>
                  <Input value={formData.beat_code || ''} onChange={(e) => setFormData({ ...formData, beat_code: e.target.value })} placeholder="Unique beat code" />
                </div>
                <div>
                  <Label>Area (ha)</Label>
                  <Input type="number" value={formData.area_ha || ''} onChange={(e) => setFormData({ ...formData, area_ha: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Latitude</Label>
                    <Input type="number" step="0.00000001" value={formData.centroid_latitude || ''} onChange={(e) => setFormData({ ...formData, centroid_latitude: e.target.value })} />
                  </div>
                  <div>
                    <Label>Longitude</Label>
                    <Input type="number" step="0.00000001" value={formData.centroid_longitude || ''} onChange={(e) => setFormData({ ...formData, centroid_longitude: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Target Trees</Label>
                  <Input type="number" value={formData.target_trees || ''} onChange={(e) => setFormData({ ...formData, target_trees: parseInt(e.target.value) || 0 })} />
                </div>
                {navigator.geolocation && (
                  <Button variant="outline" size="sm" onClick={() => {
                    navigator.geolocation.getCurrentPosition((pos) => {
                      setFormData({ ...formData, centroid_latitude: pos.coords.latitude, centroid_longitude: pos.coords.longitude });
                      toast.success('Location captured');
                    }, () => toast.error('Could not get location'));
                  }}>
                    <Crosshair className="h-3.5 w-3.5 mr-1" /> Use my location
                  </Button>
                )}
              </>
            )}
            {formLevel === 'block' && (
              <div>
                <Label>Total Area (ha)</Label>
                <Input type="number" value={formData.total_area_ha || ''} onChange={(e) => setFormData({ ...formData, total_area_ha: e.target.value })} />
              </div>
            )}
            {formLevel === 'station' && (
              <>
                <div>
                  <Label>Station Officer Name</Label>
                  <Input value={formData.station_officer_name || ''} onChange={(e) => setFormData({ ...formData, station_officer_name: e.target.value })} />
                </div>
                <div>
                  <Label>Station Officer Phone</Label>
                  <Input value={formData.station_officer_phone || ''} onChange={(e) => setFormData({ ...formData, station_officer_phone: e.target.value })} />
                </div>
              </>
            )}
            {(formLevel === 'block' || formLevel === 'beat') && (
              <div>
                <Label>Description</Label>
                <Textarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={!formData.name || (formLevel === 'beat' && !formData.beat_code)}>
                {formMode === 'add' ? 'Create' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}