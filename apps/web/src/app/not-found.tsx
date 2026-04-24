import Link from "next/link";
import { Button } from "../components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[rgb(var(--color-bg))]">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-widest text-indigo-400 mb-3">
          404
        </p>
        <h1 className="text-4xl font-display font-bold text-white mb-4">
          Not found
        </h1>
        <p className="text-gray-400 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or was moved.
        </p>
        <Link href="/">
          <Button>Back to home</Button>
        </Link>
      </div>
    </div>
  );
}
