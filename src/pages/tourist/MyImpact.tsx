import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Sprout, TreePine } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { kg, treeCount } from "@/lib/format";
import { CO2_KG_PER_TREE_YEAR } from "@/lib/impact";
import { PLANTED_HERE } from "@/lib/treeStages";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SDG15Icon from "@/assets/SDG_15.png";
import SDG13Icon from "@/assets/SDG_13.png";
import acaciaImage from "@/assets/acacia-auriculiformis-new.png";
import acrocarpusImage from "@/assets/acrocarpus-fraxinifolius-new.png";
import albiziaImage from "@/assets/albizia-mugavu-new.png";
import treesForKenyaLogo from "@/assets/trees-for-kenya-logo.jpeg";
import greenBeltLogo from "@/assets/green-belt-movement-logo.jpg";
import tistLogo from "@/assets/tist-program-logo.webp";
import mauForest from "@/assets/mau-forest-complex.jpg";
import ktbLogo from "@/assets/ktb-logo.png";

/** Artwork for species we have photos of, matched on the genus. */
const SPECIES_ART: { match: RegExp; image: string; scientificName: string; description: string }[] = [
  {
    match: /acacia/i,
    image: acaciaImage,
    scientificName: "Acacia auriculiformis",
    description:
      "Acacia auriculiformis, commonly called auri trees, are fast-growing evergreen trees with gnarled trunks and sweet-smelling yellow flowers. The trees are often used for shade, erosion control, and charcoal.",
  },
  {
    match: /acrocarpus/i,
    image: acrocarpusImage,
    scientificName: "Acrocarpus fraxinifolius",
    description:
      "Acrocarpus fraxinifolius is a deciduous tree. It is classified as an exotic big tree that can grow up to 60 m high.",
  },
  {
    match: /albizia|mugavu/i,
    image: albiziaImage,
    scientificName: "Albizia coriaria",
    description:
      "Albizia is in the Guinness Book of Records as the world's fastest growing tree. Albizia is a large tree that can grow up to 40 m tall with the first branch at a height of up to 20 m.",
  },
];

/** Partners we have logos and write-ups for, matched on their exact name. */
const PARTNER_PROFILES: { name: string; logo: string; description: string }[] = [
  {
    name: "Trees for Kenya",
    logo: treesForKenyaLogo,
    description:
      "A non-profit NGO that actively restores degraded forest lands, supports farm forestry, and promotes agroforestry through partnerships with farmers and tree nurseries.",
  },
  {
    name: "Green Belt Movement",
    logo: greenBeltLogo,
    description:
      "A well-known organization focused on tree planting and water harvesting, empowering communities to take action for environmental conservation.",
  },
  {
    name: "TIST Program",
    logo: tistLogo,
    description:
      "A program that works with thousands of farmers in Kenya to plant trees, which not only helps the environment but also provides them with income and leadership opportunities through the sale of carbon credits.",
  },
];

const normalize = (name: string) => name.trim().toLowerCase().replace(/^the\s+/, "");

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export default function MyImpact() {
  const { session } = useAuth();
  const { state } = useStore();
  const currentYear = new Date().getFullYear();

  const impact = useMemo(() => {
    const paid = state.donations.filter((d) => d.userId === session?.userId && d.status === "paid");
    const requestByDonation = new Map(
      state.plantationRequests.flatMap((r) => r.donationIds.map((donationId) => [donationId, r] as const)),
    );
    const fundedTrees = paid.reduce((sum, d) => sum + treeCount(d.trees), 0);
    // Only a Ministry-completed request counts as planted.
    const plantedTrees = paid
      .filter((d) => requestByDonation.get(d.id)?.status === "completed")
      .reduce((sum, d) => sum + treeCount(d.trees), 0);
    const lifetimeKg = paid.reduce((sum, d) => sum + d.carbonOffsetKg, 0);
    const treesIn = (year: number) =>
      paid
        .filter((d) => new Date(d.createdAt).getFullYear() === year)
        .reduce((sum, d) => sum + treeCount(d.trees), 0);

    const speciesCounts = new Map<string, { name: string; count: number }>();
    for (const d of paid) {
      for (const row of d.trees) {
        const entry = speciesCounts.get(row.treeTypeId) ?? { name: row.treeType, count: 0 };
        entry.count += row.count;
        speciesCounts.set(row.treeTypeId, entry);
      }
    }
    const species = [...speciesCounts.entries()]
      .map(([typeId, entry]) => {
        const type = state.treeTypes.find((t) => t.id === typeId);
        const name = type?.name ?? entry.name;
        const scientificName = type?.scientificName ?? "";
        const art = SPECIES_ART.find((a) => a.match.test(name) || a.match.test(scientificName));
        const description =
          art && normalize(art.scientificName) === normalize(scientificName)
            ? art.description
            : type
              ? `Each tree is rated to offset about ${kg(type.offsetKg)} of CO₂ over its lifetime.`
              : "A native species planted by OTOT partners.";
        return { id: typeId, name, scientificName, count: entry.count, image: art?.image, description };
      })
      .sort((a, b) => b.count - a.count);

    const partnerTrees = new Map<string, { funded: number; planted: number }>();
    for (const d of paid) {
      const request = requestByDonation.get(d.id);
      if (!request?.partnerId) continue;
      const entry = partnerTrees.get(request.partnerId) ?? { funded: 0, planted: 0 };
      entry.funded += treeCount(d.trees);
      if (request.status === "completed") entry.planted += treeCount(d.trees);
      partnerTrees.set(request.partnerId, entry);
    }
    const partners = [...partnerTrees.entries()].flatMap(([partnerId, counts]) => {
      const vendor = state.vendors.find((v) => v.id === partnerId);
      if (!vendor) return [];
      const profile = PARTNER_PROFILES.find((p) => normalize(p.name) === normalize(vendor.name));
      return [{ ...counts, id: vendor.id, name: vendor.name, region: vendor.region, profile }];
    });

    return {
      fundedTrees,
      plantedTrees,
      lifetimeKg,
      yearlyKg: fundedTrees * CO2_KG_PER_TREE_YEAR,
      treesLastYear: treesIn(currentYear - 1),
      treesThisYear: treesIn(currentYear),
      species,
      partners,
    };
  }, [currentYear, session?.userId, state.donations, state.plantationRequests, state.treeTypes, state.vendors]);

  const plantingData = [
    { name: "Planted", value: impact.plantedTrees, fill: "#8BC34A" },
    { name: "Funded, on the way", value: Math.max(0, impact.fundedTrees - impact.plantedTrees), fill: "#C5E1A5" },
  ];

  const yearCell = (trees: number) => (trees > 0 ? trees.toLocaleString() : "-");
  const co2Cell = (trees: number) => (trees > 0 ? Math.round(trees * CO2_KG_PER_TREE_YEAR).toLocaleString() : "-");

  return (
    <div className="p-4 sm:p-8 space-y-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">My Impact</h1>
        <img src={ktbLogo} alt="Kenya Tourism Board" className="h-14 sm:h-20 object-contain" />
      </div>

      {impact.fundedTrees === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Sprout className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No trees yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Your impact report fills in once you fund your first trees. Offset a trip, or make a direct donation.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline">
              <Link to="/carbon-calculator">Calculate a trip</Link>
            </Button>
            <Button asChild>
              <Link to="/donate">Plant trees</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <section className="space-y-8">
            <div>
              <p className="text-muted-foreground mb-6">
                Your climate action through tree planting contributes to the United Nations Sustainable Development Goals.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6 bg-muted/50 border-none">
                  <div className="flex items-center gap-4">
                    <img src={SDG15Icon} alt="SDG 15 Life on Land" className="w-20 h-20 rounded-lg flex-shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-sm mb-1">Trees funded</p>
                      <p className="text-3xl font-bold text-foreground">{impact.fundedTrees.toLocaleString()} Trees</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-muted/50 border-none">
                  <div className="flex items-center gap-4">
                    <img src={SDG15Icon} alt="SDG 15 Life on Land" className="w-20 h-20 rounded-lg flex-shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-sm mb-1">Trees planted</p>
                      <p className="text-3xl font-bold text-foreground">{impact.plantedTrees.toLocaleString()} Trees</p>
                      {impact.plantedTrees < impact.fundedTrees && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {(impact.fundedTrees - impact.plantedTrees).toLocaleString()} more on their way
                        </p>
                      )}
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-muted/50 border-none">
                  <div className="flex items-center gap-4">
                    <img src={SDG13Icon} alt="SDG 13 Climate Action" className="w-20 h-20 rounded-lg flex-shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-sm mb-1">CO₂ your trees offset over their lifetime*</p>
                      <p className="text-3xl font-bold text-foreground">{(impact.lifetimeKg / 1000).toFixed(1)} tonnes CO₂</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-muted/50 border-none">
                  <div className="flex items-center gap-4">
                    <img src={SDG13Icon} alt="SDG 13 Climate Action" className="w-20 h-20 rounded-lg flex-shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-sm mb-1">Estimated CO₂ absorbed per year once planted*</p>
                      <p className="text-3xl font-bold text-foreground">{(impact.yearlyKg / 1000).toFixed(1)} tonnes CO₂</p>
                    </div>
                  </div>
                </Card>
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                * Estimates from the trees you paid for. A tree counts as planted once the Ministry verifies the planting.
              </p>
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
                          <td className="p-3 font-semibold text-foreground">Trees funded</td>
                          <td className="p-3 text-muted-foreground">{yearCell(impact.treesLastYear)}</td>
                          <td className="p-3 text-foreground">{impact.treesThisYear.toLocaleString()}</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="p-3 font-semibold text-foreground">Est. CO₂ absorbed per year once planted (kg)</td>
                          <td className="p-3 text-muted-foreground">{co2Cell(impact.treesLastYear)}</td>
                          <td className="p-3 text-foreground">
                            {Math.round(impact.treesThisYear * CO2_KG_PER_TREE_YEAR).toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-4">
                    <h4 className="font-semibold mb-2 text-foreground">Notes</h4>
                    <p className="text-sm text-muted-foreground">
                      We count only the trees you paid for. Lifetime CO₂ is the offset each species is rated for. The yearly
                      figure uses an average of {CO2_KG_PER_TREE_YEAR} kg of CO₂ per growing tree, and applies once a tree is
                      in the ground.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-6">
                  <div className="h-[250px] w-[250px]" role="img" aria-label={`${impact.plantedTrees} of ${impact.fundedTrees} funded trees planted`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={plantingData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                          {plantingData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {plantingData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ background: entry.fill }} />
                        <span className="text-sm">
                          {entry.name}: {entry.value.toLocaleString()} {entry.value === 1 ? "tree" : "trees"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">Tree locations</h2>
            <Card className="overflow-hidden">
              <img src={mauForest} alt={PLANTED_HERE} className="w-full h-64 object-cover" />
              <div className="p-6">
                <h3 className="text-xl font-bold">{PLANTED_HERE}, Kenya</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Every tree you fund is planted in the {PLANTED_HERE} by a Ministry-approved partner. GPS pins will appear
                  here when field mapping is connected.
                </p>
              </div>
            </Card>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Your species</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {impact.species.map((species) => (
                <Card key={species.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                  <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                    {species.image ? (
                      <img
                        src={species.image}
                        alt={species.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-emerald-50" aria-hidden>
                        <TreePine className="h-20 w-20 text-emerald-600/70" />
                      </div>
                    )}
                  </div>
                  <div className="p-6 space-y-3">
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-1">{species.name}</h3>
                      {species.scientificName && (
                        <p className="text-sm text-muted-foreground italic">{species.scientificName}</p>
                      )}
                      <p className="text-sm font-medium text-foreground mt-1">
                        {species.count.toLocaleString()} {species.count === 1 ? "tree" : "trees"} funded
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{species.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Your planting partners</h2>
            {impact.partners.length === 0 ? (
              <Card className="p-6 bg-muted/30">
                <p className="text-muted-foreground">
                  The Ministry hasn't assigned a planting partner to your trees yet. Partners appear here once they are.
                </p>
              </Card>
            ) : (
              <div className="space-y-6">
                {impact.partners.map((partner) => (
                  <Card key={partner.id} className="p-6 sm:p-8 bg-muted/30">
                    <div className="flex items-start gap-6">
                      <div className="flex-shrink-0">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-background rounded-lg flex items-center justify-center">
                          {partner.profile ? (
                            <img src={partner.profile.logo} alt={partner.name} className="w-16 h-16 object-contain" />
                          ) : (
                            <span className="text-2xl font-bold text-primary" aria-hidden>
                              {initials(partner.name)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 space-y-3 min-w-0">
                        <h3 className="text-xl sm:text-2xl font-bold text-primary">{partner.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {partner.funded.toLocaleString()} of your trees assigned · {partner.planted.toLocaleString()} planted
                          {partner.region ? ` · ${partner.region}` : ""}
                        </p>
                        {partner.profile && (
                          <p className="text-muted-foreground leading-relaxed">{partner.profile.description}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
