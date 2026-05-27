import { Building2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PartnerCategory } from "@/types/partner";

interface Step1SelectCategoryProps {
  selectedCategory: PartnerCategory | null;
  onSelectCategory: (category: PartnerCategory) => void;
  onNext: () => void;
  onCancel: () => void;
}

export function Step1SelectCategory({
  selectedCategory,
  onSelectCategory,
  onNext,
  onCancel,
}: Step1SelectCategoryProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-admin-primary mb-2">Select Partner Category</h2>
        <p className="text-muted-foreground">Choose the type of partner you want to onboard</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Institutional Partner Card */}
        <Card
          className={`p-6 cursor-pointer transition-all border-2 hover:shadow-lg ${
            selectedCategory === 'government'
              ? 'border-admin-primary bg-admin-primary/5'
              : 'border-border hover:border-admin-primary/50'
          }`}
          onClick={() => onSelectCategory('government')}
        >
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${
                selectedCategory === 'government' 
                  ? 'bg-admin-primary text-admin-cream' 
                  : 'bg-muted'
              }`}>
                <Building2 className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Institutional Partner</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Oversight & governance roles. No financial transactions. Custom reporting and analytics access.
                </p>
                <div className="text-xs text-muted-foreground">
                  <strong>Examples:</strong> KTB, Ministry of Tourism, Forest Service
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <input
                type="radio"
                checked={selectedCategory === 'government'}
                onChange={() => onSelectCategory('government')}
                className="h-5 w-5 accent-admin-primary"
              />
            </div>
          </div>
        </Card>

        {/* Business Partner Card */}
        <Card
          className={`p-6 cursor-pointer transition-all border-2 hover:shadow-lg ${
            selectedCategory === 'business'
              ? 'border-admin-primary bg-admin-primary/5'
              : 'border-border hover:border-admin-primary/50'
          }`}
          onClick={() => onSelectCategory('business')}
        >
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${
                selectedCategory === 'business' 
                  ? 'bg-admin-primary text-admin-cream' 
                  : 'bg-muted'
              }`}>
                <Briefcase className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Business Partner</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Operational partners with transactional capabilities. Can receive payments and use API integrations.
                </p>
                <div className="text-xs text-muted-foreground">
                  <strong>Examples:</strong> Lodges, Airlines, Plantations, Nurseries
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <input
                type="radio"
                checked={selectedCategory === 'business'}
                onChange={() => onSelectCategory('business')}
                className="h-5 w-5 accent-admin-primary"
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-between max-w-4xl mx-auto pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={onNext}
          disabled={!selectedCategory}
          className="bg-admin-primary text-admin-cream hover:bg-admin-primary/90"
        >
          Continue →
        </Button>
      </div>
    </div>
  );
}
