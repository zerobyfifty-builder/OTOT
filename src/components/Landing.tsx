import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TreePine, Plane, Heart, Award, Users, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import ktbLogo from "@/assets/ktb-logo.png";
import ktbSustainable from "@/assets/ktb-sustainable.png";
import kenyaCoatOfArms from "@/assets/kenya-coat-of-arms.png";
import kfsLogo from "@/assets/kfs-logo.png";
import kefriLogo from "@/assets/kefri-logo.png";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <img src={ktbLogo} alt="Kenya Tourism Board" className="h-20 object-contain" />
          <nav className="hidden md:flex space-x-6">
            <a href="#about" className="text-foreground/70 hover:text-primary transition-colors text-sm font-medium">About</a>
            <a href="#how-it-works" className="text-foreground/70 hover:text-primary transition-colors text-sm font-medium">How It Works</a>
            <a href="#impact" className="text-foreground/70 hover:text-primary transition-colors text-sm font-medium">Impact</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/auth/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24 px-4 overflow-hidden">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left - Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  <TreePine className="h-4 w-4" />
                  Kenya's Sustainable Tourism Initiative
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight">
                  One Tourist<br />
                  <span className="text-primary">One Tree</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                  Transform your Kenya adventure into a lasting legacy. Calculate your carbon footprint, 
                  take the Responsible Traveler Pledge, and plant trees to offset your impact.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/auth/signup">
                  <Button size="lg" className="px-8 py-3 text-base">
                    Calculate my impact
                  </Button>
                </Link>
                <Link to="/auth/login">
                  <Button variant="outline" size="lg" className="px-8 py-3 text-base">
                    Sign in
                  </Button>
                </Link>
              </div>

            </div>

            {/* Right - Video */}
            <div className="relative mt-8 lg:mt-0">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-video bg-foreground/5">
                <iframe
                  src="https://www.youtube.com/embed/wcx86Nv1LXw?rel=0"
                  title="One Tourist One Tree"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
              {/* Decorative elements - hidden on mobile for cleaner look */}
              <div className="hidden md:block absolute -z-10 -top-4 -right-4 w-full h-full rounded-2xl bg-primary/20" />
              <div className="hidden md:block absolute -z-20 -top-8 -right-8 w-full h-full rounded-2xl bg-primary/10" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-t border-border">
        <div className="container mx-auto max-w-5xl px-4">
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {[
              { value: "50,000+", label: "Trees Planted" },
              { value: "10,000+", label: "Responsible Travelers" },
              { value: "1,100", label: "Tons CO₂ Offset" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              >
                <div className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-secondary">
        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, amount: 0.3 }}
            className="text-4xl font-bold text-center text-foreground mb-16"
          >
            How It Works
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { icon: <Plane className="h-8 w-8 text-primary" />, title: "1. Calculate impact", desc: "Measure flight and stay emissions, then see a tree mix sized to the carbon you want to offset." },
              { icon: <Heart className="h-8 w-8 text-primary" />, title: "2. Donate", desc: "Choose tree types and counts, then complete a donation. The ministry turns that into a plantation request." },
              { icon: <TreePine className="h-8 w-8 text-primary" />, title: "3. Trees get planted", desc: "Plantation partners assign field agents, complete the work, and the ministry marks the request complete." },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                viewport={{ once: true, amount: 0.3 }}
              >
                <Card className="p-8 text-center bg-card border-border shadow-lg h-full">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-foreground">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, amount: 0.3 }}
            className="text-4xl font-bold text-center text-foreground mb-16"
          >
            Why Choose OTOT?
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {[
              { icon: <Globe className="h-6 w-6 text-primary" />, title: "Real Impact", desc: "Every tree is planted by local communities in Kenya's forests with GPS tracking and photo verification for complete transparency." },
              { icon: <Users className="h-6 w-6 text-primary" />, title: "Community partnership", desc: "Ministry teams assign plantation partners who plant with local communities across Kenya." },
              { icon: <Heart className="h-6 w-6 text-primary" />, title: "Simple & Affordable", desc: "Starting at just $1 minimum donation or $30 for a fully tracked tree. Make a meaningful impact without breaking the bank." },
              { icon: <Award className="h-6 w-6 text-primary" />, title: "Certified Impact", desc: "Receive official certificates for your pledge and tree planting contributions that you can share on social media." },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true, amount: 0.3 }}
                className="flex items-start space-x-4"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-foreground">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-16 bg-secondary">
        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, amount: 0.3 }}
            className="text-4xl font-bold text-center text-foreground mb-4"
          >
            Our Partners
          </motion.h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Backed by Kenya's leading conservation and government institutions
          </p>
          <motion.div
            className="flex flex-wrap items-center justify-center gap-14 md:gap-24 max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {[
              { src: ktbSustainable, alt: "KTB Sustainability Initiative" },
              { src: kenyaCoatOfArms, alt: "Republic of Kenya" },
              { src: kfsLogo, alt: "Kenya Forest Service" },
              { src: kefriLogo, alt: "Kenya Forestry Research Institute" },
            ].map((logo, i) => (
              <motion.img
                key={logo.alt}
                src={logo.src}
                alt={logo.alt}
                className="h-20 md:h-24 object-contain"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              />
            ))}
          </motion.div>
        </div>
      </section>


      <section className="py-20 bg-accent text-accent-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Make a Difference?</h2>
          <p className="text-xl mb-8 text-accent-foreground/90 max-w-2xl mx-auto">
            Join thousands of responsible travelers who are helping reforest Kenya while exploring its natural beauty.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth/signup">
              <Button size="lg" className="bg-primary text-black hover:bg-primary/90 px-8 py-3">
                Start your journey
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
                <img src={ktbLogo} alt="Kenya Tourism Board" className="h-16 object-contain" />
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Kenya's sustainable tourism initiative connecting responsible travelers with reforestation efforts.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-3">Get Started</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/auth/signup" className="text-muted-foreground hover:text-primary transition-colors">Create account</Link></li>
                <li><Link to="/auth/login" className="text-muted-foreground hover:text-primary transition-colors">Sign in</Link></li>
                <li><Link to="/carbon-calculator" className="text-muted-foreground hover:text-primary transition-colors">Carbon calculator</Link></li>
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