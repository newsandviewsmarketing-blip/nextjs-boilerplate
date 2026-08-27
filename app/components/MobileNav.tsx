"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type NavigationItem = readonly [label: string, href: string];

export default function MobileNav({
  items,
  isAuthenticated = false,
}: {
  items: readonly NavigationItem[];
  isAuthenticated?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div className="mobile-navigation">
      <button
        className="mobile-menu-button"
        type="button"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation-panel"
        aria-label={
          isOpen ? "Close navigation menu" : "Open navigation menu"
        }
        onClick={() => setIsOpen((open) => !open)}
      >
        <span aria-hidden="true">{isOpen ? "×" : "☰"}</span>
        <span className="mobile-menu-label">Menu</span>
      </button>

      <nav
        id="mobile-navigation-panel"
        className="mobile-nav-panel"
        aria-label="Mobile navigation"
        hidden={!isOpen}
      >
        {items.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            onClick={() => setIsOpen(false)}
          >
            {label}
          </Link>
        ))}

        <a
          href="https://vetnewsandviews.com"
          target="_blank"
          rel="noreferrer"
          onClick={() => setIsOpen(false)}
        >
          VNV News
        </a>

        {isAuthenticated ? (
          <Link
            className="mobile-sign-in"
            href="/dashboard"
            onClick={() => setIsOpen(false)}
          >
            My VetConnect
          </Link>
        ) : (
          <Link
            className="mobile-sign-in"
            href="/login"
            onClick={() => setIsOpen(false)}
          >
            Sign in
          </Link>
        )}
      </nav>
    </div>
  );
}
