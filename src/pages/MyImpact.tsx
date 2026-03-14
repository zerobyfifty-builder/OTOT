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
import SDG15Icon from '@/assets/SDG_15.png';
import SDG13Icon from '@/assets/SDG_13.png';
import SDG10Icon from '@/assets/SDG_10.png';
import acaciaImage from '@/assets/acacia-auriculiformis-new.png';
import acrocarpusImage from '@/assets/acrocarpus-fraxinifolius-new.png';
import albiziaImage from '@/assets/albizia-mugavu-new.png';
import treesForKenyaLogo from '@/assets/trees-for-kenya-logo.jpeg';
import greenBeltLogo from '@/assets/green-belt-movement-logo.jpg';
import tistLogo from '@/assets/tist-program-logo.webp';
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
  const [mapboxToken] = useState('pk.eyJ1IjoicmFtc2VudGhpbCIsImEiOiJjbWdlNmsyeGwwYXFhMmlzZjR2c2J1ejdnIn0._afBkwGcrWPS4S6QJOKGHg');
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

  // Species data
  const speciesData = [{
    name: 'Acacia',
    scientificName: 'Acacia auriculiformis',
    description: 'Acacia auriculiformis, commonly called auri trees, are fast-growing evergreen trees with gnarled trunks and sweet-smelling yellow flowers. The trees are often used for shade, erosion control, and charcoal.',
    image: acaciaImage
  }, {
    name: 'Acrocarpus fraxinifolius',
    scientificName: 'Acrocarpus fraxinifolius',
    description: 'Acrocarpus fraxinifolius is foliage deciduous trees. Also classified as exotic big tree that can grow up to 60 m height.',
    image: acrocarpusImage
  }, {
    name: 'Albizia/Mugavu',
    scientificName: 'Albizia coriaria',
    description: "Albizia is in the Guinness Book of Records as the world's fastest growing tree. Albizia is a large tree that can grow up to 40 m tall with the first branch at a height of up to 20 m.",
    image: albiziaImage
  }];

  // Partners data
  const partnersData = [{
    name: 'Trees for Kenya',
    logo: treesForKenyaLogo,
    description: 'A non-profit NGO that actively restores degraded forest lands, supports farm forestry, and promotes agroforestry through partnerships with farmers and tree nurseries.'
  }, {
    name: 'The Green Belt Movement',
    logo: greenBeltLogo,
    description: 'A well-known organization focused on tree planting and water harvesting, empowering communities to take action for environmental conservation.'
  }, {
    name: 'The TIST Program',
    logo: tistLogo,
    description: 'A program that works with thousands of farmers in Kenya to plant trees, which not only helps the environment but also provides them with income and leadership opportunities through the sale of carbon credits.'
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
            <Card className="p-6 bg-muted/50 border-none">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <img src={SDG15Icon} alt="SDG 15 Life on Land" className="w-20 h-20 rounded-lg" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Trees planted</p>
                  <p className="text-3xl font-bold text-foreground">{stats.totalTrees.toLocaleString()} Trees</p>
                </div>
              </div>
            </Card>

            {/* Families Helped */}
            <Card className="p-6 bg-muted/50 border-none">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <img src={SDG10Icon} alt="SDG 10 Reduced Inequalities" className="w-20 h-20 rounded-lg" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Families helped</p>
                  <p className="text-3xl font-bold text-foreground">{stats.familiesHelped} Families</p>
                </div>
              </div>
            </Card>

            {/* Carbon Sequestered to Date */}
            <Card className="p-6 bg-muted/50 border-none">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <img src={SDG13Icon} alt="SDG 13 Climate Action" className="w-20 h-20 rounded-lg" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Carbon sequestered to date*</p>
                  <p className="text-3xl font-bold text-foreground">{stats.carbonToDate.toFixed(1)} tonnes CO₂</p>
                </div>
              </div>
            </Card>

            {/* Carbon Sequestered over Lifetime */}
            <Card className="p-6 bg-muted/50 border-none">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <img src={SDG13Icon} alt="SDG 13 Climate Action" className="w-20 h-20 rounded-lg" />
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
        
        <Card className="p-6 bg-muted/30">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Data table and notes */}
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="p-3 text-left font-semibold text-foreground">2025</th>
                      <th className="p-3 text-left font-semibold text-foreground">2026 to date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="p-3 font-semibold text-foreground">Number of trees</td>
                      <td className="p-3 text-muted-foreground">-</td>
                      <td className="p-3 text-foreground">{stats.totalTrees.toLocaleString()}</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="p-3 font-semibold text-foreground">CO₂ sequestered (Kg)</td>
                      <td className="p-3 text-muted-foreground">-</td>
                      <td className="p-3 text-foreground">{(stats.carbonToDate * 1000).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Notes section below table */}
              <div className="pt-4">
                <h4 className="font-semibold mb-2 text-foreground">Notes</h4>
                <p className="text-sm text-muted-foreground">
                  Please note that in the CO₂ calculation we only take into account the CO₂ contribution from the trees you
                  have bought, so not from the trees you have gotten as a gift. We otherwise would double count.
                </p>
              </div>
            </div>

            {/* Data graphic */}
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="h-[250px] w-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={carbonData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                      {carbonData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
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
          </div>
        </Card>
      </section>

      {/* Section 3: Tree Locations Map */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold mb-6">Tree locations</h2>
        {mapboxToken && trees.length > 0 && <TreeMap trees={trees} mapboxToken={mapboxToken} onTreeClick={() => {}} />}
      </section>

      {/* Section 4: Species Planted */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold">Species planted:</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {speciesData.map((species, index) => <Card key={index} className="overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                <img src={species.image} alt={species.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-6 space-y-3">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">{species.name}</h3>
                  <p className="text-sm text-muted-foreground italic">{species.scientificName}</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{species.description}</p>
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