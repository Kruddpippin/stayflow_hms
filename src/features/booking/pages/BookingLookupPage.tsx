import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Hotel, Search, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const lookupSchema = z.object({
  reference: z.string().min(1, "Booking reference is required"),
  email: z.string().email("Valid email required"),
});
type LookupValues = z.infer<typeof lookupSchema>;

export default function BookingLookupPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LookupValues>({
    resolver: zodResolver(lookupSchema),
  });

  function onSubmit(values: LookupValues) {
    navigate(`/booking/${encodeURIComponent(values.reference.trim())}?email=${encodeURIComponent(values.email.trim())}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b" style={{ backgroundColor: "#0F766E" }}>
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <Hotel className="h-[18px] w-[18px] text-white" />
          </div>
          <span className="text-base font-semibold text-white">StayFlow</span>
        </div>
      </header>

      <div className="flex min-h-[80vh] items-center justify-center p-6">
        <Card className="w-full max-w-md rounded-2xl shadow-lg">
          <CardContent className="p-8">
            <div className="mb-6 text-center">
              <Search className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <h1 className="text-xl font-semibold">Find your booking</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your booking reference and email to view or manage your reservation.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Booking reference</Label>
                <Input {...register("reference")} placeholder="SF-XXXXXX" className="text-center font-mono text-lg tracking-wider" />
                {errors.reference && <p className="text-xs text-destructive">{errors.reference.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" {...register("email")} placeholder="you@email.com" />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <Button type="submit" className="w-full gap-2" size="lg" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Look up booking
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Need to make a new booking? <Link to="/" className="font-medium text-primary hover:underline">Go to StayFlow</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
