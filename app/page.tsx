import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageCircle, Users, Shield, Zap } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

export default function Home() {
  return (
    <div className="min-h-dvh flex flex-col">
      {/* Navbar */}
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Chat App</h1>
        <div className="flex items-center gap-4">
          <Link href="/sign-in">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link href="/sign-up">
            <Button>Sign Up</Button>
          </Link>
          <ModeToggle />
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <h2 className="text-4xl md:text-5xl font-bold mb-4">
          Real-time messaging for everyone
        </h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-lg">
          Connect with friends, colleagues, and groups in real-time. 
          Fast, secure, and simple messaging.
        </p>
        <Link href="/sign-up">
          <Button size="lg">Get Started Free</Button>
        </Link>
      </main>

      {/* Features */}
      <section className="border-t p-8 bg-muted/30">
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Zap className="size-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Real-time</h3>
            <p className="text-sm text-muted-foreground">
              Instant messaging with typing indicators and read receipts
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="size-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Group Chats</h3>
            <p className="text-sm text-muted-foreground">
              Create groups and collaborate with multiple people
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Shield className="size-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Secure</h3>
            <p className="text-sm text-muted-foreground">
              Your messages are protected with secure authentication
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
