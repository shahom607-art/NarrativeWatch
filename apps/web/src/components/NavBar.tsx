"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function NavBar() {
  const { data: session } = useSession();

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link href={session ? "/dashboard" : "/"} className="text-xl font-semibold text-accent">
          NarrativeWatch
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {session && (
            <Link href="/dashboard" className="hover:text-accent">
              Dashboard
            </Link>
          )}
          <Link href="/education" className="hover:text-accent">
            Education
          </Link>
          {session ? (
            <>
              <Link href="/account/settings" className="hover:text-accent">
                Settings
              </Link>
              <button
                onClick={() => signOut()}
                className="rounded border border-border px-3 py-1 hover:border-accent"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="hover:text-accent">
                Login
              </Link>
              <Link
                href="/auth/register"
                className="rounded bg-accent px-3 py-1 text-white hover:opacity-90"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
