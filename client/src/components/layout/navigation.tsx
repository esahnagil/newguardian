import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Activity, Server, Bell, Settings } from "lucide-react";

export function Navigation() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Gösterge Paneli", icon: Activity },
    { href: "/monitoring", label: "İzleme", icon: Server },
    { href: "/alerts", label: "Uyarılar", icon: Bell },
    { href: "/settings", label: "Ayarlar", icon: Settings }
  ];

  return (
    <nav className="flex h-16 items-center border-b px-4 bg-sidebar">
      <div className="flex items-center gap-6 flex-1">
        <h1 className="text-lg font-semibold">Ağ İzleyici</h1>

        <div className="flex gap-2">
          {links.map(({ href, label, icon: Icon }) => (
            <Button
              key={href}
              variant={location === href ? "secondary" : "ghost"}
              asChild
            >
              <Link href={href} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </nav>
  );
}