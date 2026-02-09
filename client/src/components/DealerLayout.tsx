import { Sidebar } from "./Sidebar";
import { ReactNode } from "react";

interface DealerLayoutProps {
  children: ReactNode;
  dealerId?: string;
}

export function DealerLayout({ children, dealerId }: DealerLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar dealerId={dealerId} />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
