import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Building2, 
  Package, 
  Megaphone, 
  Facebook, 
  FileText,
  Palette
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const getNavItems = (dealerId?: string): NavItem[] => [
  {
    title: "Dashboard",
    href: dealerId ? `/dashboard/${dealerId}` : "/dealers",
    icon: LayoutDashboard,
    description: "Overview and analytics"
  },
  {
    title: "Dealer Management",
    href: "/dealers",
    icon: Building2,
    description: "Manage dealers"
  },
  {
    title: "Inventory",
    href: dealerId ? `/inventory/${dealerId}` : "/dealers",
    icon: Package,
    description: "Vehicle inventory"
  },
  {
    title: "Ad Creator",
    href: "/dealers",
    icon: Megaphone,
    description: "Create Facebook ads"
  },
  {
    title: "Facebook Ad Staging",
    href: dealerId ? `/ads/staging/${dealerId}` : "/dealers",
    icon: Facebook,
    description: "Stage and publish ads"
  },
  {
    title: "Content Gen",
    href: "/dealers",
    icon: FileText,
    description: "Generate content"
  },
  {
    title: "Templates",
    href: "/templates",
    icon: Palette,
    description: "Ad templates"
  }
];

interface SidebarProps {
  dealerId?: string;
}

export function Sidebar({ dealerId }: SidebarProps) {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Facebook className="w-6 h-6 text-blue-500" />
          <span className="font-bold text-lg">FB Ad Accelerator</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {getNavItems(dealerId).map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || 
                           (item.href !== "/" && location.startsWith(item.href));
            
            return (
              <Link key={item.title} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer",
                    "hover:bg-gray-800",
                    isActive && "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{item.title}</div>
                    <div className="text-xs text-gray-400 truncate">
                      {item.description}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="text-xs text-gray-500">
          <div className="font-semibold text-gray-400 mb-1">SYSTEM STATUS</div>
          <div className="flex items-center justify-between">
            <span>API Connection</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-green-400">ONLINE</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
