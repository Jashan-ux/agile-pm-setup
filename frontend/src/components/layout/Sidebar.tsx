import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  BookOpen,
  CheckSquare,
  Calendar,
  BarChart3,
  Users,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/" },
  { label: "Projects", icon: FolderKanban, to: "/projects" },
  { label: "User Stories", icon: BookOpen, to: "/stories" },
  { label: "Tasks", icon: CheckSquare, to: "/tasks" },
  { label: "Calendar", icon: Calendar, to: "/calendar", disabled: true },
  { label: "Reports", icon: BarChart3, to: "/reports" },
  { label: "Team", icon: Users, to: "/team", disabled: true },
  { label: "Settings", icon: Settings, to: "/settings", disabled: true },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="flex h-full w-56 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-bold text-foreground tracking-tight">
          AgilePM
        </span>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-2 pt-3">
        {navItems.map((item) => {
          const isActive =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);

          return (
            <Link
              key={item.to}
              to={item.disabled ? "#" : item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                item.disabled && "pointer-events-none opacity-40"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* User */}
      <div className="flex items-center gap-3 p-4">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">AS</AvatarFallback>
        </Avatar>
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-xs font-medium text-foreground">
            Arjun Singh
          </p>
          <p className="truncate text-xs text-muted-foreground">
            arjun@example.com
          </p>
        </div>
      </div>
    </aside>
  );
}