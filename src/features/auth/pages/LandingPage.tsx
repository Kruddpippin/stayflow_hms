import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Hotel, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Hotel className="h-[18px] w-[18px]" />
            </div>
            <span className="text-base font-bold">StayFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button className="gap-2">
                Get started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ backgroundColor: "#0F766E" }}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F766E] via-[#0D6B63] to-[#0A5C55]" />
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/5" />

        <div className="relative mx-auto max-w-6xl px-5 py-24 lg:py-36">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Run your property, <br />
              managed <span className="text-emerald-300">effortlessly.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-white/70">
              StayFlow is the modern lodging management system for hotels, motels,
              serviced apartments, guesthouses, hostels, and resorts.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/signup">
                <Button size="lg" className="gap-2 bg-white text-[#0F766E] hover:bg-white/90">
                  Create free account <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="ghost" className="text-white hover:bg-white/10">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground">
              <Hotel className="h-3 w-3" />
            </div>
            <span className="font-medium text-foreground">StayFlow</span>
          </div>
          <p>&copy; {new Date().getFullYear()} StayFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
