import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { TreeMap } from '@/components/trees/TreeMap';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
export const MyImpact = () => {
  const {
    user
  } = useAuth();
  const [copied, setCopied] = useState(false);
  const [trees, setTrees] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalTrees: 0,
    familiesHelped: 0,
    carbonToDate: 0,
    carbonLifetime: 0
  });
  const [mapboxToken] = useState('pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbTc5MXZuOWowbzRvMmpzYjl0azU2a2hkIn0.HdEr7_dQrIh2aPxCORV7Sg');
  useEffect(() => {
    if (user) {
      fetchTreeData();
    }
  }, [user]);
  const fetchTreeData = async () => {
    if (!user) return;
    const {
      data: treesData,
      error
    } = await supabase.from('trees').select('*').eq('user_id', user.id);
    if (error) {
      console.error('Error fetching trees:', error);
      return;
    }
    setTrees(treesData || []);

    // Calculate stats
    const totalTrees = treesData?.reduce((sum, tree) => sum + tree.num_trees, 0) || 0;
    const carbonToDate = totalTrees * 26.5; // kg per tree annually
    const carbonLifetime = totalTrees * 250; // kg per tree over lifetime

    setStats({
      totalTrees,
      familiesHelped: Math.floor(totalTrees / 10),
      // Estimate: 1 family per 10 trees
      carbonToDate: carbonToDate / 1000,
      // Convert to tonnes
      carbonLifetime: carbonLifetime / 1000 // Convert to tonnes
    });
  };
  const handleGenerateLink = () => {
    const link = `${window.location.origin}/impact/${user?.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Carbon data for pie chart
  const carbonData = [{
    name: 'Carbon sequestered to date',
    value: stats.carbonToDate,
    fill: '#8BC34A'
  }, {
    name: 'Carbon to be sequestered over trees lifetime',
    value: stats.carbonLifetime - stats.carbonToDate,
    fill: '#C5E1A5'
  }];

  // Mock species data
  const speciesData = [{
    name: 'Acacia',
    scientificName: 'Acacia auriculiformis',
    description: 'Acacia auriculiformis, commonly called auri trees, are fast-growing evergreen trees with gnarled trunks and sweet-smelling yellow flowers. The trees are often used for shade, erosion control, and charcoal.',
    image: '/src/assets/tree-green.png'
  }, {
    name: 'Acrocarpus fraxinifolius',
    scientificName: 'Acrocarpus fraxinifolius',
    description: 'Acrocarpus fraxinifolius is foliage deciduous trees. Also classified as exotic big tree that can grow up to 60 m height.',
    image: '/src/assets/tree-green.png'
  }, {
    name: 'Albizia/Mugavu',
    scientificName: 'Albizia',
    description: "Albizzia is in the Guinness Book of Records as the world's fastest growing tree. Albizzia is a large tree that can grow up to 40 m tall with the first branch at a height of up to 20 m.",
    image: '/src/assets/tree-green.png'
  }];

  // Mock partners data
  const partnersData = [{
    name: 'Trees4Trees',
    logo: '/src/assets/otot-tree-icon.png',
    description: 'Trees4Trees in Indonesia empowers local communities through partnership reforestation initiatives. By increasing the area of community planted and owned forests, livelihood assets are created, the negative effects of deforestation are reduced and the environment is renewed.'
  }, {
    name: 'FEED',
    logo: '/src/assets/otot-tree-icon.png',
    description: 'FEED in the Philippines supports sustainable education & tree planting, aiming to grow, preserve and protect Philippine biodiversity. FEED does this through social forestry programs and research in partnership with the University of the Philippines based in Los Baños.'
  }];
  return <div className="p-8 space-y-12">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">My Impact</h1>
      </div>

      {/* Section 1: Share Impact & UN SDG Metrics */}
      <section className="space-y-8">
        <Card className="p-6 bg-muted/30">
          <div className="flex items-start gap-4">
            <div className="bg-muted rounded-lg p-4">
              <Link2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">Share your impact report!</h2>
                <p className="text-muted-foreground">Use this link to share your impact report and inspire others.</p>
              </div>
              <Button onClick={handleGenerateLink} className="bg-primary hover:bg-primary/90">
                {copied ? <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </> : <>
                    <Link2 className="mr-2 h-4 w-4" />
                    Generate link
                  </>}
              </Button>
            </div>
          </div>
        </Card>

        <div>
          <p className="text-muted-foreground mb-6">Your climate action though tree planting has contributed to the United Nations Sustainability Development Goals.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Trees Planted */}
            <Card className="p-6 bg-[hsl(120,40%,90%)] border-none">
              <div className="flex items-center gap-4">
                <div className="bg-[hsl(120,60%,40%)] rounded-lg p-4 flex-shrink-0">
                  <div className="text-white text-2xl font-bold">15</div>
                  <div className="text-white text-xs">LIFE<br />ON LAND</div>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Trees planted</p>
                  <p className="text-3xl font-bold text-foreground">{stats.totalTrees.toLocaleString()} Trees</p>
                </div>
              </div>
            </Card>

            {/* Families Helped */}
            <Card className="p-6 bg-[hsl(330,70%,90%)] border-none">
              <div className="flex items-center gap-4">
                <div className="bg-[hsl(330,80%,45%)] rounded-lg p-4 flex-shrink-0">
                  <div className="text-white text-2xl font-bold">10</div>
                  <div className="text-white text-xs">REDUCED<br />INEQUALITIES</div>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Families helped</p>
                  <p className="text-3xl font-bold text-foreground">{stats.familiesHelped} Families</p>
                </div>
              </div>
            </Card>

            {/* Carbon Sequestered to Date */}
            <Card className="p-6 bg-[hsl(120,30%,85%)] border-none">
              <div className="flex items-center gap-4">
                <div className="bg-[hsl(120,45%,35%)] rounded-lg p-4 flex-shrink-0">
                  <div className="text-white text-2xl font-bold">13</div>
                  <div className="text-white text-xs">CLIMATE<br />ACTION</div>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Carbon sequestered to date*</p>
                  <p className="text-3xl font-bold text-foreground">{stats.carbonToDate.toFixed(1)} tonnes CO₂</p>
                </div>
              </div>
            </Card>

            {/* Carbon Sequestered over Lifetime */}
            <Card className="p-6 bg-[hsl(120,30%,85%)] border-none">
              <div className="flex items-center gap-4">
                <div className="bg-[hsl(120,45%,35%)] rounded-lg p-4 flex-shrink-0">
                  <div className="text-white text-2xl font-bold">13</div>
                  <div className="text-white text-xs">CLIMATE<br />ACTION</div>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Carbon sequestered over lifetime*</p>
                  <p className="text-3xl font-bold text-foreground">{stats.carbonLifetime.toFixed(1)} tonnes CO₂</p>
                </div>
              </div>
            </Card>
          </div>

          <p className="text-xs text-muted-foreground mt-4">* CO₂ only calculated from trees purchased</p>
        </div>
      </section>

      {/* Section 2: Carbon Calculation Details */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold">Carbon calculation details</h2>
        
        <div>
          <h3 className="text-lg font-semibold mb-4 text-muted-foreground">Data table</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="p-4 text-left">← 2021</th>
                  <th className="p-4 text-left">2022</th>
                  <th className="p-4 text-left">2023</th>
                  <th className="p-4 text-left">2024 to date</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-primary/20">
                  <td className="p-4 font-semibold">Number of trees</td>
                  <td className="p-4">-</td>
                  <td className="p-4">-</td>
                  <td className="p-4">{stats.totalTrees.toLocaleString()}</td>
                </tr>
                <tr className="bg-primary/20">
                  <td className="p-4 font-semibold">CO₂ sequestered (Kg)</td>
                  <td className="p-4">-</td>
                  <td className="p-4">-</td>
                  <td className="p-4">{(stats.carbonToDate * 1000).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4 text-muted-foreground">Data graphic</h3>
          <Card className="p-6 bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={carbonData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                      {carbonData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-[#8BC34A]" />
                  <span className="text-sm">carbon sequestered to date</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-[#C5E1A5]" />
                  <span className="text-sm">carbon to be sequestered over trees' lifetime</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="mt-6 p-6 bg-background border">
            <h4 className="font-semibold mb-2">Notes</h4>
            <p className="text-sm text-muted-foreground">
              Please note that in the CO₂ calculation we only take into account the CO₂ contribution from the trees you
              have bought, so not from the trees you have gotten as a gift. We otherwise would double count.
            </p>
          </Card>
        </div>
      </section>

      {/* Section 3: Tree Locations Map */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Tree locations</h2>
          <p className="text-muted-foreground">
            Indonesia, UAE, Kenya, Nepal, Bhutan, The Philippines, Uganda, Peru, Malaysia-ReGrow, Guatemala,
            Ecuador, Haiti, India, Malaysia, Madagascar, Thailand
          </p>
        </div>
        {mapboxToken && trees.length > 0 && <TreeMap trees={trees} mapboxToken={mapboxToken} onTreeClick={() => {}} />}
      </section>

      {/* Section 4: Species Planted */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold">Species planted:</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {speciesData.map((species, index) => <Card key={index} className="overflow-hidden">
              <div className="aspect-square bg-muted relative overflow-hidden">
                <img src={species.image} alt={species.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{species.name}</h3>
                  <span className="text-2xl">🌱</span>
                </div>
                <p className="text-sm text-muted-foreground">{species.description}</p>
              </div>
            </Card>)}
        </div>
        <div className="flex justify-center">
          <Button variant="outline" className="min-w-[200px]">
            Show more
          </Button>
        </div>
      </section>

      {/* Section 5: Planting Partners */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold">Trees were planted by:</h2>
        <div className="space-y-6">
          {partnersData.map((partner, index) => <Card key={index} className="p-8 bg-muted/30">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 bg-background rounded-lg flex items-center justify-center">
                    <img src={partner.logo} alt={partner.name} className="w-16 h-16 object-contain" />
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="text-2xl font-bold text-primary">{partner.name}</h3>
                  <p className="text-muted-foreground leading-relaxed">{partner.description}</p>
                </div>
              </div>
            </Card>)}
        </div>
      </section>
    </div>;
};