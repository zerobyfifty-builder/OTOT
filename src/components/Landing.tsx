import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TreePine, Plane, Heart, Award, Users, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Logo size="md" />
          <nav className="hidden md:flex space-x-6">
            <a href="#about" className="text-black hover:text-primary transition-colors">About</a>
            <a href="#how-it-works" className="text-black hover:text-primary transition-colors">How It Works</a>
            <a href="#impact" className="text-black hover:text-primary transition-colors">Impact</a>
          </nav>
          <div className="space-x-3">
            <Link to="/auth/login">
              <Button variant="outline" size="sm" className="border-2 border-primary text-black hover:bg-primary hover:text-black">Sign In</Button>
            </Link>
            <Link to="/auth/signup">
              <Button size="sm" className="bg-primary text-black hover:bg-primary/90">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="mb-8">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              One Tourist<br />
              <span className="text-primary">One Tree</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Transform your Kenya adventure into a lasting legacy. Calculate your carbon footprint, 
              take the Responsible Traveler Pledge, and plant trees to offset your impact.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link to="/pledge">
              <Button size="lg" className="bg-primary text-black hover:bg-primary/90 px-8 py-3">
                Take the Pledge
              </Button>
            </Link>
            <Link to="/auth/signup">
              <Button variant="outline" size="lg" className="border-2 border-primary text-black hover:bg-primary hover:text-black px-8 py-3">
                Calculate My Impact
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">50,000+</div>
              <div className="text-muted-foreground">Trees Planted</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">10,000+</div>
              <div className="text-muted-foreground">Responsible Travelers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">1,100</div>
              <div className="text-muted-foreground">Tons CO₂ Offset</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-secondary">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-foreground mb-16">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="p-8 text-center bg-card border-border shadow-lg">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">1. Take the Pledge</h3>
              <p className="text-muted-foreground leading-relaxed">
                Commit to responsible tourism with our 10-point Responsible Traveler Pledge and receive your digital certificate.
              </p>
            </Card>

            <Card className="p-8 text-center bg-card border-border shadow-lg">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Plane className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">2. Calculate Impact</h3>
              <p className="text-muted-foreground leading-relaxed">
                Use our carbon calculator to measure your flight and accommodation emissions during your Kenya visit.
              </p>
            </Card>

            <Card className="p-8 text-center bg-card border-border shadow-lg">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <TreePine className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">3. Plant Trees</h3>
              <p className="text-muted-foreground leading-relaxed">
                Offset your carbon footprint by planting trees in Kenya's forests and track their growth with GPS coordinates.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-foreground mb-16">Why Choose OTOT?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">Real Impact</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Every tree is planted by local communities in Kenya's forests with GPS tracking and photo verification for complete transparency.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">Community Partnership</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Partner with local lodges and communities to ensure sustainable reforestation that benefits both environment and livelihoods.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">Simple & Affordable</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Starting at just $1 minimum donation or $30 for a fully tracked tree. Make a meaningful impact without breaking the bank.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">Certified Impact</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Receive official certificates for your pledge and tree planting contributions that you can share on social media.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-accent text-accent-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Make a Difference?</h2>
          <p className="text-xl mb-8 text-accent-foreground/90 max-w-2xl mx-auto">
            Join thousands of responsible travelers who are helping reforest Kenya while exploring its natural beauty.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/pledge">
              <Button size="lg" className="bg-primary text-black hover:bg-primary/90 px-8 py-3">
                Start Your Journey
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-accent-foreground text-black hover:bg-accent-foreground hover:text-black px-8 py-3">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-secondary border-t border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="mb-4">
                <Logo size="sm" />
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Kenya's sustainable tourism initiative connecting responsible travelers with reforestation efforts.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-3">Get Started</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/pledge" className="text-muted-foreground hover:text-primary transition-colors">Take the Pledge</Link></li>
                <li><Link to="/auth/signup" className="text-muted-foreground hover:text-primary transition-colors">Calculate Impact</Link></li>
                <li><Link to="/auth/signup" className="text-muted-foreground hover:text-primary transition-colors">Plant Trees</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-3">About</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">How It Works</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Our Impact</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Partners</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-3">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Contact Us</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">FAQ</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center">
            <p className="text-muted-foreground text-sm">
              © 2024 One Tourist One Tree. A Kenya Tourism Board initiative.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;