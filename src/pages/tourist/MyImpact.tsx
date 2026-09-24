import { useMemo, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { treeCount } from "@/lib/format";
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
    scientificName: "Acacia auriculiformis",
    description:
      "Acacia auriculiformis, commonly called auri trees, are fast-growing evergreen trees with gnarled trunks and sweet-smelling yellow flowers. The trees are often used for shade, erosion control, and charcoal.",
    image: acaciaImage,
  },
  {
    name: "Acrocarpus fraxinifolius",
    scientificName: "Acrocarpus fraxinifolius",
    description:
      "Acrocarpus fraxinifolius is foliage deciduous trees. Also classified as exotic big tree that can grow up to 60 m height.",
    image: acrocarpusImage,
  },
  {
    name: "Albizia/Mugavu",
    scientificName: "Albizia coriaria",
    description:
      "Albizia is in the Guinness Book of Records as the world's fastest growing tree. Albizia is a large tree that can grow up to 40 m tall with the first branch at a height of up to 20 m.",
    image: albiziaImage,
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
  const currentYear = new Date().getFullYear();

  const stats = useMemo(() => {
    const paid = state.donations.filter((d) => d.userId === session?.userId && d.status === "paid");
    const totalTrees = paid.reduce((sum, d) => sum + treeCount(d.trees), 0);
    const carbonLifetimeKg = paid.reduce((sum, d) => sum + d.carbonOffsetKg, 0);
    const carbonToDateKg = totalTrees * KG_PER_TREE_YEAR;
    const treesIn = (year: number) =>
      paid
        .filter((d) => new Date(d.createdAt).getFullYear() === year)
        .reduce((sum, d) => sum + treeCount(d.trees), 0);
    return {
      totalTrees,
      familiesHelped: Math.floor(totalTrees / 10),
      carbonToDate: carbonToDateKg / 1000,
      carbonLifetime: Math.max(carbonLifetimeKg, carbonToDateKg) / 1000,
      treesLastYear: treesIn(currentYear - 1),
      treesThisYear: treesIn(currentYear),
    };
  }, [currentYear, session?.userId, state.donations]);

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
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const yearCell = (trees: number) => (trees > 0 ? trees.toLocaleString() : "-");
  const co2Cell = (trees: number) => (trees > 0 ? Math.round(trees * KG_PER_TREE_YEAR).toLocaleString() : "-");

  return (
    <div className="p-8 space-y-12">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold text-foreground mb-2">My Impact</h1>
        <img src={ktbLogo} alt="Kenya Tourism Board" className="h-20 object-contain" />
      </div>

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
              <Button onClick={() => void handleGenerateLink()} className="bg-primary hover:bg-primary/90">
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Link2 className="mr-2 h-4 w-4" />
                    Generate link
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        <div>
          <p className="text-muted-foreground mb-6">
            Your climate action though tree planting has contributed to the United Nations Sustainability Development Goals.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      <section className="space-y-6">
        <h2 className="text-2xl font-bold">Carbon calculation details</h2>

        <Card className="p-6 bg-muted/30">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="p-3 text-left font-semibold text-foreground" />
                      <th className="p-3 text-left font-semibold text-foreground">{currentYear - 1}</th>
                      <th className="p-3 text-left font-semibold text-foreground">{currentYear} to date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="p-3 font-semibold text-foreground">Number of trees</td>
                      <td className="p-3 text-muted-foreground">{yearCell(stats.treesLastYear)}</td>
                      <td className="p-3 text-foreground">{stats.treesThisYear.toLocaleString()}</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="p-3 font-semibold text-foreground">CO₂ sequestered (Kg)</td>
                      <td className="p-3 text-muted-foreground">{co2Cell(stats.treesLastYear)}</td>
                      <td className="p-3 text-foreground">
                        {Math.round(stats.treesThisYear * KG_PER_TREE_YEAR).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="pt-4">
                <h4 className="font-semibold mb-2 text-foreground">Notes</h4>
                <p className="text-sm text-muted-foreground">
                  Please note that in the CO₂ calculation we only take into account the CO₂ contribution from the trees you
                  have bought, so not from the trees you have gotten as a gift. We otherwise would double count.
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
        <h2 className="text-2xl font-bold mb-6">Tree locations</h2>
        {stats.totalTrees > 0 && (
          <Card className="overflow-hidden">
            <img src={mauForest} alt="Mau Forest Complex" className="w-full h-64 object-cover" />
            <div className="p-6">
              <h3 className="text-xl font-bold">Mau Forest Complex, Kenya</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Your funded trees are assigned to planting partners working in the Mau Forest Complex. GPS pins will appear
                here when field mapping is connected.
              </p>
            </div>
          </Card>
        )}
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold">Species planted:</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {speciesData.map((species) => (
            <Card key={species.name} className="overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                <img
                  src={species.image}
                  alt={species.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6 space-y-3">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">{species.name}</h3>
                  <p className="text-sm text-muted-foreground italic">{species.scientificName}</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{species.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold">Trees were planted by:</h2>
        <div className="space-y-6">
          {partnersData.map((partner) => (
            <Card key={partner.name} className="p-8 bg-muted/30">
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
    </div>
  );
}
