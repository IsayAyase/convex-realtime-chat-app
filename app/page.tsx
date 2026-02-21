import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Chat App</h1>
        <div className="flex gap-4">
          <Link href="/sign-in">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link href="/sign-up">
            <Button>Sign Up</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <h2 className="text-4xl font-bold mb-4">Welcome to Chat App</h2>
        <p className="text-lg text-gray-600 mb-8 max-w-md">
          Connect with friends and colleagues in real-time. 
          Fast, secure, and simple messaging for everyone.
        </p>
        <Link href="/sign-up">
          <Button size="lg">Get Started</Button>
        </Link>
      </main>
    </div>
  );
}
