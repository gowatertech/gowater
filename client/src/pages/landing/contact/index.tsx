import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Droplet, 
  Menu, 
  PhoneCall, 
  Mail,
  Clock,
  MapPin
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Contact page component
export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header with navigation menu */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-50">
              <Droplet className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-semibold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              GoWater
            </span>
          </div>

          {/* Main navigation menu */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" className="font-medium">Inicio</Button>
            </Link>
            <Link href="/planes">
              <Button variant="ghost" className="font-medium">Planes</Button>
            </Link>
            <Link href="/soporte">
              <Button variant="ghost" className="font-medium">Soporte</Button>
            </Link>
            <Link href="/demo">
              <Button variant="ghost" className="font-medium">Demo</Button>
            </Link>
            <Link href="/contact">
              <Button variant="ghost" className="font-medium bg-primary/10">Contact</Button>
            </Link>
          </div>

          {/* Mobile menu (hamburger) */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-primary">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0">
                <div className="p-6 space-y-6">
                  <div className="flex items-center gap-2 mb-8">
                    <div className="p-1.5 rounded-md bg-blue-50">
                      <Droplet className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-xl font-semibold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                      GoWater
                    </span>
                  </div>
                  <nav className="space-y-4">
                    <Link href="/">
                      <div className="block p-2 text-base font-medium hover:bg-muted rounded-md">Inicio</div>
                    </Link>
                    <Link href="/planes">
                      <div className="block p-2 text-base font-medium hover:bg-muted rounded-md">Planes</div>
                    </Link>
                    <Link href="/soporte">
                      <div className="block p-2 text-base font-medium hover:bg-muted rounded-md">Soporte</div>
                    </Link>
                    <Link href="/demo">
                      <div className="block p-2 text-base font-medium hover:bg-muted rounded-md">Demo</div>
                    </Link>
                    <Link href="/contact">
                      <div className="block p-2 text-base font-medium bg-primary/10 rounded-md">Contact</div>
                    </Link>
                  </nav>
                  <div className="pt-6 border-t space-y-4">
                    <Link href="/platform/login">
                      <Button variant="outline" className="w-full">Iniciar sesión</Button>
                    </Link>
                    <Link href="/platform/register">
                      <Button className="w-full">Registrarse</Button>
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Action buttons */}
          <div className="hidden md:flex gap-4 items-center">
            <Link href="/platform/login">
              <Button variant="ghost">Iniciar sesión</Button>
            </Link>
            <Link href="/platform/register">
              <Button>Registrarse</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero section */}
        <section className="py-16 md:py-20 bg-gradient-to-b from-blue-50 to-white">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col justify-center items-center text-center max-w-3xl mx-auto">
              <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-primary">
                  Contact Us
                </h1>
                <p className="text-muted-foreground md:text-xl max-w-[700px] mx-auto">
                  We're here to answer your questions and help you with any inquiries about our services.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact information */}
        <section className="py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {/* Dominican Republic Phone */}
              <Card className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                      <PhoneCall className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <img 
                          src="https://flagcdn.com/w40/do.png" 
                          alt="Dominican Republic Flag" 
                          className="h-5 mr-2"
                        />
                        <h3 className="font-medium">Dominican Republic</h3>
                      </div>
                      <p className="text-xl font-medium text-primary">809-350-2237</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Open hours: Monday to Friday 8am - 6pm
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* United States Phone */}
              <Card className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                      <PhoneCall className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <img 
                          src="https://flagcdn.com/w40/us.png" 
                          alt="United States Flag" 
                          className="h-5 mr-2"
                        />
                        <h3 className="font-medium">United States</h3>
                      </div>
                      <p className="text-xl font-medium text-primary">919-343-6706</p>
                      <p className="text-xl font-medium text-primary mt-1">984-260-7447</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Open hours: Monday to Friday 9am - 7pm (EST)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Email */}
              <Card className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-medium mb-2">Email</h3>
                      <p className="text-xl font-medium text-primary">soportegowater@gmail.com</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        We respond within 24 hours.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Contact form section */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="grid gap-10 md:grid-cols-2">
              <div>
                <h2 className="text-3xl font-bold tracking-tighter mb-4">
                  Send us a message
                </h2>
                <p className="text-muted-foreground mb-4">
                  Fill out the form and we'll get back to you as soon as possible.
                </p>
                
                <div className="space-y-6 mt-8">
                  <div className="flex items-start gap-4">
                    <Clock className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <h3 className="font-medium">Business Hours</h3>
                      <p className="text-sm text-muted-foreground">
                        Monday to Friday: 8:00 AM - 6:00 PM (AST/EDT)
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <MapPin className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <h3 className="font-medium">Main Office</h3>
                      <p className="text-sm text-muted-foreground">
                        Santo Domingo, Dominican Republic
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <form className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Name</label>
                      <input 
                        type="text" 
                        className="w-full p-2 rounded-md border border-input bg-background"
                        placeholder="Your name" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <input 
                        type="email" 
                        className="w-full p-2 rounded-md border border-input bg-background"
                        placeholder="you@example.com" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subject</label>
                    <input 
                      type="text" 
                      className="w-full p-2 rounded-md border border-input bg-background"
                      placeholder="Subject of your message" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Message</label>
                    <textarea 
                      className="w-full p-2 rounded-md border border-input bg-background min-h-[120px]"
                      placeholder="Write your message here" 
                    />
                  </div>
                  <Button className="w-full">Send message</Button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* CTA section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4">
              Start optimizing your water distribution today
            </h2>
            <p className="mt-4 mb-8 text-primary-foreground/80 md:text-xl max-w-[700px] mx-auto">
              Join hundreds of companies already trusting GoWater to manage their operations
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/platform/register">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Get started
                </Button>
              </Link>
              <Link href="/planes">
                <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground hover:bg-primary-foreground/10 w-full sm:w-auto">
                  View plans
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 md:py-16 bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-md bg-blue-50">
                  <Droplet className="h-5 w-5 text-primary" />
                </div>
                <span className="text-lg font-semibold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  GoWater
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Route and product management solutions for water distribution companies.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/features" className="text-muted-foreground hover:text-foreground">Features</Link></li>
                <li><Link href="/planes" className="text-muted-foreground hover:text-foreground">Plans & Pricing</Link></li>
                <li><Link href="/demo" className="text-muted-foreground hover:text-foreground">Request Demo</Link></li>
                <li><Link href="/security" className="text-muted-foreground hover:text-foreground">Security</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Support</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/soporte" className="text-muted-foreground hover:text-foreground">Help Center</Link></li>
                <li><Link href="/documentation" className="text-muted-foreground hover:text-foreground">Documentation</Link></li>
                <li><Link href="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link></li>
                <li><Link href="/status" className="text-muted-foreground hover:text-foreground">System Status</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="text-muted-foreground hover:text-foreground">About Us</Link></li>
                <li><Link href="/blog" className="text-muted-foreground hover:text-foreground">Blog</Link></li>
                <li><Link href="/careers" className="text-muted-foreground hover:text-foreground">Careers</Link></li>
                <li><Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} GoWater. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}