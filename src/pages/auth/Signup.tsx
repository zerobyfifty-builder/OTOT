import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { DEMO_PASSWORD } from "@/data/seed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import ktbLogo from "@/assets/ktb-logo.png";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6),
});

export default function Signup() {
  const { signUpTourist } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(DEMO_PASSWORD);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ name, email, password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || "Check the form");
      return;
    }
    const result = signUpTourist(parsed.data.name, parsed.data.email, parsed.data.password);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Welcome to OTOT");
    navigate(result.home || "/dashboard");
  };

  return (
    <div className="min-h-screen bg-secondary flex flex-col items-center justify-center px-4 py-10">
      <img src={ktbLogo} alt="Kenya Tourism Board" className="h-16 mb-8 object-contain" />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create a tourist account</CardTitle>
          <CardDescription>
            Ministry and partner accounts are provisioned separately. Demo password: {DEMO_PASSWORD}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              Get started
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/auth/login" className="ml-1 text-accent hover:underline">
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
