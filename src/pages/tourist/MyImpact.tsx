import { useMemo, useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { treeCount } from "@/lib/format";
import { TouristPage } from "@/components/layout/TouristPage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SDG15Icon from "@/assets/SDG_15.png";
import SDG13Icon from "@/assets/SDG_13.png";
import SDG10Icon from "@/assets/SDG_10.png";
import acaciaImage from "@/assets/acacia-auriculiformis-new.png";
import acrocarpusImage from "@/assets/acrocarpus-fraxinifolius-new.png";
import albiziaImage from "@/assets/albizia-mugavu-new.png";
import treesForKenyaLogo from "@/assets/trees-for-kenya-logo.jpeg";
import greenBeltLogo from "@/assets/green-belt-movement-logo.jpg";
import tistLogo from "@/assets/tist-program-logo.webp";
import mauForest from "@/assets/mau-forest-complex.jpg";
import ktbLogo from "@/assets/ktb-logo.png";

const KG_PER_TREE_YEAR = 26.5;

const speciesData = [
  {
    name: "Acacia",
    scientificName: "Acacia xanthophloea",
    description:
      "Fever trees with pale bark that grow quickly along watercourses. Used for shade, restoration, and charcoal in Kenyan landscapes.",
    image: acaciaImage,
  },
  {
    name: "Croton",
    scientificName: "Croton megalocarpus",
    description:
      "A hardy indigenous tree that supports farm forestry and oilseed production while sequestering carbon on degraded land.",
    image: albiziaImage,
  },
  {
    name: "African Cedar",
    scientificName: "Juniperus procera",
    description:
      "East Africa’s highland cedar. Long-lived, valuable for watershed restoration and a high lifetime carbon store.",
    image: acrocarpusImage,
  },
];

const partnersData = [
  {
    name: "Trees for Kenya",
    logo: treesForKenyaLogo,
    description:
      "A non-profit NGO that actively restores degraded forest lands, supports farm forestry, and promotes agroforestry through partnerships with farmers and tree nurseries.",
  },
  {
    name: "The Green Belt Movement",
    logo: greenBeltLogo,
    description:
      "A well-known organization focused on tree planting and water harvesting, empowering communities to take action for environmental conservation.",
  },
  {
    name: "The TIST Program",
    logo: tistLogo,
    description:
      "A program that works with thousands of farmers in Kenya to plant trees, which not only helps the environment but also provides them with income and leadership opportunities through the sale of carbon credits.",
  },
];

export default function MyImpact() {
  const { session } = useAuth();
  const { state } = useStore();
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    const paid = state.donations.filter((d) => d.userId === session?.userId && d.status === "paid");
    const totalTrees = paid.reduce((sum, d) => sum + treeCount(d.trees), 0);
    const carbonLifetimeKg = paid.reduce((sum, d) => sum + d.carbonOffsetKg, 0);
    const carbonToDateKg = totalTrees * KG_PER_TREE_YEAR;
    return {
      totalTrees,
      familiesHelped: Math.floor(totalTrees / 10),
      carbonToDate: carbonToDateKg / 1000,
      carbonLifetime: Math.max(carbonLifetimeKg, carbonToDateKg) / 1000,
    };
  }, [session?.userId, state.donations]);

  const carbonData = [
    { name: "Carbon sequestered to date", value: stats.carbonToDate, fill: "#8BC34A" },
    {
      name: "Carbon to be sequestered over trees lifetime",
      value: Math.max(0, stats.carbonLifetime - stats.carbonToDate),
      fill: "#C5E1A5",
    },
  ];

  const handleGenerateLink = async () => {
    const link = `${window.location.origin}/my-impact`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TouristPage
      title="My Impact"
      headerRight={<img src={ktbLogo} alt="Kenya Tourism Board" className="hidden sm:block h-16 sm:h-20 object-contain" />}
    >
      <section className="space-y-8">
        <Card className="glass-card p-6">
          <div className="flex items-start gap-4">
            <div className="bg-muted rounded-lg p-4">
              <Link2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">Share your impact report!</h2>
                <p className="text-muted-foreground">Use this link to share your impact report and inspire others.</p>
              </div>
              <Button onClick={() => void handleGenerateLink()}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Generate link
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        <div>
          <p className="text-muted-foreground mb-6">
            Your climate action through tree planting has contributed to the United Nations Sustainable Development Goals.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6 glass-card border-none">
              <div className="flex items-center gap-4">
                <img src={SDG15Icon} alt="SDG 15 Life on Land" className="w-20 h-20 rounded-lg" />
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Trees planted</p>
                  <p className="text-3xl font-bold text-foreground">{stats.totalTrees.toLocaleString()} Trees</p>
                </div>
              </div>
            </Card>
            <Card className="p-6 glass-card border-none">
              <div className="flex items-center gap-4">
                <img src={SDG10Icon} alt="SDG 10 Reduced Inequalities" className="w-20 h-20 rounded-lg" />
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Families helped</p>
                  <p className="text-3xl font-bold text-foreground">{stats.familiesHelped} Families</p>
                </div>
              </div>
            </Card>
            <Card className="p-6 glass-card border-none">
              <div className="flex items-center gap-4">
                <img src={SDG13Icon} alt="SDG 13 Climate Action" className="w-20 h-20 rounded-lg" />
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Carbon sequestered to date*</p>
                  <p className="text-3xl font-bold text-foreground">{stats.carbonToDate.toFixed(1)} tonnes CO₂</p>
                </div>
              </div>
            </Card>
            <Card className="p-6 glass-card border-none">
              <div className="flex items-center gap-4">
                <img src={SDG13Icon} alt="SDG 13 Climate Action" className="w-20 h-20 rounded-lg" />
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

      <section className="space-y-6">
        <h2 className="text-2xl font-bold">Carbon calculation details</h2>
        <Card className="glass-card p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="p-3 text-left font-semibold" />
                      <th className="p-3 text-left font-semibold">To date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="p-3 font-semibold">Number of trees</td>
                      <td className="p-3">{stats.totalTrees.toLocaleString()}</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="p-3 font-semibold">CO₂ sequestered (Kg)</td>
                      <td className="p-3">{Math.round(stats.carbonToDate * 1000).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Notes</h4>
                <p className="text-sm text-muted-foreground">
                  Lifetime CO₂ uses the mix of species you funded. Annual figures assume {KG_PER_TREE_YEAR} kg per tree
                  per year.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="h-[250px] w-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={carbonData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                      {carbonData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
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

      <section className="space-y-6">
        <h2 className="text-2xl font-bold">Tree locations</h2>
        <Card className="glass-card overflow-hidden">
          <img src={mauForest} alt="Mau Forest Complex" className="w-full h-64 object-cover" />
          <div className="p-6">
            <h3 className="text-xl font-bold">Mau Forest Complex, Kenya</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Your funded trees are assigned to planting partners working in the Mau Forest Complex. GPS pins will appear
              here when field mapping is connected.
            </p>
          </div>
        </Card>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold">Species planted</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {speciesData.map((species) => (
            <Card key={species.name} className="glass-card overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="aspect-[4/3] bg-muted overflow-hidden">
                <img src={species.image} alt={species.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-6 space-y-3">
                <div>
                  <h3 className="text-xl font-bold">{species.name}</h3>
                  <p className="text-sm text-muted-foreground italic">{species.scientificName}</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{species.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold">Trees were planted by</h2>
        <div className="space-y-6">
          {partnersData.map((partner) => (
            <Card key={partner.name} className="glass-card p-8">
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
            </Card>
          ))}
        </div>
      </section>
    </TouristPage>
  );
}
